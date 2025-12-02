// src/context/AuthContext.js - OTP-Only Authentication (Production Ready)
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

// ==================== REDUCER ====================
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
        error: null,
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
        error: null,
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
      case 'SET_SESSION_PHONE':
       return { ...state, sessionPhone: action.payload };
    
    default:
      return state;
  }
};

// ==================== INITIAL STATE ====================
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  sessionId: null,
  sessionPhone: null,
};

// ==================== AUTH PROVIDER ====================
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ==================== CHECK AUTH STATUS ====================
  const checkAuthStatus = useCallback(async () => {
    try {
      console.log('[AUTH] Checking auth status...');
      dispatch({ type: 'SET_LOADING', payload: true });

      const userData = await AsyncStorage.getItem('userData');
      const authToken = await AsyncStorage.getItem('authToken');

      if (userData && authToken) {
        const parsedUser = JSON.parse(userData);
        console.log('[AUTH] Found stored user data:', parsedUser.fullName);
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

  // ==================== REFRESH USER DATA ====================
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

  // ==================== INITIALIZE ====================
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // ==================== SIGN UP ====================
  const signUp = useCallback(async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      console.log('[AUTH] Signing up user:', userData.fullName);

      const result = await ApiService.signUp(userData);

      dispatch({ type: 'SET_LOADING', payload: false });

      if (result.success) {
        console.log('[AUTH] Sign up successful');
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

  // ==================== SEND OTP ====================
  const sendOTP = useCallback(async (phone) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      console.log('[AUTH] Sending OTP to:', phone);

      const result = await ApiService.sendOTP(phone);

      dispatch({ type: 'SET_LOADING', payload: false });

      if (result.success) {
        if (result.data?.sessionID) {
          dispatch({ type: 'SET_SESSION_ID', payload: result.data.sessionID });
          dispatch({ type: 'SET_SESSION_PHONE', payload: phone });
          console.log('[AUTH] Session ID set:', result.data.sessionID);
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

  // ==================== VERIFY OTP (Login) ====================
  const verifyOTP = useCallback(async (otp, phone = null) => {
  try {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    if (!state.sessionId) {
      const errorMsg = 'Session expired. Please request OTP again.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }

    // Prefer phone passed in, otherwise use stored sessionPhone
    const phoneToSend = phone || state.sessionPhone;
    if (!phoneToSend) {
      const errorMsg = 'Phone number missing. Please request OTP again.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: errorMsg };
    }

    console.log('[AUTH] Verifying OTP with session:', state.sessionId, 'phone:', phoneToSend);

    const result = await ApiService.verifyOTP(state.sessionId, otp, phoneToSend);

    dispatch({ type: 'SET_LOADING', payload: false });

      if (result.success) {
        // Extract user data from response
        const userData = result.data?.user || result.data;
        const token = result.data?.accessToken;

        console.log('[AUTH] OTP verification successful');

        // Store user data
        if (userData) {
          dispatch({ type: 'SET_USER', payload: userData });
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
        }

        // Store token if provided
        if (token) {
          await AsyncStorage.setItem('authToken', token);
          console.log('[AUTH] Auth token stored');
        }

        return { success: true, data: userData };
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

  // ==================== LOGIN (DEPRECATED - OTP ONLY) ====================
  // Kept for backward compatibility but should not be used
  const login = useCallback(async (phone, password) => {
    console.warn('[AUTH] Legacy login method called. Using OTP-only flow instead.');
    // This should not be called anymore
    return {
      success: false,
      error: 'OTP-only authentication is now required. Please use the OTP verification flow.',
    };
  }, []);

  // ==================== UPDATE USER PROFILE ====================
  const updateUserProfile = useCallback(async (profileData) => {
    try {
      console.log('[AUTH] Updating user profile...');
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.updateProfile(profileData);

      if (result.success) {
        console.log('[AUTH] Profile update successful');

        if (result.data) {
          const updatedUser = result.data.user || result.data;
          dispatch({ type: 'SET_USER', payload: updatedUser });
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        }

        dispatch({ type: 'SET_LOADING', payload: false });
        return result;
      } else {
        if (result.needsLogin) {
          dispatch({ type: 'LOGOUT' });
          return {
            success: false,
            error: 'Session expired. Please login again.',
            needsLogin: true,
          };
        }
        dispatch({ type: 'SET_ERROR', payload: result.error });
        dispatch({ type: 'SET_LOADING', payload: false });
        return result;
      }
    } catch (error) {
      console.error('[AUTH] Error updating user profile:', error);
      const errorMsg = error.message || 'Failed to update profile';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: errorMsg };
    }
  }, []);

  // ==================== SUBMIT AADHAAR VERIFICATION ====================
  const submitAadharVerification = useCallback(async (kycData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      console.log('[AUTH] Submitting Aadhaar verification...');

      const result = await ApiService.submitAadharVerification(kycData);

      if (result.success) {
        const updatedUser = result.data.user || result.data;
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        dispatch({ type: 'SET_LOADING', payload: false });

        return { success: true, data: updatedUser };
      } else {
        if (result.needsLogin) {
          dispatch({ type: 'LOGOUT' });
          dispatch({ type: 'SET_LOADING', payload: false });
          return {
            success: false,
            error: 'Session expired. Please login again.',
            needsLogin: true,
          };
        }
        dispatch({ type: 'SET_ERROR', payload: result.error });
        dispatch({ type: 'SET_LOADING', payload: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'Aadhaar verification failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: errorMsg };
    }
  }, []);

  // ==================== LOGOUT ====================
  const logout = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('[AUTH] Logging out...');

      await ApiService.logout();
      dispatch({ type: 'LOGOUT' });

      console.log('[AUTH] Logout successful');
      dispatch({ type: 'SET_LOADING', payload: false });

      return { success: true };
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      dispatch({ type: 'LOGOUT' });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true };
    }
  }, []);

  // ==================== CLEAR ERROR ====================
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // ==================== MEMOIZED VALUE ====================
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

// ==================== CUSTOM HOOK ====================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};