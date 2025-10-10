import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { pick, isCancel, types } from '@react-native-documents/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProfileUpgradeSection = ({ user, onRefresh, navigation }) => {
  const { updateUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState('loading');
  const [uploadProgress, setUploadProgress] = useState({ aadhaar: false, pan: false });
  const [showDaysModal, setShowDaysModal] = useState(false);

  // Step 1: KYC Data
  const [kycData, setKycData] = useState({
    aadharNumber: '',
    panNumber: '',
    aadhaarFile: null,
    panFile: null,
  });

  // Step 2: Consultant Application Data - Enhanced with all fields
  const [consultantData, setConsultantData] = useState({
    rate: '',
    daysPerWeek: '',
    days: [], // Array of selected days
    qualification: '',
    field: '',
    university: '',
    graduationYear: '',
    keySkills: [],
    Specialized: [],
    shortBio: '',
    experience: '',
    category: '',
    languages: [],
    resume: null,
  });

  const [languageInput, setLanguageInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [specializationInput, setSpecializationInput] = useState('');

  const categories = [
    'IT & Technology',
    'Business & Finance',
    'Legal & Compliance',
    'Marketing & Sales',
    'Human Resources',
    'Healthcare',
    'Education & Training',
    'Design & Creative',
    'Engineering',
    'Consulting',
  ];

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const timeSlots = [
    '1-2 hours',
    '2-4 hours',
    '4-6 hours',
    '6-8 hours',
    'Flexible',
  ];

  // Check email availability on mount
  useEffect(() => {
    checkEmailAvailability();
  }, [user]);

  const checkEmailAvailability = useCallback(() => {
    if (!user?.email || user.email.trim() === '') {
      Alert.alert(
        'Email Required',
        'Please update your email address in your profile before applying to become a consultant.',
        [
          {
            text: 'Update Profile',
            onPress: () => {
              if (navigation) {
                navigation.navigate('Dashboard', { initialSection: 'profile' });
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return false;
    }
    return true;
  }, [user, navigation]);

  // Fetch application status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await ApiService.getConsultantStatus();
        if (result.success && result.data?.status) {
          setApplicationStatus(result.data.status);
        } else {
          if (user?.role === 'consultant') {
            setApplicationStatus('approved');
          } else if (user?.aadharVerified) {
            setApplicationStatus('kyc_completed');
            setCurrentStep(2);
          } else {
            setApplicationStatus('not_started');
          }
        }
      } catch (err) {
        console.error('[UPGRADE] Error fetching status:', err);
        setApplicationStatus('not_started');
      }
    };

    if (user) {
      fetchStatus();
    }
  }, [user]);

  // Auto-advance to step 2 if KYC completed
  useEffect(() => {
    if (
      applicationStatus === 'kyc_completed' ||
      (user?.aadharVerified && applicationStatus !== 'pending' && applicationStatus !== 'approved')
    ) {
      setCurrentStep(2);
    }
  }, [applicationStatus, user?.aadharVerified]);

  // File Picker Functions
  const pickAadhaarFile = useCallback(async () => {
    try {
      const results = await pick({
        type: [types.images, types.pdf],
        allowMultiSelection: false,
      });

      if (results && results.length > 0) {
        const file = results[0];
        setKycData(prev => ({
          ...prev,
          aadhaarFile: {
            uri: file.fileCopyUri || file.uri,
            type: file.type,
            name: file.name,
          },
        }));
        Alert.alert('Success', 'Aadhaar document selected');
      }
    } catch (error) {
      if (!isCancel(error)) {
        Alert.alert('Error', 'Failed to select Aadhaar document');
      }
    }
  }, []);

  const pickPanFile = useCallback(async () => {
    try {
      const results = await pick({
        type: [types.images, types.pdf],
        allowMultiSelection: false,
      });

      if (results && results.length > 0) {
        const file = results[0];
        setKycData(prev => ({
          ...prev,
          panFile: {
            uri: file.fileCopyUri || file.uri,
            type: file.type,
            name: file.name,
          },
        }));
        Alert.alert('Success', 'PAN document selected');
      }
    } catch (error) {
      if (!isCancel(error)) {
        Alert.alert('Error', 'Failed to select PAN document');
      }
    }
  }, []);

  const selectResume = useCallback(async () => {
    try {
      const results = await pick({
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

      if (results && results.length > 0) {
        const file = results[0];
        setConsultantData(prev => ({
          ...prev,
          resume: {
            uri: file.fileCopyUri || file.uri,
            type: file.type,
            name: file.name,
          },
        }));
        Alert.alert('Success', 'Resume selected');
      }
    } catch (error) {
      if (!isCancel(error)) {
        Alert.alert('Error', 'Failed to select resume');
      }
    }
  }, []);

  // Days Selection Handler
  const toggleDaySelection = useCallback((day) => {
    setConsultantData(prev => {
      const days = prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day];
      
      // Update daysPerWeek automatically
      return {
        ...prev,
        days,
        daysPerWeek: days.length.toString(),
      };
    });
  }, []);

  // Validation Functions
  const validateKYC = useCallback(() => {
    const errors = [];

    if (!kycData.aadharNumber || kycData.aadharNumber.length !== 12) {
      errors.push('Please enter a valid 12-digit Aadhaar number');
    }

    if (!/^\d{12}$/.test(kycData.aadharNumber)) {
      errors.push('Aadhaar number must contain only digits');
    }

    if (!kycData.panNumber || kycData.panNumber.length !== 10) {
      errors.push('Please enter a valid 10-character PAN number');
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(kycData.panNumber)) {
      errors.push('PAN format should be: ABCDE1234F');
    }

    if (!kycData.aadhaarFile) {
      errors.push('Please upload Aadhaar document');
    }

    if (!kycData.panFile) {
      errors.push('Please upload PAN document');
    }

    return errors;
  }, [kycData]);

  const validateConsultantData = useCallback(() => {
    const errors = [];

    if (!consultantData.rate || parseFloat(consultantData.rate) <= 0) {
      errors.push('Please enter a valid session fee');
    }

    if (parseFloat(consultantData.rate) > 10000) {
      errors.push('Session fee cannot exceed ₹10,000');
    }

    if (!consultantData.experience || parseInt(consultantData.experience) < 0) {
      errors.push('Please enter valid years of experience');
    }

    if (!consultantData.qualification?.trim()) {
      errors.push('Qualification is required');
    }

    if (!consultantData.field?.trim()) {
      errors.push('Field of study is required');
    }

    if (!consultantData.university?.trim()) {
      errors.push('University name is required');
    }

    if (!consultantData.graduationYear || 
        parseInt(consultantData.graduationYear) < 1950 || 
        parseInt(consultantData.graduationYear) > new Date().getFullYear()) {
      errors.push('Please enter a valid graduation year');
    }

    if (!consultantData.category) {
      errors.push('Please select a category');
    }

    if (consultantData.days.length === 0) {
      errors.push('Please select at least one available day');
    }

   

    if (consultantData.languages.length === 0) {
      errors.push('Please add at least one language');
    }

    if (!consultantData.resume) {
      errors.push('Please upload your resume');
    }

    return errors;
  }, [consultantData]);

  // Submit KYC
  const handleKYCSubmission = useCallback(async () => {
    if (!checkEmailAvailability()) return;

    const validationErrors = validateKYC();
    if (validationErrors.length > 0) {
      Alert.alert('Validation Error', validationErrors.join('\n'));
      return;
    }

    try {
      setLoading(true);
      setUploadProgress({ aadhaar: true, pan: true });

      const profileData = {
        aadharNumber: kycData.aadharNumber,
        panNumber: kycData.panNumber,
        profileImage: kycData.aadhaarFile,
        resume: kycData.panFile,
      };

      const result = await updateUserProfile(profileData);

      if (result.success) {
        Alert.alert(
          'Success',
          'KYC verification submitted successfully',
          [
            {
              text: 'Continue',
              onPress: () => {
                setCurrentStep(2);
                setApplicationStatus('kyc_completed');
                onRefresh && onRefresh();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit KYC verification');
      }
    } catch (error) {
      console.error('[UPGRADE] KYC submission error:', error);
      Alert.alert('Error', 'Failed to submit KYC verification');
    } finally {
      setLoading(false);
      setUploadProgress({ aadhaar: false, pan: false });
    }
  }, [kycData, validateKYC, updateUserProfile, checkEmailAvailability, onRefresh]);

  // Submit Consultant Application
  const handleConsultantApplication = useCallback(async () => {
    if (!checkEmailAvailability()) return;

    const validationErrors = validateConsultantData();
    if (validationErrors.length > 0) {
      Alert.alert('Validation Error', validationErrors.join('\n'));
      return;
    }

    try {
      setLoading(true);

      const result = await ApiService.submitConsultantApplication(consultantData);

      if (result.success) {
        Alert.alert(
          'Success',
          'Your consultant application has been submitted successfully. It will be reviewed within 2-3 business days.',
          [
            {
              text: 'OK',
              onPress: () => {
                setApplicationStatus('pending');
                onRefresh && onRefresh();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit consultant application');
      }
    } catch (error) {
      console.error('[UPGRADE] Consultant application error:', error);
      Alert.alert('Error', 'Failed to submit consultant application');
    } finally {
      setLoading(false);
    }
  }, [consultantData, validateConsultantData, checkEmailAvailability, onRefresh]);

  // Language Management
  const addLanguage = useCallback(() => {
    if (languageInput.trim() && !consultantData.languages.includes(languageInput.trim())) {
      setConsultantData(prev => ({
        ...prev,
        languages: [...prev.languages, languageInput.trim()]
      }));
      setLanguageInput('');
    }
  }, [languageInput, consultantData.languages]);

  const removeLanguage = useCallback((languageToRemove) => {
    setConsultantData(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang !== languageToRemove)
    }));
  }, []);

  // Skill Management
  const addSkill = useCallback(() => {
    if (skillInput.trim() && !consultantData.keySkills.includes(skillInput.trim())) {
      setConsultantData(prev => ({
        ...prev,
        keySkills: [...prev.keySkills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  }, [skillInput, consultantData.keySkills]);

  const removeSkill = useCallback((skillToRemove) => {
    setConsultantData(prev => ({
      ...prev,
      keySkills: prev.keySkills.filter(skill => skill !== skillToRemove)
    }));
  }, []);

  // Specialization Management
  const addSpecialization = useCallback(() => {
    if (specializationInput.trim() && !consultantData.Specialized.includes(specializationInput.trim())) {
      setConsultantData(prev => ({
        ...prev,
        Specialized: [...prev.Specialized, specializationInput.trim()]
      }));
      setSpecializationInput('');
    }
  }, [specializationInput, consultantData.Specialized]);

  const removeSpecialization = useCallback((specToRemove) => {
    setConsultantData(prev => ({
      ...prev,
      Specialized: prev.Specialized.filter(spec => spec !== specToRemove)
    }));
  }, []);

  // Render Status Screen
  const renderStatusScreen = () => {
    const statusConfig = {
      approved: {
        icon: 'checkmark-circle',
        iconColor: '#059669',
        bgColor: '#F0FDF4',
        borderColor: '#059669',
        title: 'Consultant Approved!',
        subtitle: 'Congratulations! You are now a verified consultant on our platform.',
      },
      pending: {
        icon: 'time',
        iconColor: '#F59E0B',
        bgColor: '#FFFBEB',
        borderColor: '#F59E0B',
        title: 'Application Pending',
        subtitle: "Your consultant application is under review. You'll be notified once it's approved.",
      },
      rejected: {
        icon: 'close-circle',
        iconColor: '#EF4444',
        bgColor: '#FEF2F2',
        borderColor: '#EF4444',
        title: 'Application Not Approved',
        subtitle: 'Your application was not approved. Please contact support for more information.',
      },
    };

    const config = statusConfig[applicationStatus] || statusConfig.pending;

    return (
      <View style={[styles.statusContainer, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
        <View style={styles.statusIconContainer}>
          <Ionicons name={config.icon} size={64} color={config.iconColor} />
        </View>
        <Text style={styles.statusTitle}>{config.title}</Text>
        <Text style={styles.statusSubtitle}>{config.subtitle}</Text>
        
        {applicationStatus === 'rejected' && (
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 24 }]}
            onPress={() => {
              if (navigation) {
                navigation.navigate('ChatBot', { query: 'need support' });
              }
            }}
          >
            <Ionicons name="help-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Contact Support</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Days Selection Modal
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

          <ScrollView style={styles.modalBody}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayOption,
                  consultantData.days.includes(day) && styles.selectedDayOption
                ]}
                onPress={() => toggleDaySelection(day)}
              >
                <Text style={[
                  styles.dayOptionText,
                  consultantData.days.includes(day) && styles.selectedDayOptionText
                ]}>
                  {day}
                </Text>
                {consultantData.days.includes(day) && (
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowDaysModal(false)}
          >
            <Text style={styles.modalButtonText}>
              Done ({consultantData.days.length} selected)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render KYC Step
  const renderKYCStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
        </View>
        <Text style={styles.stepTitle}>KYC Verification</Text>
        <Text style={styles.stepSubtitle}>Verify your identity to continue</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Aadhaar Number *</Text>
        <TextInput
          style={styles.formInput}
          value={kycData.aadharNumber}
          onChangeText={(text) => setKycData(prev => ({ ...prev, aadharNumber: text.replace(/\D/g, '') }))}
          placeholder="Enter 12-digit Aadhaar number"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          maxLength={12}
          editable={!loading}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Aadhaar Document *</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickAadhaarFile}
          disabled={loading}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#059669" />
          <Text style={styles.uploadButtonText}>
            {kycData.aadhaarFile ? 'Change Document' : 'Upload Document'}
          </Text>
        </TouchableOpacity>
        {kycData.aadhaarFile && (
          <View style={styles.fileInfo}>
            <Ionicons name="document" size={16} color="#059669" />
            <Text style={styles.fileName} numberOfLines={1}>
              {kycData.aadhaarFile.name}
            </Text>
            <TouchableOpacity onPress={() => setKycData(prev => ({ ...prev, aadhaarFile: null }))}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>PAN Number *</Text>
        <TextInput
          style={styles.formInput}
          value={kycData.panNumber}
          onChangeText={(text) => setKycData(prev => ({ ...prev, panNumber: text.toUpperCase() }))}
          placeholder="Enter PAN (e.g., ABCDE1234F)"
          placeholderTextColor="#94A3B8"
          maxLength={10}
          autoCapitalize="characters"
          editable={!loading}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>PAN Document *</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickPanFile}
          disabled={loading}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#059669" />
          <Text style={styles.uploadButtonText}>
            {kycData.panFile ? 'Change Document' : 'Upload Document'}
          </Text>
        </TouchableOpacity>
        {kycData.panFile && (
          <View style={styles.fileInfo}>
            <Ionicons name="document" size={16} color="#059669" />
            <Text style={styles.fileName} numberOfLines={1}>
              {kycData.panFile.name}
            </Text>
            <TouchableOpacity onPress={() => setKycData(prev => ({ ...prev, panFile: null }))}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleKYCSubmission}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Verify & Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Render Consultant Step
  const renderConsultantStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
        </View>
        <Text style={styles.stepTitle}>Consultant Profile</Text>
        <Text style={styles.stepSubtitle}>Complete your consultant application</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.formScrollView}>
        {/* Session Fee & Experience */}
        <View style={styles.formRow}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.formLabel}>Session Fee (₹/hour) *</Text>
            <TextInput
              style={styles.formInput}
              value={consultantData.rate}
              onChangeText={(text) => setConsultantData(prev => ({ ...prev, rate: text.replace(/\D/g, '') }))}
              placeholder="e.g., 500"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.formLabel}>Experience (years) *</Text>
            <TextInput
              style={styles.formInput}
              value={consultantData.experience}
              onChangeText={(text) => setConsultantData(prev => ({ ...prev, experience: text.replace(/\D/g, '') }))}
              placeholder="e.g., 5"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>
        </View>

        {/* Available Days Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Available Days *</Text>
          <TouchableOpacity
            style={[styles.formInput, styles.selectInput]}
            onPress={() => setShowDaysModal(true)}
            disabled={loading}
          >
            <Text style={[styles.selectInputText, consultantData.days.length === 0 && styles.placeholderText]}>
              {consultantData.days.length > 0 
                ? `${consultantData.days.length} day${consultantData.days.length > 1 ? 's' : ''} selected`
                : 'Select available days'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </TouchableOpacity>
          
          {consultantData.days.length > 0 && (
            <View style={styles.selectedDaysContainer}>
              {consultantData.days.map((day) => (
                <View key={day} style={styles.selectedDayChip}>
                  <Text style={styles.selectedDayChipText}>{day}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

       

        {/* Education Details */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Qualification *</Text>
          <TextInput
            style={styles.formInput}
            value={consultantData.qualification}
            onChangeText={(text) => setConsultantData(prev => ({ ...prev, qualification: text }))}
            placeholder="e.g., Master's in Business Administration"
            placeholderTextColor="#94A3B8"
            editable={!loading}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Field of Study *</Text>
          <TextInput
            style={styles.formInput}
            value={consultantData.field}
            onChangeText={(text) => setConsultantData(prev => ({ ...prev, field: text }))}
            placeholder="e.g., Business Management"
            placeholderTextColor="#94A3B8"
            editable={!loading}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.formLabel}>University *</Text>
            <TextInput
              style={styles.formInput}
              value={consultantData.university}
              onChangeText={(text) => setConsultantData(prev => ({ ...prev, university: text }))}
              placeholder="University name"
              placeholderTextColor="#94A3B8"
              editable={!loading}
            />
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.formLabel}>Graduation Year *</Text>
            <TextInput
              style={styles.formInput}
              value={consultantData.graduationYear}
              onChangeText={(text) => setConsultantData(prev => ({ ...prev, graduationYear: text.replace(/\D/g, '') }))}
              placeholder="Year"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={4}
              editable={!loading}
            />
          </View>
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  consultantData.category === category && styles.selectedCategoryChip
                ]}
                onPress={() => setConsultantData(prev => ({ ...prev, category }))}
                disabled={loading}
              >
                <Text style={[
                  styles.categoryChipText,
                  consultantData.category === category && styles.selectedCategoryChipText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Key Skills */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Key Skills</Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.formInput, styles.flexInput]}
              value={skillInput}
              onChangeText={setSkillInput}
              placeholder="Add skill"
              placeholderTextColor="#94A3B8"
              onSubmitEditing={addSkill}
              editable={!loading}
            />
            <TouchableOpacity style={styles.addButton} onPress={addSkill} disabled={loading}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {consultantData.keySkills.length > 0 && (
            <View style={styles.chipList}>
              {consultantData.keySkills.map((skill, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{skill}</Text>
                  <TouchableOpacity
                    onPress={() => removeSkill(skill)}
                    style={styles.removeChipButton}
                    disabled={loading}
                  >
                    <Ionicons name="close" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Specializations */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Specializations</Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.formInput, styles.flexInput]}
              value={specializationInput}
              onChangeText={setSpecializationInput}
              placeholder="Add specialization"
              placeholderTextColor="#94A3B8"
              onSubmitEditing={addSpecialization}
              editable={!loading}
            />
            <TouchableOpacity style={styles.addButton} onPress={addSpecialization} disabled={loading}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {consultantData.Specialized.length > 0 && (
            <View style={styles.chipList}>
              {consultantData.Specialized.map((spec, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{spec}</Text>
                  <TouchableOpacity
                    onPress={() => removeSpecialization(spec)}
                    style={styles.removeChipButton}
                    disabled={loading}
                  >
                    <Ionicons name="close" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Languages */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Languages *</Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.formInput, styles.flexInput]}
              value={languageInput}
              onChangeText={setLanguageInput}
              placeholder="Add language"
              placeholderTextColor="#94A3B8"
              onSubmitEditing={addLanguage}
              editable={!loading}
            />
            <TouchableOpacity style={styles.addButton} onPress={addLanguage} disabled={loading}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {consultantData.languages.length > 0 && (
            <View style={styles.chipList}>
              {consultantData.languages.map((language, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{language}</Text>
                  <TouchableOpacity
                    onPress={() => removeLanguage(language)}
                    style={styles.removeChipButton}
                    disabled={loading}
                  >
                    <Ionicons name="close" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Short Bio */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Short Bio</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            value={consultantData.shortBio}
            onChangeText={(text) => setConsultantData(prev => ({ ...prev, shortBio: text }))}
            placeholder="Tell us about yourself and your expertise..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
          <Text style={styles.charCount}>{consultantData.shortBio.length}/500</Text>
        </View>

        {/* Resume Upload */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Resume *</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={selectResume}
            disabled={loading}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#059669" />
            <Text style={styles.uploadButtonText}>
              {consultantData.resume ? 'Change Resume' : 'Upload Resume (PDF/DOC)'}
            </Text>
          </TouchableOpacity>
          {consultantData.resume && (
            <View style={styles.fileInfo}>
              <Ionicons name="document-text" size={16} color="#059669" />
              <Text style={styles.fileName} numberOfLines={1}>
                {consultantData.resume.name}
              </Text>
              <TouchableOpacity onPress={() => setConsultantData(prev => ({ ...prev, resume: null }))}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleConsultantApplication}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Submit Application</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Main Render
  if (applicationStatus === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (applicationStatus === 'approved' || applicationStatus === 'pending' || applicationStatus === 'rejected') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {renderStatusScreen()}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {currentStep === 1 ? renderKYCStep() : renderConsultantStep()}
      {renderDaysModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SCREEN_WIDTH < 380 ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  stepTitle: {
    fontSize: SCREEN_WIDTH < 380 ? 20 : 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  formScrollView: {
    maxHeight: SCREEN_WIDTH < 380 ? 500 : 600,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  halfWidth: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  formInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectInputText: {
    fontSize: 14,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  uploadButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  selectedDayChip: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedDayChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0369A1',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timeSlotScroll: {
    marginTop: 8,
  },
  timeSlotChip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedTimeSlotChip: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  timeSlotChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedTimeSlotChipText: {
    color: '#fff',
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flexInput: {
    flex: 1,
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: '#059669',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E40AF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  removeChipButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    padding: SCREEN_WIDTH < 380 ? 24 : 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusIconContainer: {
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: SCREEN_WIDTH < 380 ? 20 : 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
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
    borderColor: '#059669',
  },
  dayOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedDayOptionText: {
    color: '#059669',
    fontWeight: '600',
  },
  modalButton: {
    backgroundColor: '#059669',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default ProfileUpgradeSection;