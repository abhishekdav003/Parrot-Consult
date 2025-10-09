// InboxScreen.jsx - Production-Ready Inbox with Real-time Updates (WhatsApp-like) - COMPLETE VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/ApiService';
import { io } from 'socket.io-client';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHAT_SERVER = 'https://api.parrotconsult.com';

const InboxScreen = ({ navigation }) => {
  const { isAuthenticated, user } = useAuth();
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const insets = useSafeAreaInsets();
  
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const inboxRoomsJoined = useRef(new Set());

  // Real-time socket connection for instant inbox updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initSocket = () => {
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

      socket.on('connect', () => {
        console.log('[INBOX] Socket connected:', socket.id);
        setConnected(true);
        
        // Re-join all chat rooms after reconnection
        if (inbox.length > 0) {
          inbox.forEach(chat => {
            if (!inboxRoomsJoined.current.has(chat.chatId)) {
              socket.emit('join-chat', {
                chatId: chat.chatId,
                userId: user._id,
                consultantId: chat.otherId
              });
              inboxRoomsJoined.current.add(chat.chatId);
            }
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('[INBOX] Socket disconnected');
        setConnected(false);
        inboxRoomsJoined.current.clear();
      });

      socket.on('new-message', ({ message, chat }) => {
        console.log('[INBOX] New message received, updating inbox automatically');
        loadInboxSilently();
      });

      socket.on('read-updated', ({ chatId }) => {
        console.log('[INBOX] Messages marked as read, updating inbox automatically');
        loadInboxSilently();
      });

      return socket;
    };

    const socket = initSocket();

    return () => {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      inboxRoomsJoined.current.clear();
    };
  }, [isAuthenticated, user]);

  // Join socket rooms when inbox updates
  useEffect(() => {
    if (socketRef.current?.connected && inbox.length > 0) {
      inbox.forEach(chat => {
        if (!inboxRoomsJoined.current.has(chat.chatId)) {
          socketRef.current.emit('join-chat', {
            chatId: chat.chatId,
            userId: user._id,
            consultantId: chat.otherId
          });
          inboxRoomsJoined.current.add(chat.chatId);
          console.log('[INBOX] Joined room:', chat.chatId);
        }
      });
    }
  }, [inbox, user]);

  // Load inbox when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      
      if (isAuthenticated && user) {
        loadInbox();
      }

      return () => {
        isMountedRef.current = false;
      };
    }, [isAuthenticated, user])
  );

  // Load inbox with loading indicator (initial load only)
  const loadInbox = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      console.log('[INBOX] Loading conversations...');
      setLoading(true);
      const result = await ApiService.getChatInbox();
      
      if (result.success && isMountedRef.current) {
        const inboxData = result.data.inbox || [];
        
        const sortedInbox = inboxData.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        
        setInbox(sortedInbox);
        console.log('[INBOX] Loaded', sortedInbox.length, 'conversations');
      } else if (!result.success && !result.error?.includes('Session expired')) {
        console.error('[INBOX] Failed to load:', result.error);
      }
    } catch (error) {
      console.error('[INBOX] Load error:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, user]);

  // Load inbox silently (no loading indicator) - for real-time updates
  const loadInboxSilently = useCallback(async () => {
    if (!isAuthenticated || !user || !isMountedRef.current) return;
    
    try {
      const result = await ApiService.getChatInbox();
      
      if (result.success && isMountedRef.current) {
        const inboxData = result.data.inbox || [];
        
        const sortedInbox = inboxData.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        
        setInbox(sortedInbox);
        console.log('[INBOX] Automatically updated', sortedInbox.length, 'conversations');
      }
    } catch (error) {
      console.error('[INBOX] Silent load error:', error);
    }
  }, [isAuthenticated, user]);

  const openChat = useCallback((chatItem) => {
    console.log('[INBOX] Opening chat with:', chatItem.otherName);
    navigation.navigate('ChatScreen', {
      chatId: chatItem.chatId,
      otherId: chatItem.otherId,
      otherName: chatItem.otherName,
      otherProfileImage: chatItem.otherprofileImage,
    });
  }, [navigation]);

  const formatInboxDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / 36e5;
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'now' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const renderInboxItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.inboxItem,
        item.unreadCountForMe > 0 && styles.unreadInboxItem,
        index === 0 && styles.firstInboxItem
      ]}
      onPress={() => openChat(item)}
      activeOpacity={0.8}
    >
      <View style={styles.inboxAvatarContainer}>
        <View style={[
          styles.inboxAvatar,
          item.unreadCountForMe > 0 && styles.unreadAvatar
        ]}>
          {item.otherprofileImage ? (
            <Image 
              source={{ uri: item.otherprofileImage }} 
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.inboxAvatarText}>
              {getInitials(item.otherName)}
            </Text>
          )}
        </View>
        {item.unreadCountForMe > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCountForMe > 99 ? '99+' : item.unreadCountForMe}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.inboxContent}>
        <View style={styles.inboxHeader}>
          <Text style={[
            styles.inboxName,
            item.unreadCountForMe > 0 && styles.unreadInboxName
          ]} numberOfLines={1}>
            {item.otherName || 'Unknown User'}
          </Text>
          <Text style={[
            styles.inboxTime,
            item.unreadCountForMe > 0 && styles.unreadInboxTime
          ]}>
            {formatInboxDate(item.updatedAt)}
          </Text>
        </View>
        <View style={styles.lastMessageContainer}>
          <Text style={[
            styles.lastMessage,
            item.unreadCountForMe > 0 && styles.unreadLastMessage
          ]} numberOfLines={2}>
            {item.lastMessage || 'Start your conversation...'}
          </Text>
          {item.unreadCountForMe > 0 && (
            <View style={styles.unreadDot} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Authentication guard
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.authContainer}>
          <Icon name="lock-outline" size={64} color="#E2E8F0" />
          <Text style={styles.authTitle}>Authentication Required</Text>
          <Text style={styles.authText}>Please sign in to access chat functionality</Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          {inbox.some(chat => (chat.unreadCountForMe || 0) > 0) && (
            <View style={styles.newMessageIndicator} />
          )}
          {!connected && (
            <View style={styles.reconnectingIndicator}>
              <ActivityIndicator size="small" color="#F59E0B" />
            </View>
          )}
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={inbox}
          renderItem={renderInboxItem}
          keyExtractor={(item) => item.chatId}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Icon name="chat-bubble-outline" size={64} color="#E2E8F0" />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Start chatting with consultants to see your conversations here
              </Text>
            </View>
          )}
          contentContainerStyle={inbox.length === 0 ? styles.emptyContentContainer : null}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newMessageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  reconnectingIndicator: {
    marginLeft: 8,
    padding: 4,
  },
  inboxItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  firstInboxItem: {
    borderTopWidth: 0,
  },
  unreadInboxItem: {
    backgroundColor: '#F0FDF4',
  },
  inboxAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  inboxAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  unreadAvatar: {
    backgroundColor: '#10B981',
  },
  inboxAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  inboxContent: {
    flex: 1,
    justifyContent: 'center',
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inboxName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  unreadInboxName: {
    fontWeight: '700',
    color: '#059669',
  },
  inboxTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  unreadInboxTime: {
    color: '#059669',
    fontWeight: '600',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 20,
    flex: 1,
  },
  unreadLastMessage: {
    fontWeight: '500',
    color: '#374151',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginLeft: 8,
  },
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
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  authText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  authButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InboxScreen;