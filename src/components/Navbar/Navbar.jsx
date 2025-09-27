import React, { useState, useRef, useCallback, useMemo } from 'react';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dynamic sizing based on screen dimensions
const getResponsiveSizes = (insets) => {
  const isSmallScreen = SCREEN_HEIGHT < 700;
  const isTablet = SCREEN_WIDTH > 768;
  
  // Calculate base navbar height dynamically
  const BASE_HEIGHT = isTablet ? 80 : isSmallScreen ? 65 : 70;
  
  // Calculate total navbar height including safe areas
  const TOTAL_HEIGHT = BASE_HEIGHT + insets.bottom;
  
  return {
    NAVBAR_HEIGHT: BASE_HEIGHT,
    TOTAL_HEIGHT,
    ICON_SIZE: isTablet ? 28 : isSmallScreen ? 20 : 24,
    QUICKIFY_WIDTH: isTablet ? 80 : 70,
    QUICKIFY_HEIGHT: isTablet ? 48 : 42,
    TEXT_SIZE: isTablet ? 12 : isSmallScreen ? 9 : 10,
    PADDING_HORIZONTAL: isTablet ? 20 : 16,
  };
};

const Navbar = ({ state, descriptors, navigation }) => {
  const [hasNotifications, setHasNotifications] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const { isAuthenticated, user } = useAuth();
  
  // Get dynamic safe area insets
  const insets = useSafeAreaInsets();
  
  // Get responsive sizes
  const sizes = useMemo(() => getResponsiveSizes(insets), [insets]);
  
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

  // Hide navbar on specific screens with proper animation
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
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: shouldHide ? sizes.TOTAL_HEIGHT + 20 : 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsVisible(!shouldHide);
        });
      }
    }, [state, fadeAnim, slideAnim, isVisible, sizes.TOTAL_HEIGHT])
  );

  const handleNavigation = useCallback((routeName, index, isQuickify = false) => {
    const scaleAnimRef = isQuickify ? quickifyScale : scaleAnims[index];
    
    Animated.sequence([
      Animated.timing(scaleAnimRef, {
        toValue: 0.92,
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
          style={[
            styles.quickifyButton,
            {
              width: sizes.QUICKIFY_WIDTH,
              height: sizes.QUICKIFY_HEIGHT,
            },
            isActive && styles.quickifyButtonActive
          ]}
          onPress={() => handleNavigation('Reels', 2, true)}
          activeOpacity={0.8}
        >
          <Icon
            name="play-arrow"
            size={sizes.ICON_SIZE * 0.8}
            color="#FFFFFF"
            style={styles.quickifyIcon}
          />
          <Text style={[styles.quickifyText, { fontSize: sizes.TEXT_SIZE }]}>
            Quickify
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [quickifyScale, handleNavigation, state, sizes]);

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
          <View style={[
            styles.iconContainer,
            {
              width: sizes.ICON_SIZE * 1.5,
              height: sizes.ICON_SIZE * 1.5,
            }
          ]}>
            {item.isProfile ? (
              <View style={[
                styles.profileContainer,
                {
                  width: sizes.ICON_SIZE + 2,
                  height: sizes.ICON_SIZE + 2,
                  borderRadius: (sizes.ICON_SIZE + 2) / 2,
                }
              ]}>
                {isAuthenticated && user?.profileImage ? (
                  <Image 
                    source={{ uri: user.profileImage }} 
                    style={[
                      styles.profileImage,
                      {
                        width: sizes.ICON_SIZE + 2,
                        height: sizes.ICON_SIZE + 2,
                        borderRadius: (sizes.ICON_SIZE + 2) / 2,
                      },
                      isActive && {
                        borderWidth: 2,
                        borderColor: item.activeColor,
                        width: sizes.ICON_SIZE - 2,
                        height: sizes.ICON_SIZE - 2,
                        borderRadius: (sizes.ICON_SIZE - 2) / 2,
                      }
                    ]}
                  />
                ) : (
                  <Icon
                    name={isAuthenticated ? "person" : "login"}
                    size={sizes.ICON_SIZE}
                    color={isActive ? item.activeColor : item.inactiveColor}
                    style={styles.icon}
                  />
                )}
              </View>
            ) : (
              <Icon
                name={item.icon}
                size={sizes.ICON_SIZE}
                color={isActive ? item.activeColor : item.inactiveColor}
                style={styles.icon}
              />
            )}
            
            {/* Dynamic notification badge */}
            {item.hasNotification && (
              <View style={[
                styles.notificationBadge,
                {
                  minWidth: Math.max(sizes.ICON_SIZE * 0.7, 14),
                  height: Math.max(sizes.ICON_SIZE * 0.7, 14),
                  borderRadius: Math.max(sizes.ICON_SIZE * 0.35, 7),
                }
              ]}>
                <Text style={[
                  styles.badgeText,
                  { fontSize: Math.max(sizes.TEXT_SIZE * 0.8, 8) }
                ]}>
                  1
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
                lineHeight: sizes.TEXT_SIZE * 1.2,
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
      {/* Background overlay to prevent content showing behind */}
      <View style={[
        styles.backgroundOverlay,
        {
          height: sizes.TOTAL_HEIGHT + 10, // Extra padding to ensure coverage
        }
      ]} />
      
      <SafeAreaView 
        style={styles.safeArea} 
        edges={['left', 'right', 'bottom']}
      >
        <View style={[
          styles.navbar,
          {
            height: sizes.NAVBAR_HEIGHT,
            paddingHorizontal: sizes.PADDING_HORIZONTAL,
            paddingBottom: Math.max(insets.bottom * 0.1, 4),
          }
        ]}>
          {/* Clean background with proper shadow */}
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
  backgroundOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: -1,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  navbarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
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
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  
  // Icon Styles
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: {
    textAlign: 'center',
  },
  
  // Quickify Button Styles
  quickifyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickifyButton: {
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    flexDirection: 'row',
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
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
  quickifyIcon: {
    marginRight: 4,
  },
  quickifyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Profile Styles
  profileContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    // Dynamic sizing applied in component
  },
  
  // Notification Badge
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Text Styles
  navText: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0.1,
  },
});

export default Navbar;