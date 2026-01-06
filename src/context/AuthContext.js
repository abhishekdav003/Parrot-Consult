

// src/context/AuthContext.js
// OTP-Only Authentication with persistent access + refresh token handling
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService'; // ensure this file exists and exports used functions
import { requestNotificationPermission, getFCMToken } from '../utils/fcm';


const AuthContext = createContext();

// ==================== REDUCER ====================
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_POST_LOGIN_INTENT':
  return {
    ...state,
    postLoginIntent: action.payload,
  };

case 'CLEAR_POST_LOGIN_INTENT':
  return {
    ...state,
    postLoginIntent: null,
  };

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
        sessionPhone: null,
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
  postLoginIntent: null,
};

// ==================== AUTH PROVIDER ====================
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ==================== CHECK AUTH STATUS ====================
  // Tries: 1) If access token + userData present -> use it
  //       2) If access token missing but refresh token present -> call refresh endpoint and recover


  const registerDeviceForNotifications = useCallback(async () => {
  try {
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      console.log('[FCM] Notification permission not granted');
      return;
    }

    const fcmToken = await getFCMToken();
    if (!fcmToken) {
      console.log('[FCM] No FCM token received');
      return;
    }

    console.log('[FCM] Device token:', fcmToken);

    const result = await ApiService.saveDeviceToken(fcmToken);
    if (result.success) {
      console.log('[FCM] Device token saved to backend');
    } else {
      console.log('[FCM] Failed to save token:', result.error);
    }
  } catch (error) {
    console.error('[FCM] Token registration error:', error);
  }
}, []);


  const setPostLoginIntent = useCallback((intent) => {
  dispatch({
    type: 'SET_POST_LOGIN_INTENT',
    payload: intent,
  });
}, []);

