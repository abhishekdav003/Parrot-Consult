// ExpertProfileScreen.jsx - Updated with UnifiedBookingModal integration
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import UnifiedBookingModal from './UnifiedBookingModal'; // Import the unified booking modal

const ExpertProfileScreen = ({ route, navigation }) => {
  const { expert } = route.params;
  const profile = expert.consultantRequest.consultantProfile;
  const [showBookingModal, setShowBookingModal] = useState(false);

  const getImageSource = () => {
    if (!expert.profileImage || 
        expert.profileImage === '' || 
        expert.profileImage.includes('amar-jha.dev') || 
        expert.profileImage.includes('MyImg-BjWvYtsb.svg')) {
      return { uri: 'https://via.placeholder.com/120x120/f0f0f0/999999?text=' + encodeURIComponent(expert.fullName.charAt(0)) };
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
    
    return { uri: 'https://via.placeholder.com/120x120/f0f0f0/999999?text=' + encodeURIComponent(expert.fullName.charAt(0)) };
  };

  const handleMessage = () => {
    Alert.alert(
      'Message',
      `Send message to ${expert.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => console.log('Sending message to:', expert.fullName) }
      ]
    );
  };

  const handleBookNow = () => {
    console.log('Opening booking modal for expert:', expert.fullName);
    setShowBookingModal(true);
  };

  const handleCloseBookingModal = () => {
    console.log('Closing booking modal');
    setShowBookingModal(false);
  };

  // Generate star rating
  const renderStars = (rating = 4.8) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Text key={i} style={styles.star}>★</Text>);
    }
    return stars;
  };

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={getImageSource()}
            style={styles.profileImage}
            onError={(error) => {
              console.log('Profile image load error:', error.nativeEvent.error);
            }}
          />
          
          <Text style={styles.name}>{expert.fullName}</Text>
          <Text style={styles.category}>{profile.category || profile.fieldOfStudy}</Text>
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>
            <Text style={styles.ratingText}>4.8 (310 reviews)</Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🌐</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Languages</Text>
                <Text style={styles.detailValue}>{profile.languages?.join(', ') || 'English'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📞</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Available</Text>
                <Text style={styles.detailValue}>Audio and Video</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>👤</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Mode</Text>
                <Text style={styles.detailValue}>{expert.location || 'Available Online'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>💰</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Session Fee</Text>
                <Text style={styles.detailValue}>₹{profile.sessionFee?.toLocaleString() || '1000'}/30min</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>⏰</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{profile.yearsOfExperience || 5} years</Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Me Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About Me</Text>
          <Text style={styles.aboutText}>
            {profile.shortBio || 
             `Experienced in ${profile.category || profile.fieldOfStudy} with ${profile.yearsOfExperience} years of experience. Let's work together to achieve your goals!`}
          </Text>
          
          {/* Skills */}
          {profile.keySkills && profile.keySkills.length > 0 && (
            <View style={styles.skillsContainer}>
              <Text style={styles.skillsTitle}>Key Skills</Text>
              <View style={styles.skillsWrapper}>
                {profile.keySkills.map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Education */}
          {profile.qualification && (
            <View style={styles.educationContainer}>
              <Text style={styles.educationTitle}>Education</Text>
              <Text style={styles.educationText}>
                {profile.qualification} in {profile.fieldOfStudy} from {profile.university} ({profile.graduationYear})
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={handleMessage}
            activeOpacity={0.7}
          >
            <Text style={styles.messageText}>Message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={handleBookNow}
            activeOpacity={0.7}
          >
            <Text style={styles.bookText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Unified Booking Modal */}
      <UnifiedBookingModal
        visible={showBookingModal}
        onClose={handleCloseBookingModal}
        expert={expert}
        navigation={navigation}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#F5F5F5',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8f8f8',
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  category: {
    fontSize: 16,
    color: '#B8860B',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  star: {
    fontSize: 16,
    color: '#FFD700',
    marginRight: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#666',
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
  },
  aboutSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  skillsContainer: {
    marginBottom: 16,
  },
  skillsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  educationContainer: {
    marginBottom: 8,
  },
  educationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  educationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 80,
    gap: 12,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  messageText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExpertProfileScreen;