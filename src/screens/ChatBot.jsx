// src/components/ChatBot.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';

const { width, height } = Dimensions.get('window');

const ChatBot = ({ route, navigation }) => {
  const initialQuery = route?.params?.query || 'hello';
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'bot', 
      text: "Hello! I'm Parry, your AI assistant. How can I help you today?", 
      timestamp: new Date() 
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showListener = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideListener = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = require('react-native').Keyboard.addListener(showListener, keyboardWillShow);
    const hideSubscription = require('react-native').Keyboard.addListener(hideListener, keyboardWillHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Initialize with query
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSendMessage(initialQuery);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Message animation
  const animateMessage = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Typing animation
  useEffect(() => {
    if (isTyping) {
      const animate = () => {
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isTyping) animate();
        });
      };
      animate();
    }
  }, [isTyping]);

  const handleSendMessage = async (messageText = input.trim()) => {
    if (!messageText || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsTyping(true);
    scrollToBottom();

    try {
      const response = await ApiService.getChatBotResponse(messageText);
      
      if (response.success) {
        const botMessage = {
          id: Date.now() + 1,
          sender: 'bot',
          text: response.data.reply,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, botMessage]);
        animateMessage();
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'I apologize, but I encountered an issue. Please try again.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('ChatBot error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'I\'m having trouble connecting. Please check your internet connection.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleBackPress = () => {
    navigation.navigate('Home');
  };

  const MessageBubble = ({ message, index }) => {
    const isUser = message.sender === 'user';
    const isLatest = index === messages.length - 1;
    
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.botMessageContainer,
          {
            opacity: isLatest ? fadeAnim : 1,
            transform: [
              {
                translateY: isLatest ? slideAnim : 0,
              },
            ],
          },
        ]}
      >
        {/* Bot Avatar */}
        {!isUser && (
          <View style={styles.avatarContainer}>
            <View style={styles.botAvatar}>
              <Icon name="support-agent" size={16} color="#059669" />
            </View>
          </View>
        )}

        {/* Message Bubble */}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
        ]}>
          <View style={[
            styles.messageContent,
            isUser ? styles.userMessageContent : styles.botMessageContent,
          ]}>
            <Text style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.botMessageText,
            ]}>
              {message.text}
            </Text>
          </View>
          
          {/* Timestamp */}
          <Text style={[
            styles.timestamp,
            isUser ? styles.userTimestamp : styles.botTimestamp
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>

        {/* User Avatar */}
        {isUser && (
          <View style={styles.avatarContainer}>
            <View style={styles.userAvatar}>
              <Icon name="person" size={16} color="#ffffff" />
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  const TypingIndicator = () => (
    <Animated.View 
      style={[
        styles.typingContainer,
        { opacity: typingAnim }
      ]}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.botAvatar}>
          <Icon name="support-agent" size={16} color="#059669" />
        </View>
      </View>
      
      <View style={styles.typingBubble}>
        <View style={styles.typingContent}>
          <View style={styles.typingDotsContainer}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.typingDot,
                  {
                    opacity: typingAnim,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.typingText}>Parry is typing...</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#059669" barStyle="light-content" />
      
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color="#059669" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <View style={styles.headerAvatarContainer}>
                <View style={styles.headerAvatar}>
                  <Icon name="support-agent" size={20} color="#059669" />
                </View>
                <View style={styles.onlineIndicator} />
              </View>
              
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Parry</Text>
                <Text style={styles.headerSubtitle}>AI Assistant</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
              <Icon name="more-vert" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerBorder} />
        </View>
      </SafeAreaView>

      {/* Messages Container */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScrollView}
          contentContainerStyle={[
            styles.messagesContainer,
            { paddingBottom: keyboardHeight > 0 ? 20 : 100 }
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((message, index) => (
            <MessageBubble key={message.id} message={message} index={index} />
          ))}
          
          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Input Area */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              transform: [{ translateY: keyboardHeight > 0 ? -keyboardHeight : 0 }],
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="Type your message..."
                placeholderTextColor="#94A3B8"
                multiline
                maxHeight={100}
                onSubmitEditing={() => handleSendMessage()}
                editable={!loading}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              activeOpacity={0.7}
            >
              <View style={[
                styles.sendButtonContent,
                (!input.trim() || loading) && styles.sendButtonContentDisabled,
              ]}>
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Icon 
                    name="send" 
                    size={18} 
                    color={!input.trim() ? '#94A3B8' : 'white'} 
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  headerSafeArea: {
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#10B981',
    opacity: 0.6,
  },

  // Chat Container
  chatContainer: {
    flex: 1,
  },
  messagesScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesContainer: {
    padding: 16,
  },

  // Message Styles
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  
  avatarContainer: {
    marginHorizontal: 8,
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },

  messageBubble: {
    maxWidth: width * 0.75,
    marginBottom: 4,
  },
  
  userBubble: {
    alignSelf: 'flex-end',
  },
  userMessageContent: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userMessageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  botBubble: {
    alignSelf: 'flex-start',
  },
  botMessageContent: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  botMessageText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  messageContent: {
    marginBottom: 2,
  },

  timestamp: {
    fontSize: 11,
    marginHorizontal: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  userTimestamp: {
    color: '#059669',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#94A3B8',
    textAlign: 'left',
  },

  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  typingBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  typingContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDotsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginHorizontal: 1,
  },
  typingText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Input Styles
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlignVertical: 'center',
    minHeight: 24,
    maxHeight: 80,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 0,
  },
  sendButtonContent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendButtonContentDisabled: {
    backgroundColor: '#E2E8F0',
    elevation: 0,
    shadowOpacity: 0,
  },
});

export default ChatBot;