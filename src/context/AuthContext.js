// src/context/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import ApiService from '../services/ApiService';

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
        loading: false 
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { 
        ...state, 
        user: null, 
        isAuthenticated: false, 
        loading: false,
        sessionId: null
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const token = await ApiService.getAuthToken();
      
      if (token) {
        dispatch({ type: 'SET_USER', payload: { verified: true } });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const signUp = async (userData) => {
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
  };

  const sendOTP = async (phone) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.sendOTP(phone);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      
      if (result.success) {
        if (result.data.sessionID) {
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
  };

  const verifyOTP = async (otp) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      if (!state.sessionId) {
        dispatch({ type: 'SET_ERROR', payload: 'Session expired. Please request OTP again.' });
        return { success: false, error: 'Session expired. Please request OTP again.' };
      }

      const result = await ApiService.verifyOTP(state.sessionId, otp);
      
      if (result.success) {
        dispatch({ type: 'SET_USER', payload: { verified: true } });
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
  };

  const login = async (phone, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.login(phone, password);
      
      if (result.success) {
        if (result.data.token) {
          await ApiService.setAuthToken(result.data.token);
        }
        dispatch({ type: 'SET_USER', payload: result.data.user || { phone } });
        return { success: true, data: result.data };
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await ApiService.logout();
      dispatch({ type: 'LOGOUT' });
      return { success: true };
    } catch (error) {
      dispatch({ type: 'LOGOUT' });
      return { success: true };
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