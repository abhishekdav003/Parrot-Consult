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
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import ApiService from '../services/ApiService';

const { width, height } = Dimensions.get('window');

const ChatBot = ({ route, navigation }) => {
  const initialQuery = route?.params?.query || 'hello'; // Default to 'hello' if no query
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'bot', 
      text: "Hi! I'm Parry 🦜 — Ask me anything about Parrot Consult!", 
      timestamp: new Date() 
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Initialize with query - always send 'hello' when component mounts for Search tab
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSendMessage(initialQuery);
    }, 1000); // Delay to let component mount properly
    
    return () => clearTimeout(timer);
  }, []); // Empty dependency to run only once on mount

  // Animation for new messages
  const animateMessage = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
          text: 'Sorry, I encountered an issue. Please try again!',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('ChatBot error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Oops! Something went wrong. Please check your connection.',
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

  const MessageBubble = ({ message, index }) => {
    const isUser = message.sender === 'user';
    
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.botMessageContainer,
          {
            opacity: index === messages.length - 1 ? fadeAnim : 1,
            transform: [
              {
                translateY: index === messages.length - 1 ? slideAnim : 0,
              },
            ],
          },
        ]}
      >
        {/* Avatar */}
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#10B981', '#059669', '#047857']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>🦜</Text>
            </LinearGradient>
          </View>
        )}

        {/* Message Bubble */}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
        ]}>
          {isUser ? (
            <LinearGradient
              colors={['#059669', '#047857', '#065F46']}
              style={styles.userBubbleGradient}
            >
              <Text style={styles.userMessageText}>{message.text}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.botBubbleContent}>
              <Text style={styles.botMessageText}>{message.text}</Text>
            </View>
          )}
          
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
            <LinearGradient
              colors={['#059669', '#047857', '#065F46']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>👤</Text>
            </LinearGradient>
          </View>
        )}
      </Animated.View>
    );
  };

  const TypingIndicator = () => (
    <View style={styles.typingContainer}>
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={['#10B981', '#059669', '#047857']}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>🦜</Text>
        </LinearGradient>
      </View>
      
      <View style={styles.typingBubble}>
        <View style={styles.typingDotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.typingDot,
                {
                  opacity: fadeAnim,
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.typingText}>Parry is thinking...</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#059669', '#047857']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>🦜</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Parry</Text>
              <Text style={styles.headerSubtitle}>AI Assistant</Text>
            </View>
          </View>
          <View style={styles.onlineIndicator} />
        </View>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScrollView}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((message, index) => (
            <MessageBubble key={message.id} message={message} index={index} />
          ))}
          
          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Type your message here..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxHeight={100}
              onSubmitEditing={() => handleSendMessage()}
              editable={!loading}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!input.trim() || loading}
            >
              <LinearGradient
                colors={
                  !input.trim() || loading
                    ? ['#9CA3AF', '#6B7280']
                    : ['#10B981', '#059669', '#047857']
                }
                style={styles.sendButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.sendButtonText}>➤</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: 'white',
  },

  // Chat Container
  chatContainer: {
    flex: 1,
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },

  // Message Styles
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
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
  avatarGradient: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 16,
  },

  messageBubble: {
    maxWidth: width * 0.75,
    marginBottom: 4,
  },
  
  userBubble: {
    alignSelf: 'flex-end',
  },
  userBubbleGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userMessageText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
  },
  
  botBubble: {
    alignSelf: 'flex-start',
  },
  botBubbleContent: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  botMessageText: {
    color: '#374151',
    fontSize: 16,
    lineHeight: 22,
  },

  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  userTimestamp: {
    color: '#059669',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#9CA3AF',
    textAlign: 'left',
  },

  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  typingBubble: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Input Styles
  inputContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 50,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    maxHeight: 100,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginLeft: 8,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ChatBot;