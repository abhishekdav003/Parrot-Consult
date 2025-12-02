// src/screens/LoginScreen.jsx - OTP-Only Login (Production Ready)
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
      // Haptic feedback (if available)
      try {
        require('react-native').NativeModules?.HapticFeedback?.perform?.('notificationSuccess');
      } catch (e) {
        // Silent fail if haptic not available
      }

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
    titleFontSize: isTablet() ? rfs(32) : rfs(28),
    subtitleFontSize: isTablet() ? rfs(16) : rfs(14),
    inputFontSize: rfs(16),
    inputHeight: hp(56),
    buttonHeight: hp(56),
    iconSize: rfs(22),
    spacing: wp(24),
  }), []);

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
              {/* Header Section */}
              <View style={styles.headerSection}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#4CAF50', '#45a049']}
                    style={styles.iconBackground}
                  >
                    <Icon name="phone-in-talk" size={responsiveStyles.iconSize} color="#fff" />
                  </LinearGradient>
                </View>

                <Text style={[
                  styles.title,
                  { fontSize: responsiveStyles.titleFontSize }
                ]}>
                  Sign In
                </Text>

                <Text style={[
                  styles.subtitle,
                  { fontSize: responsiveStyles.subtitleFontSize }
                ]}>
                  Enter your phone number to get started
                </Text>
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={rfs(16)} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Phone Input Section */}
              <View style={styles.inputSection}>
                <Text style={[
                  styles.label,
                  { fontSize: rfs(14) }
                ]}>
                  Phone Number
                </Text>

                <View style={[
                  styles.inputContainer,
                  {
                    borderColor: isFocused ? '#4CAF50' : isValidPhone ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: isFocused ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.08)',
                    height: responsiveStyles.inputHeight,
                  }
                ]}>
                  {/* Country Code */}
                  <Text style={[styles.countryCode, { fontSize: responsiveStyles.inputFontSize }]}>
                    +91
                  </Text>

                  {/* Divider */}
                  <View style={styles.divider} />

                  {/* Phone Input */}
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: responsiveStyles.inputFontSize }
                    ]}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!loading}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />

                  {/* Validation Indicator */}
                  {phone.length > 0 && (
                    <Icon
                      name={isValidPhone ? 'check-circle' : 'cancel'}
                      size={rfs(20)}
                      color={isValidPhone ? '#10B981' : '#FCA5A5'}
                    />
                  )}
                </View>

                {/* Helper Text */}
                {phone.length > 0 && !isValidPhone && (
                  <Text style={[styles.helperText, { fontSize: rfs(12) }]}>
                    Please enter a valid 10-digit phone number starting with 6-9
                  </Text>
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
                      opacity: isValidPhone && !loading ? 1 : 0.6,
                    }
                  ]}
                  onPress={handleSendOTP}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={!isValidPhone || loading}
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
                  or
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
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <Icon name="info" size={rfs(16)} color="rgba(255, 255, 255, 0.6)" />
                <Text style={[styles.infoText, { fontSize: rfs(11) }]}>
                  We'll send you a 6-digit verification code via SMS
                </Text>
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
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    minHeight: height * 0.85,
  },

  // Header Section
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
    letterSpacing: 0.3,
  },

  // Error Display
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
    fontSize: rfs(13),
    marginLeft: wp(8),
    flex: 1,
    fontWeight: '500',
  },

  // Input Section
  inputSection: {
    marginBottom: hp(28),
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
    transition: 'all 0.3s ease',
  },
  countryCode: {
    color: '#fff',
    fontWeight: '600',
    marginRight: wp(8),
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: wp(12),
  },
  input: {
    flex: 1,
    color: '#fff',
    fontWeight: '500',
    letterSpacing: 1,
  },
  helperText: {
    color: '#FCA5A5',
    marginTop: hp(6),
    fontWeight: '400',
    letterSpacing: 0.2,
  },

  // Button
  buttonContainer: {
    marginBottom: hp(28),
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

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(28),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  signupLink: {
    color: '#4CAF50',
    fontWeight: '700',
  },

  // Info Section
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: wp(10),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: wp(8),
    flex: 1,
    fontWeight: '400',
    lineHeight: hp(16),
  },
});

export default LoginScreen;