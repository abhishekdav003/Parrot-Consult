// src/screens/OTPVerificationScreen.jsx - Production Ready
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { hp, wp, rfs, ms, isTablet } from '../utils/ResponsiveUtils';


const { width, height } = Dimensions.get('window');

const OTPVerificationScreen = ({ navigation, route }) => {
  // ==================== ROUTE PARAMS ====================
  const { phone, type } = route.params;

  // ==================== STATE MANAGEMENT ====================
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [otpFilled, setOtpFilled] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const otpInputRefs = useRef([]);

  const { verifyOTP, sendOTP, loading, error, clearError } = useAuth();

  // ==================== TIMER LOGIC ====================
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // ==================== OTP VALIDATION ====================
  const validateOTP = useCallback((otpValue) => {
    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otpValue);
  }, []);

  const handleOTPChange = useCallback((value, index) => {
    // Only accept numeric input
    const numericValue = value.replace(/[^0-9]/g, '');

    // Don't exceed 1 character per field
    if (numericValue.length > 1) {
      return;
    }

    // Update OTP state
    const newOtp = otp.split('');
    newOtp[index] = numericValue;
    const updatedOtp = newOtp.join('');

    setOtp(updatedOtp);
    setOtpFilled(updatedOtp.length === 6);

    // Auto-focus to next field
    if (numericValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    clearError();
  }, [otp, clearError]);

  const handleOTPKeyPress = useCallback((key, index) => {
    if (key === 'Backspace') {
      if (otp[index]) {
        // Clear current field
        const newOtp = otp.split('');
        newOtp[index] = '';
        setOtp(newOtp.join(''));
        setOtpFilled(false);
      } else if (index > 0) {
        // Move to previous field
        const newOtp = otp.split('');
        newOtp[index - 1] = '';
        setOtp(newOtp.join(''));
        setOtpFilled(false);
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  }, [otp]);

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

  // ==================== VERIFY OTP HANDLER ====================
  const handleVerifyOTP = useCallback(async () => {
    if (!otp.trim()) {
      Alert.alert('Information', 'Please enter the OTP', [
        { text: 'OK', onPress: clearError }
      ]);
      return;
    }

    if (!validateOTP(otp)) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP', [
        { text: 'OK', onPress: clearError }
      ]);
      return;
    }

    Keyboard.dismiss();
    const result = await verifyOTP(otp, phone);

    if (result.success) {
      // Haptic feedback
      try {
        require('react-native').NativeModules?.HapticFeedback?.perform?.('notificationSuccess');
      } catch (e) {
        // Silent fail
      }

      if (type === 'signup') {
        Alert.alert(
          'Success',
          'Account verified successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main', params: { screen: 'Home' } }],
                });
              }
            }
          ]
        );
      } else {
        // For login with OTP only
        Alert.alert(
          'Success',
          'You have been logged in successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main', params: { screen: 'Home' } }],
                });
              }
            }
          ]
        );
      }
    } else {
      Alert.alert('Error', result.error || 'Invalid OTP. Please try again.', [
        { text: 'OK', onPress: clearError }
      ]);
      // Clear OTP on error
      setOtp('');
      otpInputRefs.current[0]?.focus();
    }
  }, [otp, verifyOTP, validateOTP, type, navigation, clearError]);

  // ==================== RESEND OTP HANDLER ====================
  const handleResendOTP = useCallback(async () => {
    if (!canResend) return;

    const result = await sendOTP(phone);

    if (result.success) {
      // Haptic feedback
      try {
        require('react-native').NativeModules?.HapticFeedback?.perform?.('notificationSuccess');
      } catch (e) {
        // Silent fail
      }

      setOtp('');
      setResendTimer(30);
      setCanResend(false);
      setOtpFilled(false);
      otpInputRefs.current[0]?.focus();

      Alert.alert(
        'OTP Sent',
        'A new verification code has been sent to your phone.',
        [{ text: 'OK', onPress: clearError }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to resend OTP', [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [canResend, phone, sendOTP, clearError]);

  // ==================== FORMAT PHONE ====================
  const formatPhone = useCallback((phoneNum) => {
    return `+91 ${phoneNum.slice(0, 5)} ${phoneNum.slice(5)}`;
  }, []);

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
    otpBoxSize: isTablet() ? wp(50) : wp(45),
    iconSize: rfs(22),
  }), []);

  // ==================== RENDER OTP INPUT BOXES ====================
  const renderOTPInput = useCallback((index) => {
    return (
      <View key={index} style={{ flex: 1, marginHorizontal: wp(4) }}>
        <TextInput
          ref={(ref) => {
            otpInputRefs.current[index] = ref;
          }}
          style={[
            styles.otpBox,
            {
              width: responsiveStyles.otpBoxSize,
              height: responsiveStyles.otpBoxSize,
              fontSize: rfs(24),
              borderColor:
                focusedIndex === index ? '#4CAF50' :
                otp[index] ? '#10B981' :
                'rgba(255, 255, 255, 0.2)',
              backgroundColor:
                focusedIndex === index ? 'rgba(76, 175, 80, 0.1)' :
                'rgba(255, 255, 255, 0.08)',
            }
          ]}
          maxLength={1}
          keyboardType="number-pad"
          onChangeText={(value) => handleOTPChange(value, index)}
          onKeyPress={({ nativeEvent }) => handleOTPKeyPress(nativeEvent.key, index)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(-1)}
          value={otp[index] || ''}
          editable={!loading}
          selectTextOnFocus
          textContentType="oneTimeCode"
        />
      </View>
    );
  }, [otp, focusedIndex, loading, handleOTPChange, handleOTPKeyPress, responsiveStyles.otpBoxSize]);

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
                    <Icon name="verified-user" size={responsiveStyles.iconSize} color="#fff" />
                  </LinearGradient>
                </View>

                <Text style={[
                  styles.title,
                  { fontSize: responsiveStyles.titleFontSize }
                ]}>
                  Verify Phone
                </Text>

                <Text style={[
                  styles.subtitle,
                  { fontSize: responsiveStyles.subtitleFontSize }
                ]}>
                  Enter the 6-digit code sent to{'\n'}
                  <Text style={styles.phoneText}>{formatPhone(phone)}</Text>
                </Text>
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={rfs(16)} color="#EF4444" />
                  <Text style={[styles.errorText, { fontSize: rfs(13) }]}>{error}</Text>
                </View>
              )}

              {/* OTP Input Section */}
              <View style={styles.otpSection}>
                <View style={styles.otpContainer}>
                  {[0, 1, 2, 3, 4, 5].map((index) => renderOTPInput(index))}
                </View>
              </View>

              {/* Verify Button */}
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
                      opacity: otpFilled && !loading ? 1 : 0.6,
                    }
                  ]}
                  onPress={handleVerifyOTP}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={!otpFilled || loading}
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
                        <Icon name="check-circle" size={rfs(18)} color="#fff" />
                        <Text style={[styles.buttonText, { fontSize: rfs(16) }]}>
                          Verify Code
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Resend Section */}
              <View style={styles.resendSection}>
                <Text style={[styles.resendText, { fontSize: rfs(14) }]}>
                  Didn't receive the code?{' '}
                </Text>
                {canResend ? (
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.resendLink, { fontSize: rfs(14) }]}>
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.timerText, { fontSize: rfs(14) }]}>
                    Resend in {resendTimer}s
                  </Text>
                )}
              </View>

              {/* Help Section */}
              <View style={styles.helpSection}>
                <Icon name="help-outline" size={rfs(16)} color="rgba(255, 255, 255, 0.6)" />
                <Text style={[styles.helpText, { fontSize: rfs(11) }]}>
                  Check your messages. Standard SMS rates may apply.
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
    lineHeight: hp(24),
    letterSpacing: 0.3,
  },
  phoneText: {
    fontWeight: '700',
    color: '#4CAF50',
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
    marginLeft: wp(8),
    flex: 1,
    fontWeight: '500',
  },

  // OTP Section
  otpSection: {
    marginBottom: hp(32),
    alignItems: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBox: {
    borderWidth: 2,
    borderRadius: wp(12),
    textAlign: 'center',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },

  // Button
  buttonContainer: {
    marginBottom: hp(24),
  },
  button: {
    borderRadius: wp(14),
    overflow: 'hidden',
    height: hp(56),
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

  // Resend Section
  resendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(20),
  },
  resendText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  resendLink: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  timerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },

  // Help Section
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: wp(10),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: wp(8),
    flex: 1,
    fontWeight: '400',
    lineHeight: hp(16),
  },
});

export default OTPVerificationScreen;