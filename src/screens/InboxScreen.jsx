// InboxScreen.jsx - Clean Inbox Implementation
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/ApiService';
import Icon from 'react-native-vector-icons/MaterialIcons';

const InboxScreen = ({ navigation }) => {
  const { isAuthenticated, user } = useAuth();
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load inbox when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user) {
        loadInbox();
      }
    }, [isAuthenticated, user])
  );

  const loadInbox = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      console.log('[INBOX] Loading conversations...');
      setLoading(true);
      const result = await ApiService.getChatInbox();
      
      if (result.success) {
        const inboxData = result.data.inbox || [];
        setInbox(inboxData);
        console.log('[INBOX] Loaded', inboxData.length, 'conversations');
      } else {
        console.error('[INBOX] Failed to load:', result.error);
        if (!result.error?.includes('Session expired')) {
          Alert.alert('Error', result.error || 'Failed to load conversations');
        }
      }
    } catch (error) {
      console.error('[INBOX] Load error:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInbox();
  }, [loadInbox]);

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
      return 'now';
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
          <Text style={styles.inboxAvatarText}>
            {getInitials(item.otherName)}
          </Text>
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
      <SafeAreaView style={styles.container}>
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          {inbox.some(chat => (chat.unreadCountForMe || 0) > 0) && (
            <View style={styles.newMessageIndicator} />
          )}
          <TouchableOpacity 
            onPress={loadInbox} 
            disabled={loading}
            style={styles.refreshButton}
          >
            <Icon name="refresh" size={24} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>
      
      {loading && !refreshing ? (
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
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={["#059669"]}
              tintColor="#059669"
            />
          }
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
    marginRight: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
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
  },
  unreadAvatar: {
    backgroundColor: '#10B981',
  },
  inboxAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
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
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
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