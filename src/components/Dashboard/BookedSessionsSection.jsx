// src/components/Dashboard/BookedSessionsSection.jsx - PRODUCTION READY
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ApiService from '../../services/ApiService';
import EnhancedSessionCard from './EnhancedSessionCard';

const BookedSessionsSection = ({ user, onRefresh, onAuthError }) => {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Fetch consultant bookings (sessions where people booked me) with sorting
  const fetchBookings = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('[BOOKED_SESSIONS] Fetching consultant bookings');
      
      const result = await ApiService.getConsultantBookings();
      
      if (result.success) {
        const bookingsData = Array.isArray(result.data) ? result.data : [];
        
        // CRITICAL FIX: Ensure each booking has proper structure
        const processedBookings = bookingsData.map(booking => ({
          ...booking,
          _id: booking._id || booking.id,
          meetingLink: booking.meetingLink || booking._id,
          duration: booking.duration || 30,
          status: booking.status || 'scheduled',
          user: booking.user || { 
            _id: booking.userId, 
            fullName: 'Client',
            name: 'Client'
          },
          consultant: booking.consultant || {
            _id: user?._id,
            fullName: user?.fullName,
            name: user?.fullName
          }
        }));

        // âœ… Sort bookings by date/time (upcoming first, then by closest time)
        const sortedBookings = processedBookings.sort((a, b) => {
          const dateA = new Date(a.bookingDateTime);
          const dateB = new Date(b.bookingDateTime);
          const now = new Date();
          
          // Separate upcoming and past bookings
          const isAUpcoming = dateA >= now;
          const isBUpcoming = dateB >= now;
          
          // Upcoming bookings come first
          if (isAUpcoming && !isBUpcoming) return -1;
          if (!isAUpcoming && isBUpcoming) return 1;
          
          // Within upcoming: earliest first
          if (isAUpcoming && isBUpcoming) {
            return dateA - dateB;
          }
          
          // Within past: most recent first
          return dateB - dateA;
        });
        
        setBookings(sortedBookings);
        console.log('[BOOKED_SESSIONS] Loaded', sortedBookings.length, 'bookings');
      } else {
        if (result.needsLogin && onAuthError) {
          onAuthError(result);
          return;
        }
        console.error('[BOOKED_SESSIONS] Fetch failed:', result.error);
        Alert.alert('Error', 'Failed to load bookings. Please try again.');
        setBookings([]);
      }
    } catch (error) {
      console.error('[BOOKED_SESSIONS] Error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onAuthError, user]);

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

  // âœ… Memoized filtered bookings with smart filtering
  const filteredBookings = useMemo(() => {
    if (activeFilter === 'all') return bookings;
    
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDateTime);
      const now = new Date();
      const timeDiff = bookingDate - now;
      const minutesDiff = Math.floor(timeDiff / 60000);
      const sessionDuration = booking.duration || 30;
      
      switch (activeFilter) {
        case 'upcoming':
          // Show scheduled/pending sessions that haven't ended yet
          if (['pending', 'scheduled'].includes(booking.status)) {
            // Check if session hasn't ended
            if (minutesDiff < 0) {
              const minutesAfterStart = Math.abs(minutesDiff);
              return minutesAfterStart < sessionDuration; // Still in progress
            }
            return true; // Future session
          }
          return false;
          
        case 'completed':
          return booking.status === 'completed';
          
        case 'cancelled':
          return ['cancelled', 'missed'].includes(booking.status);
          
        default:
          return true;
      }
    });
  }, [bookings, activeFilter]);

  // âœ… Memoized filter counts with smart counting
  const filterCounts = useMemo(() => {
    const now = new Date();
    
    const upcoming = bookings.filter(b => {
      if (!['scheduled', 'pending'].includes(b.status)) return false;
      
      const bookingDate = new Date(b.bookingDateTime);
      const timeDiff = bookingDate - now;
      const minutesDiff = Math.floor(timeDiff / 60000);
      const sessionDuration = b.duration || 30;
      
      // Future session
      if (minutesDiff >= 0) return true;
      
      // In-progress session
      const minutesAfterStart = Math.abs(minutesDiff);
      return minutesAfterStart < sessionDuration;
    }).length;
    
    return {
      all: bookings.length,
      upcoming: upcoming,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => ['cancelled', 'missed'].includes(b.status)).length,
    };
  }, [bookings]);

  const filters = useMemo(() => [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' }
  ], []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sessions Booked With You</Text>
          <Text style={styles.subtitle}>Clients who have booked your consultation</Text>
        </View>
        
      </View>

      {/* Enhanced Filter Section */}
      <View style={styles.filtersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => {
            const count = filterCounts[filter.key];
            const isActive = activeFilter === filter.key;
            
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip, 
                  isActive && styles.activeFilterChip,
                ]}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.7}
              >
                <View style={styles.chipContent}>
                  <View style={[styles.chipIcon, isActive && styles.activeChipIcon]}>
                    <Ionicons 
                      name={filter.icon} 
                      size={16} 
                      color={isActive ? '#fff' : '#8E8E93'} 
                    />
                  </View>
                  
                  <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                    {filter.label}
                  </Text>
                  
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

      {/* Bookings List */}
      <ScrollView
        style={styles.bookingsList}
        contentContainerStyle={styles.bookingsListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#059669']}
            tintColor="#059669"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons 
                name={filters.find(f => f.key === activeFilter)?.icon || 'calendar-outline'} 
                size={56} 
                color="#C7C7CC" 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'all' ? 'No Bookings Yet' : `No ${filters.find(f => f.key === activeFilter)?.label} Bookings`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'all' 
                ? 'No clients have booked consultations with you yet. Share your profile to get started!'
                : `You don't have any ${activeFilter} sessions at the moment`}
            </Text>
          </View>
        ) : (
          <>
            {filteredBookings.map((booking) => (
              <EnhancedSessionCard 
                key={booking._id} 
                booking={booking}
                isConsultantView={true}
              />
            ))}
          </>
        )}
      </ScrollView>

      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  headerBadge: {
    backgroundColor: '#059669',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  filtersWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterChip: {
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  activeFilterChip: {
    backgroundColor: '#059669',
    borderColor: '#059669',
    ...Platform.select({
      ios: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeChipIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
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
    color: '#059669',
  },
  bookingsList: {
    flex: 1,
  },
  bookingsListContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  bottomStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E5EA',
  },
});

export default BookedSessionsSection;