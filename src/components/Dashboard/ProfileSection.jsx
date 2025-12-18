// src/components/Dashboard/ProfileSection.jsx - Fixed keyboard dismissal issue
import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  Keyboard,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { pick, isCancel, types } from '@react-native-documents/picker';

// FIXED: Moved InfoRow outside the main component to prevent recreation
const InfoRow = React.memo(({ 
  label, 
  value, 
  icon, 
  editable = true, 
  keyboardType = 'default', 
  onChangeText,
  multiline = false,
  maxLength,
  placeholder,
  editing
}) => {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color="#666" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {editing && editable ? (
        <TextInput
          style={[styles.infoInput, multiline && styles.multilineInput]}
          value={value || ''}
          onChangeText={onChangeText}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          maxLength={maxLength}
          autoCorrect={keyboardType !== 'email-address'}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          returnKeyType={multiline ? "default" : "done"}
          blurOnSubmit={!multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          selectTextOnFocus={false}
          spellCheck={keyboardType !== 'email-address' && keyboardType !== 'numeric'}
        />
      ) : (
        <Text style={styles.infoValue} numberOfLines={multiline ? 3 : 1}>
          {value || 'Not provided'}
        </Text>
      )}
    </View>
  );
});

InfoRow.displayName = 'InfoRow';

