import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const Navbar = ({ state, descriptors, navigation }) => {
  const [hasNotifications, setHasNotifications] = useState(true);
  const { isAuthenticated, user } = useAuth();

  const navItems = [
    { 
      name: 'Home', 
      icon: 'home', 
      route: 'Home',
      activeColor: '#4A7C59',
      inactiveColor: '#666'
    },
    { 
      name: 'Search', 
      icon: 'search', 
      route: 'Search',
      activeColor: '#4A7C59',
      inactiveColor: '#666'
    },
    { 
      name: 'Reels', 
      icon: 'add-box', 
      route: 'Reels',
      activeColor: '#4A7C59',
      inactiveColor: '#666'
    },
    { 
      name: 'Notifications', 
      icon: 'favorite-border', 
      route: 'Notifications',
      activeColor: '#4A7C59',
      inactiveColor: '#666',
      hasNotification: hasNotifications
    },
    // Conditionally show Login or Dashboard
    isAuthenticated ? {
      name: 'Dashboard', 
      icon: 'dashboard', 
      route: 'Dashboard',
      activeColor: '#4A7C59',
      inactiveColor: '#666',
      isProfile: true
    } : {
      name: 'Login', 
      icon: 'person', 
      route: 'Login',
      activeColor: '#4A7C59',
      inactiveColor: '#666'
    },
  ];

  const handleNavigation = (routeName, index) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const NavButton = ({ item, index, isActive }) => (
    <TouchableOpacity
      style={[
        styles.navButton,
        isActive && styles.activeNavButton
      ]}
      onPress={() => handleNavigation(item.route, index)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {item.isProfile && user?.profileImage ? (
          <Image 
            source={{ uri: user.profileImage }} 
            style={styles.profileImage}
          />
        ) : (
          <Icon
            name={item.icon}
            size={24}
            color={isActive ? item.activeColor : item.inactiveColor}
          />
        )}
        {item.hasNotification && (
          <View style={styles.notificationDot} />
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
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navbar}>
        {navItems.map((item, index) => {
          const isActive = state.index === index;
          return (
            <NavButton 
              key={index} 
              item={item} 
              index={index}
              isActive={isActive}
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    minHeight: 60,
  },
  activeNavButton: {
    backgroundColor: 'rgba(74, 124, 89, 0.1)',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  profileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A7C59',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  navText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default Navbar;