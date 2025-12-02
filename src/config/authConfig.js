// src/config/authConfig.js - Authentication Configuration & Constants
// Production-Ready Configuration

// ==================== OTP CONFIGURATION ====================
export const OTP_CONFIG = {
  // OTP Length
  LENGTH: 6,
  
  // OTP Expiry time in seconds (10 minutes)
  EXPIRY_TIME: 600,
  
  // Resend OTP timer in seconds
  RESEND_TIMER: 30,
  
  // Maximum OTP attempts before rate limiting
  MAX_ATTEMPTS: 5,
  
  // Rate limiting window in seconds
  RATE_LIMIT_WINDOW: 3600, // 1 hour
};

// ==================== VALIDATION CONFIG ====================
export const VALIDATION_CONFIG = {
  // Phone number validation
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 10,
    REGEX: /^[6-9]\d{9}$/, // Indian phone numbers (10 digits, starts with 6-9)
    ERROR_MESSAGE: 'Please enter a valid 10-digit phone number starting with 6-9',
    COUNTRY_CODE: '+91',
  },

  // Full name validation
  FULL_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REGEX: /^[a-zA-Z\s]+$/,
    ERROR_MESSAGE: 'Full name must be 2-50 characters and contain only letters',
  },

  // Email validation (for future use)
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    ERROR_MESSAGE: 'Please enter a valid email address',
  },
};

// ==================== UI CONFIGURATION ====================
export const UI_CONFIG = {
  // Colors
  COLORS: {
    PRIMARY: '#4CAF50',
    PRIMARY_DARK: '#45a049',
    SECONDARY: '#10B981',
    SUCCESS: '#10B981',
    ERROR: '#EF4444',
    WARNING: '#F59E0B',
    INFO: '#3B82F6',
    BACKGROUND: '#1a3c5c',
    SURFACE: '#ffffff',
    TEXT_PRIMARY: '#1E293B',
    TEXT_SECONDARY: '#64748B',
    BORDER: '#E2E8F0',
    PLACEHOLDER: 'rgba(255, 255, 255, 0.5)',
  },

  // Border Radius
  BORDER_RADIUS: {
    SMALL: 8,
    MEDIUM: 12,
    LARGE: 16,
    EXTRA_LARGE: 24,
    FULL: 999,
  },

  // Shadows
  SHADOWS: {
    LIGHT: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    MEDIUM: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    DARK: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
  },

  // Animation Durations (ms)
  ANIMATIONS: {
    QUICK: 150,
    NORMAL: 300,
    SLOW: 500,
  },
};

// ==================== API CONFIGURATION ====================
export const API_CONFIG = {
  // Base URLs (Update according to your environment)
  BASE_URLS: {
    PRODUCTION: 'https://api.parrotconsult.com/api/v1',
    DEVELOPMENT: 'http://192.168.0.177:8011/api/v1',
    STAGING: 'https://staging-api.parrotconsult.com/api/v1',
  },

  // API Endpoints
  ENDPOINTS: {
    // Authentication
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    CHECK_PHONE: '/auth/check-phone',
    
    // User
    REGISTER: '/user/registeruser',
    LOGIN: '/user/loginuser',
    LOGOUT: '/user/logoutuser',
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/updateProfile',
    
    // Consultant
    CONSULTANT_APPLICATION: '/user/consultantApplication',
    CONSULTANT_STATUS: '/user/consultantStatus',
    
    // Verification
    AADHAAR_VERIFY: '/user/aadharpanVerify',
    
    // Global
    GET_ALL_USERS: '/global/globalseeallactiveconsultants',
  },

  // Request Timeout (ms)
  TIMEOUT: 30000,

  // Retry Configuration
  RETRY: {
    ENABLED: true,
    MAX_ATTEMPTS: 3,
    DELAY: 1000, // ms
    BACKOFF: 1.5,
  },
};

