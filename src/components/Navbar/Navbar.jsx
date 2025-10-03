import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ApiService from '../../services/ApiService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Optimized responsive sizing
const getResponsiveSizes = (insets) => {
  const isSmallScreen = SCREEN_HEIGHT < 700;
  const isTablet = SCREEN_WIDTH > 768;
  
  const BASE_HEIGHT = isTablet ? 70 : isSmallScreen ? 58 : 62;
  
  return {
    NAVBAR_HEIGHT: BASE_HEIGHT,
    ICON_SIZE: isTablet ? 26 : isSmallScreen ? 22 : 24,
    QUICKIFY_WIDTH: isTablet ? 75 : 65,
    QUICKIFY_HEIGHT: isTablet ? 44 : 38,
    TEXT_SIZE: isTablet ? 11 : isSmallScreen ? 9 : 10,
    PADDING_HORIZONTAL: Math.max(SCREEN_WIDTH * 0.02, 12),
  };
};

const Navbar = ({ state, descriptors, navigation }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { isAuthenticated, user } = useAuth();
  
  const insets = useSafeAreaInsets();
  const sizes = useMemo(() => getResponsiveSizes(insets), [insets]);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(1))
  ).current;
  const quickifyScale = useRef(new Animated.Value(1)).current;

  // Fetch unread message count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      return;
    }

    try {
      const result = await ApiService.getChatInbox();
      if (result.success) {
        const inboxData = result.data.inbox || [];
        // Count number of chats with unread messages (not total messages)
        const unreadChats = inboxData.filter(chat => (chat.unreadCountForMe || 0) > 0).length;
        setUnreadCount(unreadChats);
        console.log('[NAVBAR] Unread chats:', unreadChats, 'Total chats:', inboxData.length);
      }
    } catch (error) {
      console.error('[NAVBAR] Failed to fetch unread count:', error);
    }
  }, [isAuthenticated, user]);

  // Fetch unread count when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      
      // Refresh every 30 seconds when screen is focused
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => clearInterval(interval);
    }, [fetchUnreadCount])
  );

  // Initial fetch when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, user, fetchUnreadCount]);

  const navItems = useMemo(() => [
    { 
      name: 'Home', 
      icon: 'home', 
      route: 'Home',
      activeColor: '#059669',
      inactiveColor: '#6B7280'
    },
    { 
      name: 'Assistant', 
      icon: 'support-agent', 
      route: 'ChatBot',
      activeColor: '#059669',
      inactiveColor: '#6B7280',
    },
    { 
      name: 'Quickify', 
      icon: 'play-arrow', 
      route: 'Reels',
      activeColor: '#FFFFFF',
      inactiveColor: '#FFFFFF',
      isQuickify: true
    },
    { 
      name: 'Messages', 
      icon: 'chat-bubble', 
      route: 'Notifications',
      activeColor: '#059669',
      inactiveColor: '#6B7280',
      hasNotification: unreadCount > 0,
      notificationCount: unreadCount
    },
    isAuthenticated ? {
      name: 'Profile', 
      icon: 'person', 
      route: 'Dashboard',
      activeColor: '#059669',
      inactiveColor: '#6B7280',
      isProfile: true
    } : {
      name: 'Login', 
      icon: 'login', 
      route: 'Login',
      activeColor: '#059669',
      inactiveColor: '#6B7280'
    },
  ], [isAuthenticated, unreadCount]);

  useFocusEffect(
    useCallback(() => {
      const currentRoute = state.routes[state.index].name;
      const shouldHide = ['ExpertProfile', 'ExpertProfileScreen'].includes(currentRoute);
      
      if (shouldHide !== !isVisible) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: shouldHide ? 0 : 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: shouldHide ? 100 : 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setIsVisible(!shouldHide));
      }
    }, [state, fadeAnim, slideAnim, isVisible])
  );

  const handleNavigation = useCallback((routeName, index, isQuickify = false) => {
    const scaleAnimRef = isQuickify ? quickifyScale : scaleAnims[index];
    
    Animated.sequence([
      Animated.timing(scaleAnimRef, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimRef, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index]?.key || routeName,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      if (routeName === 'ChatBot') {
        navigation.navigate('ChatBot', { query: 'hello' });
      } else if (routeName === 'Home') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        navigation.navigate(routeName);
      }
      
      // Refresh unread count after navigation
      if (routeName === 'Notifications') {
        setTimeout(fetchUnreadCount, 500);
      }
    }
  }, [navigation, scaleAnims, quickifyScale, state.routes, fetchUnreadCount]);

  const QuickifyButton = useCallback(() => {
    const isActive = state.routes[state.index]?.name === 'Reels';
    
    return (
      <Animated.View style={[styles.navButtonContainer, { transform: [{ scale: quickifyScale }] }]}>
        <TouchableOpacity
          style={[
            styles.quickifyButton,
            {
              width: sizes.QUICKIFY_WIDTH,
              height: sizes.QUICKIFY_HEIGHT,
            },
            isActive && styles.quickifyButtonActive
          ]}
          onPress={() => handleNavigation('Reels', 2, true)}
          activeOpacity={0.7}
        >
          <Icon name="play-arrow" size={sizes.ICON_SIZE} color="#FFFFFF" />
          <Text style={[styles.quickifyText, { fontSize: sizes.TEXT_SIZE }]}>Quickify</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [quickifyScale, handleNavigation, state, sizes]);

  const NavButton = useCallback(({ item, index, isActive }) => {
    if (item.isQuickify) return <QuickifyButton />;

    return (
      <Animated.View style={[styles.navButtonContainer, { transform: [{ scale: scaleAnims[index] }] }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation(item.route, index)}
          activeOpacity={0.6}
        >
          <View style={styles.iconWrapper}>
            {item.isProfile && isAuthenticated && user?.profileImage ? (
              <Image 
                source={{ uri: user.profileImage }} 
                style={[
                  styles.profileImage,
                  {
                    width: sizes.ICON_SIZE + 4,
                    height: sizes.ICON_SIZE + 4,
                    borderRadius: (sizes.ICON_SIZE + 4) / 2,
                  },
                  isActive && styles.profileImageActive
                ]}
              />
            ) : (
              <Icon
                name={item.icon}
                size={sizes.ICON_SIZE}
                color={isActive ? item.activeColor : item.inactiveColor}
              />
            )}
            
            {item.hasNotification && item.notificationCount > 0 && (
              <View style={[styles.badge, { 
                minWidth: item.notificationCount > 9 ? sizes.ICON_SIZE * 0.85 : sizes.ICON_SIZE * 0.65,
                height: sizes.ICON_SIZE * 0.65,
                borderRadius: sizes.ICON_SIZE * 0.325,
                paddingHorizontal: item.notificationCount > 9 ? 4 : 0,
              }]}>
                <Text style={[styles.badgeText, { fontSize: Math.max(sizes.TEXT_SIZE * 0.85, 9) }]}>
                  {item.notificationCount > 99 ? '99+' : item.notificationCount}
                </Text>
              </View>
            )}
          </View>
          
          <Text
            style={[
              styles.navText,
              {
                color: isActive ? item.activeColor : item.inactiveColor,
                fontWeight: isActive ? '600' : '400',
                fontSize: sizes.TEXT_SIZE,
              }
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [scaleAnims, handleNavigation, user, isAuthenticated, QuickifyButton, sizes]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[
          styles.navbar,
          {
            height: sizes.NAVBAR_HEIGHT,
            paddingHorizontal: sizes.PADDING_HORIZONTAL,
          }
        ]}>
          {navItems.map((item, index) => {
            const routeIndex = state.routes.findIndex(route => route.name === item.route);
            const isActive = state.index === routeIndex && routeIndex !== -1;
            
            return (
              <NavButton 
                key={`${item.route}-${index}`} 
                item={item} 
                index={index}
                isActive={isActive}
              />
            );
          })}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 8,
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navButtonContainer: {
    flex: 1,
    alignItems: 'center',
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 50,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    height: 28,
  },
  profileImage: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileImageActive: {
    borderColor: '#059669',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  quickifyButton: {
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  quickifyButtonActive: {
    backgroundColor: '#047857',
  },
  quickifyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  navText: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0.1,
  },
});

export default Navbar;