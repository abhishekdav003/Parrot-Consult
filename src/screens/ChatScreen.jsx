// ChatScreen.jsx - FIXED: Keyboard & Read Receipts Working + Profile Navigation
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
  Keyboard,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';
import { io } from 'socket.io-client';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHAT_SERVER = 'https://api.parrotconsult.com';
// const CHAT_SERVER = 'http://10.0.2.2:8011';

// const CHAT_SERVER = 'http://192.168.1.26:8011';


const ChatScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { chatId, otherId, otherName, otherProfileImage } = route.params;
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);
  const [otherUserData, setOtherUserData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages.length]);

  // Initialize socket
  useEffect(() => {
    if (!user || !otherId || !chatId) return;

    const socket = io(CHAT_SERVER, {
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[CHAT] Connected:', socket.id);
      setConnected(true);
      socket.emit('join-chat', { chatId, userId: user._id, consultantId: otherId });
    });

    socket.on('disconnect', () => {
      console.log('[CHAT] Disconnected');
      setConnected(false);
    });

    socket.on('chat-joined', () => {
      console.log('[CHAT] Joined room');
      loadChatHistory();
    });

    socket.on('new-message', ({ message }) => {
      const processedMessage = {
        ...message,
        sender: {
          _id: message.sender._id || message.sender,
          fullName: message.sender.fullName || message.sender.name || 'Unknown',
          profileImage: message.sender.profileImage || message.sender.avatar,
        },
        receiver: {
          _id: message.receiver._id || message.receiver,
          fullName: message.receiver.fullName || message.receiver.name || 'Unknown',
          profileImage: message.receiver.profileImage || message.receiver.avatar,
        },
        createdAt: message.createdAt || new Date().toISOString(),
        readBy: message.readBy || [],
        status: message.sender._id === user._id ? 'sent' : 'received',
      };

      setMessages(prev => {
        const exists = prev.find(msg => msg._id === processedMessage._id);
        if (exists) return prev;
        const filtered = prev.filter(msg => !msg.isTemp);
        return [...filtered, processedMessage];
      });

      // FIXED: Auto mark as read when receiving message
      if (message.sender._id !== user._id) {
        setTimeout(() => {
          socketRef.current?.emit('mark-read', {
            chatId: chatId,
            userId: user._id,
          });
        }, 1000);
      }

      scrollToBottom();
    });

    socket.on('typing', ({ fromId }) => {
      if (fromId !== user._id) {
        setTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
      }
    });

    // FIXED: Read receipts update
    socket.on('read-updated', ({ chatId: updatedChatId, unreadCountForUser, unreadCountForConsultant }) => {
      console.log('[CHAT] Read status updated');
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.sender._id === user._id && !msg.readBy?.includes(otherId)) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), otherId],
              status: 'read'
            };
          }
          return msg;
        })
      );
    });

    return () => {
      clearTimeout(typingTimeoutRef.current);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [user, otherId, chatId]);

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const result = await ApiService.getChatHistory(user._id, otherId, chatId);
      
      if (result.success) {
        const messagesData = result.data.messages || [];
        const chatData = result.data.chat;
        
        const processedMessages = messagesData.map(msg => ({
          ...msg,
          status: msg.sender._id === user._id 
            ? (msg.readBy?.includes(otherId) ? 'read' : 'sent')

            
            : 'received'
        }));
        
        setMessages(processedMessages);
        setChat({ _id: chatData, peer1: user._id, peer2: otherId });
        
        // Scroll to bottom without animation
        setTimeout(() => scrollToBottom(), 200);

        // Mark messages as read
        setTimeout(() => {
          socketRef.current?.emit('mark-read', {
            chatId: chatData,
            userId: user._id,
          });
        }, 1000);
      }
    } catch (error) {
      console.error('[CHAT] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const content = messageText.trim();
    
    if (!content || !socketRef.current?.connected || !chat) {
      if (!socketRef.current?.connected) {
        Alert.alert('Connection Error', 'Not connected to chat server');
      }
      return;
    }

    const tempMessage = {
      _id: `temp_${Date.now()}`,
      content,
      sender: {
        _id: user._id,
        fullName: user.fullName,
        profileImage: user.profileImage
      },
      receiver: {
        _id: otherId,
        fullName: otherName,
        profileImage: otherProfileImage
      },
      createdAt: new Date().toISOString(),
      readBy: [],
      isTemp: true,
      status: 'sending'
    };

    setMessageText('');
    setInputHeight(40);
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const toId = chat.peer1 === user._id ? chat.peer2 : chat.peer1;

      socketRef.current.emit('send-message', {
        chatId: chat._id,
        fromId: user._id,
        toId,
        content,
        type: 'text',
      });

      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg._id === tempMessage._id ? { ...msg, status: 'sent' } : msg
        ));
      }, 500);
      
    } catch (error) {
      console.error('[CHAT] Send error:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      setMessageText(content);
      Alert.alert('Send Failed', 'Message could not be sent');
    }
  };

  const handleTyping = useCallback(() => {
    if (chat && socketRef.current?.connected) {
      socketRef.current.emit('typing', {
        chatId: chat._id,
        fromId: user._id,
      });
    }
  }, [chat, user]);

  // NEW: Handle profile navigation
  const handleProfilePress = useCallback(async () => {
    if (loadingProfile) return;

    try {
      setLoadingProfile(true);
      console.log('[CHAT] Loading profile for user:', otherId);

      // Fetch all users and find the specific user
      const result = await ApiService.getAllUsers();
      
      if (result.success && result.data) {
        const allUsers = result.data;
        const expertData = allUsers.find(user => user._id === otherId);
        
        if (expertData) {
          console.log('[CHAT] Found expert data:', expertData.fullName);
          
          // Navigate to ExpertProfileScreen with the complete expert data
          navigation.navigate('ExpertProfileStack', {
            expert: {
              _id: expertData._id || otherId,
              fullName: expertData.fullName || otherName,
              profileImage: expertData.profileImage || otherProfileImage,
              email: expertData.email,
              phone: expertData.phone,
              location: expertData.location,
              role: expertData.role,
              aadharVerified: expertData.aadharVerified,
              kycVerify: expertData.kycVerify,
              consultantRequest: expertData.consultantRequest,
              ...expertData
            }
          });
        } else {
          console.log('[CHAT] User not found in list, using basic data');
          navigation.navigate('ExpertProfileStack', {
            expert: {
              _id: otherId,
              fullName: otherName,
              profileImage: otherProfileImage,
              role: 'consultant',
            }
          });
        }
      } else {
        // Fallback: Navigate with available data
        console.log('[CHAT] Failed to fetch users, using basic data');
        navigation.navigate('ExpertProfileStack', {
          expert: {
            _id: otherId,
            fullName: otherName,
            profileImage: otherProfileImage,
            role: 'consultant',
          }
        });
      }
    } catch (error) {
      console.error('[CHAT] Error loading profile:', error);
      
      // Still navigate with basic data on error
      navigation.navigate('ExpertProfileStack', {
        expert: {
          _id: otherId,
          fullName: otherName,
          profileImage: otherProfileImage,
          role: 'consultant',
        }
      });
    } finally {
      setLoadingProfile(false);
    }
  }, [otherId, otherName, otherProfileImage, navigation, loadingProfile]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const shouldShowDateHeader = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    return currentDate !== prevDate;
  };

  const getStatusIcon = (message) => {
    if (message.status === 'sending') {
      return <Icon name="schedule" size={16} color="rgba(255,255,255,0.7)" />;
    }
    if (message.status === 'read') {
      return <Icon name="done-all" size={16} color="#4FC3F7" />;
    }
    return <Icon name="done-all" size={16} color="rgba(255,255,255,0.7)" />;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender?._id === user._id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDateHeader = shouldShowDateHeader(item, prevMessage);
    
    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <View style={styles.dateHeaderBubble}>
              <Text style={styles.dateHeaderText}>{formatDateHeader(item.createdAt)}</Text>
            </View>
          </View>
        )}
        
        <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
          {!isMyMessage && (
            <View style={styles.otherAvatar}>
              {otherProfileImage ? (
                <Image source={{ uri: otherProfileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{getInitials(otherName)}</Text>
              )}
            </View>
          )}
          
          <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
              {item.content}
            </Text>
            
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
                {formatTime(item.createdAt)}
              </Text>
              {isMyMessage && <View style={styles.messageStatus}>{getStatusIcon(item)}</View>}
            </View>
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      
      {!connected && (
        <View style={styles.connectionBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.connectionText}>Reconnecting...</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* NEW: Make header avatar clickable */}
        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={handleProfilePress}
          activeOpacity={0.7}
          disabled={loadingProfile}
        >
          <View style={styles.headerAvatar}>
            {otherProfileImage ? (
              <Image source={{ uri: otherProfileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.headerAvatarText}>{getInitials(otherName)}</Text>
            )}
            {loadingProfile && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
            )}
          </View>
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{otherName || 'Chat'}</Text>
            {typing && <Text style={styles.typingIndicator}>typing...</Text>}
          </View>
        </TouchableOpacity>
      </View>

      {/* FIXED: Proper KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item._id || `message-${index}`}
          showsVerticalScrollIndicator={false}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="chat" size={48} color="#E2E8F0" />
              <Text style={styles.emptyText}>Start your conversation</Text>
            </View>
          )}
        />

        {/* FIXED: Input container always above keyboard */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.messageInput, { height: Math.max(40, inputHeight) }]}
              value={messageText}
              onChangeText={(text) => {
                setMessageText(text);
                handleTyping();
              }}
              onContentSizeChange={(e) => {
                const newHeight = e.nativeEvent.contentSize.height;
                setInputHeight(Math.min(120, Math.max(40, newHeight)));
              }}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || !connected) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim() || !connected}
            activeOpacity={0.8}
          >
            <Icon name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  connectionBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#059669',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  typingIndicator: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderBubble: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  messageWrapper: {
    marginVertical: 2,
    maxWidth: '85%',
    flexDirection: 'row',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  otherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 1,
  },
  myMessageBubble: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  messageStatus: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    maxHeight: 120,
  },
  messageInput: {
    fontSize: 16,
    color: '#1F2937',
    textAlignVertical: 'center',
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  sendButton: {
    backgroundColor: '#059669',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
});

export default ChatScreen;