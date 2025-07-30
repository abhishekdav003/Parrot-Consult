// src/screens/LoginScreen.jsx - Cleaned up version
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Keyboard,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const phoneInputRef = useRef(null);

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const sendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const response = await fetch('YOUR_API_ENDPOINT/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          type: 'login'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'OTP Sent',
          `Verification code has been sent to +91${phoneNumber}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to OTP verification screen
                // navigation.navigate('OTPVerification', { phoneNumber, type: 'login' });
                console.log('Navigate to OTP verification');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1a3c5c', '#2d5a87', '#8B4513', '#CD853F']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.headerSection}>
                <Text style={styles.title}>Sign In</Text>
              </View>

              <View style={styles.formSection}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.phoneIcon}>
                      <Ionicons name="call" size={20} color="#4CAF50" />
                    </View>
                    <TextInput
                      ref={phoneInputRef}
                      style={styles.input}
                      placeholder="Enter phone number"
                      placeholderTextColor="#888"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      maxLength={10}
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.sendButton, isLoading && styles.disabledButton]}
                  onPress={sendOTP}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#45a049']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.signupSection}>
                  <Text style={styles.signupText}>Don't have account ? </Text>
                  <TouchableOpacity onPress={navigateToSignUp} activeOpacity={0.8}>
                    <Text style={styles.signupLink}>sign up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.08,
    justifyContent: 'center',
    minHeight: height * 0.8,
    paddingBottom: 100, // Add padding to account for navbar
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: height * 0.06,
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: '600',
    color: '#4CAF50',
    letterSpacing: 0.5,
  },
  formSection: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: height * 0.03,
  },
  label: {
    fontSize: width * 0.045,
    color: '#fff',
    marginBottom: height * 0.015,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    height: height * 0.065,
  },
  phoneIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#fff',
    paddingVertical: 0,
  },
  sendButton: {
    marginTop: height * 0.04,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: height * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.065,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  signupSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.04,
  },
  signupText: {
    color: '#fff',
    fontSize: width * 0.04,
  },
  signupLink: {
    color: '#4CAF50',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
});

export default LoginScreen;