// ==================== ERROR MESSAGES ====================
export const ERROR_MESSAGES = {
  // Validation Errors
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_PHONE: 'Please enter a valid 10-digit phone number',
    INVALID_NAME: 'Please enter a valid name',
    INVALID_OTP: 'Please enter a valid 6-digit OTP',
    PHONE_TOO_SHORT: 'Phone number must be 10 digits',
    NAME_TOO_SHORT: 'Name must be at least 2 characters',
    NAME_TOO_LONG: 'Name cannot exceed 50 characters',
  },

  // Authentication Errors
  AUTHENTICATION: {
    INVALID_OTP: 'Invalid OTP. Please try again.',
    OTP_EXPIRED: 'OTP has expired. Please request a new one.',
    SESSION_EXPIRED: 'Session expired. Please request OTP again.',
    MAX_ATTEMPTS_EXCEEDED: 'Too many failed attempts. Please try again later.',
    USER_NOT_FOUND: 'User not found. Please check your phone number.',
    USER_ALREADY_EXISTS: 'This phone number is already registered.',
    INVALID_CREDENTIALS: 'Invalid credentials. Please try again.',
  },

  // Network Errors
  NETWORK: {
    TIMEOUT: 'Request timeout. Please check your internet connection.',
    NO_INTERNET: 'No internet connection. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    NETWORK_ERROR: 'Network error occurred. Please try again.',
    BAD_REQUEST: 'Invalid request. Please check your input.',
    UNAUTHORIZED: 'Unauthorized. Please login again.',
    FORBIDDEN: 'Access forbidden.',
    NOT_FOUND: 'Resource not found.',
  },

  // Generic Errors
  GENERIC: {
    SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
    TRY_AGAIN_LATER: 'Please try again later.',
    PLEASE_LOGIN: 'Please login to continue.',
    CONTACT_SUPPORT: 'Please contact support if the issue persists.',
  },
};

// ==================== SUCCESS MESSAGES ====================
export const SUCCESS_MESSAGES = {
  OTP_SENT: 'OTP has been sent to your phone.',
  OTP_VERIFIED: 'Phone verified successfully!',
  ACCOUNT_CREATED: 'Account created successfully!',
  LOGIN_SUCCESS: 'Logged in successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  EMAIL_VERIFIED: 'Email verified successfully!',
  OPERATION_SUCCESS: 'Operation completed successfully!',
};

// ==================== INFO MESSAGES ====================
export const INFO_MESSAGES = {
  OTP_HINT: "We'll send you a 6-digit verification code via SMS",
  RESEND_HINT: 'Check your messages. Standard SMS rates may apply.',
  TERMS_AGREEMENT: 'By creating an account, you agree to our Terms of Service and Privacy Policy',
  PHONE_FORMAT: 'Enter your 10-digit phone number starting with 6-9',
};

// ==================== STORAGE KEYS ====================
export const STORAGE_KEYS = {
  USER_DATA: 'userData',
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  SESSION_ID: 'sessionId',
  LANGUAGE: 'language',
  THEME: 'theme',
  LAST_LOGIN: 'lastLogin',
  DEVICE_ID: 'deviceId',
};

// ==================== SCREEN NAMES ====================
export const SCREEN_NAMES = {
  // Authentication
  SPLASH: 'Splash',
  LOGIN: 'Login',
  SIGN_UP: 'SignUp',
  OTP_VERIFICATION: 'OTPVerification',
  
  // Main App
  MAIN: 'Main',
  HOME: 'Home',
  DASHBOARD: 'Dashboard',
  PROFILE: 'Profile',
  
  // Expert/Consultant
  EXPERTS: 'Experts',
  EXPERT_PROFILE: 'ExpertProfile',
  CONSULTANT_LIST: 'ConsultantList',
  
  // Other
  CHAT: 'Chat',
  REELS: 'Reels',
  VIDEO_CALL: 'VideoCall',
};

// ==================== REGEX PATTERNS ====================
export const REGEX_PATTERNS = {
  PHONE_INDIA: /^[6-9]\d{9}$/,
  PHONE_INTERNATIONAL: /^\+?[\d\s\-()]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  OTP: /^\d{6}$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  ALPHA_NUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHA_SPACE: /^[a-zA-Z\s]+$/,
};

// ==================== DEVICE BREAKPOINTS ====================
export const BREAKPOINTS = {
  MOBILE_SMALL: 320,
  MOBILE_MEDIUM: 375,
  MOBILE_LARGE: 414,
  TABLET_SMALL: 600,
  TABLET_MEDIUM: 768,
  TABLET_LARGE: 1024,
};

