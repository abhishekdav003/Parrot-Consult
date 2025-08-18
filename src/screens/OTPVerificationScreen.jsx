// src/screens/OTPVerificationScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const OTPVerificationScreen = ({ navigation, route }) => {
  const { phone, type } = route.params;
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  const { verifyOTP, sendOTP, loading } = useAuth();

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const validateOTP = (otpValue) => {
    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otpValue);
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    if (!validateOTP(otp)) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    const result = await verifyOTP(otp);
    
    if (result.success) {
      if (type === 'signup') {
        Alert.alert(
          'Success',
          'Account verified successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Main', {
  screen: 'Login',
});
              }
            }
          ]
        );
      } else {
        // For login, navigate to password verification
        Alert.alert(
          'OTP Verified',
          'Please enter your password to continue',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('PasswordVerification', { phone });
              }
            }
          ]
        );
      }
    } else {
      Alert.alert('Error', result.error || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    const result = await sendOTP(phone);
    
    if (result.success) {
      setResendTimer(30);
      setCanResend(false);
      Alert.alert('OTP Sent', 'A new verification code has been sent to your phone.');
    } else {
      Alert.alert('Error', result.error || 'Failed to resend OTP');
    }
  };

  const formatphone = (phone) => {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a3c5c', '#2d5a87', '#8B4513', '#CD853F']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={60} color="#4CAF50" />
          </View>
          
          <Text style={styles.title}>Verify Phone</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneText}>{formatphone(phone)}</Text>
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#888"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                fontSize={18}
                letterSpacing={4}
                autoFocus={true}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResendOTP}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
  },
  phoneText: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    height: 55,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    width: '100%',
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    color: '#fff',
    fontSize: 14,
  },
  resendLink: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  timerText: {
    color: '#888',
    fontSize: 14,
  },
});

export default OTPVerificationScreen;