// src/screens/SignUpScreen.jsx - OTP-Only Registration (Production Ready)
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { hp, wp, rfs, ms, isTablet } from '../utils/ResponsiveUtils';


const SignUpScreen = ({ navigation }) => {
  // ==================== STATE MANAGEMENT ====================
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  });
  const [validations, setValidations] = useState({
    fullName: false,
    phone: false,
  });
  const [focusedField, setFocusedField] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const { signUp, sendOTP, loading, error, clearError } = useAuth();

  // ==================== VALIDATION LOGIC ====================
  const validateFullName = useCallback((name) => {
    const isValid = name.trim().length >= 2 && name.trim().length <= 50;
    setValidations(prev => ({ ...prev, fullName: isValid }));
    return isValid;
  }, []);

  const validatePhone = useCallback((phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    const isValid = phoneRegex.test(phone);
    setValidations(prev => ({ ...prev, phone: isValid }));
    return isValid;
  }, []);

  const handleFormChange = useCallback((field, value) => {
    if (field === 'fullName') {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (value.length > 0) validateFullName(value);
    } else if (field === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [field]: numericValue }));
      if (numericValue.length === 10) validatePhone(numericValue);
    }
    clearError();
  }, [validateFullName, validatePhone, clearError]);

  // ==================== FORM VALIDATION ====================
  const validateForm = useCallback(() => {
    const { fullName, phone } = formData;

    if (!fullName.trim()) {
      Alert.alert('Information', 'Please enter your full name', [
        { text: 'OK', onPress: clearError }
      ]);
      return false;
    }

    if (fullName.trim().length < 2) {
      Alert.alert('Validation', 'Full name must be at least 2 characters', [
        { text: 'OK', onPress: clearError }
      ]);
      return false;
    }

    if (fullName.trim().length > 50) {
      Alert.alert('Validation', 'Full name must not exceed 50 characters', [
        { text: 'OK', onPress: clearError }
      ]);
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Information', 'Please enter your phone number', [
        { text: 'OK', onPress: clearError }
      ]);
      return false;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('Validation', 'Please enter a valid 10-digit phone number starting with 6-9', [
        { text: 'OK', onPress: clearError }
      ]);
      return false;
    }

    return true;
  }, [formData, clearError]);

  // ==================== ANIMATION HANDLER ====================
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  }, [scaleAnim]);

  // ==================== SIGN UP HANDLER ====================
  const handleSignUp = useCallback(async () => {
    Keyboard.dismiss();

    if (!validateForm()) return;

    // Step 1: Register user
    const signUpResult = await signUp(formData);

    if (signUpResult.success) {
      // Step 2: Send OTP
      const otpResult = await sendOTP(formData.phone);

      if (otpResult.success) {
        // Haptic feedback
        try {
          require('react-native').NativeModules?.HapticFeedback?.perform?.('notificationSuccess');
        } catch (e) {
          // Silent fail
        }

        Alert.alert(
          'Account Created',
          'Your account has been created successfully. Please verify your phone number.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('OTPVerification', {
                  phone: formData.phone,
                  type: 'signup',
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', otpResult.error || 'Failed to send verification code', [
          { text: 'OK', onPress: clearError }
        ]);
      }
    } else {
      Alert.alert('Error', signUpResult.error || 'Failed to create account', [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [validateForm, signUp, sendOTP, formData, navigation, clearError]);

  // ==================== KEYBOARD BEHAVIOR ====================
  const keyboardBehavior = Platform.select({
    ios: 'padding',
    android: 'height',
  });

  // ==================== RESPONSIVE STYLES ====================
  const responsiveStyles = useMemo(() => ({
    containerPadding: wp(20),
    titleFontSize: isTablet() ? rfs(32) : rfs(28),
    subtitleFontSize: isTablet() ? rfs(16) : rfs(14),
    inputHeight: hp(56),
    buttonHeight: hp(56),
    iconSize: rfs(22),
  }), []);

  const isFormValid = validations.fullName && validations.phone && !loading;

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#1a3c5c', '#2d5a87', '#1a3c5c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          keyboardVerticalOffset={hp(20)}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-back" size={rfs(24)} color="#fff" />
            </TouchableOpacity>

            <View style={[styles.content, { paddingHorizontal: responsiveStyles.containerPadding }]}>
              {/* Header Section */}
              <View style={styles.headerSection}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#4CAF50', '#45a049']}
                    style={styles.iconBackground}
                  >
                    <Icon name="person-add" size={responsiveStyles.iconSize} color="#fff" />
                  </LinearGradient>
                </View>

                <Text style={[
                  styles.title,
                  { fontSize: responsiveStyles.titleFontSize }
                ]}>
                  Create Account
                </Text>

                <Text style={[
                  styles.subtitle,
                  { fontSize: responsiveStyles.subtitleFontSize }
                ]}>
                  Join our community of experts
                </Text>
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={rfs(16)} color="#EF4444" />
                  <Text style={[styles.errorText, { fontSize: rfs(13) }]}>{error}</Text>
                </View>
              )}

              {/* Full Name Input */}
              <View style={styles.inputSection}>
                <Text style={[styles.label, { fontSize: rfs(14) }]}>
                  Full Name
                </Text>

                <View style={[
                  styles.inputContainer,
                  {
                    borderColor: focusedField === 'fullName' ? '#4CAF50' : validations.fullName ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: focusedField === 'fullName' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.08)',
                    height: responsiveStyles.inputHeight,
                  }
                ]}>
                  <Icon
                    name="person"
                    size={rfs(20)}
                    color={focusedField === 'fullName' ? '#4CAF50' : 'rgba(255, 255, 255, 0.6)'}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: rfs(16), marginLeft: wp(12) }
                    ]}
                    placeholder="Enter your full name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={formData.fullName}
                    onChangeText={(value) => handleFormChange('fullName', value)}
                    editable={!loading}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                  />

                  {formData.fullName.length > 0 && (
                    <Icon
                      name={validations.fullName ? 'check-circle' : 'cancel'}
                      size={rfs(20)}
                      color={validations.fullName ? '#10B981' : '#FCA5A5'}
                    />
                  )}
                </View>

                {formData.fullName.length > 0 && !validations.fullName && (
                  <Text style={[styles.helperText, { fontSize: rfs(12) }]}>
                    Name must be 2-50 characters
                  </Text>
                )}
              </View>

              {/* Phone Input */}
              <View style={styles.inputSection}>
                <Text style={[styles.label, { fontSize: rfs(14) }]}>
                  Phone Number
                </Text>

                <View style={[
                  styles.inputContainer,
                  {
                    borderColor: focusedField === 'phone' ? '#4CAF50' : validations.phone ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: focusedField === 'phone' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.08)',
                    height: responsiveStyles.inputHeight,
                  }
                ]}>
                  <Text style={[styles.countryCode, { fontSize: rfs(16) }]}>
                    +91
                  </Text>

                  <View style={styles.divider} />

                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: rfs(16), flex: 1, marginLeft: wp(12) }
                    ]}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={formData.phone}
                    onChangeText={(value) => handleFormChange('phone', value)}
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!loading}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                  />

                  {formData.phone.length > 0 && (
                    <Icon
                      name={validations.phone ? 'check-circle' : 'cancel'}
                      size={rfs(20)}
                      color={validations.phone ? '#10B981' : '#FCA5A5'}
                    />
                  )}
                </View>

                {formData.phone.length > 0 && !validations.phone && (
                  <Text style={[styles.helperText, { fontSize: rfs(12) }]}>
                    Enter a valid 10-digit number starting with 6-9
                  </Text>
                )}
              </View>

              {/* Terms Agreement */}
              <View style={styles.termsContainer}>
                <Icon name="info" size={rfs(14)} color="rgba(255, 255, 255, 0.6)" />
                <Text style={[styles.termsText, { fontSize: rfs(11) }]}>
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>

              {/* Sign Up Button */}
              <Animated.View
                style={[
                  styles.buttonContainer,
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      height: responsiveStyles.buttonHeight,
                      opacity: isFormValid ? 1 : 0.6,
                    }
                  ]}
                  onPress={handleSignUp}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={!isFormValid}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#45a049']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Icon name="how-to-reg" size={rfs(18)} color="#fff" />
                        <Text style={[styles.buttonText, { fontSize: rfs(16) }]}>
                          Create Account
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Sign In Link */}
              <View style={styles.signInSection}>
                <Text style={[styles.signInText, { fontSize: rfs(14) }]}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={[styles.signInLink, { fontSize: rfs(14) }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: '#1a3c5c',
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
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(60) : hp(50),
    left: wp(16),
    zIndex: 10,
    width: wp(44),
    height: wp(44),
    borderRadius: wp(22),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: hp(60),
    paddingBottom: hp(40),
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: hp(40),
  },
  iconContainer: {
    marginBottom: hp(16),
  },
  iconBackground: {
    width: hp(70),
    height: hp(70),
    borderRadius: hp(35),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: hp(8),
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: hp(22),
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: wp(12),
    paddingHorizontal: wp(12),
    paddingVertical: hp(12),
    marginBottom: hp(24),
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#FCA5A5',
    marginLeft: wp(8),
    flex: 1,
    fontWeight: '500',
  },

  // Input
  inputSection: {
    marginBottom: hp(24),
  },
  label: {
    color: '#fff',
    marginBottom: hp(10),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: wp(14),
    borderWidth: 1.5,
    paddingHorizontal: wp(14),
    overflow: 'hidden',
  },
  countryCode: {
    color: '#fff',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: wp(12),
  },
  input: {
    color: '#fff',
    fontWeight: '500',
  },
  helperText: {
    color: '#FCA5A5',
    marginTop: hp(6),
    fontWeight: '400',
  },

  // Terms
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: wp(10),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
    marginBottom: hp(28),
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: wp(8),
    flex: 1,
    fontWeight: '400',
    lineHeight: hp(16),
  },

  // Button
  buttonContainer: {
    marginBottom: hp(24),
  },
  button: {
    borderRadius: wp(14),
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: wp(8),
    letterSpacing: 0.5,
  },

  // Sign In
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  signInLink: {
    color: '#4CAF50',
    fontWeight: '700',
  },
});

export default SignUpScreen;