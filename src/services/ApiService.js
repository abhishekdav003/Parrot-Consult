// src/services/ApiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'YOUR_API_BASE_URL'; // Replace with your actual API URL

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
  }

  // Get stored auth token
  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Store auth token
  async setAuthToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error storing auth token:', error);
    }
  }

  // Remove auth token
  async removeAuthToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

  // Generic API call method
  async apiCall(endpoint, options = {}) {
    try {
      const token = await this.getAuthToken();
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
      };

      if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`;
      }

      const config = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      return { 
        success: false, 
        error: error.message || 'Network error occurred' 
      };
    }
  }

  // Authentication APIs
  async signUp(userData) {
    return await this.apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        password: userData.password,
      }),
    });
  }

  async sendOTP(phoneNumber, type = 'login') {
    return await this.apiCall('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
        type, // 'login' or 'signup'
      }),
    });
  }

  async verifyOTP(phoneNumber, otp, type = 'login') {
    return await this.apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
        otp,
        type,
      }),
    });
  }

  async login(phoneNumber, password) {
    return await this.apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
        password,
      }),
    });
  }

  async logout() {
    const result = await this.apiCall('/auth/logout', {
      method: 'POST',
    });
    
    if (result.success) {
      await this.removeAuthToken();
    }
    
    return result;
  }

  async refreshToken() {
    return await this.apiCall('/auth/refresh-token', {
      method: 'POST',
    });
  }

  // User profile APIs
  async getProfile() {
    return await this.apiCall('/user/profile', {
      method: 'GET',
    });
  }

  async updateProfile(profileData) {
    return await this.apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Check if user is authenticated
  async isAuthenticated() {
    const token = await this.getAuthToken();
    if (!token) return false;

    // Verify token with server
    const result = await this.apiCall('/auth/verify-token', {
      method: 'GET',
    });

    return result.success;
  }
}

// Export singleton instance
export default new ApiService();