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
  Image,
  Keyboard,
  Modal,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { pick, isCancel, types } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const { width, height } = Dimensions.get('window');

// Constants
const NAVBAR_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
const BOTTOM_SAFE_PADDING = 120; // Extra padding to prevent navbar overlap

// ===== MEMOIZED INFO ROW COMPONENT =====
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
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={[styles.iconCircle, editing && styles.iconCircleActive]}>
          <Ionicons name={icon} size={18} color={editing ? "#10B981" : "#64748B"} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {editing && editable ? (
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.infoInput, 
              multiline && styles.multilineInput,
              isFocused && styles.infoInputFocused
            ]}
            value={value || ''}
            onChangeText={onChangeText}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            placeholderTextColor="#CBD5E1"
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {isFocused && !multiline && (
            <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" style={styles.inputCheck} />
          )}
        </View>
      ) : (
        <View style={styles.valueContainer}>
          <Text style={styles.infoValue} numberOfLines={multiline ? 3 : 1}>
            {value || 'Not provided'}
          </Text>
          {value && !multiline && (
            <View style={styles.valueBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>
      )}
    </View>
  );
});

InfoRow.displayName = 'InfoRow';

// ===== TIME PICKER COMPONENT =====
const TimePicker = React.memo(({ 
  label, 
  value, 
  icon, 
  onPress,
  editing
}) => {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={[styles.iconCircle, editing && styles.iconCircleActive]}>
          <Ionicons name={icon} size={18} color={editing ? "#10B981" : "#64748B"} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {editing ? (
        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.timePickerText, !value && styles.timePickerPlaceholder]}>
            {value || 'Select time range'}
          </Text>
          <Ionicons name="time-outline" size={20} color="#10B981" />
        </TouchableOpacity>
      ) : (
        <View style={styles.valueContainer}>
          <Text style={styles.infoValue}>
            {value || 'Not set'}
          </Text>
          {value && (
            <View style={styles.valueBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>
      )}
    </View>
  );
});

TimePicker.displayName = 'TimePicker';

// ===== DAYS SELECTOR COMPONENT =====
const DaysSelector = React.memo(({ 
  label, 
  selectedDays, 
  icon, 
  onPress,
  editing
}) => {
  const displayText = selectedDays?.length > 0 
    ? `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected`
    : 'Select days';

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={[styles.iconCircle, editing && styles.iconCircleActive]}>
          <Ionicons name={icon} size={18} color={editing ? "#10B981" : "#64748B"} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {editing ? (
        <TouchableOpacity
          style={styles.daysSelectorButton}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.daysSelectorText, selectedDays?.length === 0 && styles.daysSelectorPlaceholder]}>
            {displayText}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#10B981" />
        </TouchableOpacity>
      ) : (
        <View style={styles.valueContainer}>
          <Text style={styles.infoValue}>
            {selectedDays?.length > 0 ? selectedDays.join(', ') : 'Not set'}
          </Text>
          {selectedDays?.length > 0 && (
            <View style={styles.valueBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>
      )}
    </View>
  );
});

DaysSelector.displayName = 'DaysSelector';

