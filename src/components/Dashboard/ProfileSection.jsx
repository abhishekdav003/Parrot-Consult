// src/components/Dashboard/ProfileSection.jsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

const ProfileSection = ({ user, onRefresh, onAuthError }) => {
  const { updateUserProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    location: user?.location || '',
    phone: user?.phone?.toString() || '',
  });

  console.log('[PROFILE_SECTION] Rendering with user:', user?.fullName);

  // Initialize form data when user changes
  React.useEffect(() => {
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      location: user?.location || '',
      phone: user?.phone?.toString() || '',
    });
  }, [user?.phone, user?.fullName, user?.email, user?.location]);

  // Memoize email validation
  const isValidEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Memoize profile completion calculation
  const profileCompletion = useMemo(() => {
    const fields = ['fullName', 'email', 'location', 'phone'];
    const filledFields = fields.filter(field => 
      formData[field] && formData[field].toString().trim() !== ''
    ).length;
    return Math.round((filledFields / fields.length) * 100);
  }, [formData]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      console.log('[PROFILE_SECTION] Saving profile with data:', formData);
      setLoading(true);

      // Validate required fields
      if (!formData.fullName.trim()) {
        Alert.alert('Error', 'Full name is required');
        return;
      }

      // Email validation if provided
      if (formData.email && !isValidEmail(formData.email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      const result = await updateUserProfile(formData);
      console.log('[PROFILE_SECTION] Update result:', result);

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditing(false);
        onRefresh && onRefresh();
      } else {
        // Handle session expiry
        if (onAuthError && onAuthError(result)) {
          return;
        }
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('[PROFILE_SECTION] Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }, [formData, isValidEmail, updateUserProfile, onRefresh, onAuthError]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    console.log('[PROFILE_SECTION] Cancel edit');
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      location: user?.location || '',
      phone: user?.phone?.toString() || '',
    });
    setEditing(false);
  }, [user]);

  // Handle edit mode
  const handleEdit = useCallback(() => {
    console.log('[PROFILE_SECTION] Edit mode activated');
    setEditing(true);
  }, []);

  // Handle field change
  const handleFieldChange = useCallback((fieldName, value) => {
    console.log('[PROFILE_SECTION] Updating field:', fieldName, 'with value:', value);
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  // Memoize status color function
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FFA726';
      case 'rejected': return '#FF6B6B';
      default: return '#666';
    }
  }, []);

  // Info Row Component
  const InfoRow = React.memo(({ label, value, icon, editable = true, keyboardType = 'default', fieldName }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color="#666" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {editing && editable ? (
        <TextInput
          style={styles.infoInput}
          value={value}
          onChangeText={(text) => handleFieldChange(fieldName, text)}
          placeholder={`Enter ${label.toLowerCase()}`}
          keyboardType={keyboardType}
          editable={!loading}
        />
      ) : (
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      )}
    </View>
  ));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
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
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
          <Text style={styles.userRole}>
            {user?.role === 'consultant' ? 'Consultant' : 'User'}
          </Text>
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>
              Profile {profileCompletion}% complete
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${profileCompletion}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {editing ? (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Ionicons name="close" size={20} color="#666" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
          >
            <Ionicons name="pencil" size={20} color="#4CAF50" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <InfoRow
          label="Full Name"
          value={formData.fullName}
          icon="person-outline"
          fieldName="fullName"
        />
        
        <InfoRow
          label="Email"
          value={formData.email}
          icon="mail-outline"
          keyboardType="email-address"
          fieldName="email"
        />
        
        <InfoRow
          label="Phone"
          value={formData.phone}
          icon="call-outline"
          editable={false}
          fieldName="phone"
        />
        
        <InfoRow
          label="Location"
          value={formData.location}
          icon="location-outline"
          fieldName="location"
        />
      </View>

      {/* Account Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Account Status</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: user?.suspended ? '#FF6B6B' : '#4CAF50' }
            ]} />
            <Text style={styles.infoValue}>
              {user?.suspended ? 'Suspended' : 'Active'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="card-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Aadhaar Verified</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: user?.aadharVerified ? '#4CAF50' : '#FFA726' }
            ]} />
            <Text style={styles.infoValue}>
              {user?.aadharVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Member Since</Text>
          </View>
          <Text style={styles.infoValue}>
            {user?.createdAt ? 
              new Date(user.createdAt).toLocaleDateString() : 
              'Recently joined'
            }
          </Text>
        </View>
      </View>

      {/* Consultant Information (if applicable) */}
      {user?.role === 'consultant' && user?.consultantRequest && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultant Information</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="briefcase-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Application Status</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: getStatusColor(user.consultantRequest.status) }
              ]} />
              <Text style={styles.infoValue}>
                {user.consultantRequest.status ? 
                  user.consultantRequest.status.charAt(0).toUpperCase() + user.consultantRequest.status.slice(1) : 
                  'Not Applied'
                }
              </Text>
            </View>
          </View>
          
          {user.consultantRequest.consultantProfile && (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="school-outline" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Qualification</Text>
                </View>
                <Text style={styles.infoValue}>
                  {user.consultantRequest.consultantProfile.qualification || 'Not provided'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Experience</Text>
                </View>
                <Text style={styles.infoValue}>
                  {user.consultantRequest.consultantProfile.yearsOfExperience || 0} years
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="cash-outline" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Session Fee</Text>
                </View>
                <Text style={styles.infoValue}>
                  ₹{user.consultantRequest.consultantProfile.sessionFee || 0}
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Trial Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trial Status</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="videocam-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Video Trial</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: user?.videoFreeTrial ? '#FF6B6B' : '#4CAF50' }
            ]} />
            <Text style={styles.infoValue}>
              {user?.videoFreeTrial ? 'Used' : 'Available'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Chat Trial</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: user?.chatFreeTrial ? '#FF6B6B' : '#4CAF50' }
            ]} />
            <Text style={styles.infoValue}>
              {user?.chatFreeTrial ? 'Used' : 'Available'}
            </Text>
          </View>
        </View>
      </View>

      {/* Add some bottom padding */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  completionContainer: {
    marginTop: 8,
  },
  completionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  editButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 10,
    paddingVertical: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
    flex: 1,
  },
  infoInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});

export default React.memo(ProfileSection);