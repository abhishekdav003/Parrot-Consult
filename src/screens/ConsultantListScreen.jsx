import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';
import UnifiedBookingModal from './UnifiedBookingModal';

const getCategoryMapping = (frontendCategory) => {
  const mappings = {
    'it-consultant': 'tech',
    'e-commerce': 'E-commerce',
    'legal-consultant': 'Legal',
    'marketing-consultant': 'Marketing',
    'financial-consultant': 'Finance',
    'hr-consultant': 'HR',
    'Business': 'strategy',
    'other': 'Other'
  };
  return mappings[frontendCategory] || frontendCategory;
};

const ConsultantListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { category } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [consultants, setConsultants] = useState([]);
  const [filteredConsultants, setFilteredConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
const [selectedConsultant, setSelectedConsultant] = useState(null);

  useEffect(() => {
    fetchConsultants();
  }, [category]);

  useEffect(() => {
    filterConsultants();
  }, [searchQuery, consultants]);

  const fetchConsultants = async () => {
  try {
    setLoading(true);
    console.log('[CONSULTANT_LIST] Starting fetch process...');
    console.log('[CONSULTANT_LIST] Category being searched:', category?.title);
    
    // Create a timeout promise to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - please check your connection')), 15000)
    );
    
    console.log('[CONSULTANT_LIST] Making API call...');
    
    // Race between API call and timeout
    const result = await Promise.race([
      ApiService.getAllUsers(),
      timeoutPromise
    ]);
    
    console.log('[CONSULTANT_LIST] API Response received:', result);
    
    if (result.success) {
      let allUsers = result.data || [];
      console.log('[CONSULTANT_LIST] Fetched users:', allUsers.length);
      
      // Log available categories in DB for debugging
      const availableCategories = allUsers
        .map(user => user.consultantRequest?.consultantProfile?.category)
        .filter(Boolean);
      console.log('[CONSULTANT_LIST] Available categories in DB:', [...new Set(availableCategories)]);
      
      // Filter only approved consultants
      let approvedConsultants = allUsers.filter(user => 
        user.consultantRequest && 
        user.consultantRequest.status === 'approved' &&
        user.consultantRequest.consultantProfile
      );

      console.log('[CONSULTANT_LIST] Approved consultants found:', approvedConsultants.length);
      
      // Log approved consultants for debugging
      if (approvedConsultants.length > 0) {
        console.log('[CONSULTANT_LIST] Approved consultants details:', 
          approvedConsultants.map(user => ({
            name: user.fullName,
            category: user.consultantRequest.consultantProfile.category,
            status: user.consultantRequest.status
          }))
        );
      }
      
      // Filter by category if provided
      if (category?.title) {
        const dbCategoryName = getCategoryMapping(category.title);
        console.log('[CONSULTANT_LIST] Mapping frontend category:', category.title, '-> DB category:', dbCategoryName);
        
        approvedConsultants = approvedConsultants.filter(user => {
          const consultantCategory = user.consultantRequest.consultantProfile.category;
          const matches = consultantCategory === dbCategoryName;
          console.log('[CONSULTANT_LIST] Consultant:', user.fullName, 'Category:', consultantCategory, 'Matches:', matches);
          return matches;
        });
        
        console.log('[CONSULTANT_LIST] Consultants after category filter:', approvedConsultants.length);
      }
      
      // Transform user data to consultant format
      const transformedConsultants = approvedConsultants.map(user => ({
        _id: user._id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profileImage || null,
        primaryCategory: user.consultantRequest.consultantProfile.category || category?.displayTitle || 'General Consulting',
        specializedServices: user.consultantRequest.consultantProfile.keySkills || [],
        keySkills: user.consultantRequest.consultantProfile.keySkills || [],
        sessionFee: user.consultantRequest.consultantProfile.sessionFee,
        yearsOfExperience: user.consultantRequest.consultantProfile.yearsOfExperience,
        qualification: user.consultantRequest.consultantProfile.qualification,
        university: user.consultantRequest.consultantProfile.university,
        shortBio: user.consultantRequest.consultantProfile.shortBio,
        languages: user.consultantRequest.consultantProfile.languages || [],
        daysPerWeek: user.consultantRequest.consultantProfile.daysPerWeek,
        availableTimePerDay: user.consultantRequest.consultantProfile.availableTimePerDay,
        consultantType: user.consultantRequest.consultantProfile.consultantType,
        rating: 4.5, // Default rating since no rating system in backend yet
        reviewCount: Math.floor(Math.random() * 50) + 1, // Random review count for now
        isApproved: true,
        status: 'approved'
      }));
      
      console.log('[CONSULTANT_LIST] Final transformed consultants:', transformedConsultants.length);
      console.log('[CONSULTANT_LIST] Transformed consultants details:', 
        transformedConsultants.map(c => ({ name: c.name, category: c.primaryCategory }))
      );
      
      setConsultants(transformedConsultants);
    } else {
      console.error('[CONSULTANT_LIST] API Error:', result.error);
      Alert.alert('Error', result.error || 'Failed to load consultants');
      setConsultants([]);
    }
  } catch (error) {
    console.error('[CONSULTANT_LIST] Exception fetching consultants:', error);
    
    if (error.message.includes('timeout')) {
      Alert.alert('Timeout', 'Request timed out. Please check your internet connection and try again.');
    } else {
      Alert.alert('Error', error.message || 'Failed to load consultants');
    }
    
    setConsultants([]);
  } finally {
    console.log('[CONSULTANT_LIST] Setting loading to false');
    setLoading(false);
  }
};

  const filterConsultants = () => {
    if (!searchQuery.trim()) {
      setFilteredConsultants(consultants);
      return;
    }

    const filtered = consultants.filter(consultant => {
      const searchLower = searchQuery.toLowerCase();
      return (
        consultant.name?.toLowerCase().includes(searchLower) ||
        consultant.primaryCategory?.toLowerCase().includes(searchLower) ||
        consultant.specializedServices?.some(service =>
          service.toLowerCase().includes(searchLower)
        ) ||
        consultant.keySkills?.some(skill =>
          skill.toLowerCase().includes(searchLower)
        ) ||
        consultant.qualification?.toLowerCase().includes(searchLower) ||
        consultant.university?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredConsultants(filtered);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleViewProfile = (consultant) => {
    // Transform consultant data back to the format expected by ExpertProfileScreen
    const expertData = {
      _id: consultant._id,
      fullName: consultant.name,
      email: consultant.email,
      phone: consultant.phone,
      profileImage: consultant.profilePicture,
      location: consultant.location || 'Available Online',
      consultantRequest: {
        status: 'approved',
        consultantProfile: {
          category: consultant.primaryCategory,
          keySkills: consultant.keySkills,
          sessionFee: consultant.sessionFee,
          yearsOfExperience: consultant.yearsOfExperience,
          qualification: consultant.qualification,
          university: consultant.university,
          shortBio: consultant.shortBio,
          languages: consultant.languages,
          daysPerWeek: consultant.daysPerWeek,
          availableTimePerDay: consultant.availableTimePerDay,
          consultantType: consultant.consultantType,
          fieldOfStudy: consultant.primaryCategory // Fallback for category display
        }
      }
    };
    
    // Navigate to ExpertProfileScreen
    navigation.navigate('ExpertProfileScreen', { expert: expertData });
  };

  const handleBookNow = (consultant) => {
  // Transform consultant data to expert format expected by UnifiedBookingModal
  const expertData = {
    _id: consultant._id,
    fullName: consultant.name,
    email: consultant.email,
    phone: consultant.phone,
    profileImage: consultant.profilePicture,
    consultantRequest: {
      status: 'approved',
      consultantProfile: {
        sessionFee: consultant.sessionFee,
        category: consultant.primaryCategory,
        keySkills: consultant.keySkills,
        yearsOfExperience: consultant.yearsOfExperience,
        qualification: consultant.qualification,
        university: consultant.university,
        shortBio: consultant.shortBio,
        languages: consultant.languages,
        daysPerWeek: consultant.daysPerWeek,
        availableTimePerDay: consultant.availableTimePerDay,
        consultantType: consultant.consultantType
      }
    }
  };
  
  setSelectedConsultant(expertData);
  setShowBookingModal(true);
};

  const renderStars = (rating = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Icon key={i} name="star" size={16} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Icon key="half" name="star-half" size={16} color="#FFD700" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Icon key={`empty-${i}`} name="star-border" size={16} color="#FFD700" />
      );
    }

    return stars;
  };

  const renderConsultantCard = (consultant) => (
    <View key={consultant._id} style={styles.consultantCard}>
      <View style={styles.consultantHeader}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {consultant.profilePicture ? (
              <Image
                source={{ uri: consultant.profilePicture }}
                style={styles.avatar}
                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={30} color="#666" />
              </View>
            )}
          </View>
          <View style={styles.consultantInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.consultantName}>
                {consultant.name || 'Unknown'}
              </Text>
              {consultant.isApproved && (
                <View style={styles.vettedBadge}>
                  <Text style={styles.vettedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.specialization}>
              {consultant.qualification && consultant.university 
                ? `${consultant.qualification} - ${consultant.university}`
                : consultant.primaryCategory
              }
            </Text>
            {consultant.keySkills && consultant.keySkills.length > 0 && (
              <Text style={styles.skillsText}>
                Skills: {consultant.keySkills.join(', ')}
              </Text>
            )}
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(consultant.rating || 0)}
              </View>
              <Text style={styles.ratingText}>
                {consultant.rating ? consultant.rating.toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.reviewCount}>
                ({consultant.reviewCount || 0})
              </Text>
            </View>
            {consultant.sessionFee && (
              <Text style={styles.sessionFee}>
                ₹{consultant.sessionFee}/session
              </Text>
            )}
            {consultant.yearsOfExperience && (
              <Text style={styles.experience}>
                {consultant.yearsOfExperience} years experience
              </Text>
            )}
            {consultant.languages && consultant.languages.length > 0 && (
              <Text style={styles.languages}>
                Languages: {consultant.languages.join(', ')}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.viewProfileButton}
          onPress={() => handleViewProfile(consultant)}
        >
          <Text style={styles.viewProfileText}>View Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bookNowButton}
          onPress={() => handleBookNow(consultant)}
        >
          <Text style={styles.bookNowText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category?.displayTitle || 'Consultants'}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search experts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading consultants...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.consultantsList}>
            {filteredConsultants.length > 0 ? (
              filteredConsultants.map(renderConsultantCard)
            ) : (
              <View style={styles.noResultsContainer}>
                <Icon name="search-off" size={48} color="#ccc" />
                <Text style={styles.noResultsText}>No consultants found</Text>
                <Text style={styles.noResultsSubtext}>
                  {searchQuery.trim() 
                    ? 'Try searching with different keywords'
                    : `No consultants available for ${category?.displayTitle || 'this category'}`
                  }
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
      <UnifiedBookingModal
  visible={showBookingModal}
  onClose={() => {
    setShowBookingModal(false);
    setSelectedConsultant(null);
  }}
  expert={selectedConsultant}
/>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  consultantsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  consultantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  consultantHeader: {
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consultantInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  consultantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  vettedBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vettedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  specialization: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  skillsText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
  },
  sessionFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  experience: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  languages: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewProfileText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bookNowButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookNowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ConsultantListScreen;