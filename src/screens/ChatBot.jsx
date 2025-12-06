// src/components/ChatBot.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';

// Responsive sizing configuration
const getResponsiveSizes = (insets, dimensions) => {
  const { width: screenWidth, height: screenHeight } = dimensions;
  const isSmallScreen = screenHeight < 700;
  const isTablet = screenWidth > 768;
  
  return {
    // Input area sizing
    INPUT_CONTAINER_HEIGHT: isSmallScreen ? 44 : 52,
    INPUT_PADDING_VERTICAL: isSmallScreen ? 8 : 10,
    INPUT_PADDING_HORIZONTAL: isSmallScreen ? 12 : 16,
    INPUT_BORDER_RADIUS: 24,
    
    // Message sizing
    MESSAGE_PADDING_HORIZONTAL: isSmallScreen ? 12 : 16,
    MESSAGE_PADDING_VERTICAL: isSmallScreen ? 8 : 12,
    MESSAGE_BORDER_RADIUS: 18,
    MESSAGE_MAX_WIDTH: screenWidth * (isTablet ? 0.65 : 0.75),
    
    // Avatar sizing
    AVATAR_SIZE: isSmallScreen ? 28 : 32,
    AVATAR_BORDER_RADIUS: isSmallScreen ? 14 : 16,
    HEADER_AVATAR_SIZE: 40,
    HEADER_AVATAR_BORDER_RADIUS: 20,
    
    // Text sizing
    HEADER_TITLE_SIZE: isTablet ? 20 : isSmallScreen ? 16 : 18,
    HEADER_SUBTITLE_SIZE: isSmallScreen ? 11 : 13,
    MESSAGE_TEXT_SIZE: isSmallScreen ? 14 : 15,
    TIMESTAMP_SIZE: isSmallScreen ? 10 : 11,
    
    // Icon sizing
    HEADER_ICON_SIZE: isSmallScreen ? 20 : 24,
    MESSAGE_ICON_SIZE: isSmallScreen ? 14 : 16,
    
    // Spacing
    NAVBAR_HEIGHT: 60,
    MARGIN_VERTICAL: isSmallScreen ? 2 : 4,
    PADDING: isSmallScreen ? 12 : 16,
    HEADER_HEIGHT: isSmallScreen ? 50 : 60,
    
    // Safe area consideration
    BOTTOM_PADDING: insets.bottom + (isSmallScreen ? 8 : 12),
    TOP_PADDING: insets.top,
  };
};

