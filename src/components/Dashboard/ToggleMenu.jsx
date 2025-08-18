// src/components/Dashboard/ToggleMenu.jsx
import React, { useMemo } from 'react';
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
  onClose,
}) => {
  // Check if user is consultant
  const isConsultant = useMemo(() => {
    return user?.role === 'consultant' || user?.consultantRequest?.status === 'approved';
  }, [user?.role, user?.consultantRequest?.status]);

  // Base menu (visible to all)
  const menuItems = [
    { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline' },
    { id: 'profile', title: 'My Profile', icon: 'person-outline' },
    { id: 'mysessions', title: 'My Sessions', icon: 'calendar-outline' },
    { id: 'upgrade', title: 'Profile Upgrade', icon: 'star-outline' },
  ];

  // Add consultant-only items
  if (isConsultant) {
    menuItems.splice(3, 0, { id: 'booked', title: 'Booked Sessions', icon: 'bookmark-outline' });
    menuItems.splice(4, 0, { id: 'wallet', title: 'Wallet', icon: 'wallet-outline' });
  }

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        activeSection === item.id && styles.activeMenuItem,
      ]}
      onPress={() => onItemPress(item.id)}
    >
      <Ionicons
        name={item.icon}
        size={22}
        color={activeSection === item.id ? '#4CAF50' : '#666'}
      />
      <Text
        style={[
          styles.menuItemText,
          activeSection === item.id && styles.activeMenuItemText,
        ]}
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.menu}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Image
                source={{
                  uri: user?.profileImage || 'https://via.placeholder.com/50',
                }}
                style={styles.avatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user?.fullName || 'Guest User'}
                </Text>
                <Text style={styles.userPhone}>{user?.phone}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {menuItems.map(renderMenuItem)}
          </View>

          {/* Upload Reels Section (only for consultant) */}
          {isConsultant && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.uploadReelButton}
                onPress={() => onItemPress('uploadreel')}
              >
                <Ionicons name="videocam" size={22} color="#4CAF50" />
                <Text style={styles.uploadReelText}>Upload Reel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Logout */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={22} color="#FF6B6B" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '75%',
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
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
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  activeMenuItem: {
    backgroundColor: '#f0f9f0',
    borderRightWidth: 3,
    borderRightColor: '#4CAF50',
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  activeMenuItemText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  uploadReelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  uploadReelText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
});

export default ToggleMenu;