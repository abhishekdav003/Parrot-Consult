// ExpertProfileScreen.jsx - Production-Ready Optimized Version
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UnifiedBookingModal from './UnifiedBookingModal';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';
import { wp, hp, rfs, getSpacing } from '../utils/ResponsiveUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate dynamic navbar height (consistent with HomeScreen)
const getNavbarHeight = (insets) => {
  const isSmallScreen = SCREEN_HEIGHT < 700;
  const isTablet = SCREEN_WIDTH > 768;
  const BASE_HEIGHT = isTablet ? 80 : isSmallScreen ? 65 : 70;
  return BASE_HEIGHT + insets.bottom;
};

// Calculate header height for proper scrollview padding
const getHeaderHeight = (insets) => {
  const isSmallScreen = SCREEN_HEIGHT < 700;
  const baseHeight = isSmallScreen ? 56 : 64;
  return baseHeight + insets.top;
};

const ExpertProfileScreen = ({ route, navigation }) => {
  const { expert } = route.params;
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const spacing = getSpacing();
  
  // State management
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [imageError, setImageError] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Calculate dynamic paddings for proper spacing
  const { topPadding, bottomPadding, actionButtonHeight } = useMemo(() => {
    const navbarHeight = getNavbarHeight(insets);
    const headerHeight = getHeaderHeight(insets);
    
    // Action button container height with proper margins
    const buttonHeight = hp(50); // Minimum button height
    const buttonPadding = hp(12) * 2; // Top + bottom padding
    const actionMargin = hp(16); // Margin from bottom navbar
    const safeArea = insets.bottom;
    
    const actionHeight = buttonHeight + buttonPadding + actionMargin + safeArea;
    
    return {
      topPadding: hp(16), // Increased space below header
      bottomPadding: actionHeight + hp(24), // Extra space above action buttons
      actionButtonHeight: actionHeight,
    };
  }, [insets]);

  // Safe data extraction with memoization
  const profile = useMemo(() => 
    expert?.consultantRequest?.consultantProfile || expert?.consultantProfile || {},
    [expert]
  );

  useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#FFFFFF', true);
      StatusBar.setTranslucent(false);
    }
    
    return () => {
      StatusBar.setBarStyle('dark-content', true);
    };
  }, []);

  // Optimized image handler with fallback
  const getImageSource = useCallback(() => {
    if (imageError || !expert?.profileImage || 
        expert.profileImage === '' || 
        expert.profileImage.includes('amar-jha.dev') || 
        expert.profileImage.includes('MyImg-BjWvYtsb.svg')) {
      return { 
        uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(expert?.fullName || 'Expert')}&size=400&background=059669&color=FFFFFF&bold=true&format=png`
      };
    }
    
    if (expert.profileImage.startsWith('http')) {
      return { uri: expert.profileImage };
    }
    
    if (expert.profileImage.includes('cloudinary')) {
      return { uri: expert.profileImage };
    }
    
    if (expert.profileImage.startsWith('/uploads/')) {
      const baseUrl = ApiService.baseURL?.replace('/api/v1', '') || '';
      return { uri: `${baseUrl}${expert.profileImage}` };
    }
    
    return { 
      uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(expert?.fullName || 'Expert')}&size=400&background=059669&color=FFFFFF&bold=true&format=png`
    };
  }, [expert?.profileImage, expert?.fullName, imageError]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Optimized chat handler with error handling
  const handleMessage = useCallback(async () => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Login Required',
        'Please login to start a conversation',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    if (user._id === expert._id) {
      Alert.alert('Info', "You cannot message yourself");
      return;
    }

    if (isStartingChat) return;

    try {
      setIsStartingChat(true);
      const chatHistoryResult = await ApiService.getChatHistory(user._id, expert._id, 'null');
      
      if (chatHistoryResult.success) {
        const chatData = chatHistoryResult.data;
        const existingChatId = chatData.chat;
        
        navigation.navigate('ChatScreen', {
          chatId: existingChatId || 'new',
          otherId: expert._id,
          otherName: expert.fullName,
          otherProfileImage: expert.profileImage,
          isNewChat: !existingChatId || existingChatId === 'null'
        });
      } else {
        navigation.navigate('ChatScreen', {
          chatId: 'new',
          otherId: expert._id,
          otherName: expert.fullName,
          otherProfileImage: expert.profileImage,
          isNewChat: true
        });
      }
    } catch (error) {
      console.error('[EXPERT_PROFILE] Error starting chat:', error);
      Alert.alert('Chat Error', 'Unable to start chat. Please try again.');
    } finally {
      setIsStartingChat(false);
    }
  }, [isAuthenticated, user, expert, navigation, isStartingChat]);

  // Optimized booking handler
  const handleBookNow = useCallback(() => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Login Required',
        'Please login to book a session',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    if (user._id === expert._id) {
      Alert.alert('Info', "You cannot book a session with yourself");
      return;
    }

    setShowBookingModal(true);
  }, [isAuthenticated, user, expert, navigation]);

  // Memoized computed values for better performance
  const experience = useMemo(() => {
    if (profile.yearsOfExperience) return profile.yearsOfExperience;
    if (profile.experience) return profile.experience;
    if (profile.graduationYear) {
      const years = new Date().getFullYear() - profile.graduationYear;
      return years > 0 ? years : null;
    }
    return null;
  }, [profile]);

  const languages = useMemo(() => {
    if (profile.languages && Array.isArray(profile.languages) && profile.languages.length > 0) {
      return profile.languages.filter(lang => lang && lang.trim());
    }
    return [];
  }, [profile.languages]);

  const availability = useMemo(() => {
    if (profile.days && Array.isArray(profile.days) && profile.days.length > 0) {
      return profile.days.filter(day => day && day.trim()).join(', ');
    }
    if (profile.daysPerWeek) {
      return `${profile.daysPerWeek} days/week`;
    }
    return null;
  }, [profile.days, profile.daysPerWeek]);

  const sessionFee = useMemo(() => {
    const fee = profile.sessionFee || profile.rate;
    return fee ? parseInt(fee) : null;
  }, [profile.sessionFee, profile.rate]);

  const skills = useMemo(() => {
    if (profile.keySkills && Array.isArray(profile.keySkills) && profile.keySkills.length > 0) {
      return profile.keySkills.filter(skill => skill && skill.trim());
    }
    return [];
  }, [profile.keySkills]);

  const specialized = useMemo(() => {
    if (profile.Specialized && Array.isArray(profile.Specialized) && profile.Specialized.length > 0) {
      return profile.Specialized.filter(area => area && area.trim());
    }
    return [];
  }, [profile.Specialized]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Fixed Header with SafeAreaView */}
      
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.headerBtn} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={rfs(24)} color="#1E293B" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Expert Profile</Text>
            
            <View style={styles.headerBtn} />
          </View>
        </View>
      </SafeAreaView>
      

      {/* Scrollable Content */}
      <ScrollView 
        contentContainerStyle={{
          paddingTop: hp(8),
          paddingBottom: hp(160),
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.imageWrapper}>
              <Image
                source={getImageSource()}
                style={styles.profileImage}
                onError={handleImageError}
              />
              {expert?.aadharVerified && (
                <View style={styles.verifiedBadge}>
                  <Icon name="verified" size={rfs(20)} color="#10B981" />
                </View>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.expertName} numberOfLines={2}>
                {expert?.fullName || 'Expert Name'}
              </Text>
              
              {profile.category && (
                <View style={styles.categoryContainer}>
                  <Icon name="work-outline" size={rfs(16)} color="#059669" />
                  <Text style={styles.categoryText}>{profile.category}</Text>
                </View>
              )}
              
              {profile.fieldOfStudy && profile.category !== profile.fieldOfStudy && (
                <View style={styles.fieldContainer}>
                  <Icon name="school" size={rfs(14)} color="#64748B" />
                  <Text style={styles.fieldText}>{profile.fieldOfStudy}</Text>
                </View>
              )}

              {expert?.location && (
                <View style={styles.locationContainer}>
                  <Icon name="location-on" size={rfs(14)} color="#64748B" />
                  <Text style={styles.locationText} numberOfLines={1}>{expert.location}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Stats Row */}
          {(experience || sessionFee || profile.daysPerWeek) && (
            <View style={styles.statsRow}>
              {experience && (
                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <Icon name="workspace-premium" size={rfs(20)} color="#059669" />
                  </View>
                  <Text style={styles.statValue}>{experience}+</Text>
                  <Text style={styles.statLabel}>Years</Text>
                </View>
              )}
              
              {sessionFee && (
                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <Icon name="payments" size={rfs(20)} color="#059669" />
                  </View>
                  <Text style={styles.statValue}>₹{sessionFee}</Text>
                  <Text style={styles.statLabel}>Per Session</Text>
                </View>
              )}

              {profile.daysPerWeek && (
                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <Icon name="event-available" size={rfs(20)} color="#059669" />
                  </View>
                  <Text style={styles.statValue}>{profile.daysPerWeek}</Text>
                  <Text style={styles.statLabel}>Days/Week</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* About Section */}
        {profile.shortBio && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Icon name="person" size={rfs(18)} color="#059669" />
              </View>
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.aboutText}>{profile.shortBio}</Text>
          </View>
        )}

        {/* Optimized Skills Section - Thin Pills */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Icon name="psychology" size={rfs(18)} color="#059669" />
              </View>
              <Text style={styles.sectionTitle}>Key Skills</Text>
            </View>
            <View style={styles.skillsContainer}>
              {skills.map((skill, index) => (
                <View key={`skill-${index}`} style={styles.skillPill}>
                  <Icon name="check-circle" size={rfs(12)} color="#059669" />
                  <Text style={styles.skillText} numberOfLines={1}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Specializations - Thin Pills */}
        {specialized.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Icon name="stars" size={rfs(18)} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>Specializations</Text>
            </View>
            <View style={styles.skillsContainer}>
              {specialized.map((area, index) => (
                <View key={`spec-${index}`} style={styles.specPill}>
                  <Icon name="star" size={rfs(12)} color="#F59E0B" />
                  <Text style={styles.specText} numberOfLines={1}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Session Details */}
        {(sessionFee || availability || languages.length > 0 || profile.availableTimePerDay) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Icon name="schedule" size={rfs(18)} color="#059669" />
              </View>
              <Text style={styles.sectionTitle}>Session Details</Text>
            </View>
            
            {sessionFee && (
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Icon name="attach-money" size={rfs(18)} color="#64748B" />
                  <Text style={styles.infoLabel}>Fee</Text>
                </View>
                <Text style={styles.infoValue}>₹{sessionFee}/30 min</Text>
              </View>
            )}

            {availability && (
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Icon name="calendar-today" size={rfs(18)} color="#64748B" />
                  <Text style={styles.infoLabel}>Available</Text>
                </View>
                <Text style={styles.infoValue} numberOfLines={2}>{availability}</Text>
              </View>
            )}

            {profile.availableTimePerDay && (
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Icon name="access-time" size={rfs(18)} color="#64748B" />
                  <Text style={styles.infoLabel}>Hours/Day</Text>
                </View>
                <Text style={styles.infoValue}>{profile.availableTimePerDay}</Text>
              </View>
            )}

            {languages.length > 0 && (
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Icon name="language" size={rfs(18)} color="#64748B" />
                  <Text style={styles.infoLabel}>Languages</Text>
                </View>
                <View style={styles.languagesWrap}>
                  {languages.map((lang, index) => (
                    <View key={`lang-${index}`} style={styles.langTag}>
                      <Text style={styles.langText}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Education */}
        {(profile.qualification || profile.university) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Icon name="school" size={rfs(18)} color="#059669" />
              </View>
              <Text style={styles.sectionTitle}>Education</Text>
            </View>
            
            <View style={styles.educationBox}>
              {profile.qualification && (
                <Text style={styles.degreeText}>{profile.qualification}</Text>
              )}
              {profile.fieldOfStudy && (
                <Text style={styles.fieldStudyText}>in {profile.fieldOfStudy}</Text>
              )}
              {profile.university && (
                <View style={styles.uniRow}>
                  <Icon name="account-balance" size={rfs(14)} color="#64748B" />
                  <Text style={styles.uniText}>{profile.university}</Text>
                </View>
              )}
              {profile.graduationYear && (
                <View style={styles.yearRow}>
                  <Icon name="event" size={rfs(14)} color="#94A3B8" />
                  <Text style={styles.yearText}>Graduated {profile.graduationYear}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Contact */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Icon name="contact-phone" size={rfs(18)} color="#059669" />
            </View>
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>
          
          {expert?.phone && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Icon name="phone" size={rfs(18)} color="#64748B" />
                <Text style={styles.infoLabel}>Phone</Text>
              </View>
              <Text style={styles.infoValue}>+91 {expert.phone}</Text>
            </View>
          )}

          {expert?.email && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Icon name="email" size={rfs(18)} color="#64748B" />
                <Text style={styles.infoLabel}>Email</Text>
              </View>
              <Text style={styles.infoValue} numberOfLines={1}>{expert.email}</Text>
            </View>
          )}

          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <View style={styles.infoLeft}>
              <Icon 
                name={expert?.aadharVerified ? "verified" : "pending"} 
                size={rfs(18)} 
                color={expert?.aadharVerified ? "#10B981" : "#F59E0B"} 
              />
              <Text style={styles.infoLabel}>Status</Text>
            </View>
            <View style={[
              styles.statusTag,
              expert?.aadharVerified ? styles.verifiedTag : styles.pendingTag
            ]}>
              <Text style={[
                styles.statusTagText,
                expert?.aadharVerified ? styles.verifiedTagText : styles.pendingTagText
              ]}>
                {expert?.aadharVerified ? "Verified" : "Pending"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Action Buttons with proper safe area */}
      <SafeAreaView style={styles.actionContainer} edges={['bottom']}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.actionButton,
              styles.messageButton,
              isStartingChat && styles.buttonDisabled
            ]}
            onPress={handleMessage}
            activeOpacity={0.8}
            disabled={isStartingChat}
          >
            {isStartingChat ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <>
                <Icon name="chat-bubble-outline" size={rfs(20)} color="#059669" />
                <Text style={styles.messageButtonText}>Message</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.bookButton]}
            onPress={handleBookNow}
            activeOpacity={0.8}
          >
            <Icon name="event" size={rfs(20)} color="#FFFFFF" />
            <Text style={styles.bookButtonText}>Book Session</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Booking Modal */}
      {showBookingModal && (
        <UnifiedBookingModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          expert={expert}
          navigation={navigation}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSafeArea: {
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    position: 'relative',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    paddingBottom: hp(1), 
    paddingTop: hp(16),
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(16),
    paddingVertical: hp(12),
  },
  headerBtn: {
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: rfs(18),
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginHorizontal: wp(12),
  },
  scrollView: {
    flex: 1,
  },


  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: wp(16),
    borderRadius: wp(20),
    padding: wp(20),
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: hp(12),
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: hp(20),
  },
  imageWrapper: {
    position: 'relative',
    marginRight: wp(16),
  },
  profileImage: {
    width: wp(90),
    height: wp(90),
    borderRadius: wp(45),
    backgroundColor: '#F1F5F9',
    borderWidth: 3,
    borderColor: '#F0FDF4',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  expertName: {
    fontSize: rfs(22),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: hp(6),
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(4),
  },
  categoryText: {
    fontSize: rfs(14),
    fontWeight: '600',
    color: '#059669',
    marginLeft: wp(6),
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(4),
  },
  fieldText: {
    fontSize: rfs(13),
    color: '#64748B',
    marginLeft: wp(6),
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: rfs(12),
    color: '#94A3B8',
    marginLeft: wp(6),
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: wp(12),
    padding: wp(12),
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(6),
  },
  statValue: {
    fontSize: rfs(16),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: hp(2),
  },
  statLabel: {
    fontSize: rfs(11),
    color: '#64748B',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: wp(16),
    marginBottom: hp(12),
    borderRadius: wp(16),
    padding: wp(18),
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(14),
  },
  sectionIconBox: {
    width: wp(32),
    height: wp(32),
    borderRadius: wp(8),
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(10),
  },
  sectionTitle: {
    fontSize: rfs(16),
    fontWeight: '600',
    color: '#1E293B',
  },
  aboutText: {
    fontSize: rfs(14),
    color: '#475569',
    lineHeight: rfs(22),
  },
  // Optimized Thin Pills for Skills
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(8),
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: wp(20),
    paddingHorizontal: wp(12),
    paddingVertical: hp(6),
    gap: wp(6),
  },
  skillText: {
    fontSize: rfs(12),
    color: '#059669',
    fontWeight: '600',
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: wp(20),
    paddingHorizontal: wp(12),
    paddingVertical: hp(6),
    gap: wp(6),
  },
  specText: {
    fontSize: rfs(12),
    color: '#D97706',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },


  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: wp(12),
  },
  infoLabel: {
    fontSize: rfs(14),
    color: '#1E293B',
    fontWeight: '500',
    marginLeft: wp(8),
  },
  infoValue: {
    fontSize: rfs(13),
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '50%',
  },
  languagesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(6),
    maxWidth: '50%',
    justifyContent: 'flex-end',
  },
  langTag: {
    backgroundColor: '#EFF6FF',
    borderRadius: wp(12),
    paddingHorizontal: wp(10),
    paddingVertical: hp(4),
  },
  langText: {
    fontSize: rfs(11),
    color: '#2563EB',
    fontWeight: '500',
  },
  statusTag: {
    paddingHorizontal: wp(12),
    paddingVertical: hp(5),
    borderRadius: wp(12),
  },
  verifiedTag: {
    backgroundColor: '#D1FAE5',
  },
  pendingTag: {
    backgroundColor: '#FEF3C7',
  },
  statusTagText: {
    fontSize: rfs(12),
    fontWeight: '600',
  },
  verifiedTagText: {
    color: '#059669',
  },
  pendingTagText: {
    color: '#D97706',
  },
  educationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: wp(12),
    padding: wp(14),
    gap: hp(6),
  },
  degreeText: {
    fontSize: rfs(15),
    fontWeight: '600',
    color: '#1E293B',
  },
  fieldStudyText: {
    fontSize: rfs(13),
    color: '#059669',
    fontWeight: '500',
  },
  uniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(6),
    marginTop: hp(2),
  },
  uniText: {
    fontSize: rfs(12),
    color: '#64748B',
    flex: 1,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(6),
  },
  yearText: {
    fontSize: rfs(11),
    color: '#94A3B8',
  },
  actionContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#FFFFFF',
  paddingBottom: hp(24), // ⬅️ IMPORTANT
  paddingTop: hp(12),
  borderTopWidth: 1,
  borderTopColor: '#E2E8F0',
  elevation: 12,
},

  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: wp(16),
    paddingTop: hp(16), // Increased top padding
    paddingBottom: hp(8), // Bottom padding before safe area
    gap: wp(12),
    marginBottom: hp(8), // Extra margin from bottom
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(14),
    paddingVertical: hp(14),
    gap: wp(8),
    minHeight: hp(50),
  },
  messageButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#059669',
  },
  messageButtonText: {
    color: '#059669',
    fontSize: rfs(15),
    fontWeight: '700',
  },
  bookButton: {
    backgroundColor: '#059669',
    flex: 1.2,
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: rfs(15),
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
});

export default ExpertProfileScreen;