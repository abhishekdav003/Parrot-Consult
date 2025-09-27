// ChatScreen.jsx - Optimized Real-time Chat Implementation
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
  Keyboard,
  Animated,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';
import { io } from 'socket.io-client';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CHAT_SERVER = 'https://api.parrotconsult.com'; // Use your production URL
// const CHAT_SERVER = 'http://10.0.2.2:8011';


const ChatScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { chatId, otherId, otherName, otherProfileImage } = route.params;
  
  // Core states
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chat, setChat] = useState(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [keyboardHeight] = useState(new Animated.Value(0));
  
  // Refs
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToEnd({ animated: true });
      } catch (error) {
        console.warn('[CHAT] Scroll failed:', error);
      }
    }, 100);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!user || !otherId || !chatId) return;

    console.log('[CHAT] Initializing socket connection...');
    
    const initSocket = () => {
      // Clean up existing connection
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      const socket = io(CHAT_SERVER, {
        transports: ['websocket'],
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('[CHAT] Socket connected:', socket.id);
        setConnected(true);
        
        // Join chat room
        const userId = user._id;
        const consultantId = otherId;
        
        socket.emit('join-chat', { chatId, userId, consultantId });
      });

      socket.on('disconnect', (reason) => {
        console.log('[CHAT] Socket disconnected:', reason);
        setConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[CHAT] Connection error:', error);
        setConnected(false);
      });

      // Chat events
      socket.on('chat-joined', async () => {
        console.log('[CHAT] Joined chat room');
        await loadChatHistory();
      });

      socket.on('new-message', ({ message, chat: updatedChat }) => {
        console.log('[CHAT] New message received');
        
        const processedMessage = {
          ...message,
          sender: {
            _id: message.sender._id || message.sender,
            fullName: message.sender.fullName || message.sender.name || 'Unknown User',
            profileImage: message.sender.profileImage || message.sender.avatar,
          },
          createdAt: message.createdAt || new Date().toISOString(),
          readBy: message.readBy || [],
        };

        setMessages(prev => {
          const exists = prev.find(msg => msg._id === processedMessage._id);
          if (exists) return prev;
          return [...prev, processedMessage];
        });

        // Mark as read if message is from other user
        if (message.sender._id !== user._id) {
          setTimeout(() => {
            socket.emit('mark-read', {
              chatId: updatedChat._id,
              userId: user._id,
            });
          }, 500);
        }

        setChat(prevChat => ({ ...prevChat, ...updatedChat }));
        scrollToBottom();
      });

      socket.on('typing', ({ fromId }) => {
        if (fromId !== user._id) {
          setTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
        }
      });

      socket.on('read-updated', ({ unreadCountForpeer1, unreadCountForpeer2 }) => {
        setMessages(prevMessages =>
          prevMessages.map(msg => {
            if (msg.sender._id === user._id && !msg.readBy?.includes(otherId)) {
              return {
                ...msg,
                readBy: [...(msg.readBy || []), otherId]
              };
            }
            return msg;
          })
        );
      });

      return socket;
    };

    const socket = initSocket();

    return () => {
      console.log('[CHAT] Cleaning up socket...');
      clearTimeout(typingTimeoutRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      setConnected(false);
    };
  }, [user, otherId, chatId]);

  // Load chat history
  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const result = await ApiService.getChatHistory(user._id, otherId, chatId);
      
      if (result.success) {
        const messagesData = result.data.messages || [];
        const chatData = result.data.chat;
        
        setMessages(messagesData);
        setChat({ _id: chatData, peer1: user._id, peer2: otherId });
        
        scrollToBottom();
        console.log('[CHAT] Chat history loaded:', messagesData.length, 'messages');
      } else {
        console.error('[CHAT] Failed to load history:', result.error);
        Alert.alert('Error', 'Failed to load chat history');
      }
    } catch (error) {
      console.error('[CHAT] Load history error:', error);
      Alert.alert('Error', 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    const content = messageText.trim();
    
    if (!content || sending || !socketRef.current?.connected || !chat) {
      if (!socketRef.current?.connected) {
        Alert.alert('Connection Error', 'Not connected to chat server');
      }
      return;
    }

    console.log('[CHAT] Sending message:', content.substring(0, 50) + '...');
    
    // Optimistic message
    const optimisticMessage = {
      _id: `temp_${Date.now()}`,
      content,
      sender: {
        _id: user._id,
        fullName: user.fullName,
        profileImage: user.profileImage
      },
      createdAt: new Date().toISOString(),
      readBy: [],
      isOptimistic: true
    };

    // Clear input and add optimistic message
    setMessageText('');
    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);
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

      console.log('[CHAT] Message sent successfully');
      
      // Remove optimistic message after a delay (it will be replaced by real message)
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      }, 3000);
      
    } catch (error) {
      console.error('[CHAT] Send message error:', error);
      
      // Remove optimistic message and restore input
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      setMessageText(content);
      
      Alert.alert('Send Failed', 'Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = useCallback(() => {
    if (chat && socketRef.current?.connected) {
      socketRef.current.emit('typing', {
        chatId: chat._id,
        fromId: user._id,
      });
    }
  }, [chat, user]);

  // Keyboard handling
  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardShowListener?.remove();
      keyboardHideListener?.remove();
    };
  }, [keyboardHeight]);

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Render message
  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender?._id === user._id;
    const sortedMessages = messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const prevMessage = sortedMessages[index - 1];
    const nextMessage = sortedMessages[index + 1];
    
    const showSenderInfo = !isMyMessage && (
      !prevMessage || 
      prevMessage.sender?._id !== item.sender?._id ||
      (new Date(item.createdAt) - new Date(prevMessage.createdAt)) > 300000
    );
    
    const isLastInGroup = !nextMessage || 
      nextMessage.sender?._id !== item.sender?._id ||
      (new Date(nextMessage.createdAt) - new Date(item.createdAt)) > 300000;
    
    const isRead = item.readBy?.length > 1;
    
    return (
      <View style={[
        styles.messageWrapper,
        isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
      ]}>
        {showSenderInfo && !isMyMessage && (
          <Text style={styles.senderName}>
            {item.sender?.fullName || otherName || 'User'}
          </Text>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          item.isOptimistic && styles.optimisticMessage
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatTime(item.createdAt)}
            </Text>
            
            {isMyMessage && (
              <View style={styles.messageStatus}>
                {item.isOptimistic ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                ) : (
                  <Icon 
                    name={isRead ? "done-all" : "done"} 
                    size={16} 
                    color={isRead ? "#4FC3F7" : "rgba(255,255,255,0.7)"} 
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (!typing) return null;
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>Typing...</Text>
        </View>
      </View>
    );
  };

  // Render connection status
  const renderConnectionStatus = () => {
    if (connected) return null;
    
    return (
      <View style={styles.connectionBanner}>
        <View style={styles.connectionIndicator}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.connectionText}>Reconnecting...</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      
      {renderConnectionStatus()}
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {getInitials(otherName)}
            </Text>
          </View>
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherName || 'Chat'}
            </Text>
            {typing && (
              <Text style={styles.typingIndicator}>Typing...</Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.8}>
          <Icon name="more-vert" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item._id || `message-${index}`}
          showsVerticalScrollIndicator={false}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Icon name="chat" size={48} color="#E2E8F0" />
              </View>
              <Text style={styles.emptyText}>Start your conversation</Text>
              <Text style={styles.emptySubtext}>Send a message to begin chatting</Text>
            </View>
          )}
        />
        
        {renderTypingIndicator()}

        <Animated.View 
          style={[
            styles.inputContainer,
            {
              paddingBottom: Platform.OS === 'ios' ? 
                Math.max(keyboardHeight._value, 34) : 
                Math.max(keyboardHeight._value, 20)
            }
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              value={messageText}
              onChangeText={(text) => {
                setMessageText(text);
                handleTyping();
              }}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
              blurOnSubmit={false}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
          </View>
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending || !connected) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sending || !connected}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  
  // Connection Status
  connectionBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    zIndex: 1000,
    paddingVertical: 8,
  },
  connectionIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Header
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
    borderRadius: 20,
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
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  menuButton: {
    padding: 8,
    borderRadius: 20,
  },
  
  // Chat Container
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
  
  // Messages
  messageWrapper: {
    marginVertical: 2,
    maxWidth: '85%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    marginLeft: 12,
    fontWeight: '500',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 1,
  },
  myMessageBubble: {
    backgroundColor: '#059669',
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optimisticMessage: {
    opacity: 0.7,
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
  
  // Typing
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  
  // Input
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    backgroundColor: '#F9FAFB',
    maxHeight: 120,
  },
  messageInput: {
    fontSize: 16,
    color: '#1F2937',
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  sendButton: {
    backgroundColor: '#059669',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    elevation: 0,
    shadowOpacity: 0,
  },
  
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  emptyIcon: {
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ChatScreen;