// ==================== FEATURE FLAGS ====================
export const FEATURE_FLAGS = {
  // Enable/Disable Features
  OTP_ONLY: true,
  TWO_FACTOR_AUTH: false,
  BIOMETRIC_LOGIN: false,
  SOCIAL_LOGIN: false,
  EMAIL_VERIFICATION: false,
  PHONE_VERIFICATION: true,
  
  // Feature Rollout
  NEW_UI: true,
  BETA_FEATURES: false,
  ANALYTICS: true,
  CRASH_REPORTING: true,
};

// ==================== PERMISSIONS ====================
export const PERMISSIONS_REQUIRED = {
  CAMERA: 'Camera access required for video calls',
  MICROPHONE: 'Microphone access required for calls',
  CONTACTS: 'Contacts access to find friends',
  LOCATION: 'Location access for location-based services',
  PHOTO_LIBRARY: 'Photo library access to upload images',
  CALENDAR: 'Calendar access for scheduling',
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get API base URL based on environment
 * @returns {string}
 */
export const getApiBaseUrl = () => {
  // Detect environment from __DEV__ or build config
  if (__DEV__) {
    return API_CONFIG.BASE_URLS.DEVELOPMENT;
  }
  return API_CONFIG.BASE_URLS.PRODUCTION;
};

/**
 * Get error message with fallback
 * @param {string} category - Error category
 * @param {string} key - Error key
 * @param {string} defaultMessage - Fallback message
 * @returns {string}
 */
export const getErrorMessage = (category, key, defaultMessage = 'An error occurred') => {
  return ERROR_MESSAGES[category]?.[key] || defaultMessage;
};

/**
 * Get success message
 * @param {string} key - Message key
 * @returns {string}
 */
export const getSuccessMessage = (key) => {
  return SUCCESS_MESSAGES[key] || 'Operation completed successfully!';
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export const validatePhone = (phone) => {
  return VALIDATION_CONFIG.PHONE.REGEX.test(phone);
};

/**
 * Validate full name
 * @param {string} name - Name to validate
 * @returns {boolean}
 */
export const validateFullName = (name) => {
  const trimmed = name.trim();
  return (
    trimmed.length >= VALIDATION_CONFIG.FULL_NAME.MIN_LENGTH &&
    trimmed.length <= VALIDATION_CONFIG.FULL_NAME.MAX_LENGTH
  );
};

/**
 * Validate OTP
 * @param {string} otp - OTP to validate
 * @returns {boolean}
 */
export const validateOTP = (otp) => {
  return REGEX_PATTERNS.OTP.test(otp);
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string}
 */
export const formatPhoneForDisplay = (phone) => {
  if (!phone || phone.length !== 10) return phone;
  return `${VALIDATION_CONFIG.PHONE.COUNTRY_CODE} ${phone.slice(0, 5)} ${phone.slice(5)}`;
};

/**
 * Get color based on status
 * @param {string} status - Status value
 * @returns {string}
 */
export const getColorByStatus = (status) => {
  const colors = {
    success: UI_CONFIG.COLORS.SUCCESS,
    error: UI_CONFIG.COLORS.ERROR,
    warning: UI_CONFIG.COLORS.WARNING,
    info: UI_CONFIG.COLORS.INFO,
  };
  return colors[status] || UI_CONFIG.COLORS.TEXT_SECONDARY;
};

/**
 * Get border radius value
 * @param {string} size - Size key (small, medium, large, extra_large, full)
 * @returns {number}
 */
export const getBorderRadius = (size = 'medium') => {
  return UI_CONFIG.BORDER_RADIUS[size.toUpperCase()] || UI_CONFIG.BORDER_RADIUS.MEDIUM;
};

/**
 * Get shadow style
 * @param {string} intensity - Intensity (light, medium, dark)
 * @returns {object}
 */
export const getShadow = (intensity = 'medium') => {
  return UI_CONFIG.SHADOWS[intensity.toLowerCase()] || UI_CONFIG.SHADOWS.MEDIUM;
};

// ==================== EXPORT DEFAULT ====================
export default {
  OTP_CONFIG,
  VALIDATION_CONFIG,
  UI_CONFIG,
  API_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  INFO_MESSAGES,
  STORAGE_KEYS,
  SCREEN_NAMES,
  REGEX_PATTERNS,
  BREAKPOINTS,
  FEATURE_FLAGS,
  PERMISSIONS_REQUIRED,
};