// Updated ExpertsSection.jsx - Fixed Book Now button to properly call UnifiedBookingModal
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Dimensions,
  Platform,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../../services/ApiService';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_SPACING = 16;

const ExpertsSection = ({ onBookNow }) => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  const scaleAnims = useRef({}).current;

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ApiService.getAllUsers();
      
      if (result.success) {
        const approvedExperts = result.data.filter(user => 
          user.role === 'consultant'
        );
        setExperts(approvedExperts);
        
        // Initialize scale animations for each expert
        approvedExperts.forEach((expert, index) => {
          scaleAnims[expert._id] = new Animated.Value(1);
        });
      } else {
        setError(result.error || 'Failed to fetch experts');
      }
      
    } catch (err) {
      console.error('Error fetching experts:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllExperts = () => {
    // Updated navigation - navigate to the correct screen name
    navigation.navigate('ExpertsListStack', { 
      onBookNow: onBookNow 
    });
  };

  const handleViewProfile = (expert) => {
    // Animate card press
    if (scaleAnims[expert._id]) {
      Animated.sequence([
        Animated.timing(scaleAnims[expert._id], {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnims[expert._id], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    navigation.navigate('ExpertProfile', { expert });
  };

  // FIXED: Properly handle Book Now button press
  const handleBookNow = (expert, event) => {
    console.log('Book Now clicked for expert:', expert?.fullName);
    
    // Stop event propagation to prevent card press
    if (event) {
      event.stopPropagation();
    }
    
    // Check if onBookNow callback is provided
    if (onBookNow && typeof onBookNow === 'function') {
      console.log('Calling onBookNow callback with expert:', expert);
      onBookNow(expert);
    } else {
      console.warn('onBookNow callback not provided or not a function');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const getImageSource = (expert) => {
    if (!expert.profileImage || 
        expert.profileImage === '' || 
        expert.profileImage.includes('amar-jha.dev') || 
        expert.profileImage.includes('MyImg-BjWvYtsb.svg')) {
      return { uri: 'https://via.placeholder.com/80x80/D1FAE5/059669?text=' + encodeURIComponent(expert.fullName.charAt(0)) };
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
    
    return { uri: 'https://via.placeholder.com/80x80/D1FAE5/059669?text=' + encodeURIComponent(expert.fullName.charAt(0)) };
  };

  const renderExpert = ({ item }) => {
    const profile = item.consultantRequest.consultantProfile;
    const languages = profile.languages?.join(', ') || 'English';
    
    return (
      <Animated.View 
        style={[
          styles.expertCard, 
          { width: CARD_WIDTH },
          { transform: [{ scale: scaleAnims[item._id] || 1 }] }
        ]}
      >
        {/* Card content - Make only the card content clickable for profile view */}
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => handleViewProfile(item)}
          activeOpacity={0.95}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.expertImageContainer}>
              <Image
                source={getImageSource(item)}
                style={styles.expertImage}
                onError={(error) => {
                  console.log('Image load error for:', item.fullName, error.nativeEvent.error);
                }}
              />
              <View style={styles.onlineIndicator} />
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={16} color="#10B981" />
              </View>
            </View>
            
            <View style={styles.expertInfo}>
              <Text style={styles.expertName} numberOfLines={1}>
                {item.fullName}
              </Text>
              <Text style={styles.expertCategory} numberOfLines={1}>
                {profile.category || profile.fieldOfStudy}
              </Text>
              {/* <View style={styles.ratingContainer}>
                <Icon name="star" size={14} color="#FBBF24" />
                <Text style={styles.ratingText}>4.8</Text>
                <Text style={styles.reviewsText}>(124 reviews)</Text>
              </View> */}
            </View>
          </View>

          {/* Expertise Tags */}
          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Expert</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Available</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Verified</Text>
            </View>
          </View>
          
          {/* Details Section */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="language" size={16} color="#059669" />
                <Text style={styles.detailLabel}>Languages</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>{languages}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="video-call" size={16} color="#059669" />
                <Text style={styles.detailLabel}>Available</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>Video & Chat</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="access-time" size={16} color="#059669" />
                <Text style={styles.detailLabel}>Response</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>Within 2 hours</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="location-on" size={16} color="#059669" />
                <Text style={styles.detailLabel}>Location</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>{item.location || 'Online'}</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Action Buttons - Outside the card content to prevent conflicts */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.viewProfileBtn}
            onPress={() => handleViewProfile(item)}
            activeOpacity={0.8}
          >
            <Icon name="person" size={16} color="#059669" />
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>
          
          {/* FIXED: Book Now button with proper event handling */}
          <TouchableOpacity 
            style={styles.bookNowBtn}
            onPress={(event) => handleBookNow(item, event)}
            activeOpacity={0.8}
          >
            <Icon name="calendar-today" size={16} color="#ffffff" />
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom accent */}
        <View style={styles.bottomAccent} />
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.sectionTitle}>Meet Our Experts</Text>
            <View style={styles.titleUnderline} />
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading experts...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.sectionTitle}>Meet Our Experts</Text>
            <View style={styles.titleUnderline} />
          </View>
        </View>
        <View style={styles.centerContainer}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchExperts} activeOpacity={0.7}>
            <Icon name="refresh" size={16} color="#ffffff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (experts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.sectionTitle}>Meet Our Experts</Text>
            <View style={styles.titleUnderline} />
          </View>
        </View>
        <View style={styles.centerContainer}>
          <Icon name="people-outline" size={48} color="#94A3B8" />
          <Text style={styles.noExpertsText}>No experts available at the moment</Text>
          <Text style={styles.noExpertsSubtext}>Check back later for available consultants</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section - Unified with CategorySection */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Meet Our Experts</Text>
          <View style={styles.titleUnderline} />
        </View>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={handleViewAllExperts}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Icon name="arrow-forward" size={16} color="#059669" />
        </TouchableOpacity>
      </View>
      
      {/* Subtitle */}
      <Text style={styles.subtitle}>Connect with verified professionals</Text>
      
      {/* Experts Carousel */}
      <FlatList
        ref={flatListRef}
        data={experts}
        renderItem={renderExpert}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={false}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
      />
      
      {/* Dots Indicator */}
      {experts.length > 1 && (
        <View style={styles.indicatorContainer}>
          {experts.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentIndex ? '#10B981' : '#E2E8F0',
                  width: index === currentIndex ? 20 : 8,
                }
              ]}
            />
          ))}
        </View>
      )}

      {/* Section bottom border */}
      <View style={styles.sectionBorder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
  },

  // Header Styles - Unified with CategorySection
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.2,
  },
  titleUnderline: {
    width: 40,
    height: 2,
    backgroundColor: '#10B981',
    borderRadius: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  viewAllText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Carousel Styles
  carouselContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },

  // Expert Card Styles - Enhanced
  expertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: CARD_SPACING / 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },

  // FIXED: Separate card content from buttons
  cardContent: {
    flex: 1,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12,
  },
  expertImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  expertImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#D1FAE5',
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
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  expertInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  expertName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.1,
  },
  expertCategory: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
    marginLeft: 2,
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 11,
    color: '#64748B',
  },

  // Tags Container
  tagsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  tag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tagText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Details Section
  detailsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  detailValue: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Action Buttons - FIXED: Positioned outside card content
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  viewProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  viewProfileText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bookNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  bookNowText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Bottom Accent
  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#10B981',
    opacity: 0.6,
  },

  // Dots Indicator
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
    transition: 'width 0.3s ease',
  },

  // Loading & Error States
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  noExpertsText: {
    fontSize: 16,
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  noExpertsSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Section Border
  sectionBorder: {
    marginTop: 20,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: -16,
  },
});

export default ExpertsSection;