// src/components/Dashboard/MySessionsSection.jsx - PRODUCTION READY
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

const MySessionsSection = ({ user, onRefresh, onAuthError }) => {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch sessions with sorting
  const fetchBookings = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('[MY_SESSIONS] Fetching user bookings');
      
      const result = await ApiService.getUserBookings();
      
      if (result.success) {
        const bookingsData = Array.isArray(result.data) ? result.data : [];
        
        // âœ… Sort bookings by date/time (upcoming first, then by closest time)
        const sortedBookings = bookingsData.sort((a, b) => {
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
        console.log('[MY_SESSIONS] Loaded', sortedBookings.length, 'sessions');
      } else {
        if (result.needsLogin && onAuthError) {
          onAuthError(result);
          return;
        }
        console.error('[MY_SESSIONS] Fetch failed:', result.error);
        setBookings([]);
      }
    } catch (error) {
      console.error('[MY_SESSIONS] Error:', error);
      Alert.alert('Error', 'Failed to load sessions. Please try again.');
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

  // âœ… Memoized filtered bookings with smart filtering
  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDateTime);
      const now = new Date();
      const timeDiff = bookingDate - now;
      const minutesDiff = Math.floor(timeDiff / 60000);
      const sessionDuration = booking.duration || 30;
      
      switch (activeTab) {
        case 'upcoming':
          // Show scheduled/pending sessions that haven't ended yet
          if (['scheduled', 'pending'].includes(booking.status)) {
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
  }, [bookings, activeTab]);

  // âœ… Memoized tab counts with smart counting
  const tabCounts = useMemo(() => {
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

  const tabs = useMemo(() => [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' }
  ], []);

  const handleBookConsultation = useCallback(() => {
    navigation.navigate('Categories');
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Sessions</Text>
          <Text style={styles.subtitle}>Consultations you have booked</Text>
        </View>
        {bookings.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{bookings.length}</Text>
          </View>
        )}
      </View>

      {/* Enhanced Tab Navigation */}
      <View style={styles.tabsWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => {
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;
            
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                  <Ionicons 
                    name={tab.icon} 
                    size={16} 
                    color={isActive ? '#fff' : '#8E8E93'} 
                  />
                </View>
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                      {count > 99 ? '99+' : count}
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
        contentContainerStyle={styles.sessionsListContent}
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
                name={tabs.find(t => t.key === activeTab)?.icon || 'calendar-outline'} 
                size={56} 
                color="#C7C7CC" 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'all' ? 'No Sessions Yet' : `No ${tabs.find(t => t.key === activeTab)?.label} Sessions`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all' 
                ? 'Book your first consultation to get started with expert guidance'
                : `You don't have any ${activeTab} sessions at the moment`}
            </Text>
            {activeTab === 'all' && (
              <TouchableOpacity 
                style={styles.bookNowButton}
                onPress={handleBookConsultation}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.bookNowText}>Book Consultation</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {filteredBookings.map((booking) => (
              <EnhancedSessionCard 
                key={booking._id} 
                booking={booking}
                isConsultantView={false}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Stats */}
      {bookings.length > 0 && (
        <View style={styles.bottomStats}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E6F3FF' }]}>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.statNumber}>{tabCounts.all}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF4E6' }]}>
              <Ionicons name="time-outline" size={20} color="#FF9500" />
            </View>
            <Text style={styles.statNumber}>{tabCounts.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#059669" />
            </View>
            <Text style={styles.statNumber}>{tabCounts.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      )}
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
    backgroundColor: '#007AFF',
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
  tabsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 16,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 44,
  },
  activeTab: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeTabIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
    marginRight: 8,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  activeTabBadgeText: {
    color: '#007AFF',
  },
  sessionsList: {
    flex: 1,
  },
  sessionsListContent: {
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
    marginBottom: 32,
  },
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    gap: 8,
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
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

export default MySessionsSection;