const ProfileSection = ({ user, onRefresh, onAuthError }) => {
  const { updateUserProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [selectedProfileImage, setSelectedProfileImage] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);
  
  // FIXED: Initialize form data directly without useMemo to prevent issues
  const getInitialFormData = () => {
    if (!user) return {};
    
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
      return {
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
      };
    }

    return baseData;
  };

  const [formData, setFormData] = useState(() => getInitialFormData());

  // FIXED: Update form data only when user actually changes
  React.useEffect(() => {
    if (user) {
      const newFormData = getInitialFormData();
      setFormData(newFormData);
    }
  }, [user?.fullName, user?.email, user?.phone, user?.location, user?.role]);

  // Memoize user type check
  // const isConsultant = useMemo(() => {
  //   return user?.consultantRequest?.consultantProfile || user?.role === 'consultant';
  // }, [user?.consultantRequest?.consultantProfile, user?.role]);

  const isConsultant = useMemo(() => {
  return user?.role === 'consultant' || user?.consultantRequest?.status === 'approved';
}, [user?.role, user?.consultantRequest?.status]);

  // FIXED: Simplified field change handler that doesn't cause re-renders
  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prevData => ({
      ...prevData,
      [fieldName]: value
    }));
  }, []);

  // FIXED: Create stable onChangeText handlers for each field
  const createOnChangeTextHandler = useCallback((fieldName) => {
    return (text) => handleFieldChange(fieldName, text);
  }, [handleFieldChange]);

  // Request storage permissions for Android
  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    try {
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

      if (allGranted) return true;

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
  }, []);

  // Profile Image picker
  const pickProfileImage = useCallback(async () => {
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
  }, [requestPermissions]);

  // Resume picker
  const pickResume = useCallback(async () => {
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
  }, [requestPermissions]);

  // Validation functions
  const isValidEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const isValidPhone = useCallback((phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  }, []);

  const isValidAadhar = useCallback((aadhar) => {
    const aadharRegex = /^\d{12}$/;
    return aadharRegex.test(aadhar);
  }, []);

  const isValidPAN = useCallback((pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  }, []);

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    let totalFields = 4;
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
  }, [user]);

  // Enhanced validation function
  const validateForm = useCallback(() => {
  const errors = [];

  if (!formData.fullName?.trim()) {
    errors.push('Full name is required');
  }

  // CRITICAL: Email is now required
  if (!formData.email?.trim()) {
    errors.push('Email address is required');
  } else if (!isValidEmail(formData.email)) {
    errors.push('Please enter a valid email address');
  }

  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.push('Please enter a valid 10-digit mobile number');
  }

  if (formData.aadharNumber && !isValidAadhar(formData.aadharNumber)) {
    errors.push('Please enter a valid 12-digit Aadhaar number');
  }

  if (formData.panNumber && !isValidPAN(formData.panNumber)) {
    errors.push('Please enter a valid PAN number (e.g., ABCDE1234F)');
  }

  if (isConsultant) {
    if (formData.sessionFee && (isNaN(formData.sessionFee) || parseFloat(formData.sessionFee) < 0)) {
      errors.push('Please enter a valid session fee');
    }

    if (formData.graduationYear && (isNaN(formData.graduationYear) || 
        parseInt(formData.graduationYear) < 1950 || 
        parseInt(formData.graduationYear) > new Date().getFullYear())) {
      errors.push('Please enter a valid graduation year');
    }

    if (formData.yearsOfExperience && (isNaN(formData.yearsOfExperience) || 
        parseFloat(formData.yearsOfExperience) < 0 || 
        parseFloat(formData.yearsOfExperience) > 50)) {
      errors.push('Please enter valid years of experience (0-50)');
    }

    if (!selectedResume && !formData.resume) {
      errors.push('Resume is required for consultant profile');
    }
  }

  return errors;
}, [formData, isConsultant, isValidEmail, isValidPhone, isValidAadhar, isValidPAN, selectedResume]);

  // Handle save with enhanced validation
  const handleSave = useCallback(async () => {
  try {
    Keyboard.dismiss();
    setLoading(true);

    console.log('[PROFILE] Starting profile save');

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      Alert.alert('Validation Error', validationErrors.join('\n'));
      setLoading(false);
      return;
    }

    // CRITICAL: Email validation for ALL profiles (especially consultants)
    if (!formData.email || !formData.email.trim()) {
      Alert.alert(
        'Email Required',
        'Email address is required to complete your profile. Please add a valid email address.',
        [{ text: 'OK', style: 'default' }]
      );
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., user@example.com)');
      setLoading(false);
      return;
    }

    const updateData = {
      fullName: formData.fullName?.trim(),
      phone: formData.phone?.trim(),
      email: formData.email?.trim(),
      location: formData.location?.trim(),
    };

    // Add KYC data only if provided
    if (formData.aadharNumber || formData.panNumber) {
      Object.assign(updateData, {
        aadharNumber: formData.aadharNumber?.trim(),
        aadharURL: formData.aadharURL?.trim() || [],
        panNumber: formData.panNumber?.trim(),
        panURL: formData.panURL?.trim(),
      });
    }

    // Add consultant data if applicable
    if (isConsultant) {
      updateData.role = 'consultant';
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

    // Add files if selected
    if (selectedProfileImage) {
      updateData.profileImage = selectedProfileImage;
    }

    if (selectedResume) {
      updateData.resume = selectedResume;
    }

    console.log('[PROFILE] Submitting update with:', {
      email: updateData.email,
      isConsultant,
      hasProfileImage: !!selectedProfileImage,
      hasResume: !!selectedResume,
    });

    const result = await updateUserProfile(updateData);

    if (result.success) {
      console.log('[PROFILE] Update successful, refreshing data');
      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            setEditing(false);
            setSelectedProfileImage(null);
            setSelectedResume(null);
            onRefresh && onRefresh();
          }
        }
      ]);
    } else {
      console.error('[PROFILE] Update failed:', result.error);
      if (onAuthError && result.needsLogin && onAuthError(result)) {
        return;
      }
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  } catch (error) {
    console.error('[PROFILE] Error updating profile:', error);
    Alert.alert('Error', 'Failed to update profile. Please try again.');
  } finally {
    setLoading(false);
  }
}, [formData, validateForm, updateUserProfile, onRefresh, onAuthError, isConsultant, selectedProfileImage, selectedResume]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Changes',
      'Are you sure you want to cancel? All unsaved changes will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            Keyboard.dismiss();
            setFormData(getInitialFormData());
            setSelectedProfileImage(null);
            setSelectedResume(null);
            setEditing(false);
          }
        }
      ]
    );
  }, []);

  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  }, []);

  // Memoized Profile Image Section
  const ProfileImageSection = React.memo(() => (
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
            style={[styles.fileButton, loading && styles.disabledButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={loading ? "#999" : "#4CAF50"} />
            <Text style={[styles.fileButtonText, loading && styles.disabledButtonText]}>
              {selectedProfileImage ? 'Change Image' : 'Upload Image'}
            </Text>
          </TouchableOpacity>
          {selectedProfileImage && (
            <Text style={styles.selectedFile} numberOfLines={1}>
              {selectedProfileImage.name}
            </Text>
          )}
          {!selectedProfileImage && user.profileImage && (
            <Text style={styles.existingFile}>
              Current: Profile image uploaded
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.infoValue}>
          {user.profileImage ? 'Uploaded' : 'Not uploaded'}
        </Text>
      )}
    </View>
  ));

  // Memoized Resume Section
  const ResumeSection = React.memo(() => (
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
            style={[styles.fileButton, loading && styles.disabledButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={loading ? "#999" : "#4CAF50"} />
            <Text style={[styles.fileButtonText, loading && styles.disabledButtonText]}>
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
  ));

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.profileImage ? (
            <Image 
              source={{ uri: user.profileImage }} 
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          {editing && (
            <TouchableOpacity 
              style={styles.avatarEditButton}
              onPress={pickProfileImage}
              disabled={loading}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{user.fullName || 'User'}</Text>
          <Text style={styles.userRole}>
            {user.role === 'consultant' ? 'Consultant' : user.role === 'admin' ? 'Admin' : 'User'}
          </Text>
          {user.consultantRequest?.status && (
            <View style={styles.statusBadge}>
              <View style={[styles.statusIndicator, { 
                backgroundColor: user.consultantRequest.status === 'approved' ? '#4CAF50' : 
                               user.consultantRequest.status === 'pending' ? '#FFA726' : '#FF6B6B' 
              }]} />
              <Text style={styles.consultantStatus}>
                Consultant Status: {user.consultantRequest.status.charAt(0).toUpperCase() + user.consultantRequest.status.slice(1)}
              </Text>
            </View>
          )}
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>
              Profile {profileCompletion}% complete
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${profileCompletion}%` }]} 
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
              style={[styles.actionButton, styles.saveButton, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#666" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => setEditing(true)}
            activeOpacity={0.8}
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
          onChangeText={createOnChangeTextHandler('fullName')}
          maxLength={50}
          placeholder="Enter your full name"
          editing={editing}
        />
        
        <InfoRow
          label="Email Address"
          value={formData.email}
          icon="mail-outline"
          keyboardType="email-address"
          onChangeText={createOnChangeTextHandler('email')}
          maxLength={100}
          placeholder="Enter your email address"
          editing={editing}
        />
        
        <InfoRow
          label="Phone Number"
          value={formData.phone}
          icon="call-outline"
          editable={false}
          editing={editing}
        />
        
        <InfoRow
          label="Location"
          value={formData.location}
          icon="location-outline"
          onChangeText={createOnChangeTextHandler('location')}
          maxLength={100}
          placeholder="Enter your location"
          editing={editing}
        />

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
          onChangeText={createOnChangeTextHandler('aadharNumber')}
          maxLength={12}
          placeholder="Enter 12-digit Aadhaar number"
          editing={editing}
        />
        
        <InfoRow
          label="PAN Number"
          value={formData.panNumber}
          icon="card-outline"
          onChangeText={createOnChangeTextHandler('panNumber')}
          maxLength={10}
          placeholder="Enter PAN number (e.g., ABCDE1234F)"
          editing={editing}
        />
      </View>

      {/* Consultant Information */}
      {isConsultant && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          <InfoRow
            label="Session Fee (₹)"
            value={formData.sessionFee}
            icon="cash-outline"
            keyboardType="numeric"
            onChangeText={createOnChangeTextHandler('sessionFee')}
            maxLength={6}
            placeholder="Enter session fee in INR"
            editing={editing}
          />
          
          <InfoRow
            label="Days per Week"
            value={formData.daysPerWeek}
            icon="calendar-outline"
            onChangeText={createOnChangeTextHandler('daysPerWeek')}
            maxLength={20}
            placeholder="e.g., 5"
            editing={editing}
          />

          <InfoRow
            label="Available Days"
            value={formData.days}
            icon="calendar-clear-outline"
            onChangeText={createOnChangeTextHandler('days')}
            maxLength={50}
            placeholder="e.g., Monday, Tuesday, Wednesday"
            editing={editing}
          />
          
          <InfoRow
            label="Available Time Per Day"
            value={formData.availableTimePerDay}
            icon="alarm-outline"
            onChangeText={createOnChangeTextHandler('availableTimePerDay')}
            maxLength={30}
            placeholder="e.g., 9 AM - 5 PM"
            editing={editing}
          />
          
          <InfoRow
            label="Qualification"
            value={formData.qualification}
            icon="school-outline"
            onChangeText={createOnChangeTextHandler('qualification')}
            maxLength={100}
            placeholder="e.g., MBA, B.Tech, etc."
            editing={editing}
          />

          <InfoRow
            label="Field of Study"
            value={formData.fieldOfStudy}
            icon="book-outline"
            onChangeText={createOnChangeTextHandler('fieldOfStudy')}
            maxLength={100}
            placeholder="e.g., Computer Science, Business"
            editing={editing}
          />
          
          <InfoRow
            label="University"
            value={formData.university}
            icon="library-outline"
            onChangeText={createOnChangeTextHandler('university')}
            maxLength={100}
            placeholder="Enter your university name"
            editing={editing}
          />
          
          <InfoRow
            label="Graduation Year"
            value={formData.graduationYear}
            icon="calendar-number-outline"
            keyboardType="numeric"
            onChangeText={createOnChangeTextHandler('graduationYear')}
            maxLength={4}
            placeholder="e.g., 2020"
            editing={editing}
          />

          <InfoRow
            label="Experience (Years)"
            value={formData.yearsOfExperience}
            icon="time-outline"
            keyboardType="numeric"
            onChangeText={createOnChangeTextHandler('yearsOfExperience')}
            maxLength={2}
            placeholder="e.g., 5"
            editing={editing}
            />
          
          <InfoRow
            label="Languages"
            value={formData.languages}
            icon="language-outline"
            onChangeText={createOnChangeTextHandler('languages')}
            maxLength={100}
            placeholder="e.g., English, Hindi, etc."
            editing={editing}
          />
          
          <InfoRow
            label="Key Skills"
            value={formData.keySkills}
            icon="construct-outline"
            onChangeText={createOnChangeTextHandler('keySkills')}
            maxLength={200}
            placeholder="e.g., JavaScript, React, Node.js"
            editing={editing}
          />
          
          <InfoRow
            label="Category"
            value={formData.category}
            icon="pricetag-outline"
            onChangeText={createOnChangeTextHandler('category')}
            maxLength={50}
            placeholder="e.g., Technology, Business, Marketing"
            editing={editing}
          />
          
          <InfoRow
            label="Short Bio"
            value={formData.shortBio}
            icon="document-text-outline"
            onChangeText={createOnChangeTextHandler('shortBio')}
            multiline={true}
            maxLength={500}
            placeholder="Write a brief description about yourself and your expertise"
            editing={editing}
          />

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
            <Text style={[styles.infoValue, { 
              color: user.suspended ? '#FF6B6B' : '#4CAF50',
              fontWeight: '600'
            }]}>
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
            <Text style={[styles.infoValue, { 
              color: user.aadharVerified ? '#4CAF50' : '#FFA726',
              fontWeight: '600'
            }]}>
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

        {user.lastLoginAt && (
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="log-in-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Last Login</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatDate(user.lastLoginAt)}
            </Text>
          </View>
        )}
      </View>

      {/* Trial Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trial Status</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="videocam-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Video Call Trial</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: user.videoFreeTrial ? '#FF6B6B' : '#4CAF50' }
            ]} />
            <Text style={[styles.infoValue, { 
              color: user.videoFreeTrial ? '#FF6B6B' : '#4CAF50',
              fontWeight: '600'
            }]}>
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
            <Text style={[styles.infoValue, { 
              color: user.chatFreeTrial ? '#FF6B6B' : '#4CAF50',
              fontWeight: '600'
            }]}>
              {user.chatFreeTrial ? 'Used' : 'Available'}
            </Text>
          </View>
        </View>
      </View>

      {/* Statistics for Consultants */}
      {isConsultant && user.consultantStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{user.consultantStats.totalSessions || 0}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="star-outline" size={24} color="#FFA726" />
              <Text style={styles.statValue}>
                {user.consultantStats.averageRating ? user.consultantStats.averageRating.toFixed(1) : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={24} color="#2196F3" />
              <Text style={styles.statValue}>
                ₹{user.consultantStats.totalEarnings ? user.consultantStats.totalEarnings.toLocaleString() : '0'}
              </Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="thumbs-up-outline" size={24} color="#9C27B0" />
              <Text style={styles.statValue}>
                {user.consultantStats.completionRate ? `${user.consultantStats.completionRate}%` : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </View>
      )}

      {/* Additional spacing at bottom */}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  avatarPlaceholder: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  consultantStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  completionContainer: {
    marginTop: 8,
  },
  completionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  editButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#999',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#999',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 60,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.4,
    minWidth: 140,
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
    lineHeight: 22,
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
    flex: 0.6,
    lineHeight: 22,
  },
  infoInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
    flex: 0.6,
    textAlign: 'left',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
    paddingTop: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.6,
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  fileSection: {
    flex: 0.6,
    alignItems: 'flex-end',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  fileButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedFile: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 6,
    textAlign: 'right',
    maxWidth: 160,
    fontWeight: '500',
  },
  existingFile: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    textAlign: 'right',
    maxWidth: 160,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default React.memo(ProfileSection);