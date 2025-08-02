// src/components/Dashboard/MySessionsSection.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';

const MySessionsSection = ({ user, onRefresh, onAuthError }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch bookings based on user role
  const fetchBookings = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('[MYSESSIONS] Fetching bookings for user role:', user?.role);
      
      let result;
      if (user?.role === 'consultant') {
        result = await ApiService.apiCall('/booking/getbookingsviaConsultantid', {
          method: 'GET',
        });
      } else {
        result = await ApiService.getUserBookings();
      }
      
      if (result.success) {
        const bookingsData = Array.isArray(result.data) ? result.data : [];
        setBookings(bookingsData);
        console.log('[MYSESSIONS] Bookings loaded:', bookingsData.length);
      } else {
        console.warn('[MYSESSIONS] Failed to fetch bookings:', result.error);
        
        if (result.needsLogin && onAuthError) {
          onAuthError(result);
          return;
        }
        
        if (result.error) {
          Alert.alert('Error', result.error);
        }
        setBookings([]);
      }
    } catch (error) {
      console.error('[MYSESSIONS] Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load sessions');
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onAuthError, user?.role]);

  useEffect(() => {
    if (user) {
      fetchBookings(true);
    }
  }, [fetchBookings, user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings(false);
    if (onRefresh) onRefresh();
  }, [fetchBookings, onRefresh]);

  // Filter bookings based on active tab
  const getFilteredBookings = useCallback(() => {
    if (activeTab === 'all') return bookings;
    return bookings.filter(booking => {
      switch (activeTab) {
        case 'scheduled':
          return ['scheduled', 'pending'].includes(booking.status);
        case 'completed':
          return booking.status === 'completed';
        case 'cancelled':
          return ['cancelled', 'missed'].includes(booking.status);
        default:
          return true;
      }
    });
  }, [bookings, activeTab]);

  const getStatusColor = (status) => {
    const colors = {
      scheduled: '#4CAF50',
      pending: '#FFA726',
      completed: '#2196F3',
      cancelled: '#FF6B6B',
      missed: '#9E9E9E',
      'in-progress': '#FF9800'
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status) => {
    const icons = {
      scheduled: 'calendar',
      pending: 'time',
      completed: 'checkmark-circle',
      cancelled: 'close-circle',
      missed: 'alert-circle',
      'in-progress': 'play-circle'
    };
    return icons[status] || 'help-circle';
  };

  const formatDateTime = (dateTime) => {
    try {
      const date = new Date(dateTime);
      return {
        date: date.toLocaleDateString('en-GB'),
        time: date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
    } catch (error) {
      return { date: 'Invalid Date', time: '' };
    }
  };

  const getTabCount = (tab) => {
    switch (tab) {
      case 'all':
        return bookings.length;
      case 'scheduled':
        return bookings.filter(b => ['scheduled', 'pending'].includes(b.status)).length;
      case 'completed':
        return bookings.filter(b => b.status === 'completed').length;
      case 'cancelled':
        return bookings.filter(b => ['cancelled', 'missed'].includes(b.status)).length;
      default:
        return 0;
    }
  };

  const handleJoinMeeting = (booking) => {
    if (booking.meetingLink) {
      // Handle meeting link navigation
      console.log('Joining meeting:', booking.meetingLink);
    } else {
      Alert.alert('No Meeting Link', 'Meeting link will be available closer to the session time.');
    }
  };

  const handleReschedule = (booking) => {
    Alert.alert('Reschedule', 'Reschedule functionality will be implemented soon.');
  };

  const handleCancel = (booking) => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => {
            // Implement cancel functionality
            console.log('Cancelling booking:', booking._id);
          }
        }
      ]
    );
  };

  const SessionCard = ({ booking }) => {
    const { date, time } = formatDateTime(booking.bookingDateTime);
    
    // Determine other party name based on user role
    const otherParty = user?.role === 'consultant' ? booking.user : booking.consultant;
    const otherPartyName = otherParty?.fullName || 'Unknown';
    const roleLabel = user?.role === 'consultant' ? 'Client' : 'Consultant';

    return (
      <View style={styles.sessionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.partyName}>
              {roleLabel}: {otherPartyName}
            </Text>
            <Text style={styles.sessionDate}>{date} at {time}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Ionicons 
              name={getStatusIcon(booking.status)} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.statusText}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{booking.duration} minutes</Text>
          </View>
          
          {booking.consultationDetail && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color="#666" />
              <Text style={styles.detailText} numberOfLines={2}>
                {booking.consultationDetail}
              </Text>
            </View>
          )}
        </View>

        {booking.status === 'scheduled' && (
          <View style={styles.cardActions}>
            {booking.meetingLink && (
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={() => handleJoinMeeting(booking)}
              >
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.joinButtonText}>Join Meeting</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleReschedule(booking)}
              >
                <Ionicons name="calendar-outline" size={14} color="#666" />
                <Text style={styles.actionButtonText}>Reschedule</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelAction]}
                onPress={() => handleCancel(booking)}
              >
                <Ionicons name="close-outline" size={14} color="#FF6B6B" />
                <Text style={[styles.actionButtonText, styles.cancelText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const TabButton = ({ tab, label, active, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.activeTab]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.activeTabText]}>
        {label}
      </Text>
      <View style={[styles.tabBadge, active && styles.activeTabBadge]}>
        <Text style={[styles.badgeText, active && styles.activeBadgeText]}>
          {getTabCount(tab)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TabButton
            tab="all"
            label="All"
            active={activeTab === 'all'}
            onPress={() => setActiveTab('all')}
          />
          <TabButton
            tab="scheduled"
            label="Upcoming"
            active={activeTab === 'scheduled'}
            onPress={() => setActiveTab('scheduled')}
          />
          <TabButton
            tab="completed"
            label="Completed"
            active={activeTab === 'completed'}
            onPress={() => setActiveTab('completed')}
          />
          <TabButton
            tab="cancelled"
            label="Cancelled"
            active={activeTab === 'cancelled'}
            onPress={() => setActiveTab('cancelled')}
          />
        </ScrollView>
      </View>

      {/* Sessions List */}
      <ScrollView 
        style={styles.sessionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'all' ? 'No sessions found' : `No ${activeTab} sessions`}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'all' 
                ? 'Book your first consultation session' 
                : `You don't have any ${activeTab} sessions`
              }
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <SessionCard key={booking._id} booking={booking} />
          ))
        )}
      </ScrollView>

      {/* Summary Stats */}
      {bookings.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getTabCount('all')}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getTabCount('completed')}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getTabCount('scheduled')}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  tabContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeTabBadge: {
    backgroundColor: '#fff',
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  activeBadgeText: {
    color: '#4CAF50',
  },
  sessionsList: {
    flex: 1,
    padding: 16,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  cancelAction: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  cancelText: {
    color: '#FF6B6B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
});

export default MySessionsSection;