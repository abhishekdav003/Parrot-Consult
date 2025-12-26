// src/screens/VideoCallScreen.jsx - PRODUCTION READY VERSION
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
  PermissionsAndroid,
  BackHandler,
  AppState,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../services/ApiService';
import { useAuth } from '../context/AuthContext';

// Import Agora SDK
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RenderModeType,
} from 'react-native-agora';

import { io } from 'socket.io-client';

// const CHAT_SERVER = 'https://api.parrotconsult.com';
const CHAT_SERVER = 'http://10.0.2.2:8011';




const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VideoCallScreen = ({ route, navigation }) => {
  const chatIdRef = useRef(null);
  const socketRef = useRef(null);


  const { bookingId } = route.params;
  const { user } = useAuth();

  // Agora engine reference
  const agoraEngineRef = useRef(null);

  // Core states
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [agoraToken, setAgoraToken] = useState(null);
  const [channelName, setChannelName] = useState(null);
  const [agoraAppId, setAgoraAppId] = useState(null);

  // Remote user state
  const [remoteUid, setRemoteUid] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState(new Map());

  // Media states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // UI states
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [videoStats, setVideoStats] = useState({ localBitrate: 0, remoteBitrate: 0 });

  // Refs
  const callTimer = useRef(null);
  const appState = useRef(AppState.currentState);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Request permissions for Android
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        const cameraGranted = granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED;
        const audioGranted = granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;

        if (!cameraGranted || !audioGranted) {
          Alert.alert(
            'Permissions Required',
            'Camera and microphone permissions are required for video calls',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return false;
        }
        return true;
      } catch (err) {
        console.error('[VIDEO_CALL] Permission error:', err);
        return false;
      }
    }
    return true;
  }, [navigation]);

  useEffect(() => {
  if (!bookingDetails || !user) return;

  const otherUserId =
    user._id === bookingDetails.user._id
      ? bookingDetails.consultant._id
      : bookingDetails.user._id;

  const socket = io(CHAT_SERVER, {
    transports: ['websocket'],
    reconnection: true,
  });

  socketRef.current = socket;

  socket.on('connect', () => {
    socket.emit('join-chat', {
      chatId: bookingDetails._id,
      userId: user._id,
      consultantId: otherUserId,
    });
  });

  socket.on('new-message', ({ message }) => {
  setChatMessages(prev => [
    ...prev,
    {
      _id: message._id,
      text: message.content,
      sender: message.sender === user._id ? 'You' : 'Other',
      isMe: message.sender === user._id,
      timestamp: new Date(message.createdAt),
    },
  ]);
});



  return () => {
    socket.disconnect();
  };
}, [bookingDetails, user]);


  // Load booking details - FIXED VERSION
  useEffect(() => {
    const loadBookingDetails = async () => {
      try {
        setLoading(true);
        console.log('[VIDEO_CALL] Loading booking details:', bookingId);

        // CRITICAL FIX: Try multiple methods to get booking
        let booking = null;
        
        // Method 1: Try consultant bookings (if user is consultant)
        if (user?.role === 'consultant' || user?.consultantRequest?.status === 'approved') {
          console.log('[VIDEO_CALL] Trying consultant bookings...');
          const consultantResult = await ApiService.getConsultantBookings();
          
          if (consultantResult.success && consultantResult.data) {
            const bookings = Array.isArray(consultantResult.data) 
              ? consultantResult.data 
              : [consultantResult.data];
            booking = bookings.find(b => b._id === bookingId || b.id === bookingId);
            
            if (booking) {
              console.log('[VIDEO_CALL] Found booking in consultant bookings');
            }
          }
        }
        
        // Method 2: Try user bookings (if not found or user is client)
        if (!booking) {
          console.log('[VIDEO_CALL] Trying user bookings...');
          const userResult = await ApiService.getUserBookings();
          
          if (userResult.success && userResult.data) {
            const bookings = Array.isArray(userResult.data) 
              ? userResult.data 
              : [userResult.data];
            booking = bookings.find(b => b._id === bookingId || b.id === bookingId);
            
            if (booking) {
              console.log('[VIDEO_CALL] Found booking in user bookings');
            }
          }
        }
        
        // Method 3: Try direct getBookingById as fallback
        if (!booking) {
          console.log('[VIDEO_CALL] Trying getBookingById...');
          const result = await ApiService.getBookingById(bookingId);
          
          if (result.success && result.data) {
            booking = Array.isArray(result.data) 
              ? result.data.find(b => b._id === bookingId || b.id === bookingId)
              : result.data;
              
            if (booking) {
              console.log('[VIDEO_CALL] Found booking via getBookingById');
            }
          }
        }

        // If still no booking found
        if (!booking) {
          console.error('[VIDEO_CALL] Booking not found after all attempts');
          Alert.alert(
            'Booking Not Found', 
            'Unable to find this booking. Please try again or contact support.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        // CRITICAL FIX: Ensure booking has all required fields
        const processedBooking = {
          ...booking,
          _id: booking._id || booking.id,
          meetingLink: booking.meetingLink || booking._id || booking.id,
          duration: booking.duration || 30,
          status: booking.status || 'scheduled',
          bookingDateTime: booking.bookingDateTime || booking.datetime || new Date().toISOString(),
          // Ensure user data
          user: booking.user || {
            _id: booking.userId,
            fullName: booking.userName || 'Client',
            name: booking.userName || 'Client'
          },
          // Ensure consultant data
          consultant: booking.consultant || {
            _id: booking.consultantId,
            fullName: booking.consultantName || 'Consultant',
            name: booking.consultantName || 'Consultant'
          }
        };

        setBookingDetails(processedBooking);
        chatIdRef.current = processedBooking._id; 

        const channel = processedBooking.meetingLink;
        setChannelName(channel);
        
        console.log('[VIDEO_CALL] Booking loaded successfully:', {
          id: processedBooking._id,
          channel: channel,
          status: processedBooking.status,
          hasUser: !!processedBooking.user,
          hasConsultant: !!processedBooking.consultant,
        });
      } catch (error) {
        console.error('[VIDEO_CALL] Error loading booking:', error);
        Alert.alert(
          'Error', 
          'Failed to load booking details: ' + error.message,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };

    loadBookingDetails();
  }, [bookingId, navigation, user]);

  // Initialize Agora Engine with comprehensive error handling
  const initializeAgora = useCallback(async () => {
    try {
      console.log('[VIDEO_CALL] Initializing Agora engine...');

      // Request permissions first
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        throw new Error('Permissions not granted');
      }

      // Get Agora token and app ID
      const result = await ApiService.getAgoraToken(channelName);
      
      if (!result.success || !result.data?.token || !result.data?.appId) {
        throw new Error(result.error || 'Failed to get Agora credentials');
      }

      const token = result.data.token;
      const appId = result.data.appId;

      console.log('[VIDEO_CALL] Got Agora credentials successfully');

      setAgoraToken(token);
      setAgoraAppId(appId);

      // Create Agora engine
      const engine = createAgoraRtcEngine();
      agoraEngineRef.current = engine;

      // Initialize engine with optimized settings
      engine.initialize({
        appId: appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      console.log('[VIDEO_CALL] Agora engine initialized');

      // Enable audio and video
      await engine.enableAudio();
      await engine.enableVideo();

      // Set video encoder configuration for better quality
      await engine.setVideoEncoderConfiguration({
        dimensions: { width: 640, height: 480 },
        frameRate: 15,
        bitrate: 0, // Auto bitrate
        orientationMode: 0,
      });

      // Enable speaker by default
      await engine.setEnableSpeakerphone(true);

      // Register comprehensive event handlers
      engine.registerEventHandler({
        onJoinChannelSuccess: (connection, elapsed) => {
          console.log('[VIDEO_CALL] Successfully joined channel:', connection.channelId);
          setCallActive(true);
          setConnecting(false);
          setIsReconnecting(false);
          reconnectAttempts.current = 0;
          startCallTimer();
        },

        onUserJoined: (connection, uid, elapsed) => {
          console.log('[VIDEO_CALL] Remote user joined:', uid);
          setRemoteUid(uid);
          setRemoteUsers(prev => {
            const newMap = new Map(prev);
            newMap.set(uid, { uid, joined: true });
            return newMap;
          });
        },

        onUserOffline: (connection, uid, reason) => {
          console.log('[VIDEO_CALL] Remote user left:', uid, 'reason:', reason);
          
          setRemoteUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(uid);
            return newMap;
          });

          if (uid === remoteUid) {
            setRemoteUid(null);
          }

          // If no more remote users, show alert
          if (remoteUsers.size === 0) {
            Alert.alert(
              'Participant Left',
              'The other participant has left the call',
              [
                { text: 'Stay', style: 'cancel' },
                { text: 'End Call', style: 'destructive', onPress: handleEndCall }
              ]
            );
          }
        },

        onError: (err, msg) => {
          console.error('[VIDEO_CALL] Agora error:', err, msg);
          
          // Handle critical errors
          if (err === 17) { // Token expired
            Alert.alert(
              'Session Expired',
              'Your session has expired. Please rejoin the call.',
              [{ text: 'OK', onPress: handleEndCall }]
            );
          }
        },

        onConnectionStateChanged: (connection, state, reason) => {
          console.log('[VIDEO_CALL] Connection state changed:', state, reason);
          
          // Handle connection state changes
          switch (state) {
            case 1: // Disconnected
              console.log('[VIDEO_CALL] Disconnected from channel');
              break;
            case 2: // Connecting
              console.log('[VIDEO_CALL] Connecting to channel...');
              setConnecting(true);
              break;
            case 3: // Connected
              console.log('[VIDEO_CALL] Connected to channel');
              setConnecting(false);
              setIsReconnecting(false);
              break;
            case 4: // Reconnecting
              console.log('[VIDEO_CALL] Reconnecting...');
              setIsReconnecting(true);
              reconnectAttempts.current += 1;
              
              if (reconnectAttempts.current >= maxReconnectAttempts) {
                Alert.alert(
                  'Connection Lost',
                  'Unable to reconnect to the call. Please try again.',
                  [{ text: 'OK', onPress: handleEndCall }]
                );
              }
              break;
            case 5: // Failed
              console.error('[VIDEO_CALL] Connection failed');
              Alert.alert(
                'Connection Failed',
                'Failed to establish connection. Please check your internet and try again.',
                [{ text: 'OK', onPress: handleEndCall }]
              );
              break;
          }
        },

        onNetworkQuality: (connection, uid, txQuality, rxQuality) => {
          // Update connection quality indicator
          const quality = Math.max(txQuality, rxQuality);
          if (quality <= 2) {
            setConnectionQuality('good');
          } else if (quality <= 4) {
            setConnectionQuality('medium');
          } else {
            setConnectionQuality('poor');
          }
        },

        onRtcStats: (connection, stats) => {
          // Update video stats for monitoring
          setVideoStats({
            localBitrate: stats.txVideoBytes,
            remoteBitrate: stats.rxVideoBytes,
          });
        },

        onRemoteVideoStateChanged: (connection, uid, state, reason, elapsed) => {
          console.log('[VIDEO_CALL] Remote video state changed:', uid, state, reason);
        },

        onRemoteAudioStateChanged: (connection, uid, state, reason, elapsed) => {
          console.log('[VIDEO_CALL] Remote audio state changed:', uid, state, reason);
        },
      });

      return { engine, token, appId };
    } catch (error) {
      console.error('[VIDEO_CALL] Error initializing Agora:', error);
      throw error;
    }
  }, [channelName, requestPermissions, remoteUsers, remoteUid]);

  // Join call with retry mechanism
  const joinCall = useCallback(async () => {
    try {
      setConnecting(true);
      console.log('[VIDEO_CALL] Joining call...');

      const { engine, token } = await initializeAgora();

      // Start video preview
      await engine.startPreview();

      // Join channel with user ID (use 0 for auto-assign)
      const result = await engine.joinChannel(token, channelName, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      if (result === 0) {
        console.log('[VIDEO_CALL] Join channel request sent successfully');
      } else {
        throw new Error(`Failed to join channel, error code: ${result}`);
      }
    } catch (error) {
      console.error('[VIDEO_CALL] Error joining call:', error);
      
      Alert.alert(
        'Connection Error',
        'Failed to join call: ' + error.message + '\n\nWould you like to try again?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: () => setTimeout(joinCall, 1000) }
        ]
      );
      
      setConnecting(false);
    }
  }, [channelName, initializeAgora, navigation]);

  // Start call timer
  const startCallTimer = useCallback(() => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
    }
    
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // Toggle audio with error handling
  const toggleMute = useCallback(async () => {
    try {
      const engine = agoraEngineRef.current;
      if (engine) {
        await engine.muteLocalAudioStream(!isMuted);
        setIsMuted(!isMuted);
        console.log('[VIDEO_CALL] Audio toggled:', !isMuted ? 'muted' : 'unmuted');
      }
    } catch (error) {
      console.error('[VIDEO_CALL] Error toggling mute:', error);
      Alert.alert('Error', 'Failed to toggle microphone');
    }
  }, [isMuted]);

  // Toggle video with error handling
  const toggleVideo = useCallback(async () => {
    try {
      const engine = agoraEngineRef.current;
      if (engine) {
        await engine.muteLocalVideoStream(!isVideoOff);
        setIsVideoOff(!isVideoOff);
        console.log('[VIDEO_CALL] Video toggled:', !isVideoOff ? 'off' : 'on');
      }
    } catch (error) {
      console.error('[VIDEO_CALL] Error toggling video:', error);
      Alert.alert('Error', 'Failed to toggle camera');
    }
  }, [isVideoOff]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    try {
      const engine = agoraEngineRef.current;
      if (engine) {
        await engine.switchCamera();
        setIsFrontCamera(prev => !prev);
        console.log('[VIDEO_CALL] Camera switched to:', !isFrontCamera ? 'front' : 'back');
      }
    } catch (error) {
      console.error('[VIDEO_CALL] Error switching camera:', error);
      Alert.alert('Error', 'Failed to switch camera');
    }
  }, [isFrontCamera]);

  // Toggle speaker
  const toggleSpeaker = useCallback(async () => {
    try {
      const engine = agoraEngineRef.current;
      if (engine) {
        await engine.setEnableSpeakerphone(!isSpeakerOn);
        setIsSpeakerOn(!isSpeakerOn);
        console.log('[VIDEO_CALL] Speaker toggled:', !isSpeakerOn ? 'on' : 'off');
      }
    } catch (error) {
      console.error('[VIDEO_CALL] Error toggling speaker:', error);
      Alert.alert('Error', 'Failed to toggle speaker');
    }
  }, [isSpeakerOn]);

  // Send chat message (placeholder - implement with backend)
  const sendChatMessage = useCallback(() => {
  if (!chatInput.trim() || !socketRef.current) return;

  const otherUserId =
    user._id === bookingDetails.user._id
      ? bookingDetails.consultant._id
      : bookingDetails.user._id;

  socketRef.current.emit('send-message', {
    chatId: bookingDetails._id,
    fromId: user._id,
    toId: otherUserId,
    content: chatInput.trim(),
    type: 'text',
  });

  setChatInput('');
}, [chatInput, bookingDetails, user]);


  // Cleanup call resources
  const cleanupCall = useCallback(async () => {
    console.log('[VIDEO_CALL] Cleaning up call resources...');

    // Stop timer
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }

    // Leave channel and cleanup Agora
    const engine = agoraEngineRef.current;
    if (engine) {
      try {
        await engine.leaveChannel();
        await engine.stopPreview();
        engine.unregisterEventHandler();
        engine.release();
        agoraEngineRef.current = null;
        console.log('[VIDEO_CALL] Agora engine cleaned up successfully');
      } catch (error) {
        console.error('[VIDEO_CALL] Error cleaning up Agora:', error);
      }
    }

    // Reset states
    setCallActive(false);
    setConnecting(false);
    setCallDuration(0);
    setRemoteUid(null);
    setRemoteUsers(new Map());
    setIsReconnecting(false);
    reconnectAttempts.current = 0;

    console.log('[VIDEO_CALL] Cleanup complete');
  }, []);

  // Handle end call with confirmation
  const handleEndCall = useCallback(() => {
    if (callActive) {
      Alert.alert(
        'End Call',
        'Are you sure you want to end this call?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Call',
            style: 'destructive',
            onPress: async () => {
              await cleanupCall();
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      cleanupCall();
      navigation.goBack();
    }
  }, [callActive, cleanupCall, navigation]);

  // Format call duration
  const formatDuration = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get connection quality color
  const getConnectionQualityColor = useMemo(() => {
    switch (connectionQuality) {
      case 'good': return '#34C759';
      case 'medium': return '#FF9500';
      case 'poor': return '#FF3B30';
      default: return '#34C759';
    }
  }, [connectionQuality]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[VIDEO_CALL] App has come to foreground');
        // Optionally rejoin if needed
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEndCall();
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [handleEndCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading session details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (!bookingDetails || !channelName) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Unable to Load Session</Text>
          <Text style={styles.errorText}>
            There was a problem loading the session details. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Waiting room (before joining call)
  if (!callActive && !connecting) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
        <View style={styles.waitingRoom}>
          {/* Header */}
          <View style={styles.waitingHeader}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.waitingTitle}>Video Consultation</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          <View style={styles.waitingContent}>
            {/* Consultant Info */}
            <View style={styles.consultantInfo}>
              <View style={[
                styles.consultantAvatar,
                { backgroundColor: user?.role === 'consultant' ? '#007AFF' : '#4CAF50' }
              ]}>
                <Text style={styles.consultantAvatarText}>
                  {bookingDetails?.consultant?.fullName?.charAt(0) || 
                   bookingDetails?.user?.fullName?.charAt(0) || 'P'}
                </Text>
              </View>
              <Text style={styles.consultantName}>
                {user?.role === 'consultant' 
                  ? bookingDetails?.user?.fullName || 'Client'
                  : bookingDetails?.consultant?.fullName || 'Consultant'}
              </Text>
              <Text style={styles.sessionInfo}>
                {new Date(bookingDetails?.bookingDateTime).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </Text>
              <Text style={styles.durationInfo}>
                Duration: {bookingDetails?.duration || 30} minutes
              </Text>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.infoText}>
                Make sure you're in a quiet place with good lighting and stable internet connection
              </Text>
            </View>

            {/* Tips */}
            <View style={styles.tipsContainer}>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.tipText}>Strong WiFi connection recommended</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.tipText}>Use headphones for better audio</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.tipText}>Find a well-lit, quiet space</Text>
              </View>
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={styles.joinButton}
              onPress={joinCall}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam" size={24} color="#fff" />
              <Text style={styles.joinButtonText}>Join Video Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Connecting state
  if (connecting && !callActive) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.connectingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.connectingText}>
            {isReconnecting ? 'Reconnecting...' : 'Connecting to call...'}
          </Text>
          <Text style={styles.connectingSubtext}>
            {isReconnecting 
              ? `Attempt ${reconnectAttempts.current} of ${maxReconnectAttempts}`
              : 'Please wait'}
          </Text>
          {reconnectAttempts.current > 0 && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleEndCall}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Active call using Agora's native view components
  const RtcSurfaceView = require('react-native-agora').RtcSurfaceView;
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Remote video (full screen) */}
      <View style={styles.remoteVideoContainer}>
        {remoteUid ? (
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{
              uid: remoteUid,
              renderMode: RenderModeType.RenderModeHidden,
            }}
          />
        ) : (
          <View style={styles.waitingForRemote}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.waitingText}>Waiting for other participant...</Text>
            <Text style={styles.waitingSubtext}>
              They will join shortly
            </Text>
          </View>
        )}
      </View>

      {/* Local video (picture-in-picture) */}
      {!isVideoOff && (
        <View style={styles.localVideoContainer}>
          <RtcSurfaceView
            style={styles.localVideo}
            canvas={{
              uid: 0,
              renderMode: RenderModeType.RenderModeHidden,
            }}
            zOrderMediaOverlay={true}
          />
          <TouchableOpacity
            style={styles.switchCameraButton}
            onPress={switchCamera}
          >
            <Ionicons name="camera-reverse" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Reconnecting overlay */}
      {isReconnecting && (
        <View style={styles.reconnectingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.reconnectingText}>Reconnecting...</Text>
        </View>
      )}

      {/* Call info overlay */}
      <View style={styles.callInfoOverlay}>
        <View style={styles.callInfoTop}>
          <View style={styles.callDurationContainer}>
            <View style={[
              styles.qualityIndicator,
              { backgroundColor: getConnectionQualityColor }
            ]} />
            <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
          </View>
          <TouchableOpacity
            style={styles.participantsButton}
            onPress={() => setShowParticipants(true)}
          >
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.participantCount}>
              {remoteUsers.size + 1}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Control buttons */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Mute button */}
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Video button */}
          <TouchableOpacity
            style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
            onPress={toggleVideo}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isVideoOff ? 'videocam-off' : 'videocam'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Speaker button */}
          <TouchableOpacity
            style={[styles.controlButton, !isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Chat button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowChat(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble" size={28} color="#fff" />
            {chatMessages.length > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{chatMessages.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* End call button */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Chat modal */}
      <Modal
        visible={showChat}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChat(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Chat</Text>
              <TouchableOpacity onPress={() => setShowChat(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={chatMessages}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
              renderItem={({ item }) => (
                <View style={[
                  styles.chatMessage,
                  item.isMe && styles.chatMessageMe
                ]}>
                  <Text style={[
                    styles.chatSender,
                    item.isMe && styles.chatSenderMe
                  ]}>
                    {item.sender}
                  </Text>
                  <Text style={[
                    styles.chatText,
                    item.isMe && styles.chatTextMe
                  ]}>
                    {item.text}
                  </Text>
                  <Text style={[
                    styles.chatTime,
                    item.isMe && styles.chatTimeMe
                  ]}>
                    {item.timestamp.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyChatContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyChatText}>No messages yet</Text>
                  <Text style={styles.emptyChatSubtext}>
                    Send a message to start the conversation
                  </Text>
                </View>
              )}
            />

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !chatInput.trim() && styles.sendButtonDisabled
                ]}
                onPress={sendChatMessage}
                disabled={!chatInput.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Participants modal */}
      <Modal
        visible={showParticipants}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowParticipants(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.participantsContainer}>
            <View style={styles.participantsHeader}>
              <Text style={styles.participantsTitle}>
                Participants ({remoteUsers.size + 1})
              </Text>
              <TouchableOpacity onPress={() => setShowParticipants(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.participantsList}>
              {/* Local user */}
              <View style={styles.participantItem}>
                <View style={[
                  styles.participantAvatar,
                  { backgroundColor: '#007AFF' }
                ]}>
                  <Text style={styles.participantAvatarText}>
                    {user?.fullName?.charAt(0) || 'Y'}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {user?.fullName || 'You'} (You)
                  </Text>
                  <View style={styles.participantStatus}>
                    <Ionicons 
                      name="mic" 
                      size={14} 
                      color={isMuted ? '#FF3B30' : '#34C759'} 
                    />
                    <Ionicons 
                      name="videocam" 
                      size={14} 
                      color={isVideoOff ? '#FF3B30' : '#34C759'} 
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                </View>
              </View>

              {/* Remote users */}
              {Array.from(remoteUsers.values()).map((remoteUser) => (
                <View key={remoteUser.uid} style={styles.participantItem}>
                  <View style={[
                    styles.participantAvatar,
                    { backgroundColor: '#4CAF50' }
                  ]}>
                    <Text style={styles.participantAvatarText}>
                      {user?.role === 'consultant'
                        ? bookingDetails?.user?.fullName?.charAt(0) || 'C'
                        : bookingDetails?.consultant?.fullName?.charAt(0) || 'C'}
                    </Text>
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {user?.role === 'consultant'
                        ? bookingDetails?.user?.fullName || 'Client'
                        : bookingDetails?.consultant?.fullName || 'Consultant'}
                    </Text>
                    <View style={styles.participantStatus}>
                      <Ionicons name="mic" size={14} color="#34C759" />
                      <Ionicons 
                        name="videocam" 
                        size={14} 
                        color="#34C759" 
                        style={{ marginLeft: 8 }}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  // Loading & Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Waiting room
  waitingRoom: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  waitingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  waitingContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  consultantInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  consultantAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  consultantAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  consultantName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  sessionInfo: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 6,
    textAlign: 'center',
  },
  durationInfo: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    alignItems: 'center',
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginLeft: 12,
  },
  tipsContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  joinButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },

  // Connecting state
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
  },
  connectingText: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  connectingSubtext: {
    marginTop: 8,
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 32,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Active call
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  waitingForRemote: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  waitingText: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  waitingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  localVideoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 80,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#1C1C1E',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  switchCameraButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reconnectingOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  reconnectingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  callInfoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
  },
  callInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  qualityIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  callDuration: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  participantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  participantCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  
  // Controls
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(60, 60, 67, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#000',
  },
  chatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  endCallButton: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  
  // Chat modal
  chatContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 20,
  },
  chatMessage: {
    backgroundColor: '#E5E5EA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    maxWidth: '75%',
    alignSelf: 'flex-start',
  },
  chatMessageMe: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  chatSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 6,
  },
  chatSenderMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  chatText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 22,
    marginBottom: 6,
  },
  chatTextMe: {
    color: '#fff',
  },
  chatTime: {
    fontSize: 11,
    color: '#8E8E93',
  },
  chatTimeMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyChatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#F2F2F7',
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1C1C1E',
    maxHeight: 100,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },

  // Participants modal
  participantsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.6,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  participantsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  participantsList: {
    paddingVertical: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  participantAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  participantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default VideoCallScreen;