// src/components/Dashboard/ToggleMenu.jsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  StatusBar,
  Platform,
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
    return user?.role === 'consultant'  || user?.consultantRequest?.status === 'approved';
  }, [user?.role, user?.consultantRequest?.status]);

  // Base menu (visible to all)
  const menuItems = useMemo(() => {
    const baseItems = [
      { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline', description: 'Overview & Stats' },
      { id: 'profile', title: 'My Profile', icon: 'person-outline', description: 'Personal Information' },
      { id: 'mysessions', title: 'My Sessions', icon: 'calendar-outline', description: 'Booked Consultations' },
    ];

    // Add consultant-only items
    if (isConsultant) {
      baseItems.push(
        { id: 'booked', title: 'Client Sessions', icon: 'bookmark-outline', description: 'Booked by Clients' },
        { id: 'wallet', title: 'Wallet', icon: 'wallet-outline', description: 'Earnings & Payments' }
      );
    }

    baseItems.push({ id: 'upgrade', title: 'Profile Upgrade', icon: 'star-outline', description: 'Become a Consultant' });

    return baseItems;
  }, [isConsultant]);

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        activeSection === item.id && styles.activeMenuItem,
      ]}
      onPress={() => {
        onItemPress(item.id);
        onClose();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[
          styles.menuItemIconContainer,
          activeSection === item.id && styles.activeMenuItemIconContainer
        ]}>
          <Ionicons
            name={item.icon}
            size={22}
            color={activeSection === item.id ? '#ffffff' : '#10B981'}
          />
        </View>
        <View style={styles.menuItemContent}>
          <Text
            style={[
              styles.menuItemText,
              activeSection === item.id && styles.activeMenuItemText,
            ]}
          >
            {item.title}
          </Text>
          <Text style={styles.menuItemDescription}>{item.description}</Text>
        </View>
      </View>
      {activeSection === item.id && (
        <View style={styles.activeIndicator} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.5)" barStyle="light-content" />
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.menu}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.userInfo} 
              onPress={() => {
                onItemPress('profile');
                onClose();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{
                    uri: user?.profileImage || 'https://via.placeholder.com/60x60/10B981/ffffff?text=U',
                  }}
                  style={styles.avatar}
                />
                <View style={styles.avatarBorder} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user?.fullName || 'Guest User'}
                </Text>
                <Text style={styles.userPhone}>{user?.phone || 'Not provided'}</Text>
                {isConsultant && (
                  <View style={styles.consultantBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.consultantBadgeText}>Consultant</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            <Text style={styles.menuSectionTitle}>Navigation</Text>
            {menuItems.map(renderMenuItem)}
          </View>

          {/* Quick Actions Section */}
          <View style={styles.actionSection}>
            <Text style={styles.menuSectionTitle}>Quick Actions</Text>
            
            // In ToggleMenu.jsx - Update the Upload Reel button
{isConsultant && (
  <TouchableOpacity
    style={styles.actionButton}
    onPress={() => {
      navigation.navigate('ReelUpload'); // Navigate to new screen
      onClose();
    }}
    activeOpacity={0.7}
  >
    <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
      <Ionicons name="videocam" size={20} color="#ffffff" />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionText}>Upload Reel</Text>
      <Text style={styles.actionSubtext}>Share your expertise</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
  </TouchableOpacity>
)}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Handle help action
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                <Ionicons name="help-circle" size={20} color="#ffffff" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionText}>Help & Support</Text>
                <Text style={styles.actionSubtext}>Get assistance</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Footer - Logout */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={onLogout}
              activeOpacity={0.7}
            >
              <View style={styles.logoutIcon}>
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              </View>
              <View style={styles.logoutContent}>
                <Text style={styles.logoutText}>Logout</Text>
                <Text style={styles.logoutSubtext}>Sign out of your account</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>ConsultApp v1.0.0</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
  },
  avatarBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#10B981',
    opacity: 0.3,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  userPhone: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  consultantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  consultantBadgeText: {
    fontSize: 11,
    color: '#92400E',
    marginLeft: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },

  // Menu Items
  menuItems: {
    paddingVertical: 20,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeMenuItem: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    marginRight: 12,
  },
  activeMenuItemIconContainer: {
    backgroundColor: '#10B981',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  activeMenuItemText: {
    color: '#065F46',
    fontWeight: '600',
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  // Action Section
  actionSection: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 'auto',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Footer
  footer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  logoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    marginRight: 12,
  },
  logoutContent: {
    flex: 1,
  },
  logoutText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  logoutSubtext: {
    fontSize: 11,
    color: '#F87171',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Version
  versionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default ToggleMenu;