// src/context/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import ApiService from '../services/ApiService';

const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        loading: false 
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { 
        ...state, 
        user: null, 
        isAuthenticated: false, 
        loading: false 
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const isAuth = await ApiService.isAuthenticated();
      
      if (isAuth) {
        const profileResult = await ApiService.getProfile();
        if (profileResult.success) {
          dispatch({ type: 'SET_USER', payload: profileResult.data });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const signUp = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.signUp(userData);
      
      if (result.success) {
        // Don't set user yet, wait for OTP verification
        dispatch({ type: 'SET_LOADING', payload: false });
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
  };

  const sendOTP = async (phoneNumber, type = 'login') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.sendOTP(phoneNumber, type);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      
      if (result.success) {
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
  };

  const verifyOTP = async (phoneNumber, otp, type = 'login') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.verifyOTP(phoneNumber, otp, type);
      
      if (result.success) {
        // Store token if provided
        if (result.data.token) {
          await ApiService.setAuthToken(result.data.token);
        }
        
        // Get user profile
        const profileResult = await ApiService.getProfile();
        if (profileResult.success) {
          dispatch({ type: 'SET_USER', payload: profileResult.data });
          return { success: true, data: result.data };
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: result.error });
      return { success: false, error: result.error };
    } catch (error) {
      const errorMsg = error.message || 'OTP verification failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  };

  const login = async (phoneNumber, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.login(phoneNumber, password);
      
      if (result.success) {
        // Store token
        if (result.data.token) {
          await ApiService.setAuthToken(result.data.token);
        }
        
        // Get user profile
        const profileResult = await ApiService.getProfile();
        if (profileResult.success) {
          dispatch({ type: 'SET_USER', payload: profileResult.data });
          return { success: true, data: result.data };
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: result.error });
      return { success: false, error: result.error };
    } catch (error) {
      const errorMsg = error.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await ApiService.logout();
      dispatch({ type: 'LOGOUT' });
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      dispatch({ type: 'LOGOUT' }); // Force logout even if API call fails
      return { success: true };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.updateProfile(profileData);
      
      if (result.success) {
        dispatch({ type: 'SET_USER', payload: result.data });
        return { success: true, data: result.data };
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'Profile update failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    signUp,
    sendOTP,
    verifyOTP,
    login,
    logout,
    updateProfile,
    clearError,
    checkAuthStatus,
  };

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