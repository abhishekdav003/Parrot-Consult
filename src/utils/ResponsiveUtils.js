/**
 * ResponsiveUtils.js - PRODUCTION-GRADE Responsive System
 * 
 * Features:
 * - Dynamic dimension updates (orientation changes)
 * - Advanced device detection (tablets, foldables, notch)
 * - Pixel-perfect rendering with PixelRatio
 * - Industry-standard 8-point grid system
 * - Safe area handling (iOS notch, Android status bar)
 * - Performance optimized with caching
 * - Error handling and fallbacks
 * - TypeScript-ready
 * - Zero external dependencies
 * 
 * @version 2.0.0
 * @author Production Team
 */

import { Dimensions, PixelRatio, Platform, StatusBar } from 'react-native';

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Design base dimensions
 * Change these to match your Figma/Design mockup
 */
const CONFIG = {
  DESIGN_WIDTH: 375,   // iPhone 11/12/13/14 Pro
  DESIGN_HEIGHT: 812,  // iPhone 11/12/13/14 Pro
  
  // Breakpoints (in pixels)
  BREAKPOINTS: {
    SMALL: 320,        // iPhone SE, small Android
    MEDIUM: 375,       // Standard phones
    LARGE: 414,        // Large phones
    TABLET: 768,       // Small tablets
    LARGE_TABLET: 1024 // Large tablets
  },
  
  // Grid system base unit
  GRID_BASE: 8,
  
  // Font scale limits (prevent text from being too small/large)
  MIN_FONT_SIZE: 10,
  MAX_FONT_SCALE: 1.3,
  
  // Tablet font scale factor (prevent huge text on tablets)
  TABLET_FONT_SCALE: 1.15,
};

// ==========================================
// DYNAMIC DIMENSIONS
// ==========================================

let dimensions = {
  window: Dimensions.get('window'),
  screen: Dimensions.get('screen'),
};

// Listen for orientation changes and update dimensions
const dimensionSubscription = Dimensions.addEventListener('change', ({ window, screen }) => {
  dimensions = { window, screen };
  // Clear cache when dimensions change
  clearCache();
});

/**
 * Get current screen dimensions
 * Always returns fresh values after orientation change
 */
export const getScreenDimensions = () => dimensions.window;

/**
 * Get screen dimensions
 */
export const getFullScreenDimensions = () => dimensions.screen;

// ==========================================
// PERFORMANCE CACHE
// ==========================================

const cache = {
  scaleFactors: null,
  isTablet: null,
  orientation: null,
  safeArea: null,
};

const clearCache = () => {
  cache.scaleFactors = null;
  cache.isTablet = null;
  cache.orientation = null;
  cache.safeArea = null;
};

// ==========================================
// SCALE CALCULATIONS
// ==========================================

/**
 * Calculate scale factors (cached for performance)
 */
const getScaleFactors = () => {
  if (cache.scaleFactors) return cache.scaleFactors;
  
  const { width, height } = getScreenDimensions();
  
  cache.scaleFactors = {
    width: width / CONFIG.DESIGN_WIDTH,
    height: height / CONFIG.DESIGN_HEIGHT,
    min: Math.min(width / CONFIG.DESIGN_WIDTH, height / CONFIG.DESIGN_HEIGHT),
    max: Math.max(width / CONFIG.DESIGN_WIDTH, height / CONFIG.DESIGN_HEIGHT),
  };
  
  return cache.scaleFactors;
};

// ==========================================
// DEVICE DETECTION
// ==========================================

/**
 * Check if device is tablet (cached)
 * Uses multiple detection methods for accuracy
 */
export const isTablet = () => {
  if (cache.isTablet !== null) return cache.isTablet;
  
  const { width, height } = getScreenDimensions();
  const pixelDensity = PixelRatio.get();
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  
  // Method 1: Pixel density check (older tablets have low density but large screens)
  const adjustedWidth = width * pixelDensity;
  const adjustedHeight = height * pixelDensity;
  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    cache.isTablet = true;
    return true;
  }
  
  // Method 2: Aspect ratio check (tablets are less elongated)
  const aspectRatio = maxDimension / minDimension;
  if ((minDimension >= CONFIG.BREAKPOINTS.TABLET) && aspectRatio < 1.6) {
    cache.isTablet = true;
    return true;
  }
  
  // Method 3: Absolute size check
  cache.isTablet = minDimension >= CONFIG.BREAKPOINTS.TABLET;
  return cache.isTablet;
};

