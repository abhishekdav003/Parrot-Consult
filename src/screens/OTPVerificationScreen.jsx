// src/screens/OTPVerificationScreen.jsx - Modern Production Ready UI with White Background & Auto-Capture OTP
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
  NativeModules,
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const otpInputRefs = useRef([]);
  const autoFillTimeoutRef = useRef(null);

  const { verifyOTP, sendOTP, loading, error, clearError } = useAuth();

  // ==================== AUTO-FILL OTP FROM SMS ====================
  useEffect(() => {
    startOTPListening();
    return () => {
      if (autoFillTimeoutRef.current) {
        clearTimeout(autoFillTimeoutRef.current);
      }
    };
  }, []);

  const startOTPListening = useCallback(() => {
    if (Platform.OS === 'android') {
      try {
        const RNOtpVerify = NativeModules.RNOtpVerify;
        if (RNOtpVerify && RNOtpVerify.getOtp) {
          RNOtpVerify.getOtp()
            .then((result) => {
              const extractedOTP = result.match(/\d{6}/)?.[0];
              if (extractedOTP) {
                handleAutoFillOTP(extractedOTP);
              }
            })
            .catch((error) => {
              console.log('OTP Auto-fill: Manual entry required');
            });
        }
      } catch (error) {
        console.log('OTP Auto-fill not available');
      }
    }
  }, []);

  const handleAutoFillOTP = useCallback((autoOtp) => {
    setOtp(autoOtp);
    setOtpFilled(true);
    
    // Trigger pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulseAnim]);

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
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length > 1) {
      return;
    }

    const newOtp = otp.split('');
    newOtp[index] = numericValue;
    const updatedOtp = newOtp.join('');

    setOtp(updatedOtp);
    setOtpFilled(updatedOtp.length === 6);

    if (numericValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    clearError();
  }, [otp, clearError]);

  const handleOTPKeyPress = useCallback((key, index) => {
    if (key === 'Backspace') {
      if (otp[index]) {
        const newOtp = otp.split('');
        newOtp[index] = '';
        setOtp(newOtp.join(''));
        setOtpFilled(false);
      } else if (index > 0) {
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

    setIsVerifying(true);
    Keyboard.dismiss();
    const result = await verifyOTP(otp, phone);
    setIsVerifying(false);

    if (result.success) {
      try {
        require('react-native').NativeModules?.HapticFeedback?.perform?.('notificationSuccess');
      } catch (e) {}

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
      setOtp('');
      otpInputRefs.current[0]?.focus();
    }
  }, [otp, verifyOTP, validateOTP, type, navigation, clearError]);

  // ==================== RESEND OTP HANDLER ====================
  const handleResendOTP = useCallback(async () => {
    if (!canResend) return;

    const result = await sendOTP(phone);

    if (result.success) {
      try {
        require('react-native').NativeModules?.HapticFeedback?.perform?.('notificationSuccess');
      } catch (e) {}

      setOtp('');
      setResendTimer(30);
      setCanResend(false);
      setOtpFilled(false);
      otpInputRefs.current[0]?.focus();
      startOTPListening();

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
  }, [canResend, phone, sendOTP, clearError, startOTPListening]);

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
    titleFontSize: isTablet() ? rfs(36) : rfs(32),
    subtitleFontSize: isTablet() ? rfs(16) : rfs(15),
    otpBoxSize: isTablet() ? wp(50) : wp(45),
    iconSize: rfs(28),
  }), []);

  // ==================== RENDER OTP INPUT BOXES ====================
  const renderOTPInput = useCallback((index) => {
    return (
      <Animated.View
        key={index}
        style={[
          { flex: 1, marginHorizontal: wp(3.5) },
          otpFilled && {
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <TextInput
          ref={(ref) => {
            otpInputRefs.current[index] = ref;
          }}
          style={[
            styles.otpBox,
            {
              width: responsiveStyles.otpBoxSize,
              height: responsiveStyles.otpBoxSize,
              fontSize: rfs(20),
              borderColor:
                focusedIndex === index ? '#059669' :
                otp[index] ? '#10B981' :
                '#E5E7EB',
              borderWidth: focusedIndex === index || otp[index] ? 2 : 1,
              backgroundColor:
                focusedIndex === index ? '#F0FDF4' :
                otp[index] ? '#F0FDF4' :
                '#F9FAFB',
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
      </Animated.View>
    );
  }, [otp, focusedIndex, loading, handleOTPChange, handleOTPKeyPress, responsiveStyles.otpBoxSize, otpFilled, pulseAnim]);

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
                <Icon name="verified-user" size={responsiveStyles.iconSize} color="#fff" />
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

            {/* Auto-fill Indicator */}
            {otpFilled && !loading && isVerifying && (
              <Animated.View style={[styles.autoFillIndicator, { opacity: pulseAnim }]}>
                <Icon name="check-circle" size={rfs(14)} color="#10B981" />
                <Text style={[styles.autoFillText, { fontSize: rfs(12), marginLeft: wp(8) }]}>
                  OTP received - Verifying...
                </Text>
              </Animated.View>
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
                    opacity: otpFilled && !loading ? 1 : 0.5,
                  }
                ]}
                onPress={handleVerifyOTP}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!otpFilled || loading}
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
              <Icon name="info" size={rfs(14)} color="#059669" />
              <Text style={[styles.helpText, { fontSize: rfs(11), marginLeft: wp(8) }]}>
                Check your messages. Standard SMS rates may apply.
              </Text>
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
  phoneText: {
    fontWeight: '700',
    color: '#fff',
  },

  // Content Section
  content: {
    paddingTop: hp(30),
    paddingBottom: hp(40),
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

  // Auto-fill Indicator
  autoFillIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: wp(10),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
    marginBottom: hp(20),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  autoFillText: {
    color: '#15803D',
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
    width: '100%',
  },
  otpBox: {
    borderRadius: wp(12),
    textAlign: 'center',
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 2,
  },

  // Button
  buttonContainer: {
    marginBottom: hp(24),
  },
  button: {
    borderRadius: wp(12),
    overflow: 'hidden',
    height: hp(56),
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
    color: '#6B7280',
    fontWeight: '500',
  },
  resendLink: {
    color: '#059669',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  timerText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Help Section
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: wp(10),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  helpText: {
    color: '#15803D',
    flex: 1,
    fontWeight: '400',
    lineHeight: hp(16),
  },
});

export default OTPVerificationScreen;