import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Image,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

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

  // Hide navbar on specific screens
  useFocusEffect(
    React.useCallback(() => {
      const currentRoute = state.routes[state.index].name;
      const shouldHide = ['Reels', 'ChatBot'].includes(currentRoute);
      
      if (shouldHide !== !isVisible) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: shouldHide ? 0 : 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: shouldHide ? 80 : 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsVisible(!shouldHide);
        });
      }
    }, [state, fadeAnim, slideAnim])
  );

  const navItems = [
    { 
      name: 'Home', 
      icon: 'home', 
      route: 'Home',
      activeColor: '#059669',
      inactiveColor: '#64748B'
    },
    { 
      name: 'Assistant', 
      icon: 'support-agent', 
      route: 'ChatBot',
      activeColor: '#059669',
      inactiveColor: '#64748B',
      isAssistant: true
    },
    { 
      name: 'Media', 
      icon: 'play-circle-outline', 
      route: 'Reels',
      activeColor: '#059669',
      inactiveColor: '#64748B'
    },
    { 
      name: 'Activity', 
      icon: 'notifications-none', 
      route: 'Notifications',
      activeColor: '#059669',
      inactiveColor: '#64748B',
      hasNotification: hasNotifications
    },
    // Conditionally show Login or Profile
    isAuthenticated ? {
      name: 'Profile', 
      icon: 'person-outline', 
      route: 'Dashboard',
      activeColor: '#059669',
      inactiveColor: '#64748B',
      isProfile: true
    } : {
      name: 'Login', 
      icon: 'login', 
      route: 'Login',
      activeColor: '#059669',
      inactiveColor: '#64748B'
    },
  ];

  const handleNavigation = (routeName, index) => {
    // Simple scale animation for feedback
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      // Special handling for Assistant -> ChatBot
      if (routeName === 'ChatBot') {
        navigation.navigate('ChatBot', { query: 'hello' });
      } else {
        navigation.navigate(routeName);
      }
    }
  };

  const NavButton = ({ item, index, isActive }) => (
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
        activeOpacity={0.6}
      >
        <View style={styles.iconContainer}>
          {/* Active indicator background */}
          {isActive && (
            <View style={styles.activeIndicatorBg} />
          )}
          
          {item.isProfile && user?.profileImage ? (
            <View style={styles.profileImageContainer}>
              <Image 
                source={{ uri: user.profileImage }} 
                style={[
                  styles.profileImage,
                  isActive && styles.profileImageActive
                ]}
              />
            </View>
          ) : (
            <Icon
              name={item.icon}
              size={24}
              color={isActive ? item.activeColor : item.inactiveColor}
              style={styles.icon}
            />
          )}
          
          {/* Notification badge */}
          {item.hasNotification && (
            <View style={styles.notificationBadge}>
              <View style={styles.notificationDot} />
            </View>
          )}

          {/* Active indicator dot */}
          {isActive && (
            <View style={styles.activeIndicatorDot} />
          )}
        </View>
        
        <Text
          style={[
            styles.navText,
            {
              color: isActive ? item.activeColor : item.inactiveColor,
              fontWeight: isActive ? '600' : '500'
            }
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Don't render navbar if not visible
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
          <View style={styles.topBorder} />
          {navItems.map((item, index) => {
            const isActive = state.index === index;
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
    zIndex: 1000,
  },
  safeArea: {
    backgroundColor: '#ffffff',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    position: 'relative',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#10B981',
    opacity: 0.6,
  },
  
  // Nav Button Styles
  navButtonContainer: {
    flex: 1,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 64,
    position: 'relative',
  },
  
  // Icon Styles
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  activeIndicatorBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    opacity: 0.8,
  },
  icon: {
    zIndex: 1,
  },
  activeIndicatorDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: '#10B981',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  
  // Profile Image
  profileImageContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
  },
  profileImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  profileImageActive: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  
  // Notification Badge
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    backgroundColor: '#ffffff',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  notificationDot: {
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },

  // Text Styles
  navText: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0.2,
  },
});

export default Navbar;