const clearPostLoginIntent = useCallback(() => {
  dispatch({
    type: 'CLEAR_POST_LOGIN_INTENT',
  });
}, []);

 const checkAuthStatus = useCallback(async () => {
  try {
    console.log('[AUTH] Checking auth status.');
    dispatch({ type: 'SET_LOADING', payload: true });

    // Correct AsyncStorage.multiGet parsing
    const storage = await AsyncStorage.multiGet([
      'userData',
      'authToken',
      'refreshToken',
    ]);

    let userDataStr = null;
    let authToken = null;
    let refreshToken = null;

    storage.forEach(([key, value]) => {
      if (key === 'userData') userDataStr = value;
      if (key === 'authToken') authToken = value;
      if (key === 'refreshToken') refreshToken = value;
    });

    // --- Now continue the logic exactly as before ---
    if (userDataStr && authToken) {
      const parsedUser = JSON.parse(userDataStr);
      dispatch({ type: 'SET_USER', payload: parsedUser });
      registerDeviceForNotifications();
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    if (!authToken && refreshToken) {
      console.log('[AUTH] No access token, attempting refresh...');
      const rt = await ApiService.refreshToken(refreshToken);

      if (rt?.success && rt.data?.accessToken) {
        await AsyncStorage.setItem('authToken', rt.data.accessToken);
        await AsyncStorage.setItem('refreshToken', rt.data.refreshToken || refreshToken);

        const profile = await ApiService.getUserProfile();
        if (profile.success) {
          await AsyncStorage.setItem('userData', JSON.stringify(profile.data));
          dispatch({ type: 'SET_USER', payload: profile.data });
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }
      }
    }

    console.log('[AUTH] No valid session, logging out...');
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
    dispatch({ type: 'LOGOUT' });
    dispatch({ type: 'SET_LOADING', payload: false });

  } catch (error) {
    console.error('[AUTH] Error checking auth status:', error);
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
    dispatch({ type: 'LOGOUT' });
    dispatch({ type: 'SET_LOADING', payload: false });
  }
}, []);


  // ==================== REFRESH USER DATA ====================
  const refreshUserData = useCallback(async () => {
    try {
      const result = await ApiService.getUserProfile();
      if (result.success) {
        dispatch({ type: 'SET_USER', payload: result.data });
        await AsyncStorage.setItem('userData', JSON.stringify(result.data));
        return { success: true, data: result.data };
      } else if (result.needsLogin) {
        // server indicated session expired
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
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

      console.log('[AUTH] Signing up user:', userData?.fullName || userData?.phone);
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
      dispatch({ type: 'SET_LOADING', payload: false });
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
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: errorMsg };
    }
  }, []);

  // ==================== VERIFY OTP (Login) ====================
  // On success: store userData, accessToken, refreshToken (if returned)
  const verifyOTP = useCallback(async (otp, phone = null) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      if (!state.sessionId) {
        const errorMsg = 'Session expired. Please request OTP again.';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        dispatch({ type: 'SET_LOADING', payload: false });
        return { success: false, error: errorMsg };
      }

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
  console.log('[AUTH] OTP success, setting user from profile');

  const userFromProfile = result.data?.user || result.data;

  if (!userFromProfile) {
    throw new Error('User profile missing after OTP login');
  }

  // 🔥 THIS IS THE FIX
  dispatch({ type: 'SET_USER', payload: userFromProfile });

  // registerDeviceForNotifications();
  await AsyncStorage.setItem(
    'userData',
    JSON.stringify(userFromProfile)
  );

  return { success: true, data: userFromProfile };
}
 else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'OTP verification failed';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: errorMsg };
    }
  }, [
  state.sessionId,
  state.sessionPhone,
  registerDeviceForNotifications
]);


  // ==================== LOGIN (DEPRECATED - OTP ONLY) ====================
  const login = useCallback(async (phone, password) => {
    console.warn('[AUTH] Legacy login called. Use OTP flow.');
    return { success: false, error: 'OTP-only flow. Use verifyOTP.' };
  }, []);

  // ==================== UPDATE USER PROFILE ====================
  const updateUserProfile = useCallback(async (profileData) => {
    try {
      console.log('[AUTH] Updating user profile.');
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await ApiService.updateProfile(profileData);

      dispatch({ type: 'SET_LOADING', payload: false });

      if (result.success) {
        console.log('[AUTH] Profile update successful');
        // update local copy
        if (result.data) {
          dispatch({ type: 'SET_USER', payload: result.data });
          await AsyncStorage.setItem('userData', JSON.stringify(result.data));
        }
        return { success: true, data: result.data };
      } else if (result.needsLogin) {
        dispatch({ type: 'LOGOUT' });
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
        return { success: false, error: 'Session expired', needsLogin: true };
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[AUTH] updateUserProfile error:', error);
      const msg = error.message || 'Profile update failed';
      dispatch({ type: 'SET_ERROR', payload: msg });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: msg };
    }
  }, []);

  // ==================== LOGOUT ====================
  const logout = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('[AUTH] Logging out.');

      // Attempt server logout (if implemented). If your ApiService.logout uses cookies for web,
      // it's still safe for mobile because backend handles mobile separately.
      try {
        await ApiService.logout();
      } catch (e) {
        console.warn('[AUTH] Server logout failed (non-fatal):', e?.message || e);
      }

      // Clear local storage and state
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
      dispatch({ type: 'LOGOUT' });
      dispatch({ type: 'SET_LOADING', payload: false });

      console.log('[AUTH] Logout successful');
      return { success: true };
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
      dispatch({ type: 'LOGOUT' });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true };
    }
  }, []);

  // ==================== AADHAAR / EXTRA ACTIONS (kept as in original) ====================
  // Example placeholders - you already had these in your file. Keep using them.
  const submitAadharVerification = useCallback(async (data) => {
    // keep your existing implementation; this is a placeholder so other parts of app can import.
    const result = await ApiService.submitAadharVerification?.(data);
    return result || { success: false, error: 'Not implemented' };
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
    setPostLoginIntent,
    clearPostLoginIntent,
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
