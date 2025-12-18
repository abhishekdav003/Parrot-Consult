// src/components/Dashboard/DashboardSection.jsx
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Changed to MaterialIcons to match navbar
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

const StatCard = React.memo(({ icon, title, value, color, subtitle, onPress, isClickable }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!isClickable) return;
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress && onPress();
    });
  };

  const StatCardContent = (
    <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.statIconContainer}>
        <View style={[styles.statIcon, { backgroundColor: color }]}>
          <Icon name={icon} size={20} color="#ffffff" />
        </View>
        {isClickable && (
          <View style={styles.activeIndicatorDot} />
        )}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && (
          <Text style={styles.statSubtitle}>{subtitle}</Text>
        )}
      </View>
      {isClickable && (
        <View style={styles.statArrow}>
          <Icon name="chevron-right" size={16} color="#94A3B8" />
        </View>
      )}
    </Animated.View>
  );

  if (isClickable) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        {StatCardContent}
      </TouchableOpacity>
    );
  }

  return StatCardContent;
});

const UpcomingSessionCard = React.memo(({ session, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#059669';
      case 'completed': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      case 'ongoing': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getSessionStatusBg = (status) => {
    switch (status) {
      case 'scheduled': return '#D1FAE5';
      case 'completed': return '#DBEAFE';
      case 'cancelled': return '#FEE2E2';
      case 'ongoing': return '#FEF3C7';
      default: return '#F1F5F9';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
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

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress && onPress(session);
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View style={[styles.sessionCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle} numberOfLines={1}>
                {session.consultant?.fullName || session.consultant?.name || 'Consultant Session'}
              </Text>
              <Text style={styles.sessionCategory} numberOfLines={1}>
                {session.consultant?.consultantRequest?.consultantProfile?.category || 'Consultation'}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getSessionStatusBg(session.status) }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getSessionStatusColor(session.status) }
              ]}>
                {session.status?.charAt(0).toUpperCase() + session.status?.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.sessionDetails}>
            <View style={styles.sessionDetailItem}>
              <Icon name="event" size={14} color="#64748B" />
              <Text style={styles.sessionDetailText}>{formatDate(session.datetime)}</Text>
            </View>
            <View style={styles.sessionDetailItem}>
              <Icon name="access-time" size={14} color="#64748B" />
              <Text style={styles.sessionDetailText}>{formatTime(session.datetime)}</Text>
            </View>
            <View style={styles.sessionDetailItem}>
              <Icon 
                name={session.sessionType === 'video' ? 'videocam' : 'chat'} 
                size={14} 
                color="#64748B" 
              />
              <Text style={styles.sessionDetailText}>
                {session.sessionType?.charAt(0).toUpperCase() + session.sessionType?.slice(1) || 'Chat'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.sessionAction}>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const QuickActionButton = React.memo(({ icon, title, color, onPress, disabled }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled) return;
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress && onPress();
    });
  };

  return (
    <View style={styles.quickActionContainer}>
      <TouchableOpacity 
        onPress={handlePress} 
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Animated.View style={[
          styles.quickAction, 
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.quickActionDisabled
        ]}>
          <View style={styles.quickActionIconContainer}>
            <View style={[styles.quickActionIcon, { backgroundColor: disabled ? '#F3F4F6' : color }]}>
              <Icon 
                name={icon} 
                size={24} 
                color={disabled ? '#9CA3AF' : '#ffffff'} 
              />
            </View>
            {!disabled && (
              <View style={styles.quickActionIndicator} />
            )}
          </View>
          <Text style={[styles.quickActionText, disabled && styles.quickActionTextDisabled]}>
            {title}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

const DashboardSection = ({ user, dashboardData, onRefresh, loading, onSectionChange }) => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  console.log('[DASHBOARD_SECTION] Rendering with data:', dashboardData);

  // Check if user is consultant
  const isConsultant = useMemo(() => {
    return user?.role === 'consultant' || user?.consultantRequest?.status === 'approved';
  }, [user?.role, user?.consultantRequest?.status]);

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

  // Navigation handlers with proper section switching
  const handleProfileClick = useCallback(() => {
    console.log('[DASHBOARD_SECTION] Navigating to profile section');
    if (onSectionChange) {
      onSectionChange('profile');
    } else {
      navigation.navigate('Dashboard', { section: 'profile' });
    }
  }, [onSectionChange, navigation]);

  const handleScheduledSessionsClick = useCallback(() => {
    console.log('[DASHBOARD_SECTION] Navigating to sessions section');
    if (onSectionChange) {
      onSectionChange('mysessions');
    } else {
      navigation.navigate('Dashboard', { section: 'mysessions' });
    }
  }, [onSectionChange, navigation]);

  const handleSessionClick = useCallback((session) => {
    Alert.alert(
      'Session Details',
      `Session with ${session.consultant?.fullName || 'Consultant'}\n` +
      `Date: ${new Date(session.datetime).toLocaleDateString()}\n` +
      `Time: ${new Date(session.datetime).toLocaleTimeString()}\n` +
      `Status: ${session.status}\n` +
      `Type: ${session.sessionType || 'Chat'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Details', 
          onPress: () => {
            if (onSectionChange) {
              onSectionChange('mysessions');
            }
          }
        }
      ]
    );
  }, [onSectionChange]);

  const handleFindConsultant = useCallback(() => {
    console.log('[DASHBOARD_SECTION] Navigating to Categories');
    navigation.navigate('Categories');
  }, [navigation]);

  const handleBookSession = useCallback(() => {
    console.log('[DASHBOARD_SECTION] Navigating to Home for booking');
    navigation.navigate('Home');
  }, [navigation]);

  const handleUploadReel = useCallback(() => {
    Alert.alert(
      'Upload Reel', 
      'This feature will allow you to upload consultation reels.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Coming Soon', style: 'default' }
      ]
    );
  }, []);

  const handleBecomeConsultant = useCallback(() => {
  console.log('[DASHBOARD] Become Consultant clicked');
  const hasValidEmail = user?.email && user.email.trim().length > 0;
  
  if (!hasValidEmail) {
    Alert.alert(
      'Email Required',
      'An email address is required to become a consultant. Please update your profile with a valid email address first.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        { 
          text: 'Update Profile', 
          onPress: () => {
            console.log('[DASHBOARD] Redirecting to profile for email update');
            onSectionChange('profile');

          }
        }
      ]
    );
    return;
  }
  
  console.log('[DASHBOARD] Opening upgrade section');
  if (onSectionChange) {
    onSectionChange('upgrade');
  } else {
    setActiveSection('upgrade');
  }
}, [user?.email, onSectionChange]);

  const handleHelpSupport = useCallback(() => {
    console.log('[DASHBOARD_SECTION] Navigating to ChatBot');
    navigation.navigate('ChatBot', { query: 'I need help and support' });
  }, [navigation]);

  const handleWalletClick = useCallback(() => {
    console.log('[DASHBOARD_SECTION] Navigating to wallet section');
    if (onSectionChange) {
      onSectionChange('wallet');
    }
  }, [onSectionChange]);

  const handleBookedSessionsClick = useCallback(() => {
    console.log('[DASHBOARD_SECTION] Navigating to booked sessions');
    if (onSectionChange) {
      onSectionChange('booked');
    }
  }, [onSectionChange]);

  // Memoize stats data with click handlers (2 columns layout)
  const statsData = useMemo(() => [
    {
      icon: "person",
      title: "Profile",
      value: `${dashboardData?.profileCompletion || 0}%`,
      color: "#F59E0B",
      subtitle: "Completion",
      onPress: handleProfileClick,
      isClickable: true,
    },
    {
      icon: "event",
      title: "Scheduled",
      value: dashboardData?.scheduledSessions || 0,
      color: "#059669",
      subtitle: "Sessions",
      onPress: handleScheduledSessionsClick,
      isClickable: dashboardData?.scheduledSessions > 0,
    },
    {
      icon: "layers",
      title: "Total",
      value: dashboardData?.totalSessions || 0,
      color: "#3B82F6",
      subtitle: "Sessions",
      isClickable: false,
    },
    {
      icon: "check-circle",
      title: "Completed",
      value: dashboardData?.completedSessions || 0,
      color: "#8B5CF6",
      subtitle: "Sessions",
      isClickable: false,
    }
  ], [dashboardData, handleProfileClick, handleScheduledSessionsClick]);

  // Memoize status items
  const statusItems = useMemo(() => [
    {
      icon: user?.aadharVerified ? "check-circle" : "warning",
      color: user?.aadharVerified ? "#059669" : "#F59E0B",
      text: `KYC ${user?.aadharVerified ? 'Verified' : 'Pending'}`,
      bgColor: user?.aadharVerified ? "#D1FAE5" : "#FEF3C7",
    },
    {
      icon: user?.videoFreeTrial ? "cancel" : "card-giftcard",
      color: user?.videoFreeTrial ? "#EF4444" : "#059669",
      text: `Video Trial ${user?.videoFreeTrial ? 'Used' : 'Available'}`,
      bgColor: user?.videoFreeTrial ? "#FEE2E2" : "#D1FAE5",
    },
    {
      icon: user?.chatFreeTrial ? "cancel" : "card-giftcard",
      color: user?.chatFreeTrial ? "#EF4444" : "#059669",
      text: `Chat Trial ${user?.chatFreeTrial ? 'Used' : 'Available'}`,
      bgColor: user?.chatFreeTrial ? "#FEE2E2" : "#D1FAE5",
    }
  ], [user?.aadharVerified, user?.videoFreeTrial, user?.chatFreeTrial]);

  // Memoize quick actions based on user role (2 columns layout)
  const quickActions = useMemo(() => {
    const baseActions = [
      {
        icon: "search",
        title: "Find Consultant",
        color: "#059669",
        onPress: handleFindConsultant,
      },
      {
        icon: "event",
        title: "Book Session", 
        color: "#3B82F6",
        onPress: handleBookSession,
      },
      {
        icon: "help",
        title: "Help & Support",
        color: "#EF4444", 
        onPress: handleHelpSupport,
      },
    ];

    if (isConsultant) {
      baseActions.push(
        {
          icon: "videocam",
          title: "Upload Reel",
          color: "#8B5CF6",
          onPress: handleUploadReel,
        },
        {
          icon: "account-balance-wallet",
          title: "Wallet",
          color: "#F59E0B",
          onPress: handleWalletClick,
        },
        {
          icon: "bookmark",
          title: "Client Sessions", 
          color: "#6366F1",
          onPress: handleBookedSessionsClick,
        }
      );
    } else {
      baseActions.push({
        icon: "person-add",
        title: "Become Consultant",
        color: "#F59E0B",
        onPress: handleBecomeConsultant,
      });
    }

    return baseActions;
  }, [isConsultant, handleFindConsultant, handleBookSession, handleUploadReel, handleHelpSupport, handleWalletClick, handleBookedSessionsClick, handleBecomeConsultant]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing || loading} 
          onRefresh={handleRefresh} 
          colors={['#059669']}
          tintColor="#059669"
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 100, // Add extra padding to prevent navbar overlap
      }}
    >
      {/* Welcome Section with Profile Photo */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeText}>
                Welcome back, {user?.fullName || 'User'}!
              </Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <TouchableOpacity onPress={handleProfileClick} activeOpacity={0.8}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={{
                    uri: user?.profileImage || 'https://via.placeholder.com/60x60/059669/ffffff?text=U',
                  }}
                  style={styles.profileImage}
                />
                <View style={styles.profileImageBorder} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.welcomeAccent} />
      </View>

      {/* Stats Grid - 2 columns */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Quick Overview</Text>
        <View style={styles.statsGrid}>
          {statsData.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              title={stat.title}
              value={stat.value}
              color={stat.color}
              subtitle={stat.subtitle}
              onPress={stat.onPress}
              isClickable={stat.isClickable}
            />
          ))}
        </View>
      </View>

      {/* Profile Completion Alert */}
      {dashboardData?.profileCompletion < 100 && (
        <View style={styles.alertSection}>
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Icon name="info" size={24} color="#F59E0B" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Complete Your Profile</Text>
              <Text style={styles.alertText}>
                Your profile is {dashboardData.profileCompletion}% complete. 
                Add more information to improve your experience.
              </Text>
            </View>
            <TouchableOpacity style={styles.alertAction} onPress={handleProfileClick}>
              <Icon name="arrow-forward" size={16} color="#F59E0B" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upcoming Sessions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          {dashboardData?.upcomingBookings?.length > 0 && (
            <TouchableOpacity style={styles.seeAllButton} onPress={handleScheduledSessionsClick}>
              <Text style={styles.seeAllText}>See All</Text>
              <Icon name="arrow-forward" size={14} color="#059669" />
            </TouchableOpacity>
          )}
        </View>
        
        {dashboardData?.upcomingBookings?.length > 0 ? (
          <View style={styles.sessionsContainer}>
            {dashboardData.upcomingBookings.slice(0, 3).map((session, index) => (
              <UpcomingSessionCard 
                key={session._id || index} 
                session={session} 
                onPress={handleSessionClick}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Icon name="event" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyStateText}>No upcoming sessions</Text>
            <Text style={styles.emptyStateSubtext}>
              Book a session to get started with expert consultations
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateAction} 
              onPress={handleFindConsultant}
              activeOpacity={0.8}
            >
              <Icon name="search" size={16} color="#ffffff" />
              <Text style={styles.emptyStateActionText}>Find Consultant</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions - 2x2 Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.sectionTitleUnderline} />
        </View>
        
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <QuickActionButton
              key={index}
              icon={action.icon}
              title={action.title}
              color={action.color}
              onPress={action.onPress}
            />
          ))}
        </View>
      </View>

      {/* Account Status */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          <View style={styles.sectionTitleUnderline} />
        </View>
        
        <View style={styles.statusGrid}>
          {statusItems.map((item, index) => (
            <View key={index} style={[styles.statusItem, { backgroundColor: item.bgColor }]}>
              <Icon 
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
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Icon name="trending-up" size={24} color="#059669" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                You have completed {dashboardData.completedSessions} out of {dashboardData.totalSessions} sessions
              </Text>
              <Text style={styles.activitySubtext}>
                {dashboardData.completedSessions > 0 ? 'Keep up the great work!' : 'Start your first session today!'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Welcome Section
  welcomeSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  welcomeContent: {
    padding: 20,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.2,
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
  },
  profileImageBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#059669',
    opacity: 0.4,
  },
  welcomeAccent: {
    height: 2,
    backgroundColor: '#059669',
    opacity: 0.6,
  },

  // Stats Section - 2 columns
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    width: (screenWidth - 44) / 2,
    minHeight: 80,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicatorDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: '#059669',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statArrow: {
    marginLeft: 8,
  },

  // Alert Section
  alertSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  alertText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  alertAction: {
    padding: 4,
    marginLeft: 8,
  },

  // Section Styles
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.1,
  },
  sectionTitleUnderline: {
    width: 30,
    height: 2,
    backgroundColor: '#059669',
    borderRadius: 1,
    opacity: 0.6,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  seeAllText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Session Styles
  sessionsContainer: {
    gap: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  sessionCategory: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  sessionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDetailText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  sessionAction: {
    padding: 8,
    marginLeft: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyStateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyStateActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Quick Actions - 2x2 Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  quickActionContainer: {
    width: '48%',
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 110,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: '#059669',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  quickActionText: {
    fontSize: 13,
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  quickActionDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  quickActionTextDisabled: {
    color: '#9CA3AF',
  },

  // Status Grid
  statusGrid: {
    gap: 12,
    marginTop: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Activity Card
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginTop: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  activityIcon: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#065F46',
    marginBottom: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  activitySubtext: {
    fontSize: 12,
    color: '#047857',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default React.memo(DashboardSection);