import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { pick, isCancel, types } from '@react-native-documents/picker';
import ApiService from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';

const ProfileUpgradeSection = ({ user, onRefresh }) => {
  const { updateUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState('loading');

  // Step 1: KYC Data
  const [kycData, setKycData] = useState({
    aadharNumber: user?.kycVerify?.aadharNumber?.toString() || '',
    panNumber: user?.kycVerify?.panNumber || '',
    aadharURL: user?.kycVerify?.aadharURL || '',
    panURL: user?.kycVerify?.panURL || '',
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

  // Categories for selection
  const categories = [
    'tech',
    'E-commerce', 
    'Legal',
    'Marketing',
    'Finance',
    'HR',
    'Business',
    'other'
  ];

  // Check current application status
  const getApplicationStatus = () => {
    if (user?.role === 'consultant') {
      return 'approved';
    }
    if (user?.consultantRequest?.status) {
      return user.consultantRequest.status;
    }
    if (user?.aadharVerified) {
      return 'kyc_completed';
    }
    return 'not_started';
  };

  // useEffect(() => {
  //   const status = getApplicationStatus();
  //   console.log("👉 Current Application Status:", status); 
  //   if (status === 'kyc_completed' || status === 'pending' || status === 'approved') {
  //     setCurrentStep(2);
  //   }
  // }, [user]);

  useEffect(() => {
  const fetchStatus = async () => {
    try {
      const result = await ApiService.getConsultantStatus();
      if (result.success && result.data?.status) {
        setApplicationStatus(result.data.status); // e.g., 'pending', 'approved'
      } else {
        // fallback: infer from user
        if (user?.role === 'consultant') setApplicationStatus('approved');
        else if (user?.aadharVerified) setApplicationStatus('kyc_completed');
        else setApplicationStatus('not_started');
      }
    } catch (err) {
      console.error('[STATUS] Error fetching consultant status:', err);
      setApplicationStatus('not_started');
    }
  };

  fetchStatus();
}, [user]);

// whenever status is 'kyc_completed' or 'pending' or 'approved', skip to Step 2
useEffect(() => {
  if (
    applicationStatus === 'kyc_completed' ||
    applicationStatus === 'pending' ||
    applicationStatus === 'approved'
  ) {
    setCurrentStep(2);
  }
}, [applicationStatus]);

  // Handle KYC Submission
  const handleKYCSubmission = async () => {
    try {
      if (!kycData.aadharNumber || kycData.aadharNumber.length !== 12) {
        Alert.alert('Error', 'Please enter a valid 12-digit Aadhaar number');
        return;
      }

      if (!kycData.panNumber || kycData.panNumber.length !== 10) {
        Alert.alert('Error', 'Please enter a valid 10-character PAN number');
        return;
      }

      setLoading(true);
      const result = await ApiService.submitAadharVerification(kycData);

      if (result.success) {
        Alert.alert('Success', 'KYC verification submitted successfully');
        setCurrentStep(2);
        onRefresh && onRefresh();
      } else {
        Alert.alert('Error', result.error || 'Failed to submit KYC verification');
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      Alert.alert('Error', 'Failed to submit KYC verification');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resume Selection
const selectResume = async () => {
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
    }
  } catch (error) {
    if (!isCancel(error)) {
      Alert.alert('Error', 'Failed to select resume');
    }
  }
};



  // Add Language
  const addLanguage = () => {
    if (languageInput.trim() && !consultantData.languages.includes(languageInput.trim())) {
      setConsultantData(prev => ({
        ...prev,
        languages: [...prev.languages, languageInput.trim()]
      }));
      setLanguageInput('');
    }
  };

  // Remove Language
  const removeLanguage = (languageToRemove) => {
    setConsultantData(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang !== languageToRemove)
    }));
  };

  // Handle Consultant Application Submission
  const handleConsultantApplication = async () => {
    try {
      // Validation
      const requiredFields = ['rate', 'qualification', 'field', 'university', 'graduationYear', 'experience', 'category'];
      const missingFields = requiredFields.filter(field => !consultantData[field]);

      if (missingFields.length > 0) {
        Alert.alert('Error', 'Please fill all required fields');
        return;
      }

      if (!consultantData.resume) {
        Alert.alert('Error', 'Please upload your resume');
        return;
      }

      if (consultantData.languages.length === 0) {
        Alert.alert('Error', 'Please add at least one language');
        return;
      }

      setLoading(true);
      const result = await ApiService.submitConsultantApplication(consultantData);

      if (result.success) {
        Alert.alert(
          'Success',
          'Your consultant application has been submitted successfully. It will be reviewed within 2-3 business days.',
          [{ text: 'OK', onPress: () => onRefresh && onRefresh() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit consultant application');
      }
    } catch (error) {
      console.error('Consultant application error:', error);
      Alert.alert('Error', 'Failed to submit consultant application');
    } finally {
      setLoading(false);
    }
  };

  // Render Status Screen
  const renderStatusScreen = () => {
    const status = getApplicationStatus();

    return (
      <View style={styles.statusContainer}>
        {status === 'approved' && (
          <>
            <Text style={styles.statusIcon}>✅</Text>
            <Text style={styles.statusTitle}>Consultant Approved!</Text>
            <Text style={styles.statusSubtitle}>
              Congratulations! You are now a verified consultant on our platform.
            </Text>
          </>
        )}

        {status === 'pending' && (
          <>
            <Text style={styles.statusIcon}>⏳</Text>
            <Text style={styles.statusTitle}>Application Pending</Text>
            <Text style={styles.statusSubtitle}>
              Your consultant application is under review. You'll be notified once it's approved.
            </Text>
          </>
        )}

        {status === 'rejected' && (
          <>
            <Text style={styles.statusIcon}>❌</Text>
            <Text style={styles.statusTitle}>Application Rejected</Text>
            <Text style={styles.statusSubtitle}>
              Your application was not approved. Please contact support for more information.
            </Text>
          </>
        )}
      </View>
    );
  };

  // Render Step 1: KYC Verification
  const renderKYCStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Step 1: KYC Verification</Text>
        <Text style={styles.stepSubtitle}>Verify your identity to continue</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Aadhaar Number *</Text>
        <TextInput
          style={styles.formInput}
          value={kycData.aadharNumber}
          onChangeText={(text) => setKycData(prev => ({ ...prev, aadharNumber: text }))}
          placeholder="Enter 12-digit Aadhaar number"
          keyboardType="numeric"
          maxLength={12}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>PAN Number *</Text>
        <TextInput
          style={styles.formInput}
          value={kycData.panNumber}
          onChangeText={(text) => setKycData(prev => ({ ...prev, panNumber: text.toUpperCase() }))}
          placeholder="Enter PAN number"
          maxLength={10}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Aadhaar Document URL</Text>
        <TextInput
          style={styles.formInput}
          value={kycData.aadharURL}
          onChangeText={(text) => setKycData(prev => ({ ...prev, aadharURL: text }))}
          placeholder="Enter Aadhaar document URL (optional)"
          keyboardType="url"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>PAN Document URL</Text>
        <TextInput
          style={styles.formInput}
          value={kycData.panURL}
          onChangeText={(text) => setKycData(prev => ({ ...prev, panURL: text }))}
          placeholder="Enter PAN document URL (optional)"
          keyboardType="url"
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleKYCSubmission}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Next →</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // Render Step 2: Consultant Application
  const renderConsultantStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Step 2: Consultant Profile</Text>
        <Text style={styles.stepSubtitle}>Complete your consultant application</Text>
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.formLabel}>Session Fee (₹/hour) *</Text>
          <TextInput
            style={styles.formInput}
            value={consultantData.rate}
            onChangeText={(text) => setConsultantData(prev => ({ ...prev, rate: text }))}
            placeholder="Hourly rate"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.formLabel}>Experience (years) *</Text>
          <TextInput
            style={styles.formInput}
            value={consultantData.experience}
            onChangeText={(text) => setConsultantData(prev => ({ ...prev, experience: text }))}
            placeholder="Years"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Qualification *</Text>
        <TextInput
          style={styles.formInput}
          value={consultantData.qualification}
          onChangeText={(text) => setConsultantData(prev => ({ ...prev, qualification: text }))}
          placeholder="e.g., Master's in Psychology"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Field of Study *</Text>
        <TextInput
          style={styles.formInput}
          value={consultantData.field}
          onChangeText={(text) => setConsultantData(prev => ({ ...prev, field: text }))}
          placeholder="e.g., Clinical Psychology"
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
          />
        </View>

        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.formLabel}>Graduation Year *</Text>
          <TextInput
            style={styles.formInput}
            value={consultantData.graduationYear}
            onChangeText={(text) => setConsultantData(prev => ({ ...prev, graduationYear: text }))}
            placeholder="Year"
            keyboardType="numeric"
            maxLength={4}
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
          />
          <TouchableOpacity style={styles.addButton} onPress={addLanguage}>
            <Text style={styles.addButtonText}>+</Text>
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
                >
                  <Text style={styles.removeLanguageText}>×</Text>
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
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Resume *</Text>
        <TouchableOpacity style={styles.fileButton} onPress={selectResume}>
          <Text style={styles.fileButtonText}>
            📄 {consultantData.resume ? consultantData.resume.name : 'Select Resume (PDF)'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleConsultantApplication}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>📤 Submit Application</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // Main Render
  const status = getApplicationStatus();
  
  if (status === 'approved' || status === 'pending' || status === 'rejected') {
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
    backgroundColor: '#f5f7fa',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  stepContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
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
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  selectedCategoryChipText: {
    color: 'white',
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
    backgroundColor: '#10b981',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
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
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e40af',
    marginRight: 8,
  },
  removeLanguageButton: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeLanguageText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileButton: {
    backgroundColor: '#f0f9f0',
    borderWidth: 2,
    borderColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  fileButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
});

export default ProfileUpgradeSection;