/**
 * Check if device is small (iPhone SE, small Android)
 */
export const isSmallDevice = () => {
  const { width } = getScreenDimensions();
  return width < CONFIG.BREAKPOINTS.MEDIUM;
};

/**
 * Check if device is large phone
 */
export const isLargeDevice = () => {
  const { width } = getScreenDimensions();
  return width >= CONFIG.BREAKPOINTS.LARGE && !isTablet();
};

/**
 * Check if device is foldable (experimental)
 * Detects very tall aspect ratios
 */
export const isFoldable = () => {
  const { width, height } = getScreenDimensions();
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  return aspectRatio > 2.1;
};

/**
 * Get current orientation (cached)
 */
export const getOrientation = () => {
  if (cache.orientation) return cache.orientation;
  
  const { width, height } = getScreenDimensions();
  cache.orientation = width < height ? 'portrait' : 'landscape';
  return cache.orientation;
};

/**
 * Check if device has notch (iPhone X+)
 */
export const hasNotch = () => {
  if (Platform.OS !== 'ios') return false;
  
  const { height, width } = getScreenDimensions();
  const maxDimension = Math.max(height, width);
  
  // iPhone X and newer have these heights
  return maxDimension >= 812;
};

/**
 * Get device category
 * Returns: 'phone-small', 'phone', 'phone-large', 'tablet', 'tablet-large'
 */
export const getDeviceCategory = () => {
  const { width } = getScreenDimensions();
  
  if (width < CONFIG.BREAKPOINTS.SMALL) return 'phone-small';
  if (width < CONFIG.BREAKPOINTS.MEDIUM) return 'phone';
  if (width < CONFIG.BREAKPOINTS.LARGE) return 'phone-large';
  if (width < CONFIG.BREAKPOINTS.LARGE_TABLET) return 'tablet';
  return 'tablet-large';
};

// ==========================================
// RESPONSIVE SIZING FUNCTIONS
// ==========================================

/**
 * Responsive Width
 * Scales width proportionally to screen width
 * 
 * @param {number} size - Width from design (in pixels)
 * @returns {number} Scaled width for current device
 * 
 * @example
 * width: wp(300) // 300px on iPhone 11 → scaled on other devices
 */
