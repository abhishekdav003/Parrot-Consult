// src/screens/SignUpScreen.jsx - Cleaned up version
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

const SignUpScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fullNameRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

  const validateForm = () => {
    const { fullName, phoneNumber, password } = formData;
    
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      fullNameRef.current?.focus();
      return false;
    }
    
    if (fullName.trim().length < 2) {
      Alert.alert('Error', 'Full name must be at least 2 characters');
      fullNameRef.current?.focus();
      return false;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      phoneRef.current?.focus();
      return false;
    }
    
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      phoneRef.current?.focus();
      return false;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please create a password');
      passwordRef.current?.focus();
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      passwordRef.current?.focus();
      return false;
    }
    
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const response = await fetch('YOUR_API_ENDPOINT/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          phoneNumber: formData.phoneNumber,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Account Created',
          'Your account has been created successfully. Please verify your phone number.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to OTP verification screen
                // navigation.navigate('OTPVerification', { 
                //   phoneNumber: formData.phoneNumber, 
                //   type: 'signup' 
                // });
                console.log('Navigate to OTP verification for signup');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to create account');
      }
    } catch (error) {
      console.error('SignUp error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const navigateToLogin = () => {
    navigation.goBack(); // Go back to Main tab navigator
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
              {/* Back Button */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.headerSection}>
                <Text style={styles.title}>Sign Up</Text>
              </View>

              <View style={styles.formSection}>
                {/* Full Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.icon}>
                      <Ionicons name="person" size={20} color="#4CAF50" />
                    </View>
                    <TextInput
                      ref={fullNameRef}
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor="#888"
                      value={formData.fullName}
                      onChangeText={(value) => updateFormData('fullName', value)}
                      autoComplete="name"
                      textContentType="name"
                      returnKeyType="next"
                      onSubmitEditing={() => phoneRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Phone Number Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.icon}>
                      <Ionicons name="call" size={20} color="#4CAF50" />
                    </View>
                    <TextInput
                      ref={phoneRef}
                      style={styles.input}
                      placeholder="Enter 10-digit phone"
                      placeholderTextColor="#888"
                      value={formData.phoneNumber}
                      onChangeText={(value) => updateFormData('phoneNumber', value)}
                      keyboardType="phone-pad"
                      maxLength={10}
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.icon}>
                      <Ionicons name="lock-closed" size={20} color="#4CAF50" />
                    </View>
                    <TextInput
                      ref={passwordRef}
                      style={styles.input}
                      placeholder="Create password"
                      placeholderTextColor="#888"
                      value={formData.password}
                      onChangeText={(value) => updateFormData('password', value)}
                      secureTextEntry={!showPassword}
                      autoComplete="password-new"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={handleSignUp}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={showPassword ? "eye" : "eye-off"}
                        size={20}
                        color="#4CAF50"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.signUpButton, isLoading && styles.disabledButton]}
                  onPress={handleSignUp}
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
                      <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.loginSection}>
                  <Text style={styles.loginText}>Already have account ? </Text>
                  <TouchableOpacity onPress={navigateToLogin} activeOpacity={0.8}>
                    <Text style={styles.loginLink}>Sign In</Text>
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
  },
  backButton: {
    position: 'absolute',
    top: height * 0.06,
    left: width * 0.05,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: height * 0.04,
    marginTop: height * 0.08,
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
    marginBottom: height * 0.025,
  },
  label: {
    fontSize: width * 0.04,
    color: '#fff',
    marginBottom: height * 0.01,
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
    height: height * 0.06,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#fff',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  signUpButton: {
    marginTop: height * 0.03,
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
    paddingVertical: height * 0.018,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.06,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loginSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.03,
  },
  loginText: {
    color: '#fff',
    fontSize: width * 0.04,
  },
  loginLink: {
    color: '#4CAF50',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
});

export default SignUpScreen;