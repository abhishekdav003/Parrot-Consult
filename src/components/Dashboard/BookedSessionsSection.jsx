// src/components/Dashboard/BookedSessionsSection.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';

const { width: screenWidth } = Dimensions.get('window');

const BookedSessionsSection = ({ user, onRefresh, onAuthError }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Fetch sessions where people booked me (consultant bookings)
  const fetchBookings = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('[BOOKED_SESSIONS] Fetching bookings where people booked me');
      
      // Always get consultant bookings for this section (people who booked me)
      const result = await ApiService.getConsultantBookings();
      
      if (result.success) {
        const bookingsData = Array.isArray(result.data) ? result.data : [];
        setBookings(bookingsData);
        console.log('[BOOKED_SESSIONS] Sessions loaded:', bookingsData.length);
      } else {
        if (result.needsLogin && onAuthError) {
          onAuthError(result);
          return;
        }
        console.error('[BOOKED_SESSIONS] Failed to fetch bookings:', result.error);
        setBookings([]);
      }
    } catch (error) {
      console.error('[BOOKED_SESSIONS] Error:', error);
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
  }, [user, fetchBookings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings(false);
    if (onRefresh) onRefresh();
  }, [fetchBookings, onRefresh]);

  const getFilteredBookings = useCallback(() => {
    if (activeFilter === 'all') return bookings;
    return bookings.filter(booking => {
      if (activeFilter === 'upcoming') {
        return ['pending', 'scheduled'].includes(booking.status);
      }
      return booking.status === activeFilter;
    });
  }, [bookings, activeFilter]);

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: '#FF9500', bg: '#FFF4E6', icon: 'time-outline' },
      scheduled: { color: '#34C759', bg: '#E8F7ED', icon: 'calendar-outline' },
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
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const filters = [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' }
  ];

  const getFilterCount = (filterKey) => {
    if (filterKey === 'all') return bookings.length;
    if (filterKey === 'upcoming') return bookings.filter(b => ['pending', 'scheduled'].includes(b.status)).length;
    return bookings.filter(b => b.status === filterKey).length;
  };

  const BookingCard = ({ booking }) => {
    const { date, time } = formatDateTime(booking.bookingDateTime);
    const statusConfig = getStatusConfig(booking.status);
    const clientName = booking.user?.fullName || 'Unknown Client';

    return (
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <View style={styles.clientInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{clientName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.clientDetails}>
              <Text style={styles.clientName}>{clientName}</Text>
              <Text style={styles.bookingId}>ID: #{booking._id.slice(-6)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.sessionInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{time}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="hourglass-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{booking.duration} minutes</Text>
          </View>
        </View>

        {booking.consultationDetail && (
          <View style={styles.consultationDetail}>
            <Text style={styles.detailLabel}>Consultation Detail:</Text>
            <Text style={styles.detailText} numberOfLines={2}>
              {booking.consultationDetail}
            </Text>
          </View>
        )}

        {booking.status === 'scheduled' && booking.meetingLink && (
          <TouchableOpacity style={styles.joinButton}>
            <Ionicons name="videocam" size={16} color="#fff" />
            <Text style={styles.joinButtonText}>Start Session</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34C759" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sessions Booked With You</Text>
        <Text style={styles.subtitle}>Clients who have booked your consultation</Text>
      </View>

      {/* Enhanced Filter Section */}
      <View style={styles.filtersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => {
            const count = getFilterCount(filter.key);
            const isActive = activeFilter === filter.key;
            
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip, 
                  isActive && styles.activeFilterChip,
                  // Add shadow only for active chip
                  isActive && styles.chipShadow
                ]}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.8}
              >
                <View style={styles.chipContent}>
                  {/* Icon */}
                  <View style={[styles.chipIcon, isActive && styles.activeChipIcon]}>
                    <Ionicons 
                      name={filter.icon} 
                      size={16} 
                      color={isActive ? '#fff' : '#8E8E93'} 
                    />
                  </View>
                  
                  {/* Label */}
                  <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                    {filter.label}
                  </Text>
                  
                  {/* Count Badge */}
                  {count > 0 && (
                    <View style={[
                      styles.filterBadge, 
                      isActive && styles.activeFilterBadge
                    ]}>
                      <Text style={[
                        styles.badgeText, 
                        isActive && styles.activeBadgeText
                      ]}>
                        {count > 99 ? '99+' : count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.bookingsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#34C759']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'all' 
                ? 'No clients have booked you yet'
                : `No ${activeFilter} sessions found`}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
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
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  
  // Enhanced Filter Styles
  filtersWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingBottom: 16,
  },
  filtersContainer: {
    paddingTop: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingRight: 40, // Extra padding for last item
  },
  filterChip: {
    marginRight: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  activeFilterChip: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
    transform: [{ scale: 1.02 }],
  },
  chipShadow: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44, // Minimum touch target
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeChipIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
    marginRight: 8,
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  activeBadgeText: {
    color: '#34C759',
  },

  bookingsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  consultationDetail: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 20,
    fontWeight: '400',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default BookedSessionsSection;