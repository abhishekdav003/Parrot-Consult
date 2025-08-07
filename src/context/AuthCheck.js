import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const AuthCheck = {
  // Function to check if user is authenticated
  checkAuthentication: (navigation, onSuccess) => {
    const { isAuthenticated, user } = useAuth();
    
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Login Required',
        'Please login to book a consultation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => {
              navigation.navigate('Login');
            }
          }
        ]
      );
      return false;
    }
    
    if (onSuccess) {
      onSuccess();
    }
    return true;
  },

  // Function to redirect to OTP verification if needed
  redirectToOTP: (navigation, phoneNumber) => {
    navigation.navigate('OTPVerification', { phoneNumber });
  }
};

export default AuthCheck;