const ChatBot = ({ route, navigation }) => {
  const initialQuery = route?.params?.query || 'hello';
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sizes = useMemo(() => getResponsiveSizes(insets, dimensions), [insets, dimensions]);
  
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const inputTransformAnim = useRef(new Animated.Value(0)).current;

  // Enhanced Keyboard listeners with proper tracking
  useEffect(() => {
    const keyboardWillShow = (e) => {
      const height = e.endCoordinates?.height || 0;
      setKeyboardHeight(Math.max(0, height));
      setKeyboardVisible(true);
      
      // Animate input up when keyboard shows
      Animated.timing(inputTransformAnim, {
        toValue: -Math.max(0, height - (insets.bottom || 0)),
        duration: 250,
        useNativeDriver: true,
      }).start();
    };

    const keyboardWillHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      
      // Animate input back down
      Animated.timing(inputTransformAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    };

    const showListener = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideListener = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showListener, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideListener, keyboardWillHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, [insets.bottom, inputTransformAnim]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Initialize with query
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSendMessage(initialQuery);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Message animation
  const animateMessage = useCallback(() => {
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
  }, [fadeAnim, slideAnim]);

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
  }, [isTyping, typingAnim]);

  const handleSendMessage = useCallback(async (messageText = input.trim()) => {
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
  }, [input, loading, animateMessage, scrollToBottom]);

  const formatTime = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const handleBackPress = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const MessageBubble = useCallback(({ message, index }) => {
    const isUser = message.sender === 'user';
    const isLatest = index === messages.length - 1;
    
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.botMessageContainer,
          {
            marginVertical: sizes.MARGIN_VERTICAL,
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
          <View style={[
            styles.avatarContainer,
            { marginHorizontal: sizes.AVATAR_SIZE * 0.25 }
          ]}>
            <View style={[
              styles.botAvatar,
              {
                width: sizes.AVATAR_SIZE,
                height: sizes.AVATAR_SIZE,
                borderRadius: sizes.AVATAR_BORDER_RADIUS,
              }
            ]}>
              <Icon 
                name="support-agent" 
                size={sizes.MESSAGE_ICON_SIZE} 
                color="#059669" 
              />
            </View>
          </View>
        )}

        {/* Message Bubble */}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
          { maxWidth: sizes.MESSAGE_MAX_WIDTH }
        ]}>
          <View style={[
            styles.messageContent,
            isUser ? styles.userMessageContent : styles.botMessageContent,
            {
              paddingHorizontal: sizes.INPUT_PADDING_HORIZONTAL,
              paddingVertical: sizes.MESSAGE_PADDING_VERTICAL,
              borderRadius: sizes.MESSAGE_BORDER_RADIUS,
            }
          ]}>
            <Text style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.botMessageText,
              { fontSize: sizes.MESSAGE_TEXT_SIZE }
            ]}>
              {message.text}
            </Text>
          </View>
          
          {/* Timestamp */}
          <Text style={[
            styles.timestamp,
            isUser ? styles.userTimestamp : styles.botTimestamp,
            { fontSize: sizes.TIMESTAMP_SIZE, marginHorizontal: 4 }
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>

        {/* User Avatar */}
        {isUser && (
          <View style={[
            styles.avatarContainer,
            { marginHorizontal: sizes.AVATAR_SIZE * 0.25 }
          ]}>
            <View style={[
              styles.userAvatar,
              {
                width: sizes.AVATAR_SIZE,
                height: sizes.AVATAR_SIZE,
                borderRadius: sizes.AVATAR_BORDER_RADIUS,
              }
            ]}>
              <Icon 
                name="person" 
                size={sizes.MESSAGE_ICON_SIZE} 
                color="#ffffff" 
              />
            </View>
          </View>
        )}
      </Animated.View>
    );
  }, [messages.length, fadeAnim, slideAnim, formatTime, sizes]);

  const TypingIndicator = useCallback(() => (
    <Animated.View 
      style={[
        styles.typingContainer,
        {
          marginVertical: sizes.MARGIN_VERTICAL,
          opacity: typingAnim
        }
      ]}
    >
      <View style={[
        styles.avatarContainer,
        { marginHorizontal: sizes.AVATAR_SIZE * 0.25 }
      ]}>
        <View style={[
          styles.botAvatar,
          {
            width: sizes.AVATAR_SIZE,
            height: sizes.AVATAR_SIZE,
            borderRadius: sizes.AVATAR_BORDER_RADIUS,
          }
        ]}>
          <Icon 
            name="support-agent" 
            size={sizes.MESSAGE_ICON_SIZE} 
            color="#059669" 
          />
        </View>
      </View>
      
      <View style={[
        styles.typingBubble,
        { maxWidth: sizes.MESSAGE_MAX_WIDTH }
      ]}>
        <View style={[
          styles.typingContent,
          {
            paddingHorizontal: sizes.INPUT_PADDING_HORIZONTAL,
            paddingVertical: sizes.MESSAGE_PADDING_VERTICAL,
          }
        ]}>
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
          <Text style={[
            styles.typingText,
            { fontSize: sizes.TIMESTAMP_SIZE }
          ]}>
            Parry is typing...
          </Text>
        </View>
      </View>
    </Animated.View>
  ), [typingAnim, sizes]);

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar backgroundColor="#059669" barStyle="light-content" />
      
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={[
          styles.header,
          { 
            paddingHorizontal: sizes.PADDING,
            paddingVertical: sizes.INPUT_PADDING_VERTICAL,
            minHeight: sizes.HEADER_HEIGHT,
          }
        ]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  width: sizes.HEADER_AVATAR_SIZE,
                  height: sizes.HEADER_AVATAR_SIZE,
                  borderRadius: sizes.HEADER_AVATAR_BORDER_RADIUS,
                }
              ]}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Icon 
                name="arrow-back" 
                size={sizes.HEADER_ICON_SIZE} 
                color="#059669" 
              />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <View style={styles.headerAvatarContainer}>
                <View style={[
                  styles.headerAvatar,
                  {
                    width: sizes.HEADER_AVATAR_SIZE,
                    height: sizes.HEADER_AVATAR_SIZE,
                    borderRadius: sizes.HEADER_AVATAR_BORDER_RADIUS,
                  }
                ]}>
                  <Icon 
                    name="support-agent" 
                    size={sizes.HEADER_ICON_SIZE} 
                    color="#059669" 
                  />
                </View>
                <View style={styles.onlineIndicator} />
              </View>
              
              <View style={styles.headerTextContainer}>
                <Text style={[
                  styles.headerTitle,
                  { fontSize: sizes.HEADER_TITLE_SIZE }
                ]}>
                  Parry
                </Text>
                <Text style={[
                  styles.headerSubtitle,
                  { fontSize: sizes.HEADER_SUBTITLE_SIZE }
                ]}>
                  AI Assistant
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.moreButton,
                {
                  width: sizes.HEADER_AVATAR_SIZE,
                  height: sizes.HEADER_AVATAR_SIZE,
                  borderRadius: sizes.HEADER_AVATAR_BORDER_RADIUS,
                }
              ]} 
              activeOpacity={0.7}
            >
              <Icon 
                name="more-vert" 
                size={sizes.HEADER_ICON_SIZE} 
                color="#64748B" 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.headerBorder} />
        </View>
      </SafeAreaView>

      {/* Messages Container */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScrollView}
          contentContainerStyle={[
            styles.messagesContainer,
            { 
              paddingHorizontal: sizes.PADDING,
              paddingTop: sizes.PADDING,
              paddingBottom: 80,
            }
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              index={index} 
            />
          ))}
          
          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Input Area - Optimized with keyboard animation */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              paddingHorizontal: sizes.PADDING,
              paddingVertical: sizes.INPUT_PADDING_VERTICAL,
              paddingBottom: Math.max(sizes.BOTTOM_PADDING, 12),
              transform: [
                {
                  translateY: inputTransformAnim,
                },
              ],
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <View style={[
              styles.textInputContainer,
              {
                borderRadius: sizes.INPUT_BORDER_RADIUS,
                paddingHorizontal: sizes.INPUT_PADDING_HORIZONTAL,
                paddingVertical: Math.max(sizes.INPUT_PADDING_VERTICAL - 2, 4),
                minHeight: sizes.INPUT_CONTAINER_HEIGHT,
              }
            ]}>
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: sizes.MESSAGE_TEXT_SIZE }
                ]}
                value={input}
                onChangeText={setInput}
                placeholder="Type your message..."
                placeholderTextColor="#94A3B8"
                multiline
                maxHeight={sizes.INPUT_CONTAINER_HEIGHT * 2.5}
                onSubmitEditing={() => handleSendMessage()}
                editable={!loading}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  width: sizes.INPUT_CONTAINER_HEIGHT,
                  height: sizes.INPUT_CONTAINER_HEIGHT,
                  borderRadius: sizes.INPUT_CONTAINER_HEIGHT / 2,
                  marginLeft: 10,
                },
                (!input.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              activeOpacity={0.7}
            >
              <View style={[
                styles.sendButtonContent,
                {
                  width: sizes.INPUT_CONTAINER_HEIGHT,
                  height: sizes.INPUT_CONTAINER_HEIGHT,
                  borderRadius: sizes.INPUT_CONTAINER_HEIGHT / 2,
                },
                (!input.trim() || loading) && styles.sendButtonContentDisabled,
              ]}>
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Icon 
                    name="send" 
                    size={sizes.MESSAGE_ICON_SIZE} 
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
  },
  
  // Header Styles
  headerSafeArea: {
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
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
    gap: 12,
  },
  backButton: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  moreButton: {
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
    backgroundColor: '#F8FAFC',
  },
  messagesScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesContainer: {
    flexGrow: 1,
  },

  // Message Styles
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  
  avatarContainer: {
    flexShrink: 0,
  },
  botAvatar: {
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  userAvatar: {
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },

  messageBubble: {
    marginBottom: 4,
  },
  
  userBubble: {
    alignSelf: 'flex-end',
  },
  userMessageContent: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  userMessageText: {
    color: '#ffffff',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  botBubble: {
    alignSelf: 'flex-start',
  },
  botMessageContent: {
    backgroundColor: '#ffffff',
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
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  messageContent: {
    marginBottom: 2,
  },

  timestamp: {
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
  },
  typingBubble: {
    backgroundColor: '#ffffff',
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
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Input Styles
  inputContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
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
    gap: 8,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  textInput: {
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlignVertical: 'center',
    minHeight: 24,
  },
  sendButton: {
    marginBottom: 0,
  },
  sendButtonContent: {
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