// ===== MAIN PROFILE SECTION COMPONENT =====
const ProfileSection = ({ user, onRefresh, onAuthError }) => {
  const { updateUserProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [selectedProfileImage, setSelectedProfileImage] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);
  
  // Days and Time Modals
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [tempStartHour, setTempStartHour] = useState('09');
  const [tempStartMinute, setTempStartMinute] = useState('00');
  const [tempStartPeriod, setTempStartPeriod] = useState('AM');
  const [tempEndHour, setTempEndHour] = useState('05');
  const [tempEndMinute, setTempEndMinute] = useState('00');
  const [tempEndPeriod, setTempEndPeriod] = useState('PM');

  const daysOfWeek = useMemo(() => [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ], []);

  // Initialize form data
  const getInitialFormData = () => {
  if (!user) {
    return {
      days: [],   // ✅ ALWAYS INITIALIZE
    };
  }

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

    // ✅ CRITICAL FIX
    days: [], 
  };

  if (user.consultantRequest?.consultantProfile || user.role === 'consultant') {
    const profile = user.consultantRequest?.consultantProfile || {};

    return {
      ...baseData,
      sessionFee: profile.sessionFee?.toString() || '',
      days: Array.isArray(profile.days) ? profile.days : [], // ✅ SAFE
      availableTimePerDay: profile.availableTimePerDay || '',
      qualification: profile.qualification || '',
      fieldOfStudy: profile.fieldOfStudy || '',
      university: profile.university || '',
      graduationYear: profile.graduationYear?.toString() || '',
      keySkills: Array.isArray(profile.keySkills)
        ? profile.keySkills.join(', ')
        : (profile.keySkills || ''),
      shortBio: profile.shortBio || '',
      languages: Array.isArray(profile.languages)
        ? profile.languages.join(', ')
        : (profile.languages || ''),
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

  React.useEffect(() => {
    if (user) {
      const newFormData = getInitialFormData();
      setFormData(newFormData);
    }
  }, [user?.fullName, user?.email, user?.phone, user?.location, user?.role]);

  const isConsultant = useMemo(() => {
    return user?.role === 'consultant' || user?.consultantRequest?.status === 'approved';
  }, [user?.role, user?.consultantRequest?.status]);

  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prevData => ({
      ...prevData,
      [fieldName]: value
    }));
  }, []);

  const createOnChangeTextHandler = useCallback((fieldName) => {
    return (text) => handleFieldChange(fieldName, text);
  }, [handleFieldChange]);

  // Toggle day selection
  const toggleDaySelection = useCallback((day) => {
  setFormData(prev => {
    const currentDays = Array.isArray(prev.days) ? prev.days : [];

    const days = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];

    return {
      ...prev,
      days,
    };
  });
}, []);


  // Time formatting helper
  const formatTime = useCallback((hour, minute, period) => {
    return `${hour}:${minute} ${period}`;
  }, []);

  // Apply time selection
  const applyTimeSelection = useCallback(() => {
    const startTime = formatTime(tempStartHour, tempStartMinute, tempStartPeriod);
    const endTime = formatTime(tempEndHour, tempEndMinute, tempEndPeriod);
    const timeRange = `${startTime} - ${endTime}`;
    
    handleFieldChange('availableTimePerDay', timeRange);
    setShowTimeModal(false);
  }, [tempStartHour, tempStartMinute, tempStartPeriod, tempEndHour, tempEndMinute, tempEndPeriod, formatTime, handleFieldChange]);

  // ===== PERMISSIONS & FILE HANDLING =====
  
  const pickProfileImage = useCallback(async () => {
  try {
    setLoading(true);

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.8,
    });

    if (result.didCancel) return;

    if (result.errorCode) {
      Alert.alert('Error', result.errorMessage || 'Failed to select image');
      return;
    }

    const asset = result.assets?.[0];
    if (!asset) return;

    // Normalize to your existing backend format
    const file = {
      uri: asset.uri,
      name: asset.fileName || `profile_${Date.now()}.jpg`,
      type: asset.type || 'image/jpeg',
    };

    setSelectedProfileImage(file);
    Alert.alert('Success', 'Profile image selected');
  } catch (error) {
    console.error('[PROFILE] Image picker error:', error);
    Alert.alert('Error', 'Failed to select profile image');
  } finally {
    setLoading(false);
  }
}, []);

  

  const pickResume = useCallback(async () => {
  try {
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
}, []);


  // ===== VALIDATION FUNCTIONS =====
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

  // ===== PROFILE COMPLETION CALCULATION =====
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

  // ===== FORM VALIDATION =====
  const validateForm = useCallback(() => {
    const errors = [];

    if (!formData.fullName?.trim()) {
      errors.push('Full name is required');
    }

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

  // ===== SAVE HANDLER =====
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

      if (!formData.email || !formData.email.trim()) {
        Alert.alert(
          'Email Required',
          'Email address is required to complete your profile. Please add a valid email address.',
          [{ text: 'OK', style: 'default' }]
        );
        setLoading(false);
        return;
      }

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

      if (formData.aadharNumber || formData.panNumber) {
        Object.assign(updateData, {
          aadharNumber: formData.aadharNumber?.trim(),
          aadharURL: formData.aadharURL?.trim() || [],
          panNumber: formData.panNumber?.trim(),
          panURL: formData.panURL?.trim(),
        });
      }

      if (isConsultant) {
        updateData.role = 'consultant';
        Object.assign(updateData, {
          sessionFee: formData.sessionFee?.trim(),
          days: formData.days.join(', '),
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

  // ===== CANCEL HANDLER =====
  const handleCancel = useCallback(() => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to cancel? All unsaved changes will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        {
          text: 'Discard',
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

  // ===== PROFILE IMAGE SECTION =====
  const ProfileImageSection = React.memo(() => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={[styles.iconCircle, editing && styles.iconCircleActive]}>
          <Ionicons name="camera-outline" size={18} color={editing ? "#10B981" : "#64748B"} />
        </View>
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
            <Ionicons name="cloud-upload-outline" size={16} color={loading ? "#94A3B8" : "#10B981"} />
            <Text style={[styles.fileButtonText, loading && styles.disabledButtonText]}>
              {selectedProfileImage ? 'Change' : 'Upload'}
            </Text>
          </TouchableOpacity>
          {selectedProfileImage && (
            <Text style={styles.selectedFile} numberOfLines={1}>
              ✓ {selectedProfileImage.name}
            </Text>
          )}
          {!selectedProfileImage && user.profileImage && (
            <Text style={styles.existingFile}>
              Current: Uploaded
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.valueContainer}>
          <Text style={styles.infoValue}>
            {user.profileImage ? 'Uploaded' : 'Not uploaded'}
          </Text>
          {user.profileImage && (
            <View style={styles.valueBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>
      )}
    </View>
  ));

  // ===== RESUME SECTION =====
  const ResumeSection = React.memo(() => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={[styles.iconCircle, editing && styles.iconCircleActive]}>
          <Ionicons name="document-text-outline" size={18} color={editing ? "#10B981" : "#64748B"} />
        </View>
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
            <Ionicons name="cloud-upload-outline" size={16} color={loading ? "#94A3B8" : "#10B981"} />
            <Text style={[styles.fileButtonText, loading && styles.disabledButtonText]}>
              {selectedResume ? 'Change' : 'Upload'}
            </Text>
          </TouchableOpacity>
          {selectedResume && (
            <Text style={styles.selectedFile} numberOfLines={1}>
              ✓ {selectedResume.name}
            </Text>
          )}
          {!selectedResume && user.consultantRequest?.documents?.resume && (
            <Text style={styles.existingFile}>
              Current: Uploaded
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.valueContainer}>
          <Text style={styles.infoValue}>
            {user.consultantRequest?.documents?.resume ? 'Uploaded' : 'Not uploaded'}
          </Text>
          {user.consultantRequest?.documents?.resume && (
            <View style={styles.valueBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>
      )}
    </View>
  ));

  // ===== DAYS MODAL =====
  const renderDaysModal = () => (
    <Modal
      visible={showDaysModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDaysModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Available Days</Text>
            <TouchableOpacity onPress={() => setShowDaysModal(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayOption,
                  Array.isArray(formData.days) && formData.days.includes(day)
 && styles.selectedDayOption
                ]}
                onPress={() => toggleDaySelection(day)}
              >
                <Text style={[
                  styles.dayOptionText,
                  formData.days.includes(day) && styles.selectedDayOptionText
                ]}>
                  {day}
                </Text>
                {formData.days.includes(day) && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowDaysModal(false)}
          >
            <Text style={styles.modalButtonText}>
              Done ({formData.days.length} selected)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ===== TIME PICKER MODAL =====
  const renderTimeModal = () => {
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];
    const periods = ['AM', 'PM'];

    return (
      <Modal
        visible={showTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Range</Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Start Time */}
              <Text style={styles.timeLabel}>Start Time</Text>
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timeColumnLabel}>Hour</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {hours.map(hour => (
                      <TouchableOpacity
                        key={`start-hour-${hour}`}
                        style={[
                          styles.timeOption,
                          tempStartHour === hour && styles.selectedTimeOption
                        ]}
                        onPress={() => setTempStartHour(hour)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          tempStartHour === hour && styles.selectedTimeOptionText
                        ]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timePickerColumn}>
                  <Text style={styles.timeColumnLabel}>Min</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {minutes.map(minute => (
                      <TouchableOpacity
                        key={`start-minute-${minute}`}
                        style={[
                          styles.timeOption,
                          tempStartMinute === minute && styles.selectedTimeOption
                        ]}
                        onPress={() => setTempStartMinute(minute)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          tempStartMinute === minute && styles.selectedTimeOptionText
                        ]}>
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timePickerColumn}>
                  <Text style={styles.timeColumnLabel}>Period</Text>
                  <View style={styles.periodContainer}>
                    {periods.map(period => (
                      <TouchableOpacity
                        key={`start-period-${period}`}
                        style={[
                          styles.periodOption,
                          tempStartPeriod === period && styles.selectedPeriodOption
                        ]}
                        onPress={() => setTempStartPeriod(period)}
                      >
                        <Text style={[
                          styles.periodOptionText,
                          tempStartPeriod === period && styles.selectedPeriodOptionText
                        ]}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.timeDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>to</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* End Time */}
              <Text style={styles.timeLabel}>End Time</Text>
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timeColumnLabel}>Hour</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {hours.map(hour => (
                      <TouchableOpacity
                        key={`end-hour-${hour}`}
                        style={[
                          styles.timeOption,
                          tempEndHour === hour && styles.selectedTimeOption
                        ]}
                        onPress={() => setTempEndHour(hour)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          tempEndHour === hour && styles.selectedTimeOptionText
                        ]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timePickerColumn}>
                  <Text style={styles.timeColumnLabel}>Min</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {minutes.map(minute => (
                      <TouchableOpacity
                        key={`end-minute-${minute}`}
                        style={[
                          styles.timeOption,
                          tempEndMinute === minute && styles.selectedTimeOption
                        ]}
                        onPress={() => setTempEndMinute(minute)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          tempEndMinute === minute && styles.selectedTimeOptionText
                        ]}>
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timePickerColumn}>
                  <Text style={styles.timeColumnLabel}>Period</Text>
                  <View style={styles.periodContainer}>
                    {periods.map(period => (
                      <TouchableOpacity
                        key={`end-period-${period}`}
                        style={[
                          styles.periodOption,
                          tempEndPeriod === period && styles.selectedPeriodOption
                        ]}
                        onPress={() => setTempEndPeriod(period)}
                      >
                        <Text style={[
                          styles.periodOptionText,
                          tempEndPeriod === period && styles.selectedPeriodOptionText
                        ]}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={applyTimeSelection}
            >
              <Text style={styles.modalButtonText}>
                Apply Time Selection
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ===== LOADING STATE =====
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: BOTTOM_SAFE_PADDING }}
    >
      
      {/* ===== PREMIUM PROFILE HEADER ===== */}
{/* ===== ULTRA PREMIUM PROFILE HEADER ===== */}
<View style={styles.heroWrapper}>
  {/* Soft Gradient Background */}
  <View style={styles.heroBackground} />

  {/* Floating Profile Card */}
  <View style={styles.heroCard}>
    {/* Avatar */}
    <View style={styles.heroAvatarWrapper}>
      {user.profileImage ? (
        <Image source={{ uri: user.profileImage }} style={styles.heroAvatar} />
      ) : (
        <View style={styles.heroAvatarPlaceholder}>
          <Text style={styles.heroAvatarText}>
            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
      )}
    </View>

    {/* Info */}
    <View style={styles.heroInfo}>
      <Text style={styles.heroName}>{user.fullName}</Text>

      <View style={styles.heroMetaRow}>
        <Text style={styles.heroRole}>Consultant</Text>

        <View style={styles.heroVerifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.heroVerifiedText}>Approved</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.heroStats}>
        <View>
          <Text style={styles.heroStatLabel}>Profile Strength</Text>
          <Text style={styles.heroStatValue}>{profileCompletion}%</Text>
        </View>

        <View style={styles.heroProgressTrack}>
          <View
            style={[
              styles.heroProgressFill,
              { width: `${profileCompletion}%` },
            ]}
          />
        </View>
      </View>
    </View>
  </View>
</View>



      {/* ===== ACTION BUTTONS ===== */}
      <View style={styles.actionButtonsContainer}>
        {editing ? (
          <>
            <TouchableOpacity 
              style={[styles.actionButtonPrimary, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.buttonTextPrimary}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButtonSecondary}
              onPress={handleCancel}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={20} color="#10B981" />
              <Text style={styles.buttonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={styles.actionButtonEdit}
            onPress={() => setEditing(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={20} color="#10B981" />
            <Text style={styles.buttonTextEdit}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ===== PERSONAL INFORMATION SECTION ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="person-circle-outline" size={22} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>
        
        <View style={styles.sectionContent}>
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
      </View>

      {/* ===== KYC INFORMATION SECTION ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>KYC Information</Text>
        </View>
        
        <View style={styles.sectionContent}>
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
      </View>

      {/* ===== CONSULTANT PROFESSIONAL SECTION ===== */}
      {isConsultant && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="briefcase-outline" size={22} color="#10B981" />
            </View>
            <Text style={styles.sectionTitle}>Professional Information</Text>
          </View>
          
          <View style={styles.sectionContent}>
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
            
            <DaysSelector
              label="Available Days"
              selectedDays={formData.days}
              icon="calendar-outline"
              onPress={() => setShowDaysModal(true)}
              editing={editing}
            />

            <TimePicker
              label="Available Time"
              value={formData.availableTimePerDay}
              icon="time-outline"
              onPress={() => setShowTimeModal(true)}
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
        </View>
      )}

      {/* ===== ACCOUNT STATUS SECTION ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="shield-outline" size={22} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>Account Status</Text>
        </View>
        
        <View style={styles.sectionContent}>
          <View style={styles.statusRow}>
            <View style={styles.statusRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.infoLabel}>Account Status</Text>
            </View>
            <View style={styles.statusRowRight}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: user.suspended ? '#EF4444' : '#10B981' }
              ]} />
              <Text style={[
                styles.infoValue, 
                { color: user.suspended ? '#EF4444' : '#10B981', fontWeight: '600' }
              ]}>
                {user.suspended ? 'Suspended' : 'Active'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <View style={styles.statusRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="card-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.infoLabel}>Aadhaar Verified</Text>
            </View>
            <View style={styles.statusRowRight}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: user.aadharVerified ? '#10B981' : '#F97316' }
              ]} />
              <Text style={[
                styles.infoValue, 
                { color: user.aadharVerified ? '#10B981' : '#F97316', fontWeight: '600' }
              ]}>
                {user.aadharVerified ? 'Verified' : 'Pending'}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.infoLabel}>Member Since</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatDate(user.createdAt)}
            </Text>
          </View>

          {user.lastLoginAt && (
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="log-in-outline" size={18} color="#10B981" />
                </View>
                <Text style={styles.infoLabel}>Last Login</Text>
              </View>
              <Text style={styles.infoValue}>
                {formatDate(user.lastLoginAt)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ===== TRIAL STATUS SECTION ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="rocket-outline" size={22} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>Trial Status</Text>
        </View>
        
        <View style={styles.sectionContent}>
          <View style={styles.statusRow}>
            <View style={styles.statusRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="videocam-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.infoLabel}>Video Call Trial</Text>
            </View>
            <View style={styles.statusRowRight}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: user.videoFreeTrial ? '#EF4444' : '#10B981' }
              ]} />
              <Text style={[
                styles.infoValue, 
                { color: user.videoFreeTrial ? '#EF4444' : '#10B981', fontWeight: '600' }
              ]}>
                {user.videoFreeTrial ? 'Used' : 'Available'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <View style={styles.statusRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="chatbubble-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.infoLabel}>Chat Trial</Text>
            </View>
            <View style={styles.statusRowRight}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: user.chatFreeTrial ? '#EF4444' : '#10B981' }
              ]} />
              <Text style={[
                styles.infoValue, 
                { color: user.chatFreeTrial ? '#EF4444' : '#10B981', fontWeight: '600' }
              ]}>
                {user.chatFreeTrial ? 'Used' : 'Available'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ===== CONSULTANT STATISTICS SECTION ===== */}
      {isConsultant && user.consultantStats && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="stats-chart-outline" size={22} color="#10B981" />
            </View>
            <Text style={styles.sectionTitle}>Performance Statistics</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{user.consultantStats.totalSessions || 0}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>
                {user.consultantStats.averageRating ? user.consultantStats.averageRating.toFixed(1) : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="cash-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>
                ₹{user.consultantStats.totalEarnings ? user.consultantStats.totalEarnings.toLocaleString() : '0'}
              </Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="thumbs-up-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>
                {user.consultantStats.completionRate ? `${user.consultantStats.completionRate}%` : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </View>
      )}

      {/* Modals */}
      {renderDaysModal()}
      {renderTimeModal()}

      {/* Bottom Spacing - Increased for navbar clearance */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ===== STYLESHEET =====
const styles = StyleSheet.create({
  // ===== CONTAINER & LAYOUT =====
  heroWrapper: {
  marginBottom: 24,
},

heroBackground: {
  height: 120,
  backgroundColor: '#10B981',
  borderBottomLeftRadius: 32,
  borderBottomRightRadius: 32,
},

heroCard: {
  marginHorizontal: 20,
  marginTop: -90,
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 20,
  flexDirection: 'row',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 8,
},

heroAvatarWrapper: {
  marginRight: 16,
},

heroAvatar: {
  width: 84,
  height: 84,
  borderRadius: 42,
  borderWidth: 3,
  borderColor: '#FFFFFF',
},

heroAvatarPlaceholder: {
  width: 84,
  height: 84,
  borderRadius: 42,
  backgroundColor: '#059669',
  alignItems: 'center',
  justifyContent: 'center',
},

heroAvatarText: {
  fontSize: 34,
  fontWeight: '700',
  color: '#FFFFFF',
},

heroInfo: {
  flex: 1,
},

heroName: {
  fontSize: 20,
  fontWeight: '700',
  color: '#0F172A',
  marginBottom: 6,
},

heroMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginBottom: 14,
},

heroRole: {
  fontSize: 14,
  color: '#64748B',
  fontWeight: '500',
},

heroVerifiedBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#ECFDF5',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 999,
  gap: 4,
},

heroVerifiedText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#10B981',
},

heroStats: {
  marginTop: 6,
},

heroStatLabel: {
  fontSize: 12,
  color: '#64748B',
  marginBottom: 4,
},

heroStatValue: {
  fontSize: 18,
  fontWeight: '700',
  color: '#10B981',
  marginBottom: 8,
},

heroProgressTrack: {
  height: 6,
  backgroundColor: '#E5E7EB',
  borderRadius: 999,
  overflow: 'hidden',
},

heroProgressFill: {
  height: '100%',
  backgroundColor: '#10B981',
  borderRadius: 999,
},


  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // ===== HEADER CARD =====
  headerCard: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerGradientBackground: {
    height: 120,
    backgroundColor: '#10B981',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 0,
    marginTop: -60,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerInfoContainer: {
    flex: 1,
    paddingTop: 8,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  userRole: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 10,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F97316',
    marginBottom: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusBadgeApproved: {
    backgroundColor: '#10B981',
  },
  statusBadgePending: {
    backgroundColor: '#F97316',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  completionBar: {
    gap: 12,
  },
  completionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  completionPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },

  // ===== ACTION BUTTONS =====
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 8,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#10B981',
    gap: 10,
  },
  actionButtonEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#10B981',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  buttonTextSecondary: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  buttonTextEdit: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#94A3B8',
  },

  // ===== SECTIONS =====
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  sectionContent: {
    paddingVertical: 8,
  },

  // ===== INFO ROW =====
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 64,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.4,
    minWidth: 120,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleActive: {
    backgroundColor: '#F0FDF4',
  },
  infoLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputWrapper: {
    flex: 0.6,
    position: 'relative',
  },
  infoInput: {
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    textAlign: 'left',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  infoInputFocused: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
    paddingTop: 12,
  },
  inputCheck: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  valueContainer: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  infoValue: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'right',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  valueBadge: {
    marginLeft: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== TIME PICKER BUTTON =====
  timePickerButton: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  timePickerText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timePickerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },

  // ===== DAYS SELECTOR BUTTON =====
  daysSelectorButton: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  daysSelectorText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  daysSelectorPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },

  // ===== FILE SECTION =====
  fileSection: {
    flex: 0.6,
    alignItems: 'flex-end',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#10B981',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  fileButtonText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedFile: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 8,
    textAlign: 'right',
    maxWidth: 140,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  existingFile: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'right',
    maxWidth: 140,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // ===== STATUS ROWS =====
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 64,
  },
  statusRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.4,
    minWidth: 120,
  },
  statusRowRight: {
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

  // ===== STATS GRID =====
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // ===== MODALS =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // ===== DAYS MODAL SPECIFIC =====
  dayOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  selectedDayOption: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  dayOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedDayOptionText: {
    color: '#10B981',
    fontWeight: '600',
  },

  // ===== TIME MODAL SPECIFIC =====
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerColumn: {
    flex: 1,
  },
  timeColumnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timeScroll: {
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedTimeOption: {
    backgroundColor: '#F0FDF4',
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedTimeOptionText: {
    color: '#10B981',
    fontWeight: '600',
  },
  periodContainer: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  periodOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedPeriodOption: {
    backgroundColor: '#F0FDF4',
  },
  periodOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedPeriodOptionText: {
    color: '#10B981',
    fontWeight: '600',
  },
  timeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default React.memo(ProfileSection);