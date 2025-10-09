// Updated App.jsx with proper StatusBar handling and responsive navigation
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider } from './src/context/AuthContext';
import { StatusBar, Platform, Dimensions } from 'react-native';

// Import all screens
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import PasswordVerificationScreen from './src/screens/PasswordVerificationScreen';
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

// Import Navigation Components
import Navbar from './src/components/Navbar/Navbar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomTabBar = (props) => {
  return <Navbar {...props} />;
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ 
        headerShown: false,
        // Optimize for better performance
        lazy: true,
        tabBarHideOnKeyboard: true,
        // Hide tab bar on specific screens
        tabBarStyle: ({ route }) => {
          const routeName = route.name;
          if (routeName === 'Reels') {
            return { display: 'none' };
          }
          return {};
        }
      }}
    >
      {/* Main Tab Screens */}
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      
      <Tab.Screen 
        name="Search" 
        component={ChatBot}
        options={{
          tabBarLabel: 'AI Chat',
        }}
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
        options={{
          tabBarLabel: 'Messages',
        }}
      />
      
      <Tab.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
      
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarButton: () => null, // Hidden from tab bar
        }}
      />
      
      {/* Hidden Tab Screens - Accessible via navigation but not visible in tab bar */}
      <Tab.Screen 
        name="ChatBot" 
        component={ChatBot}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
      
      <Tab.Screen 
        name="ExpertProfile" 
        component={ExpertProfileScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
      
      <Tab.Screen 
        name="Categories" 
        component={CategoriesScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
      
      <Tab.Screen 
        name="ConsultantList" 
        component={ConsultantListScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
      
      <Tab.Screen 
        name="ExpertsList" 
        component={ExpertListScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
      
      <Tab.Screen 
        name="ExpertProfileScreen" 
        component={ExpertProfileScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  // Configure StatusBar for different platforms and screen types
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#ffffff', true);
      StatusBar.setBarStyle('dark-content', true);
      StatusBar.setTranslucent(false);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* Responsive StatusBar configuration */}
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#ffffff" 
          translucent={false}
          networkActivityIndicatorVisible={false}
          {...Platform.select({
            ios: {
              hidden: false,
            },
            android: {
              animated: true,
            },
          })}
        />
        
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Splash" 
            screenOptions={{ 
              headerShown: false,
              // Optimize animations for better performance
              animation: 'slide_from_right',
              presentation: 'card',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          >
            {/* Authentication Flow */}
            <Stack.Screen 
              name="Splash" 
              component={SplashScreen}
              options={{
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
            
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={{
                animation: 'slide_from_bottom',
                presentation: 'modal',
                gestureEnabled: true,
                gestureDirection: 'vertical',
              }}
            />
            
            <Stack.Screen 
              name="OTPVerification" 
              component={OTPVerificationScreen}
              options={{
                animation: 'slide_from_right',
                gestureEnabled: false, // Prevent accidental back navigation during OTP
              }}
            />
            
            <Stack.Screen 
              name="PasswordVerification" 
              component={PasswordVerificationScreen}
              options={{
                animation: 'slide_from_right',
                gestureEnabled: false,
              }}
            />

            {/* Main App Flow */}
            <Stack.Screen 
              name="Main" 
              component={MainTabNavigator}
              options={{
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
            
            {/* Stack-only Screens for better UX */}
            <Stack.Screen 
              name="ChatBotStack" 
              component={ChatBot}
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            
            <Stack.Screen 
              name="ChatScreen" 
              component={ChatScreen}
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            
            {/* Expert/Consultant Related Screens */}
            <Stack.Screen 
              name="CategoriesStack" 
              component={CategoriesScreen}
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            
            <Stack.Screen 
              name="ConsultantListStack" 
              component={ConsultantListScreen}
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            
            <Stack.Screen 
              name="ExpertsListStack" 
              component={ExpertListScreen}
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            
            <Stack.Screen 
              name="ExpertProfileStack" 
              component={ExpertProfileScreen}
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />

            {/* Legacy Routes - Keep for backward compatibility */}
            <Stack.Screen 
              name="Categories" 
              component={CategoriesScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            
            <Stack.Screen 
              name="ConsultantList" 
              component={ConsultantListScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            
            <Stack.Screen 
              name="ConsultantListScreen" 
              component={ConsultantListScreen}
              options={{ 
                headerShown: false 
              }}
            />
            
            <Stack.Screen 
              name="ExpertsList" 
              component={ExpertListScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            
            <Stack.Screen 
              name="ExpertsListScreen" 
              component={ExpertListScreen}
              options={{ 
                headerShown: false 
              }}
            />
            
            <Stack.Screen 
              name="ExpertProfileScreen" 
              component={ExpertProfileScreen}
              options={{ 
                headerShown: false 
              }}
            />
            
            <Stack.Screen 
              name="ExpertProfile" 
              component={ExpertProfileScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            <Stack.Screen 
  name="VideoCall" 
  component={VideoCallScreen}
  options={{
    headerShown: false,
    presentation: 'fullScreenModal',
    animation: 'fade',
    gestureEnabled: false, // Prevent accidental swipe during call
    // Prevent back button during call on Android
    ...Platform.select({
      android: {
        gestureEnabled: false,
      },
    }),
  }}
/>
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;