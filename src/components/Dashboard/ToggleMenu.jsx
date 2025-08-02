// src/components/Dashboard/ToggleMenu.jsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ToggleMenu = ({ 
  visible, 
  user, 
  activeSection, 
  onItemPress, 
  onLogout, 
  onClose 
}) => {
  console.log('[TOGGLE_MENU] Rendering menu, visible:', visible, 'activeSection:', activeSection);

  const menuItems = [
    { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline' },
    { id: 'profile', title: 'My Profile', icon: 'person-outline' },
    { id: 'mysessions', title: 'My Sessions', icon: 'layers-outline' },
    { id: 'upgrade', title: 'Profile Upgrade', icon: 'trending-up-outline' },
    { id: 'booked', title: 'Booked Sessions', icon: 'calendar-outline' },
    { id: 'wallet', title: 'Wallet', icon: 'wallet-outline' },
  ];

  const MenuItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        activeSection === item.id && styles.activeMenuItem
      ]}
      onPress={() => {
        console.log('[TOGGLE_MENU] Menu item pressed:', item.id);
        onItemPress(item.id);
      }}
    >
      <Ionicons
        name={item.icon}
        size={20}
        color={activeSection === item.id ? '#4CAF50' : '#666'}
      />
      <Text
        style={[
          styles.menuItemText,
          activeSection === item.id && styles.activeMenuItemText
        ]}
      >
        {item.title}
      </Text>
      {activeSection === item.id && (
        <View style={styles.activeIndicator} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          {/* User Info Section */}
          <View style={styles.userSection}>
            <View style={styles.avatarContainer}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.fullName || 'User'}
              </Text>
              <Text style={styles.userPhone}>
                {user?.phone || 'Phone not available'}
              </Text>
              {user?.email && (
                <Text style={styles.userEmail}>
                  {user.email}
                </Text>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Menu Items */}
          <View style={styles.menuItemsContainer}>
            {menuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              console.log('[TOGGLE_MENU] Logout pressed');
              onLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#888',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 20,
  },
  menuItemsContainer: {
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    position: 'relative',
  },
  activeMenuItem: {
    backgroundColor: '#f0f8f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 15,
    flex: 1,
  },
  activeMenuItemText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  activeIndicator: {
    width: 3,
    height: 20,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    right: 0,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginLeft: 15,
  },
});

export default ToggleMenu;