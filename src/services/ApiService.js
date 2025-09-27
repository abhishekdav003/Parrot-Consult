// src/services/ApiService.js - Fixed to match backend expectations exactly
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

// const BASE_URL = 'http://192.168.0.177:8011/api/v1';
// const BASE_URL = 'http://10.0.2.2:8011/api/v1';
// const BASE_URL = 'http://10.0.2.2:8011/api/v1';
// const BASE_URL = 'http://10.33.116.48:8011/api/v1';
// const BASE_URL = 'http://192.168.0.116:8011/api/v1';
// const BASE_URL = 'http://10.224.232.48:8011/api/v1';
// const BASE_URL = 'http://10.0.2.2:8011/api/v1';


// const BASE_URL = 'http://192.168.0.177:8011/api/v1';

const BASE_URL = 'https://api.parrotconsult.com/api/v1';


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
      };

      // CRITICAL: Send token as Cookie header for backend compatibility
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
        OTPverified: true
      }),
    });

    if (result.success && result.data) {
      const user = result.data.user || result.data;
      const token = result.data.accessToken;

      if (token) {
        await this.setAuthToken(token);
        console.log('[API] Token saved:', token);
      }

      await AsyncStorage.setItem('userData', JSON.stringify(user));
      console.log('[API] User data saved:', user);
    }

    return result;
  }

  async logout() {
    try {
      const result = await this.apiCall('/user/logoutuser', {
        method: 'POST',
      });

      await this.removeAuthToken();
      await AsyncStorage.removeItem('userData');
      
      console.log('[API] Local data cleared on logout');

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('[API] Logout error:', error);
      
      await this.removeAuthToken();
      await AsyncStorage.removeItem('userData');
      
      return { success: true, message: 'Logged out successfully' };
    }
  }

  async getUserProfile() {
    try {
      const result = await this.apiCall('/user/profile', {
        method: 'GET',
      });
      
      if (result.success) {
        await AsyncStorage.setItem('userData', JSON.stringify(result.data));
        return result;
      }
      
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

  async getBookingById(bookingId) {
    return await this.apiCall(`/booking/getbooking/${bookingId}`, {
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

 // Updated getAllReels method for infinite scroll
  async getAllReels(page = 1, limit = 15) {
    console.log(`[API] Getting reels - page: ${page}, limit: ${limit}`);
    const result = await this.apiCall(`/reel/feed?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
    console.log('[API] getAllReels result:', result);
    return result;
  }

  // Updated likeReel method to handle like/unlike
  async likeReel(reelId) {
    console.log('[API] Toggling like for reel:', reelId);
    
    // Extract original reel ID (remove page suffix if present)
    const originalReelId = reelId.split('_')[0];
    
    const result = await this.apiCall(`/reel/${originalReelId}/like`, {
      method: 'POST',
    });
    
    console.log('[API] Like reel result:', result);
    return result;
  }

  // Updated addComment method
  async addComment(reelId, comment) {
    console.log('[API] Adding comment to reel:', reelId, comment);
    
    // Extract original reel ID (remove page suffix if present)
    const originalReelId = reelId.split('_')[0];
    
    const result = await this.apiCall(`/reel/${originalReelId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    
    console.log('[API] Add comment result:', result);
    return result;
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
}

// export const API_BASE_URL = BASE_URL;
export default new ApiService();

