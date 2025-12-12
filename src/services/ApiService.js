// src/services/ApiService.js - Fixed to match backend expectations exactly
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';


const BASE_URL = 'http://10.0.2.2:8011/api/v1';




// const BASE_URL = 'https://api.parrotconsult.com/api/v1';


const toLocalDateOnly = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
    this.requestTimeout = 30000; // 30 seconds timeout
  }

  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('[API] Error getting auth token:', error);
      return null;
    }
  }

  async setAuthToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('[API] Error storing auth token:', error);
    }
  }

  async removeAuthToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('[API] Error removing auth token:', error);
    }
  }

  async apiCall(endpoint, options = {}) {
    try {
      const token = await this.getAuthToken();

      const defaultHeaders = {
        'Content-Type': 'application/json',
        // Ensure backend treats this as a mobile client and returns tokens in response body
        'x-mobile-app': 'true',
      };

      // CRITICAL: Send token as Cookie header for backend compatibility (if present)
      if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
        defaultHeaders['Cookie'] = `accessToken=${token}`;
      }

      // Don't set Content-Type for FormData requests
      if (options.body instanceof FormData) {
        delete defaultHeaders['Content-Type'];
      }

      const config = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        timeout: this.requestTimeout,
      };

      console.log(`[API] → ${this.baseURL}${endpoint}`);
      console.log(`[API] METHOD: ${config.method || 'GET'}`);
      console.log(`[API] Headers:`, config.headers);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...config,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const text = await response.text();

        let data;
        try {
          if (text.startsWith('{') || text.startsWith('[')) {
            data = JSON.parse(text);
          } else {
            console.warn(`[API] Non-JSON response:`, text);

            if (text.includes('Invalid User Token') || text.includes('Unauthorized')) {
              return {
                success: false,
                error: 'Session expired. Please login again.',
                needsLogin: true
              };
            }

            return {
              success: false,
              error: 'Server returned invalid format',
            };
          }
        } catch (parseError) {
          console.error(`[API] Parse error:`, parseError);
          return {
            success: false,
            error: 'Invalid response from server',
          };
        }

        if (!response.ok) {
          console.warn(`[API] HTTP Error ${response.status}:`, data);

          if (response.status === 401 || response.status === 403) {
            const refreshResult = await this.refreshToken();
            if (refreshResult.success) {
              // Retry original call (recursive, safe for single depth)
              return await this.apiCall(endpoint, options);
            } else {
              return {
                success: false,
                error: data.message || 'Session expired. Please login again.',
                needsLogin: true,
                status: response.status
              };
            }
          }

          return {
            success: false,
            error: data.message || `HTTP error! status: ${response.status}`,
            status: response.status
          };
        }

        console.log(`[API] ✓ Success:`, data);

        return {
          success: true,
          data: data.data || data,
          message: data.message,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - please check your network connection');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error(`[API] Request failed:`, error);

      let errorMessage = 'Network error occurred';

      if (error.message?.includes('timeout')) {
        errorMessage = 'Request timeout - please check your network connection';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network connection failed - please check your internet connection and server status';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // ==================== OTP AUTHENTICATION METHODS ====================

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('[API] Error getting refresh token:', error);
      return null;
    }
  }

  async setRefreshToken(token) {
    try {
      await AsyncStorage.setItem('refreshToken', token);
    } catch (error) {
      console.error('[API] Error storing refresh token:', error);
    }
  }

  async removeRefreshToken() {
    try {
      await AsyncStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('[API] Error removing refresh token:', error);
    }
  }

  async refreshToken() {
    console.log('[API] Refreshing token...');
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available', needsLogin: true };
      }

      const result = await this.apiCall('/user/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (result.success) {
        // Expect result.data to include accessToken and refreshToken
        if (result.data?.accessToken) {
          await this.setAuthToken(result.data.accessToken);
        }
        if (result.data?.refreshToken) {
          await this.setRefreshToken(result.data.refreshToken);
        }
        console.log('[API] Token refreshed successfully');
        return { success: true };
      } else {
        await this.removeAuthToken();
        await this.removeRefreshToken();
        return { success: false, error: result.error || 'Refresh failed', needsLogin: true };
      }
    } catch (error) {
      console.error('[API] Refresh token error:', error);
      return { success: false, error: 'Refresh failed', needsLogin: true };
    }
  }

  /**
   * Sign up user with phone and name (OTP-only flow)
   * @param {Object} userData - { fullName, phone }
   * @returns {Promise<Object>}
   */
  async signUp(userData) {
    console.log('[API] Signing up user:', userData.fullName);

    try {
      const result = await this.apiCall('/user/registeruser', {
        method: 'POST',
        body: JSON.stringify({
          fullName: userData.fullName,
          phone: userData.phone,
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (result.success) {
        console.log('[API] Sign up successful');
        return {
          success: true,
          data: result.data || { id: result.data?.user?._id, ...userData }
        };
      } else {
        console.warn('[API] Sign up failed:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to create account. Please try again.',
        };
      }
    } catch (error) {
      console.error('[API] Sign up error:', error);
      return {
        success: false,
        error: error.message || 'Network error during sign up',
      };
    }
  }

  /**
   * Send OTP to phone number
   * @param {string} phone - 10-digit phone number
   * @returns {Promise<Object>}
   */
  async sendOTP(phone) {
    console.log('[API] Sending OTP to phone:', phone);

    try {
      if (!phone || !/^[0-9]{10}$/.test(phone)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      const result = await this.apiCall('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (result.success) {
        console.log('[API] OTP sent successfully');
        console.log('[API] Session ID:', result.data?.sessionID);

        return {
          success: true,
          data: {
            sessionID: result.data?.sessionID || result.data?.sessionId,
            message: result.message || 'OTP sent successfully'
          }
        };
      } else {
        console.warn('[API] Failed to send OTP:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to send OTP. Please try again.',
        };
      }
    } catch (error) {
      console.error('[API] Send OTP error:', error);
      return {
        success: false,
        error: error.message || 'Network error while sending OTP',
      };
    }
  }

  /**
   * Verify OTP and login user (OTP-only flow)
   * @param {string} sessionId - Session ID from sendOTP
   * @param {string} otp - 6-digit OTP
   * @returns {Promise<Object>}
   */
  async verifyOTP(sessionId, otp, phone) {
    console.log('[API] Verifying OTP with session:', sessionId, 'phone:', phone);

    try {
      if (!sessionId || !otp || !phone) {
        return {
          success: false,
          error: 'Session ID, phone and OTP are required',
        };
      }

      if (!/^[0-9]{6}$/.test(otp)) {
        return {
          success: false,
          error: 'OTP must be a 6-digit number',
        };
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // OTP-only login flow (no password needed)
      const result = await this.apiCall('/user/loginuser', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: phone,
          sessionID: sessionId,
          otp: otp,
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      });
           console.log('====================================');
           console.log("result logi " , result);
           console.log('====================================');
      if (result.success) {
        console.log('[API] OTP verification successful');

        // Extract user and token from response
        const userData = result.data?.user || result.data;
        const token = result.data?.accessToken;
        const refresh = result.data?.refreshToken;

        // Store token
        if (token) {
          await this.setAuthToken(token);
          console.log('[API] Auth token saved');
        }

        // Store refresh token (NEW: ensure refresh token is persisted for session recovery)
        if (refresh) {
          await this.setRefreshToken(refresh);
          console.log('[API] Refresh token saved');
        }

        // Store user data
        if (userData) {
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          console.log('[API] User data saved');
        }

        return {
          success: true,
          data: {
            user: userData,
            accessToken: token,
            refreshToken: refresh,
          }
        };
      } else {
        console.warn('[API] OTP verification failed:', result.error);

        // Handle session-related errors
        if (result.error?.includes('session') || result.error?.includes('expired')) {
          return {
            success: false,
            error: 'Session expired. Please request OTP again.',
            sessionExpired: true,
          };
        }

        return {
          success: false,
          error: result.error || 'Invalid OTP. Please try again.',
        };
      }
    } catch (error) {
      console.error('[API] Verify OTP error:', error);
      return {
        success: false,
        error: error.message || 'Network error during OTP verification',
      };
    }
  }

  /**
   * Resend OTP (used when user didn't receive the code)
   * @param {string} phone - 10-digit phone number
   * @returns {Promise<Object>}
   */
  async resendOTP(phone) {
    console.log('[API] Resending OTP to phone:', phone);

    try {
      if (!phone || !/^[0-9]{10}$/.test(phone)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // Use the same sendOTP endpoint
      const result = await this.sendOTP(phone);

      if (result.success) {
        console.log('[API] OTP resent successfully');
        return {
          success: true,
          data: result.data,
          message: 'OTP has been resent to your phone'
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('[API] Resend OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to resend OTP',
      };
    }
  }

  /**
   * Validate OTP without logging in (for verification purposes)
   * @param {string} sessionId - Session ID from sendOTP
   * @param {string} otp - 6-digit OTP
   * @returns {Promise<Object>}
   */
  async validateOTP(sessionId, otp) {
    console.log('[API] Validating OTP');

    try {
      const result = await this.apiCall('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: sessionId,
          otp: otp,
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (result.success) {
        console.log('[API] OTP validation successful');
        return {
          success: true,
          data: result.data || { verified: true }
        };
      } else {
        console.warn('[API] OTP validation failed:', result.error);
        return {
          success: false,
          error: result.error || 'OTP validation failed',
        };
      }
    } catch (error) {
      console.error('[API] Validate OTP error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * OTP-only logout (clears local data and revokes token)
   * @returns {Promise<Object>}
   */
  async logout() {
    try {
      console.log('[API] Logging out...');

      // Call logout endpoint to revoke token on server
      await this.apiCall('/user/logoutuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Clear local storage
      await this.removeAuthToken();
      await this.removeRefreshToken();
      await AsyncStorage.removeItem('userData');

      console.log('[API] Local data cleared on logout');
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('[API] Logout error:', error);

      // Still clear local data even if server call fails
      await this.removeAuthToken();
      await this.removeRefreshToken();
      await AsyncStorage.removeItem('userData');

      return { success: true, message: 'Logged out successfully' };
    }
  }

  /**
   * Check if phone number is already registered
   * @param {string} phone - 10-digit phone number
   * @returns {Promise<Object>}
   */
  async checkPhoneExists(phone) {
    console.log('[API] Checking if phone is registered:', phone);

    try {
      const result = await this.apiCall('/auth/check-phone', {
        method: 'POST',
        body: JSON.stringify({ phone }),
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (result.success) {
        return {
          success: true,
          exists: result.data?.exists || false,
          data: result.data,
        };
      } else {
        console.warn('[API] Failed to check phone:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to check phone availability',
        };
      }
    } catch (error) {
      console.error('[API] Check phone error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }


  // FIXED: Profile update to match backend expectations exactly
  async updateProfile(profileData) {
    console.log('[API] updateProfile called with:', profileData);

    try {
      const formData = new FormData();

      // Add basic fields that backend expects (matching website structure)
      const basicFields = ['fullName', 'phone', 'email', 'location'];
      basicFields.forEach(field => {
        if (profileData[field] !== undefined && profileData[field] !== null && profileData[field] !== '') {
          formData.append(field, profileData[field].toString());
        }
      });

      // Handle KYC fields
      const kycFields = ['aadharNumber', 'aadharURL', 'panNumber', 'panURL'];
      kycFields.forEach(field => {
        if (profileData[field] !== undefined && profileData[field] !== null && profileData[field] !== '') {
          formData.append(field, profileData[field].toString());
        }
      });

      // Handle consultant fields if it's a consultant profile
      const isConsultant = profileData.role === 'consultant' || 
                          profileData.sessionFee || 
                          profileData.qualification;

      if (isConsultant) {
        // Add role field
        formData.append('role', 'consultant');

        // Add consultant-specific fields (matching backend field names exactly)
        const consultantFields = {
          sessionFee: profileData.sessionFee,
          daysPerWeek: profileData.daysPerWeek,
          days: profileData.days,
          availableTimePerDay: profileData.availableTimePerDay,
          qualification: profileData.qualification,
          fieldOfStudy: profileData.fieldOfStudy,
          university: profileData.university,
          graduationYear: profileData.graduationYear,
          keySkills: profileData.keySkills,
          shortBio: profileData.shortBio,
          languages: profileData.languages,
          yearsOfExperience: profileData.yearsOfExperience,
          category: profileData.category,
          profileHealth: profileData.profileHealth || '0'
        };

        Object.entries(consultantFields).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            formData.append(key, value.toString());
          }
        });
      }

      // Handle profile image file
      if (profileData.profileImage && profileData.profileImage.uri) {
        const profileImage = profileData.profileImage;
        let fileUri = profileImage.uri;
        
        if (Platform.OS === 'android') {
          if (profileImage.uri.startsWith('content://')) {
            try {
              const destPath = `${RNBlobUtil.fs.dirs.CacheDir}/${profileImage.name || `profile_${Date.now()}.jpg`}`;
              await RNBlobUtil.fs.cp(profileImage.uri, destPath);
              fileUri = `file://${destPath}`;
            } catch (e) {
              console.error('[API] Failed to copy profile image URI:', e);
              throw new Error('Could not process profile image for upload');
            }
          } else if (!profileImage.uri.startsWith('file://')) {
            fileUri = `file://${profileImage.uri}`;
          }
        }

        const fileObj = {
          uri: fileUri,
          type: profileImage.type || 'image/jpeg',
          name: profileImage.name || `profile_${Date.now()}.jpg`,
        };

        console.log('[API] Adding profile image:', fileObj);
        formData.append('profileImage', fileObj);
      }

      // Handle resume file (CRITICAL: Backend expects 'resume' field)
      if (profileData.resume && profileData.resume.uri) {
        const resume = profileData.resume;
        let fileUri = resume.uri;

        if (Platform.OS === 'android') {
          if (resume.uri.startsWith('content://')) {
            try {
              const destPath = `${RNBlobUtil.fs.dirs.CacheDir}/${resume.name || `resume_${Date.now()}.pdf`}`;
              await RNBlobUtil.fs.cp(resume.uri, destPath);
              fileUri = `file://${destPath}`;
            } catch (e) {
              console.error('[API] Failed to copy resume URI:', e);
              throw new Error('Could not process resume for upload');
            }
          } else if (!resume.uri.startsWith('file://')) {
            fileUri = `file://${resume.uri}`;
          }
        }

        const fileObj = {
          uri: fileUri,
          type: resume.type || 'application/pdf',
          name: resume.name || `resume_${Date.now()}.pdf`,
        };

        console.log('[API] Adding resume file:', fileObj);
        formData.append('resume', fileObj);
      }

      console.log('[API] FormData prepared, calling /user/updateProfile');

      const result = await this.apiCall('/user/updateProfile', {
        method: 'POST',
        body: formData,
      });

      if (result.success && result.data) {
        const updatedUser = result.data.user || result.data;
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        console.log('[API] Profile update successful, user data updated');
      }

      return result;
    } catch (error) {
      console.error('[API] Error in updateProfile:', error);
      return {
        success: false,
        error: error.message || 'Failed to update profile'
      };
    }
  }

  // Get all users
  async getAllUsers() {
    console.log('[API] getAllUsers called');
    const result = await this.apiCall('/global/globalseeallactiveconsultants', {
      method: 'GET',
    });
    console.log('[API] getAllUsers result:', result);
    return result;
  }

async getBookedSlots(consultantId, date) {
  console.log('[API] Getting booked slots for:', consultantId, date);
  
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const result = await this.apiCall(`/booking/getbookingsviaConsultantid`, {
    method: 'GET',
  });
  
  if (result.success) {
    // Filter bookings for the specific date and consultant
    const bookedSlots = (result.data || []).filter(booking => {
      const bookingDate = new Date(booking.bookingDateTime);
      const bookingDateStr = bookingDate.toISOString().split('T')[0];
      return bookingDateStr === dateStr && booking.consultant._id === consultantId;
    });
    
    return {
      success: true,
      data: bookedSlots.map(booking => ({
        bookingDateTime: booking.bookingDateTime,
        time: new Date(booking.bookingDateTime).toTimeString().slice(0, 5)
      }))
    };
  }
  
  return result;
}

// Updated createBooking method with better error handling
async createBooking(bookingData) {
  console.log('[API] Creating booking with data:', bookingData);
  
  // Validate booking data before sending
  if (!bookingData.consultantId || !bookingData.userId || !bookingData.datetime) {
    return {
      success: false,
      error: 'Missing required booking information'
    };
  }
  
  // Check if the selected time slot is still available
  const selectedDate = new Date(bookingData.datetime);
  const availabilityCheck = await this.getBookedSlots(bookingData.consultantId, selectedDate);
  
  if (availabilityCheck.success) {
    const bookedSlots = availabilityCheck.data || [];
    const selectedTime = selectedDate.toTimeString().substring(0, 5); // HH:MM format
    
    const isSlotTaken = bookedSlots.some(slot => {
      return slot.time === selectedTime;
    });
    
    if (isSlotTaken) {
      return {
        success: false,
        error: 'This time slot has been booked by someone else. Please select another time.'
      };
    }
  }
  
  const result = await this.apiCall('/booking/createbooking', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });

  console.log('[API] Create booking result:', result);
  return result;
}

  async getUserBookings() {
    return await this.apiCall('/user/seebookings', {
      method: 'GET',
    });
  }

  async getConsultantBookings() {
    return await this.apiCall('/booking/getbookingsviaConsultantid', {
      method: 'GET',
    });
  }



  // FIXED: Consultant Application to match backend expectations
  async submitConsultantApplication(applicationData) {
    console.log('[API] Submitting consultant application:', applicationData);
    
    try {
      const formData = new FormData();

      // Map frontend field names to backend field names (CRITICAL)
      const fieldMapping = {
        rate: 'rate',                    // sessionFee -> rate
        daysPerWeek: 'daysPerWeek',
        qualification: 'qualification',
        field: 'field',                  // fieldOfStudy -> field  
        university: 'university',
        graduationYear: 'graduationYear',
        shortBio: 'shortBio',
        experience: 'experience',        // yearsOfExperience -> experience
        category: 'category'
      };

      // Add mapped fields
      Object.entries(fieldMapping).forEach(([backendKey, frontendKey]) => {
        const value = applicationData[frontendKey] || applicationData[backendKey];
        if (value !== null && value !== undefined && value !== '') {
          formData.append(backendKey, value.toString());
        }
      });

      // Handle languages array - backend expects multiple 'languages' fields
      if (applicationData.languages) {
        if (Array.isArray(applicationData.languages)) {
          applicationData.languages.forEach((language) => {
            if (language && language.trim()) {
              formData.append('languages', language.trim());
            }
          });
        } else if (typeof applicationData.languages === 'string') {
          const languagesArray = applicationData.languages.split(',').map(lang => lang.trim()).filter(lang => lang);
          languagesArray.forEach(language => {
            formData.append('languages', language);
          });
        }
      }

      // Handle resume file - CRITICAL: Backend expects exactly this structure
      if (applicationData.resume) {
        const resume = applicationData.resume;

        if (!resume.uri) {
          throw new Error('Resume file URI is missing');
        }

        let fileUri = resume.uri;

        if (Platform.OS === 'android') {
          if (resume.uri.startsWith('content://')) {
            try {
              const destPath = `${RNBlobUtil.fs.dirs.CacheDir}/${resume.name || `resume_${Date.now()}.pdf`}`;
              await RNBlobUtil.fs.cp(resume.uri, destPath);
              fileUri = `file://${destPath}`;
              console.log('[API] Copied content URI to cache:', fileUri);
            } catch (e) {
              console.error('[API] Failed to copy content URI:', e);
              throw new Error('Could not process file for upload');
            }
          } else if (!resume.uri.startsWith('file://')) {
            fileUri = `file://${resume.uri}`;
          }
        }

        const fileObj = {
          uri: fileUri,
          type: resume.type || 'application/pdf',
          name: resume.name || `resume_${Date.now()}.pdf`,
        };

        console.log('[API] Adding resume file:', fileObj);
        formData.append('resume', fileObj);
      }

      console.log('[API] FormData prepared for consultant application');
      
      let result = await this.apiCall('/user/consultantApplication', {
        method: 'POST',
        body: formData,
      });

      // Retry once if network error
      if (!result.success && result.error?.includes('Network')) {
        console.log('[API] Retrying consultant application due to network error...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        result = await this.apiCall('/user/consultantApplication', {
          method: 'POST',
          body: formData,
        });
      }

      if (result.success && result.data) {
        const updatedUser = result.data.user || result.data;
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        console.log('[API] Consultant application successful, user data updated');
      }

      return result;
    } catch (error) {
      console.error('[API] Error in submitConsultantApplication:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit consultant application'
      };
    }
  }

  // FIXED: KYC Verification to match backend expectations
  async submitAadharVerification(kycData) {
    console.log('[API] Submitting Aadhaar verification:', kycData);

    // Backend expects nested field structure
    const requestData = {
      'kycVerify.aadharNumber': parseInt(kycData.aadharNumber),
      'kycVerify.panNumber': kycData.panNumber,
      'kycVerify.aadharURL': kycData.aadharURL,
      'kycVerify.panURL': kycData.panURL,
      'aadharVerified': true
    };

    console.log('[API] Request data for Aadhaar verification:', requestData);

    const result = await this.apiCall('/user/aadharVerify', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    if (result.success && result.data) {
      const updatedUser = result.data.user || result.data;
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    }

    return result;
  }

  async getConsultantStatus() {
    console.log('[API] Fetching consultant status...');

    const result = await this.apiCall('/user/consultantStatus', {
      method: 'GET',
    });

    console.log('[API] Consultant status result:', result);
    return result;
  }

  async createRazorpayOrder(amount) {
    console.log('[API] Creating Razorpay order with amount:', amount);
    
    return await this.apiCall('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: amount * 100 }),
    });
  }

  async verifyRazorpayPayment(paymentData) {
    console.log('[API] Verifying Razorpay payment:', paymentData);
    
    return await this.apiCall('/payment/verifypayment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Reels APIs
// Add these optimized methods to your ApiService.js class
// Replace existing reel methods with these

// CRITICAL: Optimized for release APK - handles video URLs properly
// This section replaces the getAllReels method in your ApiService.js
// Add this optimized version to your existing ApiService class

// CRITICAL FIX: getAllReels must return proper data structure
async getAllReels(page = 1, limit = 15) {
  console.log(`[API] Getting reels - page: ${page}, limit: ${limit}`);
  
  try {
    const result = await this.apiCall(`/reel/feed?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      }
    });
    
    console.log('[API] Raw result:', result);
    
    // CRITICAL FIX: Handle nested data structure from backend
    let reelsArray = [];
    let hasMore = true;
    let totalCount = 0;

    if (result.success) {
      // Backend returns: { data: { reels: [], hasMore, totalCount } }
      if (result.data) {
        if (result.data.reels && Array.isArray(result.data.reels)) {
          reelsArray = result.data.reels;
          hasMore = result.data.hasMore !== undefined ? result.data.hasMore : true;
          totalCount = result.data.totalCount || 0;
        } else if (Array.isArray(result.data)) {
          // If data is directly an array
          reelsArray = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          // If nested as data.data
          reelsArray = result.data.data;
        }
      }

      console.log(`[API] Processing ${reelsArray.length} reels`);

      // Process and validate each reel
      const processedReels = reelsArray
        .filter(reel => reel && reel._id && reel.URL) // Filter out invalid reels
        .map(reel => ({
          _id: reel._id,
          URL: this.processVideoUrl(reel.URL),
          description: reel.description || '',
          likes: typeof reel.likes === 'number' ? reel.likes : 0,
          isLiked: reel.isLiked === true,
          comments: Array.isArray(reel.comments) ? reel.comments : [],
          likedBy: Array.isArray(reel.likedBy) ? reel.likedBy : [],
          user: reel.user ? {
            _id: reel.user._id,
            fullName: reel.user.fullName || 'Unknown User',
            profileImage: reel.user.profileImage || null,
          } : {
            _id: '',
            fullName: 'Unknown User',
            profileImage: null,
          },
          createdAt: reel.createdAt,
          commentsCount: Array.isArray(reel.comments) ? reel.comments.length : 0,
        }));

      console.log(`[API] ✓ Successfully processed ${processedReels.length} reels`);

      return {
        success: true,
        data: processedReels, // CRITICAL: Must be array, not nested object
        hasMore: hasMore,
        totalCount: totalCount,
        message: 'Reels fetched successfully'
      };
    } else {
      console.warn('[API] Reels fetch failed:', result.error);
      return {
        success: false,
        data: [], // CRITICAL: Must return empty array, not undefined
        error: result.error || 'Failed to fetch reels',
        hasMore: false,
      };
    }
  } catch (error) {
    console.error('[API] getAllReels exception:', error);
    return {
      success: false,
      data: [], // CRITICAL: Must return empty array on error
      error: error.message || 'Network error',
      hasMore: false,
    };
  }
}

// Process video URL to ensure it works in release APK
processVideoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  // If URL is already absolute, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL is relative, prepend base URL
  if (url.startsWith('/')) {
    return `${this.baseURL.replace('/api/v1', '')}${url}`;
  }
  
  return url;
}

// Like/Unlike reel with proper error handling
async likeReel(reelId) {
  console.log('[API] Toggling like for reel:', reelId);
  
  try {
    // Extract original reel ID (remove any loop suffix)
    const originalReelId = reelId.includes('_loop_') 
      ? reelId.split('_loop_')[0] 
      : reelId;
    
    const result = await this.apiCall(`/reel/${originalReelId}/like`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    if (result.success && result.data) {
      console.log('[API] Like toggled successfully');
      return {
        success: true,
        data: {
          likes: result.data.likes || 0,
          isLiked: result.data.isLiked || false,
          likedBy: result.data.likedBy || []
        }
      };
    }
    
    console.warn('[API] Like failed:', result.error);
    return {
      success: false,
      error: result.error || 'Failed to like reel'
    };
  } catch (error) {
    console.error('[API] likeReel error:', error);
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

// Add comment with proper validation and error handling
async addComment(reelId, comment) {
  console.log('[API] Adding comment to reel:', reelId);
  
  try {
    // Extract original reel ID
    const originalReelId = reelId.includes('_loop_')
      ? reelId.split('_loop_')[0]
      : reelId;
    
    // Validate comment
    if (!comment || !comment.trim()) {
      return {
        success: false,
        error: 'Comment cannot be empty'
      };
    }
    
    if (comment.trim().length > 200) {
      return {
        success: false,
        error: 'Comment is too long (max 200 characters)'
      };
    }
    
    const result = await this.apiCall(`/reel/${originalReelId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment: comment.trim() }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    if (result.success && result.data) {
      console.log('[API] Comment added successfully');
      // Ensure data is an array
      const comments = Array.isArray(result.data) ? result.data : [result.data];
      return {
        success: true,
        data: comments
      };
    }
    
    console.warn('[API] Add comment failed:', result.error);
    return {
      success: false,
      error: result.error || 'Failed to post comment'
    };
  } catch (error) {
    console.error('[API] addComment error:', error);
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

// Get user's own reels with proper error handling
async getUserReels() {
  console.log('[API] Getting user reels');
  
  try {
    const result = await this.apiCall('/reel/my-reels', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (result.success && result.data) {
      const reelsArray = Array.isArray(result.data) ? result.data : [];
      
      const processedReels = reelsArray
        .filter(reel => reel && reel._id && reel.URL)
        .map(reel => ({
          _id: reel._id,
          URL: this.processVideoUrl(reel.URL),
          description: reel.description || '',
          likes: typeof reel.likes === 'number' ? reel.likes : 0,
          isLiked: reel.isLiked === true,
          comments: Array.isArray(reel.comments) ? reel.comments : [],
          likedBy: Array.isArray(reel.likedBy) ? reel.likedBy : [],
          user: reel.user ? {
            _id: reel.user._id,
            fullName: reel.user.fullName || 'Unknown User',
            profileImage: reel.user.profileImage || null,
          } : {
            _id: '',
            fullName: 'Unknown User',
            profileImage: null,
          },
        }));
      
      return {
        success: true,
        data: processedReels
      };
    }
    
    return {
      success: false,
      data: [],
      error: result.error || 'Failed to fetch user reels'
    };
  } catch (error) {
    console.error('[API] getUserReels error:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Network error'
    };
  }
}

// Delete a reel with proper error handling
async deleteReel(reelId) {
  console.log('[API] Deleting reel:', reelId);
  
  try {
    const originalReelId = reelId.includes('_loop_')
      ? reelId.split('_loop_')[0]
      : reelId;
    
    const result = await this.apiCall(`/reel/${originalReelId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log('[API] Delete reel result:', result.success ? 'Success' : 'Failed');
    return result;
  } catch (error) {
    console.error('[API] deleteReel error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete reel'
    };
  }
}

// Upload reel optimized for production
async uploadReel({ video, description }) {
  console.log('[API] Uploading reel...');
  
  try {
    if (!video || !video.uri) {
      return {
        success: false,
        error: 'Video file is required'
      };
    }

    const formData = new FormData();
    
    // Handle video URI for Android release APK
    let videoUri = video.uri;
    
    if (Platform.OS === 'android') {
      if (video.uri.startsWith('content://')) {
        try {
          const RNBlobUtil = require('react-native-blob-util').default;
          const fileName = video.fileName || `reel_${Date.now()}.mp4`;
          const destPath = `${RNBlobUtil.fs.dirs.CacheDir}/${fileName}`;
          
          console.log('[API] Copying content URI to cache:', destPath);
          await RNBlobUtil.fs.cp(video.uri, destPath);
          videoUri = `file://${destPath}`;
        } catch (e) {
          console.error('[API] Failed to copy content URI:', e);
          return {
            success: false,
            error: 'Could not process video for upload'
          };
        }
      } else if (!video.uri.startsWith('file://')) {
        videoUri = `file://${video.uri}`;
      }
    }
    
    const videoFile = {
      uri: videoUri,
      type: video.type || 'video/mp4',
      name: video.fileName || `reel_${Date.now()}.mp4`,
    };
    
    console.log('[API] Video file prepared:', {
      uri: videoFile.uri.substring(0, 50) + '...',
      type: videoFile.type,
      name: videoFile.name
    });
    
    formData.append('video', videoFile);
    
    if (description && description.trim()) {
      formData.append('description', description.trim());
    }

    const result = await this.apiCall('/reel/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
      timeout: 120000,
    });

    if (result.success && result.data) {
      return {
        success: true,
        data: {
          ...result.data,
          URL: this.processVideoUrl(result.data.URL)
        }
      };
    }
    
    return result;
  } catch (error) {
    console.error('[API] uploadReel error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload reel'
    };
  }
}

  async testConnection() {
    try {
      console.log('[API] Testing server connection...');
      const response = await fetch(`${this.baseURL}/test`, {
        method: 'GET',
        timeout: 5000,
      });
      
      if (response.ok) {
        console.log('[API] Server connection successful');
        return { success: true, message: 'Server is reachable' };
      } else {
        console.log('[API] Server responded with error:', response.status);
        return { success: false, error: `Server error: ${response.status}` };
      }
    } catch (error) {
      console.log('[API] Server connection failed:', error.message);
      return { success: false, error: 'Server is not reachable' };
    }
  }
  
  async getChatBotResponse(prompt) {
  console.log('[API] Getting chatbot response for prompt:', prompt);
  
  const result = await this.apiCall('/openai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
  
  console.log('[API] ChatBot response result:', result);
  return result;
}





// Chat API Methods
async getChatInbox() {
  console.log('[API] Getting chat inbox...');
  
  const result = await this.apiCall('/chat/inbox', {
    method: 'GET',
  });
  
  console.log('[API] Chat inbox result:', result);
  return result;
}

async getChatHistory(peer1Id, peer2Id, chatId = 'null') {
  console.log('[API] Getting chat history for:', peer1Id, peer2Id, chatId);
  
  const result = await this.apiCall(`/chat/${peer1Id}/${peer2Id}/${chatId}`, {
    method: 'GET',
  });
  
  console.log('[API] Chat history result:', result);
  return result;
}

async sendChatMessage(chatData) {
  console.log('[API] Sending chat message:', chatData);
  
  const result = await this.apiCall('/chat/send-message', {
    method: 'POST',
    body: JSON.stringify(chatData),
  });
  
  console.log('[API] Send message result:', result);
  return result;
}

async verifyRazorpayPayment(paymentData) {
  console.log('[API] Verifying Razorpay payment:', paymentData);
  
  return await this.apiCall('/payment/verifypayment', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

async markMessagesAsRead(chatId, userId) {
  console.log('[API] Marking messages as read:', { chatId, userId });
  
  const result = await this.apiCall('/chat/mark-read', {
    method: 'POST',
    body: JSON.stringify({ chatId, userId }),
  });
  
  console.log('[API] Mark as read result:', result);
  return result;
}






// Check if user can join call (5 minutes before rule)
canJoinVideoCall(bookingDateTime, duration = 30) {
  const bookingTime = new Date(bookingDateTime);
  const now = new Date();
  const timeDiff = bookingTime - now;
  const minutesDiff = Math.floor(timeDiff / 60000);
  
  // Can join 5 minutes before
  const canJoinBefore = minutesDiff <= 5 && minutesDiff >= 0;
  
  // Check if session hasn't ended yet
  const minutesAfterStart = Math.floor((now - bookingTime) / 60000);
  const sessionNotEnded = minutesAfterStart < duration;
  
  return canJoinBefore || (minutesAfterStart >= 0 && sessionNotEnded);
}
// Verify meeting access (optional but recommended)
async verifyMeetingAccess(bookingId) {
  console.log('[API] Verifying meeting access for booking:', bookingId);
  
  try {
    const bookingResult = await this.getBookingById(bookingId);
    
    if (!bookingResult.success) {
      return {
        success: false,
        error: bookingResult.error,
        canJoin: false
      };
    }
    
    const booking = bookingResult.data;
    const userData = await AsyncStorage.getItem('userData');
    
    if (!userData) {
      return {
        success: false,
        error: 'User not authenticated',
        canJoin: false
      };
    }
    
    const user = JSON.parse(userData);
    
    // Check if user is participant in this booking
    const isParticipant = 
      booking.consultant?._id === user._id || 
      booking.user?._id === user._id ||
      booking.consultant === user._id ||
      booking.user === user._id;
    
    if (!isParticipant) {
      return {
        success: false,
        error: 'You are not authorized to join this meeting',
        canJoin: false
      };
    }
    
    // Check if meeting is in valid status
    const validStatuses = ['scheduled', 'in-progress'];
    if (!validStatuses.includes(booking.status)) {
      return {
        success: false,
        error: `Meeting is ${booking.status}`,
        canJoin: false
      };
    }
    
    return {
      success: true,
      canJoin: true,
      booking: booking
    };
  } catch (error) {
    console.error('[API] verifyMeetingAccess error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify access',
      canJoin: false
    };
  }
}

// ADD THESE METHODS TO YOUR EXISTING ApiService.js

// Get Agora token for video call - ENHANCED VERSION
// Get Agora token for video call - ENHANCED VERSION
async getAgoraToken(channelName) {
  console.log('[API] Getting Agora token for channel:', channelName);
  
  if (!channelName) {
    return {
      success: false,
      error: 'Channel name is required'
    };
  }
  
  try {
    // Add retry logic for better reliability
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        const result = await this.apiCall(`/agora/token/${channelName}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        });
        
        if (result.success && result.data) {
          console.log('[API] Agora token received successfully');
          return {
            success: true,
            data: {
              token: result.data.token,
              appId: result.data.appId
            }
          };
        }
        
        lastError = result.error;
        retries--;
        
        if (retries > 0) {
          console.log(`[API] Retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        lastError = error.message;
        retries--;
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.warn('[API] Failed to get Agora token after all retries:', lastError);
    return {
      success: false,
      error: lastError || 'Failed to get video call credentials'
    };
  } catch (error) {
    console.error('[API] getAgoraToken error:', error);
    return {
      success: false,
      error: error.message || 'Network error while getting token'
    };
  }
}

// Update booking status for video call lifecycle
async updateBookingStatus(bookingId, status, additionalData = {}) {
  console.log('[API] Updating booking status:', bookingId, status);
  
  if (!bookingId) {
    return {
      success: false,
      error: 'Booking ID is required'
    };
  }
  
  const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled', 'missed'];
  if (!validStatuses.includes(status)) {
    return {
      success: false,
      error: 'Invalid status'
    };
  }
  
  try {
    const requestData = {
      bookingId,
      status,
      ...additionalData
    };
    
    // Add timestamps based on status
    if (status === 'in-progress') {
      requestData.startedAt = new Date().toISOString();
    } else if (status === 'completed') {
      requestData.completedAt = new Date().toISOString();
    }
    
    const result = await this.apiCall('/booking/update-status', {
      method: 'POST',
      body: JSON.stringify(requestData),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    if (result.success) {
      console.log('[API] Booking status updated successfully');
      return result;
    }
    
    console.warn('[API] Failed to update booking status:', result.error);
    return result;
  } catch (error) {
    console.error('[API] updateBookingStatus error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update booking status'
    };
  }
}

// Enhanced getBookingById with better error handling
// Enhanced getBookingById with better error handling - COMPLETE FIX
// ✅ FINAL VERSION — Direct + Fallback + Auth + Error Handling
// âœ… ENHANCED VERSION â€" With consultant data population

// âœ… ENHANCED VERSION â€" With consultant data population
async getBookingById(bookingId) {
  console.log('[API] Getting booking by ID:', bookingId);

  if (!bookingId || typeof bookingId !== 'string') {
    return {
      success: false,
      error: 'Valid booking ID is required'
    };
  }

  try {
    // =========================
    // 1. DIRECT API CALL
    // =========================
    console.log('[API] Step 1: Trying direct /booking/getbooking/:id');
    const directResult = await this.apiCall(`/booking/getbooking/${bookingId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (directResult.success && directResult.data) {
      console.log('[API] Booking found directly âœ…');
      
      // Populate consultant data if needed
      let bookingData = directResult.data;
      if (typeof bookingData.consultant === 'string') {
        bookingData = await this.populateConsultantData(bookingData);
      }
      
      return {
        success: true,
        data: {
          ...bookingData,
          meetingLink: bookingData.meetingLink || bookingData._id,
          duration: bookingData.duration || 30,
          status: bookingData.status || 'scheduled'
        }
      };
    }

    // =========================
    // 2. FALLBACK - USER BOOKINGS
    // =========================
    console.log('[API] Step 2: Trying /user/seebookings');
    const userBookingsResult = await this.apiCall('/user/seebookings', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (userBookingsResult.success && Array.isArray(userBookingsResult.data)) {
      const booking = userBookingsResult.data.find(
        b => b._id === bookingId || b.id === bookingId
      );
      if (booking) {
        console.log('[API] Booking found in user bookings âœ…');
        
        // Populate consultant data if needed
        let bookingData = booking;
        if (typeof bookingData.consultant === 'string') {
          bookingData = await this.populateConsultantData(bookingData);
        }
        
        return {
          success: true,
          data: {
            ...bookingData,
            meetingLink: bookingData.meetingLink || bookingData._id,
            duration: bookingData.duration || 30,
            status: bookingData.status || 'scheduled'
          }
        };
      }
    }

    // =========================
    // 3. FALLBACK - CONSULTANT BOOKINGS
    // =========================
    console.log('[API] Step 3: Trying /booking/getbookingsviaConsultantid');
    const consultantBookingsResult = await this.apiCall('/booking/getbookingsviaConsultantid', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (consultantBookingsResult.success && Array.isArray(consultantBookingsResult.data)) {
      const booking = consultantBookingsResult.data.find(
        b => b._id === bookingId || b.id === bookingId
      );
      if (booking) {
        console.log('[API] Booking found in consultant bookings âœ…');
        
        // Populate consultant data if needed
        let bookingData = booking;
        if (typeof bookingData.consultant === 'string') {
          bookingData = await this.populateConsultantData(bookingData);
        }
        
        return {
          success: true,
          data: {
            ...bookingData,
            meetingLink: bookingData.meetingLink || bookingData._id,
            duration: bookingData.duration || 30,
            status: bookingData.status || 'scheduled'
          }
        };
      }
    }

    // =========================
    // 4. FINAL RESULT - Not Found
    // =========================
    console.warn('[API] Booking not found in any source âŒ');
    return {
      success: false,
      error: 'Booking not found. Please check the booking ID or your access permissions.'
    };

  } catch (error) {
    console.error('[API] getBookingById error:', error);
    return {
      success: false,
      error: error.message || 'Network error while fetching booking'
    };
  }
}


// Send call notification (optional - for future enhancement)
async sendCallNotification(bookingId, type = 'started') {
  console.log('[API] Sending call notification:', bookingId, type);
  
  try {
    const result = await this.apiCall('/booking/call-notification', {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        notificationType: type,
        timestamp: new Date().toISOString()
      }),
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    return result;
  } catch (error) {
    console.error('[API] sendCallNotification error:', error);
    // Don't fail the call if notification fails
    return { success: true };
  }
}

// âœ… NEW METHOD - Populate consultant data from all users list
async populateConsultantData(booking) {
  try {
    console.log('[API] Populating consultant data for:', booking.consultant);
    
    // Get all consultants
    const consultantsResult = await this.getAllUsers();
    
    if (consultantsResult.success && Array.isArray(consultantsResult.data)) {
      const consultant = consultantsResult.data.find(
        c => c._id === booking.consultant || c.id === booking.consultant
      );
      
      if (consultant) {
        console.log('[API] Found consultant data:', consultant.fullName);
        return {
          ...booking,
          consultant: {
            _id: consultant._id,
            fullName: consultant.fullName,
            name: consultant.fullName,
            email: consultant.email,
            phone: consultant.phone,
            profileImage: consultant.profileImage
          }
        };
      }
    }
    
    // If not found, return with placeholder
    console.warn('[API] Could not find consultant data');
    return {
      ...booking,
      consultant: {
        _id: booking.consultant,
        fullName: 'Consultant',
        name: 'Consultant'
      }
    };
  } catch (error) {
    console.error('[API] Error populating consultant data:', error);
    return booking;
  }
}




}

// export const API_BASE_URL = BASE_URL;
export default new ApiService();

