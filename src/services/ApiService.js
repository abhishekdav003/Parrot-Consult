// src/services/ApiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.0.177:8011/api/v1';

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
  }

  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async setAuthToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error storing auth token:', error);
    }
  }

  async removeAuthToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

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
      
      let data;
try {
  const text = await response.text();

  // Try to parse only if it starts with `{` or `[`
  if (text.startsWith('{') || text.startsWith('[')) {
    data = JSON.parse(text);
  } else {
    // Response is plain text or HTML
    return {
      success: false,
      error: 'Server returned invalid format. Please contact support.',
    };
  }
} catch (parseError) {
  console.error("Failed to parse server response:", parseError);
  return {
    success: false,
    error: 'Invalid response from server (not JSON)',
  };
}


      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
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
      body: JSON.stringify({ phone: phone }),
    });
  }

  async verifyOTP(sessionId, otp) {
    return await this.apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionId, otp }),
    });
  }

  async login(phone, password) {
    return await this.apiCall('/user/loginuser', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  }

  async logout() {
    const result = await this.apiCall('/logoutuser', {
      method: 'POST',
    });
    if (result.success) {
      await this.removeAuthToken();
    }
    return result;
  }
}

export default new ApiService();