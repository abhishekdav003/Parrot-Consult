// src/components/Dashboard/WalletSection.jsx
import React, { useState } from 'react';
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
import ApiService from '../../services/ApiService';

const WalletSection = ({ user, onRefresh }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    location: user?.location || '',
    phone: user?.phone?.toString() || '',
  });

  console.log('[PROFILE_SECTION] Rendering with user:', user);

  const handleSave = async () => {
    try {
      console.log('[PROFILE_SECTION] Saving profile with data:', formData);
      setLoading(true);

      // Validate required fields
      if (!formData.fullName.trim()) {
        Alert.alert('Error', 'Full name is required');
        return;
      }

      const result = await ApiService.updateProfile(formData);
      console.log('[PROFILE_SECTION] Update result:', result);

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditing(false);
        onRefresh && onRefresh();
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('[PROFILE_SECTION] Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    console.log('[PROFILE_SECTION] Cancel edit');
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      location: user?.location || '',
      phone: user?.phone?.toString() || '',
    });
    setEditing(false);
  };

  const calculateProfileCompletion = () => {
    const fields = ['fullName', 'email', 'location', 'phone'];
    const filledFields = fields.filter(field => 
      formData[field] && formData[field].trim() !== ''
    ).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const InfoRow = ({ label, value, icon, editable = true }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color="#666" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {editing && editable ? (
        <TextInput
          style={styles.infoInput}
          value={value}
          onChangeText={(text) => {
            const key = label.toLowerCase().replace(' ', '');
            console.log('[PROFILE_SECTION] Updating field:', key, 'with value:', text);
            setFormData(prev => ({ ...prev, [key]: text }));
          }}
          placeholder={`Enter ${label.toLowerCase()}`}
          keyboardType={label === 'Phone' ? 'phone-pad' : 'default'}
        />
      ) : (
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
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
              Profile {calculateProfileCompletion()}% complete
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${calculateProfileCompletion()}%` }
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
            onPress={() => {
              console.log('[PROFILE_SECTION] Edit mode activated');
              setEditing(true);
            }}
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
          label="fullName"
          value={formData.fullName}
          icon="person-outline"
        />
        
        <InfoRow
          label="email"
          value={formData.email}
          icon="mail-outline"
        />
        
        <InfoRow
          label="phone"
          value={formData.phone}
          icon="call-outline"
          editable={false}
        />
        
        <InfoRow
          label="location"
          value={formData.location}
          icon="location-outline"
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
                {user.consultantRequest.status || 'Not Applied'}
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
              { backgroundColor: user?.videoFreeTrial ? '#4CAF50' : '#FFA726' }
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
              { backgroundColor: user?.chatFreeTrial ? '#4CAF50' : '#FFA726' }
            ]} />
            <Text style={styles.infoValue}>
              {user?.chatFreeTrial ? 'Used' : 'Available'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return '#4CAF50';
    case 'pending': return '#FFA726';
    case 'rejected': return '#FF6B6B';
    default: return '#666';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#4CAF50',
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
    fontWeight: '600',
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
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  completionContainer: {
    marginTop: 8,
  },
  completionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#f0f8f0',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  editButtonText: {
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    textTransform: 'capitalize',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  infoInput: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});

export default WalletSection;