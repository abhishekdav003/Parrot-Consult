// src/screens/DashboardScreen.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/ApiService';

// Import modular components
import DashboardSection from '../components/Dashboard/DashboardSection';
import ProfileSection from '../components/Dashboard/ProfileSection';
import MySessionsSection from '../components/Dashboard/MySessionsSection';
import ProfileUpgradeSection from '../components/Dashboard/ProfileUpgradeSection';
import BookedSessionsSection from '../components/Dashboard/BookedSessionsSection';
import WalletSection from '../components/Dashboard/WalletSection';
import ToggleMenu from '../components/Dashboard/ToggleMenu';

const DashboardScreen = ({ navigation }) => {
  const { user, logout, refreshUserData } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuVisible, setMenuVisible] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    profileCompletion: 0,
    scheduledSessions: 0,
    totalSessions: 0,
    completedSessions: 0,
    upcomingBookings: [],
    allBookings: []
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  console.log('[DASHBOARD] Component mounted, user:', user?.fullName);

  // Memoize profile completion calculation
  const calculateProfileCompletion = useCallback((userData) => {
    if (!userData) return 0;
    
    const fields = ['fullName', 'phone', 'email', 'location'];
    const filledFields = fields.filter(field => 
      userData[field] && 
      userData[field].toString().trim() !== ''
    ).length;
    
    const completion = Math.round((filledFields / fields.length) * 100);
    console.log('[DASHBOARD] Profile completion calculated:', completion);
    return completion;
  }, []);

  // Memoize dashboard data calculation
  const calculateDashboardData = useCallback((bookings, userData) => {
    const bookingList = Array.isArray(bookings) ? bookings : [];
    const scheduledSessions = bookingList.filter(b => b.status === 'scheduled').length;
    const completedSessions = bookingList.filter(b => b.status === 'completed').length;
    
    return {
      profileCompletion: calculateProfileCompletion(userData),
      scheduledSessions,
      totalSessions: bookingList.length,
      completedSessions,
      upcomingBookings: bookingList.filter(b => b.status === 'scheduled').slice(0, 5),
      allBookings: bookingList
    };
  }, [calculateProfileCompletion]);

  // Fetch dashboard data function
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (!user) {
      console.log('[DASHBOARD] No user found, skipping fetch');
      return;
    }

    try {
      console.log('[DASHBOARD] Fetching dashboard data...');
      if (showLoading) {
        setLoading(true);
      }
      
      // Fetch user bookings
      const bookingsResult = await ApiService.getUserBookings();
      console.log('[DASHBOARD] Bookings result:', bookingsResult);
      
      if (bookingsResult.success) {
        const calculatedData = calculateDashboardData(bookingsResult.data, user);
        setDashboardData(calculatedData);
        console.log('[DASHBOARD] Dashboard data updated:', calculatedData);
      } else {
        console.warn('[DASHBOARD] Failed to fetch bookings:', bookingsResult.error);
        
        // Handle session expiry
        if (bookingsResult.needsLogin) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please login again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  logout();
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                  });
                }
              }
            ]
          );
          return;
        }
        
        // Set default data with calculated profile completion
        setDashboardData(prev => ({
          ...prev,
          profileCompletion: calculateProfileCompletion(user),
        }));
      }
    } catch (error) {
      console.error('[DASHBOARD] Error fetching dashboard data:', error);
      // Don't show alert for initial load failures
      if (!initialLoad) {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
      setDashboardData(prev => ({
        ...prev,
        profileCompletion: calculateProfileCompletion(user),
      }));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, [user, calculateDashboardData, calculateProfileCompletion, initialLoad, logout, navigation]);

  // Initial data fetch when user changes
  useEffect(() => {
    if (user) {
      fetchDashboardData(true);
    } else {
      setDashboardData({
        profileCompletion: 0,
        scheduledSessions: 0,
        totalSessions: 0,
        completedSessions: 0,
        upcomingBookings: [],
        allBookings: []
      });
      setLoading(false);
      setInitialLoad(false);
    }
  }, [user?.phone]); // Only depend on user phone to avoid excessive re-renders

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user && !initialLoad) {
        console.log('[DASHBOARD] Screen focused, refreshing data...');
        fetchDashboardData(false);
      }
    }, [user?.phone, initialLoad]) // Only depend on user phone
  );

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    console.log('[DASHBOARD] Manual refresh triggered');
    setRefreshing(true);
    await fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Handle logout
  const handleLogout = useCallback(() => {
    console.log('[DASHBOARD] Logout requested');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('[DASHBOARD] Logging out...');
            setMenuVisible(false);
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          },
        },
      ]
    );
  }, [logout, navigation]);

  // Handle menu item press
  const handleMenuItemPress = useCallback((section) => {
    console.log('[DASHBOARD] Menu item pressed:', section);
    setActiveSection(section);
    setMenuVisible(false);
  }, []);

  // Handle profile update
  const handleProfileUpdate = useCallback(async () => {
    console.log('[DASHBOARD] Profile updated, refreshing data...');
    await refreshUserData();
    await fetchDashboardData(false);
  }, [refreshUserData, fetchDashboardData]);

  // Handle authentication errors
  const handleAuthError = useCallback((error) => {
    if (error && error.needsLogin) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [
          {
            text: 'OK',
            onPress: () => {
              logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }
        ]
      );
      return true;
    }
    return false;
  }, [logout, navigation]);

  // Memoize section title
  const sectionTitle = useMemo(() => {
    const titles = {
      dashboard: 'Dashboard',
      profile: 'My Profile',
      mysessions: 'My Sessions',
      upgrade: 'Profile Upgrade',
      booked: 'Booked Sessions',
      wallet: 'Wallet'
    };
    return titles[activeSection] || 'Dashboard';
  }, [activeSection]);

  // Render active section
  const renderActiveSection = useCallback(() => {
    const commonProps = {
      user,
      onRefresh: handleProfileUpdate,
      loading: refreshing,
      onAuthError: handleAuthError
    };

    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardSection 
            {...commonProps}
            dashboardData={dashboardData}
            onRefresh={handleRefresh}
          />
        );
      case 'profile':
        return <ProfileSection {...commonProps} />;
      case 'mysessions':
        return (
          <MySessionsSection 
            {...commonProps}
            sessions={dashboardData.upcomingBookings}
          />
        );
      case 'upgrade':
        return <ProfileUpgradeSection {...commonProps} />;
      case 'booked':
        return (
          <BookedSessionsSection 
            {...commonProps}
            bookings={dashboardData.allBookings}
          />
        );
      case 'wallet':
        return <WalletSection {...commonProps} />;
      default:
        return (
          <DashboardSection 
            {...commonProps}
            dashboardData={dashboardData}
            onRefresh={handleRefresh}
          />
        );
    }
  }, [
    activeSection,
    user,
    dashboardData,
    refreshing,
    handleProfileUpdate,
    handleRefresh,
    handleAuthError
  ]);

  // Loading state for initial load
  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No user state
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>Please log in to access dashboard</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Main', { screen: 'Login' })}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {sectionTitle}
        </Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={refreshing ? "#ccc" : "#666"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggle Menu Overlay */}
      <ToggleMenu
        visible={menuVisible}
        user={user}
        activeSection={activeSection}
        onItemPress={handleMenuItemPress}
        onLogout={handleLogout}
        onClose={() => setMenuVisible(false)}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {renderActiveSection()}
      </View>

      {/* Loading Overlay */}
      {loading && !initialLoad && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      )}
    </SafeAreaView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DashboardScreen;