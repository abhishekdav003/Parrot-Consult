// src/components/Dashboard/ProfileUpgradeSection.jsx
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';

const ProfileUpgradeSection = ({ user, onRefresh }) => {
  const [aadharLoading, setAadharLoading] = useState(false);
  
  // Aadhaar verification form data
  const [aadharData, setAadharData] = useState({
    aadharNumber: user?.kycVerify?.aadharNumber?.toString() || '',
    panNumber: user?.kycVerify?.panNumber || '',
    aadharURL: user?.kycVerify?.aadharURL || '',
    panURL: user?.kycVerify?.panURL || '',
  });

  console.log('[PROFILE_SECTION] Current user:', user);

  // Handle Aadhaar verification
  const handleAadharVerification = async () => {
    try {
      console.log('[PROFILE_SECTION] Submitting Aadhaar verification:', aadharData);
      setAadharLoading(true);

      // Basic validation
      if (!aadharData.aadharNumber || aadharData.aadharNumber.length !== 12) {
        Alert.alert('Error', 'Please enter a valid 12-digit Aadhaar number');
        return;
      }

      if (!aadharData.panNumber || aadharData.panNumber.length !== 10) {
        Alert.alert('Error', 'Please enter a valid 10-character PAN number');
        return;
      }

      const result = await ApiService.submitAadharVerification(aadharData);
      console.log('[PROFILE_SECTION] Aadhaar verification result:', result);

      if (result.success) {
        Alert.alert('Success', 'Aadhaar verification submitted successfully');
        onRefresh && onRefresh();
      } else {
        Alert.alert('Error', result.error || 'Failed to submit Aadhaar verification');
      }
    } catch (error) {
      console.error('[PROFILE_SECTION] Error submitting Aadhaar verification:', error);
      Alert.alert('Error', 'Failed to submit Aadhaar verification');
    } finally {
      setAadharLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Aadhaar Verification Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>KYC Verification</Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: user?.aadharVerified ? '#4CAF50' : '#FFA726' }
            ]} />
            <Text style={styles.statusText}>
              {user?.aadharVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </View>

        {user?.aadharVerified ? (
          // Already Verified View
          <View style={styles.verifiedContainer}>
            <View style={styles.verifiedIcon}>
              <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
            </View>
            <Text style={styles.verifiedTitle}>KYC Verified</Text>
            <Text style={styles.verifiedSubtitle}>
              Your Aadhaar verification has been completed successfully
            </Text>
            
            {/* Show verified details */}
            <View style={styles.verifiedDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Aadhaar Number:</Text>
                <Text style={styles.detailValue}>
                  {aadharData.aadharNumber ? `****-****-${aadharData.aadharNumber.slice(-4)}` : 'Not provided'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PAN Number:</Text>
                <Text style={styles.detailValue}>
                  {aadharData.panNumber ? `${aadharData.panNumber.slice(0, 3)}****${aadharData.panNumber.slice(-3)}` : 'Not provided'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          // Verification Form
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Aadhaar Number</Text>
              <TextInput
                style={styles.textInput}
                value={aadharData.aadharNumber}
                onChangeText={(text) => setAadharData(prev => ({ ...prev, aadharNumber: text }))}
                placeholder="Enter 12-digit Aadhaar number"
                keyboardType="numeric"
                maxLength={12}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>PAN Number</Text>
              <TextInput
                style={styles.textInput}
                value={aadharData.panNumber}
                onChangeText={(text) => setAadharData(prev => ({ ...prev, panNumber: text.toUpperCase() }))}
                placeholder="Enter PAN number"
                maxLength={10}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Aadhaar Document URL</Text>
              <TextInput
                style={styles.textInput}
                value={aadharData.aadharURL}
                onChangeText={(text) => setAadharData(prev => ({ ...prev, aadharURL: text }))}
                placeholder="Enter Aadhaar document URL"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>PAN Document URL</Text>
              <TextInput
                style={styles.textInput}
                value={aadharData.panURL}
                onChangeText={(text) => setAadharData(prev => ({ ...prev, panURL: text }))}
                placeholder="Enter PAN document URL"
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAadharVerification}
              disabled={aadharLoading}
            >
              {aadharLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit for Verification</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  verifiedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  verifiedIcon: {
    marginBottom: 16,
  },
  verifiedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  verifiedSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  verifiedDetails: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProfileUpgradeSection;