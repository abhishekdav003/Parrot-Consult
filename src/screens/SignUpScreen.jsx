// src/screens/SignUpScreen.jsx - Modern Production Ready UI with White Background
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

    const signUpResult = await signUp(formData);

    if (signUpResult.success) {
      const otpResult = await sendOTP(formData.phone);

      if (otpResult.success) {
        try {
          require('react-native').NativeModules?.HapticFeedback?.perform?.('notificationSuccess');
        } catch (e) {}

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
    titleFontSize: isTablet() ? rfs(36) : rfs(32),
    subtitleFontSize: isTablet() ? rfs(16) : rfs(15),
    inputHeight: hp(56),
    buttonHeight: hp(56),
    iconSize: rfs(28),
  }), []);

  const isFormValid = validations.fullName && validations.phone && !loading;

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

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
            <Icon name="arrow-back" size={rfs(24)} color="#059669" />
          </TouchableOpacity>

          {/* Green Header Section with Icon */}
          <LinearGradient
            colors={['#059669', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.iconCircle}>
                <Icon name="person-add" size={responsiveStyles.iconSize} color="#fff" />
              </View>

              <Text style={[
                styles.title,
                { fontSize: responsiveStyles.titleFontSize }
              ]}>
                Join Us
              </Text>

              <Text style={[
                styles.subtitle,
                { fontSize: responsiveStyles.subtitleFontSize }
              ]}>
                Create your account today
              </Text>
            </View>

            {/* Progress Steps Inside Header */}
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View style={styles.progressStepCircle}>
                  <Text style={styles.progressStepText}>1</Text>
                </View>
                <Text style={styles.progressStepLabel}>Details</Text>
              </View>
              <View style={styles.progressLine} />
              <View style={styles.progressStep}>
                <View style={[styles.progressStepCircle, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
                  <Text style={styles.progressStepText}>2</Text>
                </View>
                <Text style={styles.progressStepLabel}>Verify</Text>
              </View>
            </View>
          </LinearGradient>

          {/* White Content Section */}
          <View style={[styles.content, { paddingHorizontal: responsiveStyles.containerPadding }]}>
            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Icon name="error-outline" size={rfs(16)} color="#EF4444" />
                <Text style={[styles.errorText, { fontSize: rfs(13), marginLeft: wp(8) }]}>
                  {error}
                </Text>
                <TouchableOpacity onPress={clearError} hitSlop={{ top: 5, bottom: 5, right: 5, left: 5 }}>
                  <Icon name="close" size={rfs(18)} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Full Name Input */}
            <View style={styles.inputSection}>
              <View style={styles.labelContainer}>
                <Icon name="person" size={rfs(16)} color="#059669" />
                <Text style={[styles.label, { fontSize: rfs(14), marginLeft: wp(8) }]}>
                  Full Name
                </Text>
              </View>

              <View style={[
                styles.inputContainer,
                {
                  borderColor: focusedField === 'fullName' ? '#059669' : validations.fullName ? '#10B981' : '#E5E7EB',
                  borderWidth: focusedField === 'fullName' || validations.fullName ? 2 : 1,
                }
              ]}>
                <TextInput
                  style={[
                    styles.input,
                    { fontSize: rfs(16) }
                  ]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
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
                    color={validations.fullName ? '#10B981' : '#EF4444'}
                  />
                )}
              </View>

              {formData.fullName.length > 0 && !validations.fullName && (
                <View style={styles.helperContainer}>
                  <Icon name="info" size={rfs(12)} color="#EF4444" />
                  <Text style={[styles.helperText, { fontSize: rfs(12), marginLeft: wp(6) }]}>
                    Name must be 2-50 characters
                  </Text>
                </View>
              )}
            </View>

            {/* Phone Input */}
            <View style={styles.inputSection}>
              <View style={styles.labelContainer}>
                <Icon name="phone" size={rfs(16)} color="#059669" />
                <Text style={[styles.label, { fontSize: rfs(14), marginLeft: wp(8) }]}>
                  Phone Number
                </Text>
              </View>

              <View style={[
                styles.inputContainer,
                {
                  borderColor: focusedField === 'phone' ? '#059669' : validations.phone ? '#10B981' : '#E5E7EB',
                  borderWidth: focusedField === 'phone' || validations.phone ? 2 : 1,
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
                  placeholder="10-digit number"
                  placeholderTextColor="#9CA3AF"
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
                    color={validations.phone ? '#10B981' : '#EF4444'}
                  />
                )}
              </View>

              {formData.phone.length > 0 && !validations.phone && (
                <View style={styles.helperContainer}>
                  <Icon name="info" size={rfs(12)} color="#EF4444" />
                  <Text style={[styles.helperText, { fontSize: rfs(12), marginLeft: wp(6) }]}>
                    Valid format: 10 digits starting with 6-9
                  </Text>
                </View>
              )}
            </View>

            {/* Terms Agreement */}
            <View style={styles.termsContainer}>
              <Icon name="verified" size={rfs(14)} color="#059669" />
              <Text style={[styles.termsText, { fontSize: rfs(11), marginLeft: wp(8) }]}>
                By creating an account, you agree to our Terms and Privacy Policy
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
                    opacity: isFormValid ? 1 : 0.5,
                  }
                ]}
                onPress={handleSignUp}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!isFormValid}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#059669', '#10B981']}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header Gradient Section
  headerGradient: {
    borderBottomLeftRadius: wp(24),
    borderBottomRightRadius: wp(24),
    paddingVertical: hp(40),
    paddingHorizontal: wp(20),
    paddingTop: hp(60),
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: hp(20),
  },
  iconCircle: {
    width: hp(70),
    height: hp(70),
    borderRadius: hp(35),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(20),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: hp(8),
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: hp(24),
    letterSpacing: 0.2,
  },

  // Progress Steps
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressStepCircle: {
    width: wp(32),
    height: wp(32),
    borderRadius: wp(16),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(6),
  },
  progressStepText: {
    fontSize: rfs(12),
    fontWeight: '700',
    color: '#059669',
  },
  progressStepLabel: {
    fontSize: rfs(10),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  progressLine: {
    width: wp(24),
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: wp(12),
  },

  // Content Section
  content: {
    paddingTop: hp(30),
    paddingBottom: hp(40),
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: wp(12),
    paddingHorizontal: wp(12),
    paddingVertical: hp(12),
    marginBottom: hp(24),
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    flex: 1,
    fontWeight: '500',
  },

  // Input
  inputSection: {
    marginBottom: hp(20),
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(10),
  },
  label: {
    color: '#1F2937',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: wp(12),
    paddingHorizontal: wp(14),
    paddingVertical: hp(12),
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  countryCode: {
    color: '#374151',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E5E7EB',
    marginHorizontal: wp(12),
  },
  input: {
    color: '#1F2937',
    fontWeight: '500',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(8),
    paddingHorizontal: wp(4),
  },
  helperText: {
    color: '#DC2626',
    fontWeight: '400',
    letterSpacing: 0.2,
  },

  // Terms
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: wp(10),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
    marginBottom: hp(24),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  termsText: {
    color: '#15803D',
    flex: 1,
    fontWeight: '400',
    lineHeight: hp(16),
  },

  // Button
  buttonContainer: {
    marginBottom: hp(24),
  },
  button: {
    borderRadius: wp(12),
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    color: '#6B7280',
    fontWeight: '500',
  },
  signInLink: {
    color: '#059669',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SignUpScreen;