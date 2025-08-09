// src/services/ApiService.js - Updated with booking functionality
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = 'http://192.168.0.177:8011/api/v1';

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
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
      };

      // Add Authorization header for token-based auth
      if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
        // Also add as Cookie for server compatibility
        defaultHeaders['Cookie'] = `accessToken=${token}`;
      }

      // Don't set Content-Type for FormData requests
      if (options.body instanceof FormData) {
        delete defaultHeaders['Content-Type'];
      }

      const config = {
        credentials: 'include', // Include cookies for server compatibility
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      };

      console.log(`[API] → ${this.baseURL}${endpoint}`);
      console.log(`[API] METHOD: ${config.method || 'GET'}`);
      console.log(`[API] Headers:`, config.headers);

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
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
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: data.message || 'Session expired. Please login again.',
            needsLogin: true,
            status: response.status
          };
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
    } catch (error) {
      console.error(`[API] Request failed:`, error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  // Auth APIs
  async signUp(userData) {
    return await this.apiCall('/user/registeruser', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async sendOTP(phone) {
    return await this.apiCall('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOTP(sessionId, otp) {
    return await this.apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionId, otp }),
    });
  }

  async login(phone, password) {
    const result = await this.apiCall('/user/loginuser', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber: phone,
        password: password,
        OTPverified: false
      }),
    });

    if (result.success && result.data) {
      const user = result.data.user || result.data;
      const token = result.data.accessToken;

      if (token) {
        await this.setAuthToken(token);
        console.log('[API] Token saved:', token);
      }

      // Store user data
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      console.log('[API] User data saved:', user);
    }

    return result;
  }

  async logout() {
    try {
      // Call logout endpoint
      const result = await this.apiCall('/user/logoutuser', {
        method: 'POST',
      });

      // Always clear local storage regardless of API response
      await this.removeAuthToken();
      await AsyncStorage.removeItem('userData');
      
      console.log('[API] Local data cleared on logout');

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('[API] Logout error:', error);
      
      // Still clear local data even if API call fails
      await this.removeAuthToken();
      await AsyncStorage.removeItem('userData');
      
      return { success: true, message: 'Logged out successfully' };
    }
  }

  // User Profile APIs
  async getUserProfile() {
    try {
      // First try to get from server with current token
      const result = await this.apiCall('/user/profile', {
        method: 'GET',
      });
      
      if (result.success) {
        // Update local storage with fresh data
        await AsyncStorage.setItem('userData', JSON.stringify(result.data));
        return result;
      }
      
      // If server call fails, try local storage
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        return {
          success: true,
          data: JSON.parse(userData),
        };
      }
      
      return {
        success: false,
        error: 'No user data found',
        needsLogin: true
      };
    } catch (error) {
      console.error('[API] Error getting user profile:', error);
      
      // Fallback to local storage
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          return {
            success: true,
            data: JSON.parse(userData),
          };
        }
      } catch (localError) {
        console.error('[API] Error reading local user data:', localError);
      }
      
      return {
        success: false,
        error: 'Failed to get user profile',
      };
    }
  }

  // Fixed updateProfile method to use FormData
  async updateProfile(profileData) {
    const formData = new FormData();
    
    // Add profile data to FormData
    Object.keys(profileData).forEach(key => {
      if (profileData[key] !== null && profileData[key] !== undefined && profileData[key] !== '') {
        formData.append(key, profileData[key]);
      }
    });

    console.log('[API] Updating profile with FormData:', profileData);

    const result = await this.apiCall('/user/updateProfile', {
      method: 'POST',
      body: formData, // This will automatically set multipart/form-data
    });

    if (result.success && result.data) {
      const updatedUser = result.data.user || result.data;
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      console.log('[API] Updated user data saved:', updatedUser);
    }

    return result;
  }

  // Get all users (to filter approved consultants on frontend)
  async getAllUsers() {
    console.log('[API] getAllUsers called');
    const result = await this.apiCall('/user/allusers', {
      method: 'GET',
    });
    console.log('[API] getAllUsers result:', result);
    return result;
  }

  // Booking APIs
  async createBooking(bookingData) {
    console.log('[API] Creating booking with data:', bookingData);
    
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

  async getBookingById(bookingId) {
    return await this.apiCall(`/booking/getbooking/${bookingId}`, {
      method: 'GET',
    });
  }

  // Consultant Application APIs
  async submitConsultantApplication(applicationData) {
    const formData = new FormData();

    Object.keys(applicationData).forEach(key => {
      if (key === 'resume' && applicationData[key]) {
        formData.append('resume', applicationData[key]);
      } else if (applicationData[key] !== null && applicationData[key] !== undefined) {
        formData.append(key, applicationData[key]);
      }
    });

    return await this.apiCall('/user/consultantApplication', {
      method: 'POST',
      body: formData,
    });
  }

  // KYC Verification APIs - Updated to match server endpoint
  async submitAadharVerification(kycData) {
    console.log('[API] Submitting Aadhaar verification:', kycData);

    // For this endpoint, we'll send as JSON since the server expects req.body fields
    const requestData = {
      'kycVerify.aadharNumber': parseInt(kycData.aadharNumber),
      'kycVerify.panNumber': kycData.panNumber,
      'kycVerify.aadharURL': kycData.aadharURL,
      'kycVerify.panURL': kycData.panURL,
      'aadharVerified': true
    };

    console.log('[API] Request data for Aadhaar verification:', requestData);

    return await this.apiCall('/user/aadharVerify', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async createRazorpayOrder(amount) {
    return await this.apiCall('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

     async createRazorpayOrder(amount) {
    console.log('[API] Creating Razorpay order with amount:', amount);
    
    return await this.apiCall('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: amount * 100 }), // Convert to paise
    });
  }

  // Verify payment (uses existing endpoint)  
  async verifyRazorpayPayment(paymentData) {
    console.log('[API] Verifying Razorpay payment:', paymentData);
    
    return await this.apiCall('/payment/verifypayment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }





    // Reels APIs
  async uploadReel({ video, description }) {
    const formData = new FormData();
    
    formData.append('video', {
  uri: Platform.OS === 'android' && !video.uri.startsWith('file://')
    ? `file://${video.uri}`
    : video.uri,
  type: video.type || 'video/mp4',
  name: video.fileName || `reel_${Date.now()}.mp4`,
});
    
    if (description) {
      formData.append('description', description);
    }

    console.log('[API] Uploading reel...');

    return await this.apiCall('/reel/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getAllReels(page = 1) {
    return await this.apiCall(`/reel/feed?page=${page}&limit=10`, {
      method: 'GET',
    });
  }

  async getUserReels() {
    return await this.apiCall('/reel/my-reels', {
      method: 'GET',
    });
  }

  async likeReel(reelId) {
    return await this.apiCall(`/reel/${reelId}/like`, {
      method: 'POST',
    });
  }

  async addComment(reelId, comment) {
    return await this.apiCall(`/reel/${reelId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }

  async deleteReel(reelId) {
    return await this.apiCall(`/reel/${reelId}`, {
      method: 'DELETE',
    });
  }

 
  
}

export default new ApiService();