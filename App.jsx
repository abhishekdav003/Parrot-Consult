// Updated App.jsx - OTP-Only Authentication Flow
import React, { useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider } from './src/context/AuthContext';
import {
  StatusBar,
  Platform,
  Dimensions,
  PixelRatio,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ReelsScreen from './src/screens/ReelsScreen';
import InboxScreen from './src/screens/InboxScreen';
import ChatScreen from './src/screens/ChatScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import ConsultantListScreen from './src/screens/ConsultantListScreen';
import ExpertProfileScreen from './src/screens/ExpertProfileScreen';
import ExpertListScreen from './src/screens/ExpertListScreen';
import ChatBot from './src/screens/ChatBot';
import VideoCallScreen from './src/screens/VideoCallScreen';

// Navigation components
import Navbar from './src/components/Navbar/Navbar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ==================== RESPONSIVE UTILITIES ====================
const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = Dimensions.get('window');

const widthScale = DEVICE_WIDTH / DESIGN_WIDTH;
const heightScale = DEVICE_HEIGHT / DESIGN_HEIGHT;

export const wp = (size) => Math.round(size * widthScale);
export const hp = (size) => Math.round(size * heightScale);

export const rfs = (size) => {
  const scale = Math.min(widthScale, heightScale);
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const ms = (size, factor = 0.5) => {
  const scale = Math.min(widthScale, heightScale);
  return Math.round(size + (scale - 1) * size * factor);
};

export const getSpacing = () => ({
  xs: wp(4),
  sm: wp(8),
  md: wp(16),
  lg: wp(24),
  xl: wp(32),
  xxl: wp(48),
});

export const isTablet = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = DEVICE_WIDTH * pixelDensity;
  const adjustedHeight = DEVICE_HEIGHT * pixelDensity;

  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  }

  return (
    (DEVICE_WIDTH >= 600 && DEVICE_HEIGHT >= 600) ||
    (DEVICE_WIDTH >= 768)
  );
};

export const getOrientation = () => {
  return DEVICE_WIDTH < DEVICE_HEIGHT ? 'portrait' : 'landscape';
};

export const responsiveDimensions = {
  width: DEVICE_WIDTH,
  height: DEVICE_HEIGHT,
  isTablet: isTablet(),
  isSmallDevice: DEVICE_WIDTH < 375,
  isMediumDevice: DEVICE_WIDTH >= 375 && DEVICE_WIDTH < 414,
  isLargeDevice: DEVICE_WIDTH >= 414,
  orientation: getOrientation(),
  spacing: getSpacing(),
  contentWidthPercent: isTablet() ? 0.85 : 0.92,
  maxContentWidth: isTablet() ? 600 : DEVICE_WIDTH * 0.92,
};

// ==================== NAVIGATION UTILITIES ====================

const CustomTabBar = (props) => <Navbar {...props} />;

const getTabBarVisibility = (route) => {
  const routesWithHiddenTabBar = [
    'Reels',
    'ChatBot',
    'ExpertProfile',
    'Categories',
    'ConsultantList',
    'ExpertsList',
    'ExpertProfileScreen',
    'VideoCall',
  ];

  if (routesWithHiddenTabBar.includes(route.name)) {
    return { display: 'none' };
  }

  return {};
};

// ==================== TAB NAVIGATOR ====================

const MainTabNavigator = () => {
  const dimensions = useWindowDimensions();

  const tabBarStyle = useMemo(() => ({
    height: Platform.select({
      ios: hp(85),
      android: hp(65),
    }),
    paddingBottom: Platform.select({
      ios: hp(20),
      android: hp(8),
    }),
    paddingTop: hp(8),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  }), []);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: getTabBarVisibility(route),
        unmountOnBlur: false,
        freezeOnBlur: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />

      <Tab.Screen
        name="Search"
        component={ChatBot}
        options={{ tabBarLabel: 'AI Chat' }}
      />

      <Tab.Screen
        name="Reels"
        component={ReelsScreen}
        options={{
          tabBarStyle: { display: 'none' },
          tabBarLabel: 'Reels',
        }}
      />

      <Tab.Screen
        name="Notifications"
        component={InboxScreen}
        options={{ tabBarLabel: 'Messages' }}
      />

      <Tab.Screen
        name="Login"
        component={LoginScreen}
        options={{ tabBarLabel: 'Profile' }}
      />

      {/* Hidden screens */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarButton: () => null }}
      />

      <Tab.Screen
        name="ChatBot"
        component={ChatBot}
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
      />

      <Tab.Screen
        name="ExpertProfile"
        component={ExpertProfileScreen}
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
      />

      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
      />

      <Tab.Screen
        name="ConsultantList"
        component={ConsultantListScreen}
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
      />

      <Tab.Screen
        name="ExpertsList"
        component={ExpertListScreen}
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
      />

      <Tab.Screen
        name="ExpertProfileScreen"
        component={ExpertProfileScreen}
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
};

