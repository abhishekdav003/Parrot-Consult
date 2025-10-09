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
} from 'react-native';
import { pick, isCancel, types } from '@react-native-documents/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';

const ProfileUpgradeSection = ({ user, onRefresh, navigation }) => {
  const { updateUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState('loading');
  const [uploadProgress, setUploadProgress] = useState({ aadhaar: false, pan: false });

  // Step 1: KYC Data
  const [kycData, setKycData] = useState({
    aadharNumber: '',
    panNumber: '',
    aadhaarFile: null,
    panFile: null,
  });

  // Step 2: Consultant Application Data
  const [consultantData, setConsultantData] = useState({
    rate: '',
    daysPerWeek: '5',
    qualification: '',
    field: '',
    university: '',
    graduationYear: '',
    shortBio: '',
    experience: '',
    category: '',
    languages: [],
    resume: null,
  });

  const [languageInput, setLanguageInput] = useState('');

  const categories = [
    'Tech',
    'E-commerce',
    'Legal',
    'Marketing',
    'Finance',
    'HR',
    'Business',
    'Other'
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

      // Upload files using updateUserProfile which handles the backend correctly
      const profileData = {
        aadharNumber: kycData.aadharNumber,
        panNumber: kycData.panNumber,
        profileImage: kycData.aadhaarFile, // Will be handled as aadhaar upload
        resume: kycData.panFile, // Will be handled as pan upload
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

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.formLabel}>Session Fee (₹/hour) *</Text>
            <TextInput
              style={styles.formInput}
              value={consultantData.rate}
              onChangeText={(text) => setConsultantData(prev => ({ ...prev, rate: text.replace(/\D/g, '') }))}
              placeholder="e.g., 500"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.formLabel}>Experience (years) *</Text>
            <TextInput
              style={styles.formInput}
              value={consultantData.experience}
              onChangeText={(text) => setConsultantData(prev => ({ ...prev, experience: text.replace(/\D/g, '') }))}
              placeholder="e.g., 5"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Qualification *</Text>
          <TextInput
            style={styles.formInput}
            value={consultantData.qualification}
            onChangeText={(text) => setConsultantData(prev => ({ ...prev, qualification: text }))}
            placeholder="e.g., Master's in Business Administration"
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
            editable={!loading}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.formLabel}>University *</Text>
            <TextInput
              style={styles.formInput}
              value={consultantData.university}
              onChangeText={(text) => setConsultantData(prev => ({ ...prev, university: text }))}
              placeholder="University name"
              editable={!loading}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.formLabel}>Graduation Year *</Text>
            <TextInput
              style={styles.formInput}
              value={consultantData.graduationYear}
              onChangeText={(text) => setConsultantData(prev => ({ ...prev, graduationYear: text.replace(/\D/g, '') }))}
              placeholder="Year"
              keyboardType="numeric"
              maxLength={4}
              editable={!loading}
            />
          </View>
        </View>

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

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Languages *</Text>
          <View style={styles.languageInputContainer}>
            <TextInput
              style={[styles.formInput, styles.languageInput]}
              value={languageInput}
              onChangeText={setLanguageInput}
              placeholder="Add language"
              onSubmitEditing={addLanguage}
              editable={!loading}
            />
            <TouchableOpacity style={styles.addButton} onPress={addLanguage} disabled={loading}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {consultantData.languages.length > 0 && (
            <View style={styles.languageList}>
              {consultantData.languages.map((language, index) => (
                <View key={index} style={styles.languageChip}>
                  <Text style={styles.languageChipText}>{language}</Text>
                  <TouchableOpacity
                    onPress={() => removeLanguage(language)}
                    style={styles.removeLanguageButton}
                    disabled={loading}
                  >
                    <Ionicons name="close" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Short Bio</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            value={consultantData.shortBio}
            onChangeText={(text) => setConsultantData(prev => ({ ...prev, shortBio: text }))}
            placeholder="Tell us about yourself and your expertise..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Resume *</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={selectResume}
            disabled={loading}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#059669" />
            <Text style={styles.uploadButtonText}>
              {consultantData.resume ? 'Change Resume' : 'Upload Resume (PDF)'}
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
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  languageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#059669',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  languageChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E40AF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  removeLanguageButton: {
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
    padding: 40,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default ProfileUpgradeSection;