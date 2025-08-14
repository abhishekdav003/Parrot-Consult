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
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';

const MySessionsSection = ({ user, onRefresh, onAuthError }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [consultantCache, setConsultantCache] = useState({});

  // Helper function to get consultant name from available data
  const getConsultantName = useCallback(async (consultantData) => {
    if (!consultantData) return 'Unknown Consultant';

    // If consultant is just a string ID
    if (typeof consultantData === 'string') {
      // Check cache first
      if (consultantCache[consultantData]) {
        return consultantCache[consultantData];
      }
      
      try {
        // Try to get full consultant data
        const allUsersResult = await ApiService.getAllUsers();
        if (allUsersResult.success && Array.isArray(allUsersResult.data)) {
          const consultant = allUsersResult.data.find(u => u._id === consultantData);
          if (consultant?.fullName) {
            const name = consultant.fullName;
            setConsultantCache(prev => ({ ...prev, [consultantData]: name }));
            return name;
          }
        }
      } catch (error) {
        console.log('[CONSULTANT_NAME] Error fetching full data:', error);
      }
      
      return `Consultant ${consultantData.slice(-6)}`;
    }

    // If consultant is an object
    if (typeof consultantData === 'object') {
      const consultantId = consultantData._id;
      
      // Check if we already have the full name in cache
      if (consultantId && consultantCache[consultantId]) {
        return consultantCache[consultantId];
      }

      // Try direct fields first
      if (consultantData.fullName) {
        const name = consultantData.fullName;
        if (consultantId) {
          setConsultantCache(prev => ({ ...prev, [consultantId]: name }));
        }
        return name;
      }
      
      if (consultantData.name) {
        const name = consultantData.name;
        if (consultantId) {
          setConsultantCache(prev => ({ ...prev, [consultantId]: name }));
        }
        return name;
      }

      // Try to fetch full data if we only have partial data
      if (consultantId) {
        try {
          const allUsersResult = await ApiService.getAllUsers();
          if (allUsersResult.success && Array.isArray(allUsersResult.data)) {
            const fullConsultant = allUsersResult.data.find(u => u._id === consultantId);
            if (fullConsultant?.fullName) {
              const name = fullConsultant.fullName;
              setConsultantCache(prev => ({ ...prev, [consultantId]: name }));
              return name;
            }
          }
        } catch (error) {
          console.log('[CONSULTANT_NAME] Error fetching consultant details:', error);
        }
      }

      // Fallback to email-based name extraction
      if (consultantData.email) {
        const emailPart = consultantData.email.split('@')[0];
        // Remove numbers and special characters, then format
        let nameFromEmail = emailPart.replace(/[0-9]/g, '').replace(/[^a-zA-Z]/g, ' ').trim();
        
        if (nameFromEmail) {
          // Capitalize each word
          nameFromEmail = nameFromEmail.split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          if (consultantId) {
            setConsultantCache(prev => ({ ...prev, [consultantId]: nameFromEmail }));
          }
          return nameFromEmail;
        }
      }

      // Final fallback
      return consultantId ? `Consultant ${consultantId.slice(-6)}` : 'Unknown Consultant';
    }

    return 'Unknown Consultant';
  }, [consultantCache]);

  // Fetch sessions I booked (user bookings)
  const fetchBookings = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('[MY_SESSIONS] Fetching sessions I booked');
      
      // Always get user bookings for this section (sessions I booked)
      const result = await ApiService.getUserBookings();
      
      if (result.success) {
        const bookingsData = Array.isArray(result.data) ? result.data : [];
        
        // Pre-cache consultant names to avoid repeated API calls
        const consultantIds = [...new Set(bookingsData.map(b => 
          typeof b.consultant === 'object' ? b.consultant._id : b.consultant
        ).filter(Boolean))];
        
        if (consultantIds.length > 0) {
          try {
            const allUsersResult = await ApiService.getAllUsers();
            if (allUsersResult.success && Array.isArray(allUsersResult.data)) {
              const consultantData = {};
              allUsersResult.data.forEach(user => {
                if (consultantIds.includes(user._id) && user.fullName) {
                  consultantData[user._id] = user.fullName;
                }
              });
              setConsultantCache(prev => ({ ...prev, ...consultantData }));
            }
          } catch (error) {
            console.log('[MY_SESSIONS] Error pre-caching consultant data:', error);
          }
        }
        
        setBookings(bookingsData);
        console.log('[MY_SESSIONS] Sessions loaded:', bookingsData.length);
      } else {
        if (result.needsLogin && onAuthError) {
          onAuthError(result);
          return;
        }
        console.error('[MY_SESSIONS] Failed to fetch bookings:', result.error);
        setBookings([]);
      }
    } catch (error) {
      console.error('[MY_SESSIONS] Error:', error);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onAuthError]);

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

  const getFilteredBookings = useCallback(() => {
    if (activeTab === 'all') return bookings;
    return bookings.filter(booking => {
      switch (activeTab) {
        case 'upcoming':
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

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: '#FF9500', bg: '#FFF4E6', icon: 'time-outline' },
      scheduled: { color: '#34C759', bg: '#E8F7ED', icon: 'calendar-check-outline' },
      'in-progress': { color: '#007AFF', bg: '#E6F3FF', icon: 'play-circle-outline' },
      completed: { color: '#8E44AD', bg: '#F3E8FF', icon: 'checkmark-circle-outline' },
      cancelled: { color: '#FF3B30', bg: '#FFE8E6', icon: 'close-circle-outline' },
      missed: { color: '#8E8E93', bg: '#F2F2F7', icon: 'alert-circle-outline' }
    };
    return configs[status] || { color: '#8E8E93', bg: '#F2F2F7', icon: 'help-circle-outline' };
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      dayName: date.toLocaleDateString('en-GB', { weekday: 'short' })
    };
  };

  const getTabCount = (tab) => {
    switch (tab) {
      case 'all':
        return bookings.length;
      case 'upcoming':
        return bookings.filter(b => ['scheduled', 'pending'].includes(b.status)).length;
      case 'completed':
        return bookings.filter(b => b.status === 'completed').length;
      case 'cancelled':
        return bookings.filter(b => ['cancelled', 'missed'].includes(b.status)).length;
      default:
        return 0;
    }
  };

  const handleJoinMeeting = useCallback(async (booking) => {
    if (booking.meetingLink) {
      try {
        const supported = await Linking.canOpenURL(booking.meetingLink);
        if (supported) {
          await Linking.openURL(booking.meetingLink);
        } else {
          Alert.alert('Error', 'Cannot open meeting link');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open meeting link');
      }
    } else {
      Alert.alert('Meeting Link', 'Meeting link will be available 10 minutes before the session.');
    }
  }, []);

  const handleReschedule = useCallback((booking) => {
    Alert.alert(
      'Reschedule Session',
      'Would you like to reschedule this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reschedule', 
          onPress: () => {
            // Navigate to reschedule screen
            console.log('Reschedule booking:', booking._id);
          }
        }
      ]
    );
  }, []);

  const handleCancelSession = useCallback((booking) => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            // Implement cancel functionality
            console.log('Cancel booking:', booking._id);
          }
        }
      ]
    );
  }, []);

  const SessionCard = ({ booking }) => {
    const [consultantName, setConsultantName] = useState('Loading...');
    const { date, time, dayName } = formatDateTime(booking.bookingDateTime);
    const statusConfig = getStatusConfig(booking.status);
    
    // Load consultant name
    useEffect(() => {
      const loadConsultantName = async () => {
        const name = await getConsultantName(booking.consultant);
        setConsultantName(name);
      };
      loadConsultantName();
    }, [booking.consultant, getConsultantName]);
    
    const isUpcoming = ['scheduled', 'pending'].includes(booking.status);
    const canJoin = booking.status === 'scheduled';

    return (
      <View style={styles.sessionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.consultantInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {consultantName && consultantName !== 'Loading...' ? consultantName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.consultantDetails}>
              <Text style={styles.consultantName}>
                {consultantName}
              </Text>
              <Text style={styles.sessionType}>Online Consultation</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#007AFF" />
              <Text style={styles.detailText}>{dayName}, {date}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color="#007AFF" />
              <Text style={styles.detailText}>{time}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="hourglass-outline" size={16} color="#007AFF" />
              <Text style={styles.detailText}>{booking.duration} min</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="card-outline" size={16} color="#007AFF" />
              <Text style={styles.detailText}>ID: {booking._id.slice(-6)}</Text>
            </View>
          </View>
        </View>

        {booking.consultationDetail && (
          <View style={styles.consultationNote}>
            <Ionicons name="document-text-outline" size={14} color="#8E8E93" />
            <Text style={styles.noteText} numberOfLines={2}>
              {booking.consultationDetail}
            </Text>
          </View>
        )}

        {isUpcoming && (
          <View style={styles.actionButtons}>
            {canJoin && (
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={() => handleJoinMeeting(booking)}
              >
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.joinButtonText}>Join Session</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.secondaryActions}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => handleReschedule(booking)}
              >
                <Ionicons name="calendar-outline" size={14} color="#007AFF" />
                <Text style={styles.secondaryButtonText}>Reschedule</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryButton, styles.cancelButton]}
                onPress={() => handleCancelSession(booking)}
              >
                <Ionicons name="close-outline" size={14} color="#FF3B30" />
                <Text style={[styles.secondaryButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {booking.status === 'completed' && (
          <TouchableOpacity style={styles.reviewButton}>
            <Ionicons name="star-outline" size={16} color="#FF9500" />
            <Text style={styles.reviewButtonText}>Rate & Review</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const tabs = [
    { key: 'all', label: 'All', icon: 'list-outline' },
    { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your sessions...</Text>
      </View>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Sessions</Text>
        <Text style={styles.subtitle}>Consultations you have booked</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons 
                  name={tab.icon} 
                  size={16} 
                  color={isActive ? '#007AFF' : '#8E8E93'} 
                />
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sessions List */}
      <ScrollView 
        style={styles.sessionsList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons 
                name={activeTab === 'all' ? 'calendar-outline' : tabs.find(t => t.key === activeTab)?.icon} 
                size={48} 
                color="#C7C7CC" 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'all' ? 'No Sessions Found' : `No ${activeTab} Sessions`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all' 
                ? 'Book your first consultation to get started'
                : `You don't have any ${activeTab} sessions`}
            </Text>
            {activeTab === 'all' && (
              <TouchableOpacity style={styles.bookNowButton}>
                <Text style={styles.bookNowText}>Book Consultation</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <SessionCard key={booking._id} booking={booking} />
          ))
        )}
      </ScrollView>

      {/* Bottom Stats */}
      {bookings.length > 0 && (
        <View style={styles.bottomStats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getTabCount('all')}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getTabCount('completed')}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getTabCount('upcoming')}</Text>
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
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tabContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#007AFF',
  },
  tabBadge: {
    marginLeft: 8,
    backgroundColor: '#C7C7CC',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: '#007AFF',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  activeTabBadgeText: {
    color: '#fff',
  },
  sessionsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  consultantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  consultantDetails: {
    flex: 1,
  },
  consultantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  sessionType: {
    fontSize: 13,
    color: '#8E8E93',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  sessionDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
    fontWeight: '500',
  },
  consultationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 13,
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  actionButtons: {
    gap: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 12,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  cancelButton: {
    backgroundColor: '#FFE8E6',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 6,
  },
  cancelButtonText: {
    color: '#FF3B30',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4E6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  bookNowButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default MySessionsSection;