// ==================== STACK SCREEN OPTIONS ====================

const getStackScreenOptions = () => ({
  headerShown: false,
  animation: Platform.select({
    ios: 'slide_from_right',
    android: 'slide_from_right',
  }),
  presentation: 'card',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  contentStyle: { backgroundColor: '#FFFFFF' },
  animationTypeForReplace: 'pop',
  animationDuration: Platform.select({
    ios: 300,
    android: 250,
  }),
});

const getModalScreenOptions = () => ({
  ...getStackScreenOptions(),
  presentation: 'modal',
  animation: Platform.select({
    ios: 'slide_from_bottom',
    android: 'slide_from_bottom',
  }),
  gestureDirection: 'vertical',
  gestureEnabled: true,
});

const getFullScreenModalOptions = () => ({
  headerShown: false,
  presentation: 'fullScreenModal',
  animation: 'fade',
  gestureEnabled: false,
  animationDuration: 200,
  contentStyle: { backgroundColor: '#000000' },
});

// ==================== MAIN APP ====================

const App = () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#FFFFFF', true);
      StatusBar.setBarStyle('dark-content', true);
      StatusBar.setTranslucent(false);
    }
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      console.log('[APP] Dimensions changed');
    });
    return () => subscription?.remove();
  }, []);

  const statusBarProps = useMemo(() => ({
    barStyle: 'dark-content',
    backgroundColor: '#FFFFFF',
    translucent: false,
    networkActivityIndicatorVisible: false,
    animated: true,
    ...Platform.select({
      ios: { hidden: false },
    }),
  }), []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar {...statusBarProps} />

        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={getStackScreenOptions()}
          >
            {/* ==================== AUTHENTICATION FLOW ==================== */}
            {/* OTP-Only Authentication Flow */}

            {/* Splash Screen */}
            <Stack.Screen
              name="Splash"
              component={SplashScreen}
              options={{
                ...getStackScreenOptions(),
                animation: 'fade',
                gestureEnabled: false,
              }}
            />

            {/* Sign Up - Register with name and phone */}
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={getModalScreenOptions()}
            />

            {/* OTP Verification - Verify with OTP code */}
            {/* Used for both signup and login flows */}
            <Stack.Screen
              name="OTPVerification"
              component={OTPVerificationScreen}
              options={{
                ...getStackScreenOptions(),
                gestureEnabled: false,
                animationTypeForReplace: 'pop',
              }}
            />

            {/* ==================== MAIN APP FLOW ==================== */}

            {/* Main Tab Navigator */}
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{
                ...getStackScreenOptions(),
                animation: 'fade',
                gestureEnabled: false,
              }}
            />

            {/* ==================== ADDITIONAL SCREENS ==================== */}

            {/* Chat and Messaging */}
            <Stack.Screen
              name="ChatBotStack"
              component={ChatBot}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ChatScreen"
              component={ChatScreen}
              options={getStackScreenOptions()}
            />

            {/* Experts and Consultants */}
            <Stack.Screen
              name="CategoriesStack"
              component={CategoriesScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ConsultantListStack"
              component={ConsultantListScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ExpertsListStack"
              component={ExpertListScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ExpertProfileStack"
              component={ExpertProfileScreen}
              options={getStackScreenOptions()}
            />

            {/* Backward Compatibility Routes */}
            <Stack.Screen
              name="Categories"
              component={CategoriesScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ConsultantList"
              component={ConsultantListScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ConsultantListScreen"
              component={ConsultantListScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ExpertsList"
              component={ExpertListScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ExpertsListScreen"
              component={ExpertListScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ExpertProfileScreen"
              component={ExpertProfileScreen}
              options={getStackScreenOptions()}
            />

            <Stack.Screen
              name="ExpertProfile"
              component={ExpertProfileScreen}
              options={getStackScreenOptions()}
            />

            {/* Video Call - Full Screen Modal */}
            <Stack.Screen
              name="VideoCall"
              component={VideoCallScreen}
              options={getFullScreenModalOptions()}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;