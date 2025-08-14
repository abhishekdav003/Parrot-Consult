// src/components/Dashboard/ProfileSection.jsx - Fixed to match backend expectations exactly
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { pick, isCancel, types } from '@react-native-documents/picker';

const ProfileSection = ({ user, onRefresh, onAuthError }) => {
  const { updateUserProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [selectedProfileImage, setSelectedProfileImage] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // FIXED: Initialize form data to match backend schema exactly
  const [formData, setFormData] = useState(() => {
    if (!user) return {};
    
    const baseData = {
      // Basic Info (matching backend updateProfile schema)
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone?.toString() || '',
      location: user.location || '',
      profileImage: user.profileImage || '',

      // KYC Info (matching backend nested structure)
      aadharNumber: user.kycVerify?.aadharNumber?.toString() || '',
      aadharURL: user.kycVerify?.aadharURL || '',
      panNumber: user.kycVerify?.panNumber || '',
      panURL: user.kycVerify?.panURL || '',
    };

    // Add consultant fields if user has consultant request
    if (user.consultantRequest?.consultantProfile || user.role === 'consultant') {
      const profile = user.consultantRequest?.consultantProfile || {};
      return {
        ...baseData,
        // Consultant Profile Info (matching backend field names exactly)
        sessionFee: profile.sessionFee?.toString() || '',
        daysPerWeek: profile.daysPerWeek || '',
        days: Array.isArray(profile.days) ? profile.days.join(', ') : (profile.days || ''),
        availableTimePerDay: profile.availableTimePerDay || '',
        qualification: profile.qualification || '',
        fieldOfStudy: profile.fieldOfStudy || '',
        university: profile.university || '',
        graduationYear: profile.graduationYear?.toString() || '',
        keySkills: Array.isArray(profile.keySkills) ? profile.keySkills.join(', ') : (profile.keySkills || ''),
        shortBio: profile.shortBio || '',
        languages: Array.isArray(profile.languages) ? profile.languages.join(', ') : (profile.languages || ''),
        yearsOfExperience: profile.yearsOfExperience?.toString() || '',
        category: profile.category || '',
        profileHealth: profile.profileHealth?.toString() || '0',

        // Documents (matching backend structure)
        resume: user.consultantRequest?.documents?.resume || '',
        otherDocuments: user.consultantRequest?.documents?.other || [],

        // Flags (matching backend)
        aadharVerified: Boolean(user.aadharVerified || false),
      };
    }

    return baseData;
  });

  // Update form data when user changes
  React.useEffect(() => {
    if (user) {
      const baseData = {
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone?.toString() || '',
        location: user.location || '',
        profileImage: user.profileImage || '',
        aadharNumber: user.kycVerify?.aadharNumber?.toString() || '',
        aadharURL: user.kycVerify?.aadharURL || '',
        panNumber: user.kycVerify?.panNumber || '',
        panURL: user.kycVerify?.panURL || '',
      };

      if (user.consultantRequest?.consultantProfile || user.role === 'consultant') {
        const profile = user.consultantRequest?.consultantProfile || {};
        setFormData({
          ...baseData,
          sessionFee: profile.sessionFee?.toString() || '',
          daysPerWeek: profile.daysPerWeek || '',
          days: Array.isArray(profile.days) ? profile.days.join(', ') : (profile.days || ''),
          availableTimePerDay: profile.availableTimePerDay || '',
          qualification: profile.qualification || '',
          fieldOfStudy: profile.fieldOfStudy || '',
          university: profile.university || '',
          graduationYear: profile.graduationYear?.toString() || '',
          keySkills: Array.isArray(profile.keySkills) ? profile.keySkills.join(', ') : (profile.keySkills || ''),
          shortBio: profile.shortBio || '',
          languages: Array.isArray(profile.languages) ? profile.languages.join(', ') : (profile.languages || ''),
          yearsOfExperience: profile.yearsOfExperience?.toString() || '',
          category: profile.category || '',
          profileHealth: profile.profileHealth?.toString() || '0',
          resume: user.consultantRequest?.documents?.resume || '',
          otherDocuments: user.consultantRequest?.documents?.other || [],
          aadharVerified: Boolean(user.aadharVerified || false),
        });
      } else {
        setFormData(baseData);
      }
    }
  }, [user]);

  // Request storage permissions for Android
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      console.log('[PROFILE] Requesting Android permissions...');
      
      const apiLevel = Platform.Version;
      let permissionsToCheck = [];
      
      if (apiLevel >= 33) {
        permissionsToCheck = [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ];
      } else {
        permissionsToCheck = [
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];
      }

      const currentPermissions = {};
      for (const permission of permissionsToCheck) {
        try {
          const hasPermission = await PermissionsAndroid.check(permission);
          currentPermissions[permission] = hasPermission ? 
            PermissionsAndroid.RESULTS.GRANTED : 
            PermissionsAndroid.RESULTS.DENIED;
        } catch (error) {
          currentPermissions[permission] = PermissionsAndroid.RESULTS.DENIED;
        }
      }

      const allGranted = Object.values(currentPermissions).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (allGranted) {
        return true;
      }

      const results = await PermissionsAndroid.requestMultiple(permissionsToCheck);
      
      const allNowGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allNowGranted) {
        Alert.alert(
          'Permissions Required',
          'Storage permissions are required to select files.',
          [{ text: 'OK', style: 'default' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PROFILE] Permission request error:', error);
      Alert.alert('Error', 'Failed to request permissions.');
      return false;
    }
  };

  // Profile Image picker
  const pickProfileImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      setLoading(true);
      
      const result = await pick({
        type: [types.images],
        allowMultiSelection: false,
      });

      if (result && result.length > 0) {
        const file = result[0];
        setSelectedProfileImage(file);
        
        console.log('[PROFILE] Profile image selected:', {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        Alert.alert('Success', `Profile image selected: ${file.name}`);
      }
    } catch (error) {
      if (!isCancel(error)) {
        console.error('[PROFILE] Profile image picker error:', error);
        Alert.alert('Error', 'Failed to select profile image');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resume picker
  const pickResume = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      setLoading(true);
      
      const result = await pick({
        type: [
          types.pdf,
          types.doc,
          types.docx,
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        allowMultiSelection: false,
      });

      if (result && result.length > 0) {
        const file = result[0];
        setSelectedResume(file);
        
        console.log('[PROFILE] Resume selected:', {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        Alert.alert('Success', `Resume selected: ${file.name}`);
      }
    } catch (error) {
      if (!isCancel(error)) {
        console.error('[PROFILE] Resume picker error:', error);
        Alert.alert('Error', 'Failed to select resume');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email validation
  const isValidEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Calculate profile completion
  const getProfileCompletion = () => {
    if (!user) return 0;
    let totalFields = 4; // fullName, email, location, phone
    let filledFields = 0;

    if (user.fullName) filledFields++;
    if (user.email) filledFields++;
    if (user.location) filledFields++;
    if (user.phone) filledFields++;

    if (user.consultantRequest?.consultantProfile) {
      const profile = user.consultantRequest.consultantProfile;
      totalFields += 8;

      if (profile.sessionFee) filledFields++;
      if (profile.qualification) filledFields++;
      if (profile.fieldOfStudy) filledFields++;
      if (profile.university) filledFields++;
      if (profile.graduationYear) filledFields++;
      if (profile.yearsOfExperience) filledFields++;
      if (profile.category) filledFields++;
      if (profile.shortBio) filledFields++;
    }

    return Math.round((filledFields / totalFields) * 100);
  };

  // FIXED: Handle save to match backend expectations exactly
  const handleSave = useCallback(async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!formData.fullName?.trim()) {
        Alert.alert('Error', 'Full name is required');
        return;
      }

      if (formData.email && !isValidEmail(formData.email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      const isConsultant = user.consultantRequest?.consultantProfile || user.role === 'consultant';

      console.log('[PROFILE] Saving profile, isConsultant:', isConsultant);
      console.log('[PROFILE] Form data:', formData);

      // CRITICAL: Prepare update data exactly as backend expects
      const updateData = {
        // Basic fields (matching backend updateProfile function exactly)
        fullName: formData.fullName?.trim(),
        phone: formData.phone?.trim(),
        email: formData.email?.trim(),
        location: formData.location?.trim(),
      };

      // Add KYC fields if provided (matching backend nested structure)
      if (formData.aadharNumber || formData.panNumber || formData.aadharURL || formData.panURL) {
        Object.assign(updateData, {
          aadharNumber: formData.aadharNumber?.trim(),
          aadharURL: formData.aadharURL?.trim(),
          panNumber: formData.panNumber?.trim(),
          panURL: formData.panURL?.trim(),
        });
      }

      // Add consultant fields if user is consultant (matching backend logic exactly)
      if (isConsultant) {
        // CRITICAL: Set role to consultant to trigger backend consultant logic
        updateData.role = 'consultant';

        // Add consultant profile fields with exact backend field names
        Object.assign(updateData, {
          sessionFee: formData.sessionFee?.trim(),
          daysPerWeek: formData.daysPerWeek?.trim(),
          days: formData.days?.trim(),
          availableTimePerDay: formData.availableTimePerDay?.trim(),
          qualification: formData.qualification?.trim(),
          fieldOfStudy: formData.fieldOfStudy?.trim(),
          university: formData.university?.trim(),
          graduationYear: formData.graduationYear?.trim(),
          keySkills: formData.keySkills?.trim(),
          shortBio: formData.shortBio?.trim(),
          languages: formData.languages?.trim(),
          yearsOfExperience: formData.yearsOfExperience?.trim(),
          category: formData.category?.trim(),
          profileHealth: formData.profileHealth || '0',
        });
      }

      // Add profile image if selected (matching backend multer field name)
      if (selectedProfileImage) {
        updateData.profileImage = selectedProfileImage;
      }

      // Add resume if selected (CRITICAL: Backend requires resume file)
      if (selectedResume) {
        updateData.resume = selectedResume;
      } else if (isConsultant && !formData.resume) {
        // For consultant profiles, if no new resume and no existing resume, show error
        Alert.alert('Error', 'Resume is required for consultant profile');
        return;
      }

      console.log('[PROFILE] Sending update data to backend:', {
        ...updateData,
        profileImage: updateData.profileImage ? 'FILE_SELECTED' : 'NONE',
        resume: updateData.resume ? 'FILE_SELECTED' : 'NONE'
      });

      const result = await updateUserProfile(updateData);

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditing(false);
        setSelectedProfileImage(null);
        setSelectedResume(null);
        onRefresh && onRefresh();
      } else {
        if (onAuthError && result.needsLogin && onAuthError(result)) {
          return;
        }
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('[PROFILE] Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }, [formData, isValidEmail, updateUserProfile, onRefresh, onAuthError, user, selectedProfileImage, selectedResume]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    // Reset form data to original values
    const baseData = {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone?.toString() || '',
      location: user?.location || '',
      profileImage: user?.profileImage || '',
      aadharNumber: user?.kycVerify?.aadharNumber?.toString() || '',
      aadharURL: user?.kycVerify?.aadharURL || '',
      panNumber: user?.kycVerify?.panNumber || '',
      panURL: user?.kycVerify?.panURL || '',
    };

    if (user?.consultantRequest?.consultantProfile || user?.role === 'consultant') {
      const profile = user.consultantRequest?.consultantProfile || {};
      setFormData({
        ...baseData,
        sessionFee: profile.sessionFee?.toString() || '',
        daysPerWeek: profile.daysPerWeek || '',
        days: Array.isArray(profile.days) ? profile.days.join(', ') : (profile.days || ''),
        availableTimePerDay: profile.availableTimePerDay || '',
        qualification: profile.qualification || '',
        fieldOfStudy: profile.fieldOfStudy || '',
        university: profile.university || '',
        graduationYear: profile.graduationYear?.toString() || '',
        keySkills: Array.isArray(profile.keySkills) ? profile.keySkills.join(', ') : (profile.keySkills || ''),
        shortBio: profile.shortBio || '',
        languages: Array.isArray(profile.languages) ? profile.languages.join(', ') : (profile.languages || ''),
        yearsOfExperience: profile.yearsOfExperience?.toString() || '',
        category: profile.category || '',
        profileHealth: profile.profileHealth?.toString() || '0',
        resume: user.consultantRequest?.documents?.resume || '',
        otherDocuments: user.consultantRequest?.documents?.other || [],
        aadharVerified: Boolean(user.aadharVerified || false),
      });
    } else {
      setFormData(baseData);
    }

    setSelectedProfileImage(null);
    setSelectedResume(null);
    setEditing(false);
  }, [user]);

  // Handle field change
  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Info Row Component
  const InfoRow = ({ 
    label, 
    value, 
    icon, 
    editable = true, 
    keyboardType = 'default', 
    fieldName, 
    multiline = false 
  }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color="#666" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {editing && editable ? (
        <TextInput
          style={[styles.infoInput, multiline && styles.multilineInput]}
          value={value}
          onChangeText={(text) => handleFieldChange(fieldName, text)}
          placeholder={`Enter ${label.toLowerCase()}`}
          keyboardType={keyboardType}
          editable={!loading}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
      ) : (
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      )}
    </View>
  );

  // Profile Image Section
  const ProfileImageSection = () => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name="camera-outline" size={20} color="#666" />
        <Text style={styles.infoLabel}>Profile Image</Text>
      </View>
      {editing ? (
        <View style={styles.fileSection}>
          <TouchableOpacity
            onPress={pickProfileImage}
            disabled={loading}
            style={styles.fileButton}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#4CAF50" />
            <Text style={styles.fileButtonText}>
              {selectedProfileImage ? 'Change Image' : 'Upload Image'}
            </Text>
          </TouchableOpacity>
          {selectedProfileImage && (
            <Text style={styles.selectedFile} numberOfLines={1}>
              {selectedProfileImage.name}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.infoValue}>
          {user.profileImage ? 'Uploaded' : 'Not uploaded'}
        </Text>
      )}
    </View>
  );

  // Resume Section Component
  const ResumeSection = () => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name="document-text-outline" size={20} color="#666" />
        <Text style={styles.infoLabel}>Resume</Text>
      </View>
      {editing ? (
        <View style={styles.fileSection}>
          <TouchableOpacity
            onPress={pickResume}
            disabled={loading}
            style={styles.fileButton}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#4CAF50" />
            <Text style={styles.fileButtonText}>
              {selectedResume ? 'Change Resume' : 'Upload Resume'}
            </Text>
          </TouchableOpacity>
          {selectedResume && (
            <Text style={styles.selectedFile} numberOfLines={1}>
              {selectedResume.name}
            </Text>
          )}
          {!selectedResume && user.consultantRequest?.documents?.resume && (
            <Text style={styles.existingFile}>
              Current: Resume uploaded
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.infoValue}>
          {user.consultantRequest?.documents?.resume ? 'Uploaded' : 'Not uploaded'}
        </Text>
      )}
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  const isConsultant = user.consultantRequest?.consultantProfile || user.role === 'consultant';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{user.fullName || 'User'}</Text>
          <Text style={styles.userRole}>
            {user.role === 'consultant' ? 'Consultant' : user.role === 'admin' ? 'Admin' : 'User'}
          </Text>
          {user.consultantRequest?.status && (
            <Text style={[styles.consultantStatus, { 
              color: user.consultantRequest.status === 'approved' ? '#4CAF50' : 
                     user.consultantRequest.status === 'pending' ? '#FFA726' : '#FF6B6B' 
            }]}>
              Consultant Status: {user.consultantRequest.status.charAt(0).toUpperCase() + user.consultantRequest.status.slice(1)}
            </Text>
          )}
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>
              Profile {getProfileCompletion()}% complete
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${getProfileCompletion()}%` }]} 
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
            onPress={() => setEditing(true)}
          >
            <Ionicons name="pencil" size={20} color="#4CAF50" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <InfoRow
          label="Full Name"
          value={formData.fullName}
          icon="person-outline"
          fieldName="fullName"
        />
        
        <InfoRow
          label="Email Address"
          value={formData.email}
          icon="mail-outline"
          keyboardType="email-address"
          fieldName="email"
        />
        
        <InfoRow
          label="Phone Number"
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

        {/* Profile Image Section */}
        <ProfileImageSection />
      </View>

      {/* KYC Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KYC Information</Text>
        
        <InfoRow
          label="Aadhaar Number"
          value={formData.aadharNumber}
          icon="card-outline"
          keyboardType="numeric"
          fieldName="aadharNumber"
        />
        
        <InfoRow
          label="PAN Number"
          value={formData.panNumber}
          icon="card-outline"
          fieldName="panNumber"
        />
      </View>

      {/* Consultant Information - Only show if user has consultant profile */}
      {isConsultant && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          <InfoRow
            label="Session Fee (INR)"
            value={formData.sessionFee}
            icon="cash-outline"
            keyboardType="numeric"
            fieldName="sessionFee"
          />
          
          <InfoRow
            label="Days per Week"
            value={formData.daysPerWeek}
            icon="calendar-outline"
            fieldName="daysPerWeek"
          />
          
          <InfoRow
            label="Available Days"
            value={formData.days}
            icon="calendar-clear-outline"
            fieldName="days"
          />
          
          <InfoRow
            label="Available Time Per Day"
            value={formData.availableTimePerDay}
            icon="alarm-outline"
            fieldName="availableTimePerDay"
          />
          
          <InfoRow
            label="Qualification"
            value={formData.qualification}
            icon="school-outline"
            fieldName="qualification"
          />
          
          <InfoRow
            label="Field of Study"
            value={formData.fieldOfStudy}
            icon="book-outline"
            fieldName="fieldOfStudy"
          />
          
          <InfoRow
            label="University"
            value={formData.university}
            icon="library-outline"
            fieldName="university"
          />
          
          <InfoRow
            label="Graduation Year"
            value={formData.graduationYear}
            icon="calendar-number-outline"
            keyboardType="numeric"
            fieldName="graduationYear"
          />
          
          <InfoRow
            label="Experience (Years)"
            value={formData.yearsOfExperience}
            icon="time-outline"
            keyboardType="numeric"
            fieldName="yearsOfExperience"
          />
          
          <InfoRow
            label="Languages"
            value={formData.languages}
            icon="language-outline"
            fieldName="languages"
          />
          
          <InfoRow
            label="Key Skills"
            value={formData.keySkills}
            icon="construct-outline"
            fieldName="keySkills"
          />
          
          <InfoRow
            label="Category"
            value={formData.category}
            icon="pricetag-outline"
            fieldName="category"
          />
          
          <InfoRow
            label="Short Bio"
            value={formData.shortBio}
            icon="document-text-outline"
            fieldName="shortBio"
            multiline={true}
          />

          {/* Resume Section */}
          <ResumeSection />
        </View>
      )}

      {/* Account Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Status</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Account Status</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: user.suspended ? '#FF6B6B' : '#4CAF50' }
            ]} />
            <Text style={styles.infoValue}>
              {user.suspended ? 'Suspended' : 'Active'}
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
              { backgroundColor: user.aadharVerified ? '#4CAF50' : '#FFA726' }
            ]} />
            <Text style={styles.infoValue}>
              {user.aadharVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Member Since</Text>
          </View>
          <Text style={styles.infoValue}>
            {formatDate(user.createdAt)}
          </Text>
        </View>
      </View>

      {/* Trial Status */}
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
              { backgroundColor: user.videoFreeTrial ? '#FF6B6B' : '#4CAF50' }
            ]} />
            <Text style={styles.infoValue}>
              {user.videoFreeTrial ? 'Used' : 'Available'}
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
              { backgroundColor: user.chatFreeTrial ? '#FF6B6B' : '#4CAF50' }
            ]} />
            <Text style={styles.infoValue}>
              {user.chatFreeTrial ? 'Used' : 'Available'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  avatarContainer: {
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
    marginBottom: 4,
  },
  consultantStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
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
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 80,
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
  fileSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 6,
  },
  fileButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFile: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    textAlign: 'right',
    maxWidth: 150,
  },
  existingFile: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
    maxWidth: 150,
  },
});

export default React.memo(ProfileSection);