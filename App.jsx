// App.jsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider } from './src/context/AuthContext';

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import PasswordVerificationScreen from './src/screens/PasswordVerificationScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SearchScreen from './src/screens/SearchScreen';
import ReelsScreen from './src/screens/ReelsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import ConsultantListScreen from './src/screens/ConsultantListScreen';
import ExpertProfileScreen from './src/screens/ExpertProfileScreen';

import Navbar from './src/components/Navbar/Navbar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar = (props) => {
  return <Navbar {...props} />;
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ 
        headerShown: false,
        // Hide tab bar on Reels screen
        tabBarStyle: ({ route }) => {
          const routeName = route.name;
          if (routeName === 'Reels') {
            return { display: 'none' };
          }
          return {};
        }
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen 
        name="Reels" 
        component={ReelsScreen}
        options={{
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Login" component={LoginScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
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
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Splash" 
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="PasswordVerification" component={PasswordVerificationScreen} />
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
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ExpertProfileScreen" 
              component={ExpertProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ExpertProfile" 
              component={ExpertProfileScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;