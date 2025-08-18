import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ApiService from '../../services/ApiService';
import UnifiedBookingModal from '../../screens/UnifiedBookingModal'; // Add this import

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.8;
const CARD_SPACING = 16;

const ExpertsSection = ({ onBookNow }) => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Add these states for the booking modal

  
  const flatListRef = useRef(null);
  const navigation = useNavigation();

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

  const handleViewProfile = (expert) => {
    // Navigate to ExpertProfile screen
    navigation.navigate('ExpertProfile', { expert });
  };

  const handleBookNow = (expert) => {
    // Set the selected expert and show the booking modal
    // setSelectedExpert(expert);
    // setBookingModalVisible(true);
     if (onBookNow) {
    onBookNow(expert);
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

  const renderExpert = ({ item }) => {
    const profile = item.consultantRequest.consultantProfile;
    const languages = profile.languages?.join(', ') || 'English';
    
    // Handle profile image URI properly
    const getImageSource = () => {
      // Always use placeholder if no profileImage or if it's the problematic URL
      if (!item.profileImage || 
          item.profileImage === '' || 
          item.profileImage.includes('amar-jha.dev') || 
          item.profileImage.includes('MyImg-BjWvYtsb.svg')) {
        return { uri: 'https://via.placeholder.com/80x80/f0f0f0/999999?text=' + encodeURIComponent(item.fullName.charAt(0)) };
      }
      
      // If it's a full URL (starts with http/https) and not the problematic one
      if (item.profileImage.startsWith('http')) {
        return { uri: item.profileImage };
      }
      
      // If it's a Cloudinary URL
      if (item.profileImage.includes('cloudinary')) {
        return { uri: item.profileImage };
      }
      
      // If it's a relative path, prepend base URL
      if (item.profileImage.startsWith('/uploads/')) {
        return { uri: `http://192.168.0.177:8011${item.profileImage}` };
      }
      
      // Default fallback with user's first letter
      return { uri: 'https://via.placeholder.com/80x80/f0f0f0/999999?text=' + encodeURIComponent(item.fullName.charAt(0)) };
    };
    
    return (
      <View style={[styles.expertCard, { width: CARD_WIDTH }]}>
        {/* Profile Image */}
        <View style={styles.imageContainer}>
          <Image
            source={getImageSource()}
            style={styles.expertImage}
            onError={(error) => {
              console.log('Image load error for:', item.fullName, error.nativeEvent.error);
            }}
            onLoad={() => {
              console.log('Image loaded successfully for:', item.fullName);
            }}
          />
          <View style={styles.onlineIndicator} />
        </View>
        
        {/* Expert Name */}
        <Text style={styles.expertName} numberOfLines={1}>
          {item.fullName}
        </Text>
        
        {/* Category */}
        <Text style={styles.expertCategory} numberOfLines={1}>
          {profile.category || profile.fieldOfStudy}
        </Text>
        
        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Languages</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{languages}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Available:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>Mail and Video</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mode:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>Available Online</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.location || 'Online'}</Text>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.viewProfileBtn}
            onPress={() => handleViewProfile(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.bookNowBtn}
            onPress={() => handleBookNow(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading experts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchExperts} activeOpacity={0.7}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (experts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noExpertsText}>No experts available at the moment</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meet Our Experts</Text>
        <Text style={styles.subtitle}>Connect with verified professionals</Text>
      </View>
      
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
        pagingEnabled={false}
      />
      
      {/* Simplified Dots Indicator */}
      {experts.length > 1 && (
        <View style={styles.indicatorContainer}>
          {experts.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentIndex ? '#2E7D32' : '#E0E0E0',
                  width: index === currentIndex ? 20 : 8,
                }
              ]}
            />
          ))}
        </View>
      )}

      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
  },
  carouselContent: {
    paddingHorizontal: (screenWidth - CARD_WIDTH) / 2,
    paddingBottom: 20,
  },
  expertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: CARD_SPACING / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  expertImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F8F8',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  expertName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  expertCategory: {
    fontSize: 14,
    color: '#FF8C00',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  detailsSection: {
    width: '100%',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  viewProfileBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewProfileText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  bookNowBtn: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bookNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
    transition: 'width 0.3s ease',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  noExpertsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ExpertsSection;