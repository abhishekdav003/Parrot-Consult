// src/components/Dashboard/DashboardSection.jsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const StatCard = React.memo(({ icon, title, value, color, subtitle }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={24} color="#fff" />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && (
        <Text style={styles.statSubtitle}>{subtitle}</Text>
      )}
    </View>
  </View>
));

const UpcomingSessionCard = React.memo(({ session }) => {
  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#FF6B6B';
      default: return '#666';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return 'Invalid Time';
    }
  };

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle}>
          {session.consultant?.name || 'Consultant Session'}
        </Text>
        <Text style={styles.sessionTime}>
          {formatDate(session.datetime)} at {formatTime(session.datetime)}
        </Text>
        <Text style={[styles.sessionStatus, { color: getSessionStatusColor(session.status) }]}>
          Status: {session.status?.charAt(0).toUpperCase() + session.status?.slice(1)}
        </Text>
      </View>
      <TouchableOpacity style={styles.sessionAction}>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );
});

const DashboardSection = ({ user, dashboardData, onRefresh, loading }) => {
  const [refreshing, setRefreshing] = useState(false);

  console.log('[DASHBOARD_SECTION] Rendering with data:', dashboardData);

  // Memoize refresh handler
  const handleRefresh = useCallback(async () => {
    console.log('[DASHBOARD_SECTION] Refresh triggered');
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Memoize formatted date
  const formattedDate = useMemo(() => {
    const now = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return now.toLocaleDateString('en-US', options);
  }, []);

  // Memoize stats data
  const statsData = useMemo(() => [
    {
      icon: "person",
      title: "Profile",
      value: `${dashboardData?.profileCompletion || 0}%`,
      color: "#FF6B35",
      subtitle: "Completion"
    },
    {
      icon: "calendar",
      title: "Scheduled",
      value: dashboardData?.scheduledSessions || 0,
      color: "#4CAF50",
      subtitle: "Sessions"
    },
    {
      icon: "layers",
      title: "Total",
      value: dashboardData?.totalSessions || 0,
      color: "#2196F3",
      subtitle: "Sessions"
    },
    {
      icon: "checkmark-circle",
      title: "Completed",
      value: dashboardData?.completedSessions || 0,
      color: "#9C27B0",
      subtitle: "Sessions"
    }
  ], [dashboardData]);

  // Memoize status items
  const statusItems = useMemo(() => [
    {
      icon: user?.aadharVerified ? "checkmark-circle" : "alert-circle",
      color: user?.aadharVerified ? "#4CAF50" : "#FFA726",
      text: `KYC ${user?.aadharVerified ? 'Verified' : 'Pending'}`
    },
    {
      icon: user?.videoFreeTrial ? "close-circle" : "gift",
      color: user?.videoFreeTrial ? "#FF6B6B" : "#4CAF50",
      text: `Video Trial ${user?.videoFreeTrial ? 'Used' : 'Available'}`
    },
    {
      icon: user?.chatFreeTrial ? "close-circle" : "gift",
      color: user?.chatFreeTrial ? "#FF6B6B" : "#4CAF50",
      text: `Chat Trial ${user?.chatFreeTrial ? 'Used' : 'Available'}`
    }
  ], [user?.aadharVerified, user?.videoFreeTrial, user?.chatFreeTrial]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing || loading} 
          onRefresh={handleRefresh} 
          colors={['#4CAF50']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Welcome back, {user?.fullName || 'User'}!
        </Text>
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {statsData.map((stat, index) => (
          <StatCard
            key={index}
            icon={stat.icon}
            title={stat.title}
            value={stat.value}
            color={stat.color}
            subtitle={stat.subtitle}
          />
        ))}
      </View>

      {/* Profile Completion Alert */}
      {dashboardData?.profileCompletion < 100 && (
        <View style={styles.alertSection}>
          <View style={styles.alertCard}>
            <Ionicons name="information-circle" size={24} color="#FF6B35" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Complete Your Profile</Text>
              <Text style={styles.alertText}>
                Your profile is {dashboardData.profileCompletion}% complete. 
                Add more information to improve your experience.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Upcoming Sessions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {dashboardData?.upcomingBookings?.length > 0 ? (
          dashboardData.upcomingBookings.map((session, index) => (
            <UpcomingSessionCard key={session._id || index} session={session} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No upcoming sessions</Text>
            <Text style={styles.emptyStateSubtext}>
              Book a session to get started
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="search" size={24} color="#4CAF50" />
            <Text style={styles.quickActionText}>Find Consultant</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="calendar" size={24} color="#2196F3" />
            <Text style={styles.quickActionText}>Book Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="person-add" size={24} color="#FF6B35" />
            <Text style={styles.quickActionText}>Become Consultant</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="help-circle" size={24} color="#9C27B0" />
            <Text style={styles.quickActionText}>Help & Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Status</Text>
        
        <View style={styles.statusGrid}>
          {statusItems.map((item, index) => (
            <View key={index} style={styles.statusItem}>
              <Ionicons 
                name={item.icon} 
                size={20} 
                color={item.color} 
              />
              <Text style={styles.statusText}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      {dashboardData?.totalSessions > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>
              You have completed {dashboardData.completedSessions} out of {dashboardData.totalSessions} sessions
            </Text>
            <Text style={styles.activitySubtext}>
              {dashboardData.completedSessions > 0 ? 'Keep up the great work!' : 'Start your first session today!'}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  welcomeSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    width: '48%',
    minHeight: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#888',
  },
  alertSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    color: '#BF360C',
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  sessionStatus: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  sessionAction: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  quickAction: {
    alignItems: 'center',
    width: '22%',
    paddingVertical: 15,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
  },
  statusText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 8,
  },
  activityCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activitySubtext: {
    fontSize: 12,
    color: '#666',
  },
});

export default React.memo(DashboardSection);