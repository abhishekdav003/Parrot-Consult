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

    console.log(`[API CALL] → ${this.baseURL}${endpoint}`);
    console.log(`[API CALL] METHOD: ${config.method}`);
    console.log(`[API CALL] BODY:`, config.body);
    console.log(`[API CALL] HEADERS:`, config.headers);

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    const text = await response.text();
    console.log(`[API RESPONSE RAW]`, text); // 👀 log raw response before parse

    let data;
    try {
      if (text.startsWith('{') || text.startsWith('[')) {
        data = JSON.parse(text);
      } else {
        console.warn(`[API ERROR] Non-JSON response:`, text);
        return {
          success: false,
          error: 'Server returned invalid format. Please contact support.',
        };
      }
    } catch (parseError) {
      console.error(`[PARSE ERROR] Failed to parse JSON:`, parseError);
      return {
        success: false,
        error: 'Invalid response from server (not JSON)',
      };
    }

    if (!response.ok) {
      console.warn(`[API ERROR] HTTP Error`, response.status, data.message);
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    console.log(`[API RESPONSE JSON]`, data);

    // unwrap if wrapped in success/data/message
    if (data && data.success === false) {
      return {
        success: false,
        error: data.message || 'Something went wrong',
      };
    }

    return {
      success: true,
      data: data.data || data, // support both nested and flat
    };
  } catch (error) {
    console.error(`[API CALL FAILED]`, error);
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
      body: JSON.stringify({ 
        phoneNumber: phone, 
        password: password,
        // OTPverified: true 
      }),
    });
  }

  async logout() {
    const result = await this.apiCall('/user/logoutuser', {
      method: 'POST',
    });
    if (result.success) {
      await this.removeAuthToken();
    }
    return result;
  }
}

export default new ApiService();