export const wp = (size) => {
  if (!size || typeof size !== 'number' || isNaN(size)) {
    if (__DEV__) console.warn(`wp: Invalid size "${size}", returning 0`);
    return 0;
  }
  
  const { width } = getScaleFactors();
  const scaled = size * width;
  
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Responsive Height
 * Scales height proportionally to screen height
 * 
 * @param {number} size - Height from design (in pixels)
 * @returns {number} Scaled height for current device
 * 
 * @example
 * height: hp(200) // 200px on iPhone 11 → scaled on other devices
 */
export const hp = (size) => {
  if (!size || typeof size !== 'number' || isNaN(size)) {
    if (__DEV__) console.warn(`hp: Invalid size "${size}", returning 0`);
    return 0;
  }
  
  const { height } = getScaleFactors();
  const scaled = size * height;
  
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Responsive Font Size
 * Scales font with limits to ensure readability
 * 
 * @param {number} size - Font size from design
 * @returns {number} Scaled and normalized font size
 * 
 * @example
 * fontSize: rfs(16) // Always readable on any device
 */
export const rfs = (size) => {
  if (!size || typeof size !== 'number' || isNaN(size)) {
    if (__DEV__) console.warn(`rfs: Invalid size "${size}", returning default`);
    return CONFIG.MIN_FONT_SIZE;
  }
  
  const { min } = getScaleFactors();
  let scaled = size * min;
  
  // Apply tablet limit (prevent huge text)
  if (isTablet()) {
    scaled = size * Math.min(min, CONFIG.TABLET_FONT_SCALE);
  }
  
  // Apply system font scale
  const fontScale = PixelRatio.getFontScale();
  if (fontScale > 1) {
    scaled = scaled * Math.min(fontScale, CONFIG.MAX_FONT_SCALE);
  }
  
  // Ensure minimum readable size
  scaled = Math.max(scaled, CONFIG.MIN_FONT_SIZE);
  
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Moderate Scale
 * For elements that should scale less aggressively
 * 
 * @param {number} size - Base size
 * @param {number} factor - Scale factor (0-1), default 0.5
 * @returns {number} Moderately scaled size
 * 
 * @example
 * padding: ms(16) // Scales more conservatively
 * borderRadius: ms(12, 0.3) // Even less scaling
 */
export const ms = (size, factor = 0.5) => {
  if (!size || typeof size !== 'number' || isNaN(size)) {
    if (__DEV__) console.warn(`ms: Invalid size "${size}", returning 0`);
    return 0;
  }
  
  if (factor < 0 || factor > 1) {
    if (__DEV__) console.warn(`ms: Factor should be 0-1, got ${factor}`);
    factor = 0.5;
  }
  
  const { min } = getScaleFactors();
  const scaled = size + (min - 1) * size * factor;
  
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Width Percentage
 * Get percentage of screen width
 * 
 * @param {number} percentage - Percentage (0-100)
 * @returns {number} Width in pixels
 * 
 * @example
 * width: wpx(90) // 90% of screen width
 */
export const wpx = (percentage) => {
  if (!percentage || typeof percentage !== 'number' || isNaN(percentage)) {
    if (__DEV__) console.warn(`wpx: Invalid percentage "${percentage}", returning 0`);
    return 0;
  }
  
  const { width } = getScreenDimensions();
  return Math.round((width * Math.min(Math.max(percentage, 0), 100)) / 100);
};

/**
 * Height Percentage
 * Get percentage of screen height
 * 
 * @param {number} percentage - Percentage (0-100)
 * @returns {number} Height in pixels
 * 
 * @example
 * height: hpx(50) // 50% of screen height
 */
export const hpx = (percentage) => {
  if (!percentage || typeof percentage !== 'number' || isNaN(percentage)) {
    if (__DEV__) console.warn(`hpx: Invalid percentage "${percentage}", returning 0`);
    return 0;
  }
  
  const { height } = getScreenDimensions();
  return Math.round((height * Math.min(Math.max(percentage, 0), 100)) / 100);
};

// ==========================================
// SPACING SYSTEM (8-point grid)
// ==========================================

/**
 * Get responsive spacing values
 * Based on 8-point grid system (industry standard)
 * 
 * @returns {Object} Spacing object with xxs to xxxl
 * 
 * @example
 * padding: getSpacing().md // 16px base, scaled
 */
export const getSpacing = () => {
  const base = CONFIG.GRID_BASE;
  
  return {
    xxs: wp(base * 0.5),  // 4px
    xs: wp(base),         // 8px
    sm: wp(base * 1.5),   // 12px
    md: wp(base * 2),     // 16px
    lg: wp(base * 3),     // 24px
    xl: wp(base * 4),     // 32px
    xxl: wp(base * 6),    // 48px
    xxxl: wp(base * 8),   // 64px
  };
};

/**
 * Direct spacing function
 * Get spacing based on multiplier
 * 
 * @param {number} multiplier - Multiplier of base grid (default 1)
 * @returns {number} Scaled spacing
 * 
 * @example
 * padding: spacing(2) // 2 × 8 = 16px, scaled
 */
export const spacing = (multiplier = 1) => {
  return wp(CONFIG.GRID_BASE * multiplier);
};

/**
 * Get responsive border radius values
 */
export const getBorderRadius = () => ({
  none: 0,
  xs: wp(4),
  sm: wp(8),
  md: wp(12),
  lg: wp(16),
  xl: wp(24),
  xxl: wp(32),
  full: 9999, // Fully rounded (pill shape)
});

/**
 * Get responsive icon sizes
 */
export const getIconSize = () => ({
  xs: rfs(12),
  sm: rfs(16),
  md: rfs(20),
  lg: rfs(24),
  xl: rfs(32),
  xxl: rfs(48),
  xxxl: rfs(64),
});

// ==========================================
// SAFE AREA HANDLING
// ==========================================

/**
 * Get safe area insets for devices with notches/status bars
 * Cached for performance
 */
export const getSafeAreaInsets = () => {
  if (cache.safeArea) return cache.safeArea;
  
  const top = Platform.select({
    ios: hasNotch() ? 44 : 20,
    android: StatusBar.currentHeight || 24,
    default: 0,
  });
  
  const bottom = Platform.select({
    ios: hasNotch() ? 34 : 0,
    android: 0,
    default: 0,
  });
  
  cache.safeArea = {
    top,
    bottom,
    left: 0,
    right: 0,
  };
  
  return cache.safeArea;
};

/**
 * Get header height (including safe area)
 */
export const getHeaderHeight = () => {
  const safeArea = getSafeAreaInsets();
  const baseHeight = hp(56); // Standard header height
  return baseHeight + safeArea.top;
};

/**
 * Get bottom tab bar height (including safe area)
 */
export const getTabBarHeight = () => {
  const safeArea = getSafeAreaInsets();
  const baseHeight = hp(60); // Standard tab bar height
  return baseHeight + safeArea.bottom;
};

// ==========================================
// LAYOUT HELPERS
// ==========================================

/**
 * Get content width (constrained on tablets)
 * Ensures content doesn't stretch too much
 */
export const getContentWidth = () => {
  const { width } = getScreenDimensions();
  
  if (isTablet()) {
    const maxWidth = getOrientation() === 'portrait' ? 600 : 800;
    return Math.min(maxWidth, width * 0.9);
  }
  
  return width * 0.92; // 92% for phones (8% margin)
};

/**
 * Get screen padding (responsive edge padding)
 */
export const getScreenPadding = () => ({
  horizontal: isTablet() ? spacing(4) : spacing(2),
  vertical: isTablet() ? spacing(3) : spacing(2),
  top: getSafeAreaInsets().top,
  bottom: getSafeAreaInsets().bottom,
});

/**
 * Get container styles (common pattern)
 */
export const getContainerStyles = () => {
  const padding = getScreenPadding();
  
  return {
    flex: 1,
    paddingHorizontal: padding.horizontal,
    paddingTop: padding.top,
    paddingBottom: padding.bottom,
    maxWidth: getContentWidth(),
    alignSelf: 'center',
    width: '100%',
  };
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Scale value based on device type
 * 
 * @param {Object} config - {phone: value, tablet: value}
 * @returns {any} Value based on device type
 * 
 * @example
 * fontSize: scaleByDevice({ phone: 16, tablet: 18 })
 */
export const scaleByDevice = (config) => {
  if (!config || typeof config !== 'object') {
    if (__DEV__) console.warn('scaleByDevice: Invalid config');
    return null;
  }
  
  return isTablet() ? config.tablet : config.phone;
};

/**
 * Scale value based on orientation
 * 
 * @param {Object} config - {portrait: value, landscape: value}
 * @returns {any} Value based on orientation
 * 
 * @example
 * columns: scaleByOrientation({ portrait: 2, landscape: 3 })
 */
export const scaleByOrientation = (config) => {
  if (!config || typeof config !== 'object') {
    if (__DEV__) console.warn('scaleByOrientation: Invalid config');
    return null;
  }
  
  return getOrientation() === 'portrait' ? config.portrait : config.landscape;
};

/**
 * Scale value based on platform
 * 
 * @param {Object} config - {ios: value, android: value, default?: value}
 * @returns {any} Value based on platform
 * 
 * @example
 * shadowOffset: scaleByPlatform({ ios: {width: 0, height: 2}, android: {width: 0, height: 4} })
 */
export const scaleByPlatform = (config) => {
  if (!config || typeof config !== 'object') {
    if (__DEV__) console.warn('scaleByPlatform: Invalid config');
    return null;
  }
  
  return Platform.select(config);
};

/**
 * Clamp value between min and max
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Interpolate between values based on screen width
 * 
 * @param {number} value - Current screen width
 * @param {number} inputMin - Minimum input (e.g., 320)
 * @param {number} inputMax - Maximum input (e.g., 768)
 * @param {number} outputMin - Minimum output
 * @param {number} outputMax - Maximum output
 * @returns {number} Interpolated value
 */
export const interpolate = (value, inputMin, inputMax, outputMin, outputMax) => {
  const ratio = (value - inputMin) / (inputMax - inputMin);
  return outputMin + ratio * (outputMax - outputMin);
};

// ==========================================
// COMPREHENSIVE DEVICE INFO
// ==========================================

/**
 * Complete responsive dimensions object
 * Use this for conditional rendering and dynamic layouts
 * 
 * @example
 * if (responsiveDimensions.isTablet) { ... }
 */
export const responsiveDimensions = {
  // Screen dimensions (live)
  get width() { return getScreenDimensions().width; },
  get height() { return getScreenDimensions().height; },
  
  // Device type (cached)
  get isTablet() { return isTablet(); },
  get isSmallDevice() { return isSmallDevice(); },
  get isMediumDevice() { 
    const { width } = getScreenDimensions();
    return width >= CONFIG.BREAKPOINTS.MEDIUM && 
           width < CONFIG.BREAKPOINTS.LARGE && 
           !isTablet();
  },
  get isLargeDevice() { return isLargeDevice(); },
  get isFoldable() { return isFoldable(); },
  
  // Orientation (cached)
  get orientation() { return getOrientation(); },
  get isPortrait() { return getOrientation() === 'portrait'; },
  get isLandscape() { return getOrientation() === 'landscape'; },
  
  // Platform
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  get hasNotch() { return hasNotch(); },
  
  // Device category
  get category() { return getDeviceCategory(); },
  
  // Spacing & sizing
  spacing: getSpacing(),
  borderRadius: getBorderRadius(),
  iconSize: getIconSize(),
  
  // Layout
  get safeArea() { return getSafeAreaInsets(); },
  get contentWidth() { return getContentWidth(); },
  get screenPadding() { return getScreenPadding(); },
  get headerHeight() { return getHeaderHeight(); },
  get tabBarHeight() { return getTabBarHeight(); },
  
  // Pixel metrics
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  
  // Breakpoint
  get breakpoint() {
    const { width } = getScreenDimensions();
    if (width < CONFIG.BREAKPOINTS.SMALL) return 'xs';
    if (width < CONFIG.BREAKPOINTS.MEDIUM) return 'sm';
    if (width < CONFIG.BREAKPOINTS.LARGE) return 'md';
    if (width < CONFIG.BREAKPOINTS.TABLET) return 'lg';
    if (width < CONFIG.BREAKPOINTS.LARGE_TABLET) return 'xl';
    return 'xxl';
  },
};

// ==========================================
// CONSTANTS EXPORT
// ==========================================

export const DEVICE_WIDTH = getScreenDimensions().width;
export const DEVICE_HEIGHT = getScreenDimensions().height;
export const { BREAKPOINTS } = CONFIG;

// ==========================================
// DEFAULT EXPORT
// ==========================================

export default {
  // Core sizing
  wp, hp, rfs, ms, wpx, hpx,
  
  // Spacing
  spacing, getSpacing, getBorderRadius, getIconSize,
  
  // Device detection
  isTablet, isSmallDevice, isLargeDevice, isFoldable, hasNotch,
  getOrientation, getDeviceCategory,
  
  // Layout helpers
  getSafeAreaInsets, getHeaderHeight, getTabBarHeight,
  getContentWidth, getScreenPadding, getContainerStyles,
  getScreenDimensions, getFullScreenDimensions,
  
  // Utilities
  scaleByDevice, scaleByOrientation, scaleByPlatform,
  clamp, interpolate, clearCache,
  
  // Comprehensive info
  responsiveDimensions,
  
  // Constants
  DEVICE_WIDTH: getScreenDimensions().width,
  DEVICE_HEIGHT: getScreenDimensions().height,
  BREAKPOINTS,
  CONFIG,
};