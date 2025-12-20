

// src/screens/LoginScreen.jsx - Modern Production Ready UI with White Background
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { hp, wp, rfs, ms, isTablet } from '../utils/ResponsiveUtils';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  // ==================== STATE MANAGEMENT ====================
  const [phone, setPhone] = useState('');
  const [isValidPhone, setIsValidPhone] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const { sendOTP, loading, error, clearError } = useAuth();

  // ==================== VALIDATION LOGIC ====================
  const validatePhone = useCallback((phoneValue) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    const isValid = phoneRegex.test(phoneValue);
    setIsValidPhone(isValid);
    return isValid;
  }, []);

  const handlePhoneChange = useCallback((value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setPhone(numericValue);
    if (numericValue.length === 10) {
      validatePhone(numericValue);
    } else {
      setIsValidPhone(false);
    }
    clearError();
  }, [validatePhone, clearError]);

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

  // ==================== SEND OTP HANDLER ====================
  const handleSendOTP = useCallback(async () => {
    if (!phone.trim()) {
      Alert.alert('Information', 'Please enter your phone number', [
        { text: 'OK', onPress: clearError }
      ]);
      return;
    }

    if (!validatePhone(phone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number', [
        { text: 'OK', onPress: clearError }
      ]);
      return;
    }

    const result = await sendOTP(phone);

    if (result.success) {
      try {
        require('react-native').NativeModules?.HapticFeedback?.perform?.('notificationSuccess');
      } catch (e) {}

      Alert.alert(
        'OTP Sent',
        `Verification code has been sent to +91 ${phone.slice(0, 5)} ${phone.slice(5)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('OTPVerification', {
                phone: phone,
                type: 'login',
              });
            }
          }
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to send OTP. Please try again.', [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [phone, sendOTP, validatePhone, navigation, clearError]);

  // ==================== KEYBOARD BEHAVIOR ====================
  const keyboardBehavior = Platform.select({
    ios: 'padding',
    android: 'height',
  });

  const keyboardVerticalOffset = Platform.select({
    ios: hp(20),
    android: 0,
  });

  // ==================== RESPONSIVE STYLES ====================
  const responsiveStyles = useMemo(() => ({
    containerPadding: wp(20),
    titleFontSize: isTablet() ? rfs(36) : rfs(32),
    subtitleFontSize: isTablet() ? rfs(16) : rfs(15),
    inputFontSize: rfs(16),
    inputHeight: hp(56),
    buttonHeight: hp(56),
    iconSize: rfs(28),
    spacing: wp(24),
  }), []);

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      
      <KeyboardAvoidingView
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { paddingHorizontal: responsiveStyles.containerPadding }]}>
            {/* Green Header Section with Icon */}
            <LinearGradient
              colors={['#059669', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <View style={styles.iconCircle}>
                  <Icon name="login" size={responsiveStyles.iconSize} color="#fff" />
                </View>

                <Text style={[
                  styles.title,
                  { fontSize: responsiveStyles.titleFontSize }
                ]}>
                  Welcome Back
                </Text>

                <Text style={[
                  styles.subtitle,
                  { fontSize: responsiveStyles.subtitleFontSize }
                ]}>
                  Sign in to your account
                </Text>
              </View>
            </LinearGradient>

            {/* White Content Section */}
            <View style={styles.formSection}>
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

              {/* Phone Input Section */}
              <View style={styles.inputSection}>
                <View style={styles.labelContainer}>
                  <Icon name="phone" size={rfs(16)} color="#059669" />
                  <Text style={[
                    styles.label,
                    { fontSize: rfs(14), marginLeft: wp(8) }
                  ]}>
                    Phone Number
                  </Text>
                </View>

                <View style={[
                  styles.inputContainer,
                  {
                    borderColor: isFocused ? '#059669' : isValidPhone ? '#10B981' : '#E5E7EB',
                    borderWidth: isFocused || isValidPhone ? 2 : 1,
                  }
                ]}>
                  <Text style={[styles.countryCode, { fontSize: responsiveStyles.inputFontSize }]}>
                    +91
                  </Text>

                  <View style={styles.divider} />

                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: responsiveStyles.inputFontSize }
                    ]}
                    placeholder="10-digit number"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!loading}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />

                  {phone.length > 0 && (
                    <Icon
                      name={isValidPhone ? 'check-circle' : 'cancel'}
                      size={rfs(20)}
                      color={isValidPhone ? '#10B981' : '#EF4444'}
                    />
                  )}
                </View>

                {phone.length > 0 && !isValidPhone && (
                  <View style={styles.helperContainer}>
                    <Icon name="info" size={rfs(12)} color="#EF4444" />
                    <Text style={[styles.helperText, { fontSize: rfs(12), marginLeft: wp(6) }]}>
                      Valid format: 10 digits starting with 6-9
                    </Text>
                  </View>
                )}
              </View>

              {/* Send OTP Button */}
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
                      opacity: isValidPhone && !loading ? 1 : 0.5,
                    }
                  ]}
                  onPress={handleSendOTP}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={!isValidPhone || loading}
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
                        <Icon name="send" size={rfs(18)} color="#fff" />
                        <Text style={[styles.buttonText, { fontSize: rfs(16) }]}>
                          Send OTP
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { fontSize: rfs(12) }]}>
                  New here?
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Sign Up Section */}
              <View style={styles.signupSection}>
                <Text style={[styles.signupText, { fontSize: rfs(14) }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SignUp')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.signupLink, { fontSize: rfs(14) }]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <Icon name="shield" size={rfs(14)} color="#059669" />
                <Text style={[styles.infoText, { fontSize: rfs(11), marginLeft: wp(8) }]}>
                  We'll send you a secure 6-digit verification code
                </Text>
              </View>
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
  content: {
    flex: 1,
  },

  // Header Gradient Section
  headerGradient: {
    borderBottomLeftRadius: wp(24),
    borderBottomRightRadius: wp(24),
    paddingVertical: hp(40),
    paddingHorizontal: wp(20),
    marginHorizontal: -wp(20),
    marginTop: -hp(20),
    paddingTop: hp(60),
  },
  headerContent: {
    alignItems: 'center',
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

  // Form Section
  formSection: {
    marginTop: hp(30),
    marginBottom: hp(40),
  },

  // Error Display
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

  // Input Section
  inputSection: {
    marginBottom: hp(24),
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
    marginRight: wp(8),
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E5E7EB',
    marginRight: wp(12),
  },
  input: {
    flex: 1,
    color: '#1F2937',
    fontWeight: '500',
    letterSpacing: 1,
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

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(24),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#6B7280',
    marginHorizontal: wp(12),
    fontWeight: '500',
  },

  // Sign Up Section
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(24),
  },
  signupText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  signupLink: {
    color: '#059669',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Info Section
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: wp(10),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  infoText: {
    color: '#15803D',
    flex: 1,
    fontWeight: '400',
    lineHeight: hp(16),
  },
});

export default LoginScreen;