import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import UnifiedBookingModal from './UnifiedBookingModal';

const { width: screenWidth } = Dimensions.get('window');

const ExpertProfileScreen = ({ route, navigation }) => {
  const { expert } = route.params;
  const profile = expert.consultantRequest?.consultantProfile || {};
  const kycInfo = expert.kycVerify || {};
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    return () => StatusBar.setBarStyle('default', true);
  }, []);

  const getImageSource = () => {
    if (!expert.profileImage || 
        expert.profileImage === '' || 
        expert.profileImage.includes('amar-jha.dev') || 
        expert.profileImage.includes('MyImg-BjWvYtsb.svg')) {
      return { 
        uri: 'https://via.placeholder.com/150x150/D1FAE5/059669?text=' + 
             encodeURIComponent(expert.fullName?.charAt(0) || 'E') 
      };
    }
    
    if (expert.profileImage.startsWith('http')) {
      return { uri: expert.profileImage };
    }
    
    if (expert.profileImage.includes('cloudinary')) {
      return { uri: expert.profileImage };
    }
    
    if (expert.profileImage.startsWith('/uploads/')) {
      return { uri: `http://192.168.0.177:8011${expert.profileImage}` };
    }
    
    return { 
      uri: 'https://via.placeholder.com/150x150/D1FAE5/059669?text=' + 
           encodeURIComponent(expert.fullName?.charAt(0) || 'E') 
    };
  };

  const handleMessage = () => {
    Alert.alert(
      'Start Conversation',
      `Send a message to ${expert.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Message', 
          onPress: () => {
            console.log('Starting conversation with:', expert.fullName);
            // Navigate to chat screen when implemented
          }
        }
      ]
    );
  };

  const handleBookNow = () => {
    console.log('Opening booking modal for expert:', expert.fullName);
    setShowBookingModal(true);
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
  };

  const handleScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    setScrollY(currentScrollY);
  };

  const handleBackPress = () => {
    // Navigate back to Home instead of previous screen
    navigation.navigate('Home');
  };

  // Calculate years of experience or default
  const experience = profile.yearsOfExperience || 
                    (profile.graduationYear ? new Date().getFullYear() - profile.graduationYear : 3);

  // Format languages
  const languages = profile.languages && Array.isArray(profile.languages) && profile.languages.length > 0
    ? profile.languages.join(', ')
    : 'English';

  // Format availability days
  const availability = profile.days && Array.isArray(profile.days) && profile.days.length > 0
    ? profile.days.join(', ')
    : (profile.daysPerWeek ? `${profile.daysPerWeek} days/week` : 'Flexible');

  // Session fee formatting
  const sessionFee = profile.sessionFee ? `₹${profile.sessionFee.toLocaleString()}` : 'Contact for pricing';

  const renderStars = (rating = 4.8) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Icon key={i} name="star" size={16} color="#FBBF24" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Icon key="half" name="star-half" size={16} color="#FBBF24" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Icon key={`empty-${i}`} name="star-border" size={16} color="#E2E8F0" />
      );
    }
    
    return stars;
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#059669" barStyle="light-content" />
      
      {/* Fixed Header with proper safe area handling */}
      <View style={styles.headerContainer}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={[styles.header, { opacity: Math.max(0.95, Math.min(scrollY / 100, 1)) }]}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { opacity: scrollY > 100 ? 1 : 0 }]}>
              {expert.fullName}
            </Text>
            
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => console.log('Share profile')}
              activeOpacity={0.7}
            >
              <Icon name="share" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={getImageSource()}
              style={styles.profileImage}
              onError={(error) => {
                console.log('Profile image load error:', error.nativeEvent.error);
              }}
            />
            
            {/* Online Status */}
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>

            {/* Verification Badges */}
            <View style={styles.badgeContainer}>
              {expert.aadharVerified && (
                <View style={styles.verificationBadge}>
                  <Icon name="verified-user" size={16} color="#10B981" />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              )}
              {expert.role === 'consultant' && (
                <View style={[styles.verificationBadge, styles.expertBadge]}>
                  <Icon name="star" size={16} color="#FBBF24" />
                  <Text style={styles.badgeText}>Expert</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.expertName}>{expert.fullName}</Text>
            
            {profile.category && (
              <Text style={styles.expertSpecialty}>{profile.category}</Text>
            )}
            
            {profile.fieldOfStudy && profile.category !== profile.fieldOfStudy && (
              <Text style={styles.expertField}>{profile.fieldOfStudy}</Text>
            )}

            {/* Quick Stats - Only show available data */}
            {experience && (
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{experience}</Text>
                  <Text style={styles.statLabel}>Years Exp.</Text>
                </View>
                
                {profile.sessionFee && (
                  <>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>₹{profile.sessionFee}</Text>
                      <Text style={styles.statLabel}>Per Session</Text>
                    </View>
                  </>
                )}

                {profile.daysPerWeek && (
                  <>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{profile.daysPerWeek}</Text>
                      <Text style={styles.statLabel}>Days/Week</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Session Info Card */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Icon name="video-call" size={24} color="#059669" />
            <Text style={styles.sessionTitle}>Session Information</Text>
          </View>
          
          <View style={styles.sessionDetails}>
            <View style={styles.sessionRow}>
              <View style={styles.sessionItem}>
                <Icon name="attach-money" size={20} color="#059669" />
                <Text style={styles.sessionLabel}>Fee</Text>
              </View>
              <Text style={styles.sessionValue}>{sessionFee}/30min</Text>
            </View>

            <View style={styles.sessionRow}>
              <View style={styles.sessionItem}>
                <Icon name="schedule" size={20} color="#059669" />
                <Text style={styles.sessionLabel}>Available</Text>
              </View>
              <Text style={styles.sessionValue}>{availability}</Text>
            </View>

            {profile.availableTimePerDay && (
              <View style={styles.sessionRow}>
                <View style={styles.sessionItem}>
                  <Icon name="access-time" size={20} color="#059669" />
                  <Text style={styles.sessionLabel}>Hours/Day</Text>
                </View>
                <Text style={styles.sessionValue}>{profile.availableTimePerDay}</Text>
              </View>
            )}

            <View style={styles.sessionRow}>
              <View style={styles.sessionItem}>
                <Icon name="language" size={20} color="#059669" />
                <Text style={styles.sessionLabel}>Languages</Text>
              </View>
              <Text style={styles.sessionValue}>{languages}</Text>
            </View>

            {expert.location && (
              <View style={styles.sessionRow}>
                <View style={styles.sessionItem}>
                  <Icon name="location-on" size={20} color="#059669" />
                  <Text style={styles.sessionLabel}>Location</Text>
                </View>
                <Text style={styles.sessionValue}>{expert.location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        {profile.shortBio && (
          <View style={styles.aboutCard}>
            <View style={styles.cardHeader}>
              <Icon name="person" size={24} color="#059669" />
              <Text style={styles.cardTitle}>About</Text>
            </View>
            <Text style={styles.aboutText}>{profile.shortBio}</Text>
          </View>
        )}

        {/* Education & Qualification */}
        {(profile.qualification || profile.university) && (
          <View style={styles.educationCard}>
            <View style={styles.cardHeader}>
              <Icon name="school" size={24} color="#059669" />
              <Text style={styles.cardTitle}>Education</Text>
            </View>
            
            {profile.qualification && (
              <View style={styles.educationItem}>
                <View style={styles.educationDot} />
                <View style={styles.educationContent}>
                  <Text style={styles.educationDegree}>{profile.qualification}</Text>
                  {profile.fieldOfStudy && (
                    <Text style={styles.educationField}>in {profile.fieldOfStudy}</Text>
                  )}
                  {profile.university && (
                    <Text style={styles.educationUniversity}>{profile.university}</Text>
                  )}
                  {profile.graduationYear && (
                    <Text style={styles.educationYear}>Graduated: {profile.graduationYear}</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Skills */}
        {profile.keySkills && Array.isArray(profile.keySkills) && profile.keySkills.length > 0 && (
          <View style={styles.skillsCard}>
            <View style={styles.cardHeader}>
              <Icon name="psychology" size={24} color="#059669" />
              <Text style={styles.cardTitle}>Key Skills</Text>
            </View>
            <View style={styles.skillsContainer}>
              {profile.keySkills.map((skill, index) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Specialized Areas */}
        {profile.Specialized && Array.isArray(profile.Specialized) && profile.Specialized.length > 0 && (
          <View style={styles.skillsCard}>
            <View style={styles.cardHeader}>
              <Icon name="stars" size={24} color="#059669" />
              <Text style={styles.cardTitle}>Specialized Areas</Text>
            </View>
            <View style={styles.skillsContainer}>
              {profile.Specialized.map((area, index) => (
                <View key={index} style={[styles.skillChip, styles.specializedChip]}>
                  <Text style={styles.specializedText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.contactCard}>
          <View style={styles.cardHeader}>
            <Icon name="contact-phone" size={24} color="#059669" />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.contactItem}>
            <Icon name="phone" size={20} color="#64748B" />
            <Text style={styles.contactText}>+91 {expert.phone}</Text>
          </View>

          {expert.email && (
            <View style={styles.contactItem}>
              <Icon name="email" size={20} color="#64748B" />
              <Text style={styles.contactText}>{expert.email}</Text>
            </View>
          )}

          {/* Verification Status */}
          <View style={styles.verificationStatus}>
            <View style={styles.verificationItem}>
              <Icon 
                name={expert.aadharVerified ? "verified" : "pending"} 
                size={16} 
                color={expert.aadharVerified ? "#10B981" : "#F59E0B"} 
              />
              <Text style={[
                styles.verificationText,
                { color: expert.aadharVerified ? "#10B981" : "#F59E0B" }
              ]}>
                {expert.aadharVerified ? "Identity Verified" : "Verification Pending"}
              </Text>
            </View>
          </View>
        </View>

        {/* Availability Status - Only show if we have real data */}
        {(availability !== 'Flexible' || profile.availableTimePerDay) && (
          <View style={styles.availabilityCard}>
            <View style={styles.availabilityHeader}>
              <Icon name="schedule" size={24} color="#059669" />
              <Text style={styles.cardTitle}>Availability</Text>
              <View style={styles.availableNow}>
                <View style={styles.availableDot} />
                <Text style={styles.availableText}>Available</Text>
              </View>
            </View>
            
            {profile.availableTimePerDay && (
              <Text style={styles.availabilityDescription}>
                Available {profile.availableTimePerDay} daily
              </Text>
            )}
          </View>
        )}

        {/* Bottom Spacing for action buttons */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={handleMessage}
          activeOpacity={0.8}
        >
          <Icon name="chat-bubble-outline" size={20} color="#059669" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={handleBookNow}
          activeOpacity={0.8}
        >
          <Icon name="event" size={20} color="#ffffff" />
          <Text style={styles.bookButtonText}>Book Session</Text>
        </TouchableOpacity>
      </View>

      {/* Unified Booking Modal */}
      <UnifiedBookingModal
        visible={showBookingModal}
        onClose={handleCloseBookingModal}
        expert={expert}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header Container - Fixed positioning
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#059669',
  },
  headerSafeArea: {
    backgroundColor: '#059669',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#059669',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 56, // Ensure minimum height for proper button alignment
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll Container - Adjusted for fixed header
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80, // Account for header + status bar
  },

  // Hero Section
  heroSection: {
    backgroundColor: '#ffffff',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    borderWidth: 4,
    borderColor: '#D1FAE5',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: -10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    flexDirection: 'column',
    gap: 4,
  },
  verificationBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  expertBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  badgeText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 2,
  },

  // Profile Info
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  expertName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.3,
  },
  expertSpecialty: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  expertField: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },

  // Card Styles
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },

  // Session Card
  sessionCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  sessionDetails: {
    gap: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionLabel: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    marginLeft: 8,
  },
  sessionValue: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },

  // About Card
  aboutCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aboutText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Education Card
  educationCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  educationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginTop: 6,
    marginRight: 12,
  },
  educationContent: {
    flex: 1,
  },
  educationDegree: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  educationField: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 4,
  },
  educationUniversity: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  educationYear: {
    fontSize: 13,
    color: '#94A3B8',
  },

  // Skills Card
  skillsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: '#F0FDF4',
    borderColor: '#D1FAE5',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  specializedChip: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  specializedText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '500',
  },

  // Contact Card
  contactCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  verificationStatus: {
    marginTop: 8,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },

  // Availability Card
  availabilityCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  availableNow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  availableText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  availabilityDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 100, // Space for action buttons without navbar interference
  },

  // Fixed Action Container - Now positioned at bottom without navbar conflict
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for safe area on iOS
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  messageButtonText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bookButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default ExpertProfileScreen;