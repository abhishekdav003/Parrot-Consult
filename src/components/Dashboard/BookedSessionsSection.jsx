// src/components/Dashboard/BookedSessionsSection.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';

const BookedSessionsSection = ({ user, onRefresh, onAuthError }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchBookings = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      let result;
      if (user?.role === 'consultant') {
        result = await ApiService.getConsultantBookings();
      } else {
        result = await ApiService.getUserBookings();
      }

      if (result.success) {
        setBookings(Array.isArray(result.data) ? result.data : []);
      } else {
        if (result.needsLogin && onAuthError) {
          onAuthError(result);
          return;
        }
        console.error('Failed to fetch bookings:', result.error);
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role, onAuthError]);

  useEffect(() => {
    if (user) {
      fetchBookings(true);
    }
  }, [user, fetchBookings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings(false);
  }, [fetchBookings]);

  const getFilteredBookings = useCallback(() => {
    if (activeFilter === 'all') return bookings;
    return bookings.filter(booking => booking.status === activeFilter);
  }, [bookings, activeFilter]);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFA726',
      scheduled: '#4CAF50',
      'in-progress': '#2196F3',
      completed: '#9C27B0',
      cancelled: '#F44336',
      missed: '#FF5722',
      rescheduled: '#FF9800'
    };
    return colors[status] || '#666';
  };

  const getStatusBackground = (status) => {
    const backgrounds = {
      pending: 'rgba(255, 167, 38, 0.1)',
      scheduled: 'rgba(76, 175, 80, 0.1)',
      'in-progress': 'rgba(33, 150, 243, 0.1)',
      completed: 'rgba(156, 39, 176, 0.1)',
      cancelled: 'rgba(244, 67, 54, 0.1)',
      missed: 'rgba(255, 87, 34, 0.1)',
      rescheduled: 'rgba(255, 152, 0, 0.1)'
    };
    return backgrounds[status] || 'rgba(102, 102, 102, 0.1)';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: 'time-outline',
      scheduled: 'calendar-outline',
      'in-progress': 'play-circle-outline',
      completed: 'checkmark-circle-outline',
      cancelled: 'close-circle-outline',
      missed: 'alert-circle-outline',
      rescheduled: 'refresh-outline'
    };
    return icons[status] || 'help-circle-outline';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB'),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      })
    };
  };

  const filters = [
    { key: 'all', label: 'All', count: bookings.length },
    { key: 'scheduled', label: 'Scheduled', count: bookings.filter(b => b.status === 'scheduled').length },
    { key: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length },
    { key: 'pending', label: 'Pending', count: bookings.filter(b => b.status === 'pending').length },
    { key: 'cancelled', label: 'Cancelled', count: bookings.filter(b => b.status === 'cancelled').length }
  ];

  const BookingCard = ({ booking }) => {
    const { date, time } = formatDateTime(booking.bookingDateTime);
    const otherUser = user?.role === 'consultant' ? booking.user : booking.consultant;

    return (
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusContainer, { backgroundColor: getStatusBackground(booking.status) }]}>
            <Ionicons 
              name={getStatusIcon(booking.status)} 
              size={16} 
              color={getStatusColor(booking.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.durationText}>{booking.duration} min</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.userInfo}>
            <Ionicons name="person-outline" size={18} color="#666" />
            <Text style={styles.userName}>
              {user?.role === 'consultant' ? 'Client: ' : 'Consultant: '}
              {otherUser?.fullName || 'Unknown'}
            </Text>
          </View>

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.dateTimeText}>{date}</Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.dateTimeText}>{time}</Text>
            </View>
          </View>

          {booking.consultationDetail && (
            <View style={styles.detailContainer}>
              <Ionicons name="document-text-outline" size={16} color="#666" />
              <Text style={styles.detailText} numberOfLines={2}>
                {booking.consultationDetail}
              </Text>
            </View>
          )}

          {booking.meetingLink && booking.status === 'scheduled' && (
            <TouchableOpacity style={styles.joinButton}>
              <Ionicons name="videocam-outline" size={16} color="#4CAF50" />
              <Text style={styles.joinButtonText}>Join Meeting</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.bookingId}>ID: {booking._id.slice(-8)}</Text>
          {booking.razorpay_order_id && (
            <Text style={styles.orderId}>Order: {booking.razorpay_order_id.slice(-8)}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.sectionTitle}>
          {user?.role === 'consultant' ? 'My Booked Sessions' : 'Your Bookings'}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {user?.role === 'consultant' 
            ? 'Sessions where clients have booked you' 
            : 'Your consultation bookings'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                activeFilter === filter.key && styles.activeFilterTab
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === filter.key && styles.activeFilterText
              ]}>
                {filter.label}
              </Text>
              {filter.count > 0 && (
                <View style={[
                  styles.filterBadge,
                  activeFilter === filter.key && styles.activeFilterBadge
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    activeFilter === filter.key && styles.activeFilterBadgeText
                  ]}>
                    {filter.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <ScrollView
        style={styles.bookingsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {getFilteredBookings().length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={64} color="#e0e0e0" />
            </View>
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'all' 
                ? user?.role === 'consultant'
                  ? 'No clients have booked you yet'
                  : 'You haven\'t made any bookings yet'
                : `No ${activeFilter} bookings found`}
            </Text>
          </View>
        ) : (
          getFilteredBookings().map((booking) => (
            <BookingCard key={booking._id} booking={booking} />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  headerSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '400',
  },
  filtersWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 4,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    minHeight: 44,
  },
  activeFilterTab: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  filterText: {
    fontSize: 15,
    color: '#495057',
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#fff',
  },
  filterBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#dee2e6',
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBadgeText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '700',
  },
  activeFilterBadgeText: {
    color: '#fff',
  },
  bookingsList: {
    flex: 1,
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f3f4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationText: {
    fontSize: 13,
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 10,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
    fontWeight: '500',
  },
  detailContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  joinButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  bookingId: {
    fontSize: 12,
    color: '#adb5bd',
    fontWeight: '500',
  },
  orderId: {
    fontSize: 12,
    color: '#adb5bd',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
});

export default BookedSessionsSection;