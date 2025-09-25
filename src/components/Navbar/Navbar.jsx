import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const NAVBAR_HEIGHT = 70; // Increased to accommodate curved button
const QUICKIFY_BUTTON_SIZE = 56;
const ICON_SIZE = 24;
const ANIMATION_DURATION = 200;

const Navbar = ({ state, descriptors, navigation }) => {
  const [hasNotifications, setHasNotifications] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const { isAuthenticated, user } = useAuth();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(1))
  ).current;
  const quickifyScale = useRef(new Animated.Value(1)).current;

  // Memoized navigation items
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
      isAssistant: true
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
      name: 'Inbox', 
      icon: 'inbox', 
      route: 'Notifications',
      activeColor: '#059669',
      inactiveColor: '#6B7280',
      hasNotification: hasNotifications
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
  ], [isAuthenticated, user, hasNotifications]);

  // Hide navbar on specific screens
  useFocusEffect(
    useCallback(() => {
      const currentRoute = state.routes[state.index].name;
      const shouldHide = [
        'ExpertProfile', 
        'ExpertProfileScreen'
      ].includes(currentRoute);
      
      if (shouldHide !== !isVisible) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: shouldHide ? 0 : 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: shouldHide ? NAVBAR_HEIGHT + 20 : 0,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsVisible(!shouldHide);
        });
      }
    }, [state, fadeAnim, slideAnim, isVisible])
  );

  const handleNavigation = useCallback((routeName, index, isQuickify = false) => {
    // Different animation for Quickify button
    const scaleAnimRef = isQuickify ? quickifyScale : scaleAnims[index];
    
    Animated.sequence([
      Animated.timing(scaleAnimRef, {
        toValue: isQuickify ? 0.9 : 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimRef, {
        toValue: 1,
        duration: 150,
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
    }
  }, [navigation, scaleAnims, quickifyScale]);

  const QuickifyButton = useCallback(() => {
  const isActive = state.routes[state.index]?.name === 'Reels';
  
  return (
    <Animated.View
      style={[
        styles.quickifyContainer,
        {
          transform: [{ scale: quickifyScale }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.quickifyButton, isActive && styles.quickifyButtonActive]}
        onPress={() => handleNavigation('Reels', 2, true)}
        activeOpacity={0.8}
      >
        <View style={styles.quickifyContent}>
          <Icon
            name="play-arrow"
            size={20}
            color="#FFFFFF"
            style={styles.quickifyIcon}
          />
          <Text style={styles.quickifyTextInside}>Quickify</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, [quickifyScale, handleNavigation, state]);

  const NavButton = useCallback(({ item, index, isActive }) => {
    if (item.isQuickify) {
      return <QuickifyButton />;
    }

    return (
      <Animated.View
        style={[
          styles.navButtonContainer,
          {
            transform: [{ scale: scaleAnims[index] }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation(item.route, index)}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            {/* Active indicator */}
            {isActive && <View style={styles.activeIndicator} />}
            
            {item.isProfile ? (
              <View style={styles.profileContainer}>
                {isAuthenticated && user?.profileImage ? (
                  <Image 
                    source={{ uri: user.profileImage }} 
                    style={[
                      styles.profileImage,
                      isActive && styles.profileImageActive
                    ]}
                  />
                ) : (
                  <Icon
                    name={isAuthenticated ? "person" : "login"}
                    size={ICON_SIZE}
                    color={isActive ? item.activeColor : item.inactiveColor}
                    style={styles.icon}
                  />
                )}
              </View>
            ) : (
              <Icon
                name={item.icon}
                size={ICON_SIZE}
                color={isActive ? item.activeColor : item.inactiveColor}
                style={styles.icon}
              />
            )}
            
            {/* Notification badge */}
            {item.hasNotification && (
              <View style={styles.notificationBadge} />
            )}
          </View>
          
          <Text
            style={[
              styles.navText,
              {
                color: isActive ? item.activeColor : item.inactiveColor,
                fontWeight: isActive ? '600' : '400'
              }
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [scaleAnims, handleNavigation, user, isAuthenticated, QuickifyButton]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navbar}>
          {/* Background blur effect */}
          <View style={styles.navbarBackground} />
          
          {navItems.map((item, index) => {
            const routeIndex = item.isQuickify 
              ? state.routes.findIndex(route => route.name === 'Reels')
              : state.routes.findIndex(route => route.name === item.route);
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
    zIndex: 100,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: NAVBAR_HEIGHT,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 20, // Increased to accommodate the curved button
    position: 'relative',
  },
  navbarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: NAVBAR_HEIGHT - 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    // Ensure solid background
    opacity: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  
  // Regular Nav Button Styles
  navButtonContainer: {
    flex: 1,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    height: NAVBAR_HEIGHT - 20,
  },
  
  // Icon Styles
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    marginBottom: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: -12,
    left: '50%',
    width: 6,
    height: 6,
    backgroundColor: '#059669',
    borderRadius: 3,
    transform: [{ translateX: -3 }],
  },
  icon: {
    textAlign: 'center',
  },
  
  // Quickify Button Styles
  quickifyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  quickifyButton: {
    width: 70,
    height: 50,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginBottom: 0, // Remove negative margin
    position: 'relative',
    // Remove transparent borders by ensuring solid background
    borderWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
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
  quickifyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  quickifyIcon: {
    marginLeft: 1, // Slight adjustment for play icon centering
    marginBottom: 2,
  },
  quickifyTextInside: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0.1,
  },
  
  // Profile Styles
  profileContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  profileImageActive: {
    borderWidth: 2,
    borderColor: '#059669',
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  
  // Notification Badge
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    backgroundColor: '#EF4444',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Text Styles
  navText: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0.1,
    lineHeight: 12,
  },
});

export default Navbar;