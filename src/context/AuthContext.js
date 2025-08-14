// src/context/AuthContext.js - Fixed to match backend expectations exactly
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        loading: false,
        error: null
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { 
        ...state, 
        user: null, 
        isAuthenticated: false, 
        loading: false,
        sessionId: null,
        error: null
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  sessionId: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const checkAuthStatus = useCallback(async () => {
    try {
      console.log('[AUTH] Checking auth status...');
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const userData = await AsyncStorage.getItem('userData');
      const authToken = await AsyncStorage.getItem('authToken');
      
      if (userData && authToken) {
        const parsedUser = JSON.parse(userData);
        console.log('[AUTH] Found stored user data:', parsedUser);
        dispatch({ type: 'SET_USER', payload: parsedUser });
      } else {
        console.log('[AUTH] No stored user data or token found');
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('[AUTH] Error checking auth status:', error);
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const result = await ApiService.getUserProfile();
      if (result.success) {
        dispatch({ type: 'SET_USER', payload: result.data });
        return { success: true, data: result.data };
      } else if (result.needsLogin) {
        dispatch({ type: 'LOGOUT' });
        return { success: false, error: 'Session expired', needsLogin: true };
      }
      return result;
    } catch (error) {
      console.error('[AUTH] Error refreshing user data:', error);
      return { success: false, error: 'Failed to refresh user data' };
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const signUp = useCallback(async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.signUp(userData);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'Sign up failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, []);

  const sendOTP = useCallback(async (phone) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.sendOTP(phone);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      
      if (result.success) {
        if (result.data?.sessionID) {
          dispatch({ type: 'SET_SESSION_ID', payload: result.data.sessionID });
        }
        return { success: true, data: result.data };
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to send OTP';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, []);

  const verifyOTP = useCallback(async (otp) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      if (!state.sessionId) {
        const errorMsg = 'Session expired. Please request OTP again.';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return { success: false, error: errorMsg };
      }

      const result = await ApiService.verifyOTP(state.sessionId, otp);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'OTP verification failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, [state.sessionId]);

  const login = useCallback(async (phone, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.login(phone, password);
      console.log('[AUTH] Login result:', result);

      if (result.success) {
        const userData = result.data.user || result.data;
        console.log('[AUTH] Setting user data:', userData);
        
        dispatch({ type: 'SET_USER', payload: userData });
        return { success: true, data: userData };
      } else {
        if (result.needsLogin) {
          dispatch({ type: 'LOGOUT' });
        }
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error, needsLogin: result.needsLogin };
      }
    } catch (error) {
      const errorMsg = error.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, []);

  // FIXED: Profile update method to match backend exactly
  const updateUserProfile = useCallback(async (profileData) => {
    try {
      console.log('[AUTH_CONTEXT] Updating user profile with data:', profileData);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Determine if this is a consultant profile update
      const isConsultantUpdate = profileData.role === 'consultant' || 
                                 profileData.sessionFee || 
                                 profileData.qualification || 
                                 profileData.fieldOfStudy || 
                                 profileData.university || 
                                 profileData.yearsOfExperience || 
                                 profileData.category;

      console.log('[AUTH_CONTEXT] Is consultant update:', isConsultantUpdate);

      // Use the single updateProfile method that handles both cases
      const result = await ApiService.updateProfile(profileData);

      if (result.success) {
        console.log('[AUTH_CONTEXT] Profile update successful:', result.data);
        
        // Update user state with fresh data from response
        if (result.data) {
          const updatedUser = result.data.user || result.data;
          
          // Update the user data in state
          dispatch({ type: 'SET_USER', payload: updatedUser });
          
          // Update local storage with fresh user data
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        }
        
        return result;
      } else {
        // Handle session expiry
        if (result.needsLogin) {
          dispatch({ type: 'LOGOUT' });
          return { success: false, error: 'Session expired. Please login again.', needsLogin: true };
        }
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return result;
      }
    } catch (error) {
      console.error('[AUTH_CONTEXT] Error updating user profile:', error);
      const errorMsg = error.message || 'Failed to update profile';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Aadhaar verification function
  const submitAadharVerification = useCallback(async (kycData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.submitAadharVerification(kycData);
      console.log('[AUTH] Aadhaar verification result:', result);

      if (result.success) {
        const updatedUser = result.data.user || result.data;
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        
        return { success: true, data: updatedUser };
      } else {
        if (result.needsLogin) {
          dispatch({ type: 'LOGOUT' });
          return { success: false, error: 'Session expired. Please login again.', needsLogin: true };
        }
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'Aadhaar verification failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('[AUTH] Logging out...');
      
      await ApiService.logout();
      dispatch({ type: 'LOGOUT' });
      console.log('[AUTH] Logout successful');
      
      return { success: true };
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      dispatch({ type: 'LOGOUT' });
      return { success: true };
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = React.useMemo(() => ({
    ...state,
    signUp,
    sendOTP,
    verifyOTP,
    login,
    logout,
    clearError,
    checkAuthStatus,
    updateUserProfile,
    refreshUserData,
    submitAadharVerification,
  }), [
    state,
    signUp,
    sendOTP,
    verifyOTP,
    login,
    logout,
    clearError,
    checkAuthStatus,
    updateUserProfile,
    refreshUserData,
    submitAadharVerification,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};