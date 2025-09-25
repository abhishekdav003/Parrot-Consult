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
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';
import UnifiedBookingModal from './UnifiedBookingModal';

// Category mapping - Frontend categories to Backend categories
const getCategoryMapping = (frontendCategory) => {
  // Direct mapping since we're using backend categories directly
  const mappings = {
    'IT': 'IT',
    'StartUp': 'StartUp',
    'Legal': 'Legal'
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
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please check your connection')), 15000)
      );
      
      console.log('[CONSULTANT_LIST] Making API call...');
      
      const result = await Promise.race([
        ApiService.getAllUsers(),
        timeoutPromise
      ]);
      
      console.log('[CONSULTANT_LIST] API Response received:', result);
      
      if (result?.success) {
        let allUsers = result.data || [];
        console.log('[CONSULTANT_LIST] Fetched users:', allUsers.length);
        
        // Get all approved consultants first
        let approvedConsultants = allUsers.filter(user => 
          user?.consultantRequest?.status === 'approved' &&
          user?.consultantRequest?.consultantProfile &&
          !user?.suspended
        );

        console.log('[CONSULTANT_LIST] Approved consultants found:', approvedConsultants.length);
        
        // Log available categories for debugging
        const availableCategories = approvedConsultants
          .map(user => user.consultantRequest?.consultantProfile?.category)
          .filter(Boolean);
        console.log('[CONSULTANT_LIST] Available categories in DB:', [...new Set(availableCategories)]);
        
        // Filter by category if provided
        if (category?.title) {
          const dbCategoryName = getCategoryMapping(category.title);
          console.log('[CONSULTANT_LIST] Filtering by category:', dbCategoryName);
          
          approvedConsultants = approvedConsultants.filter(user => {
            const consultantCategory = user.consultantRequest?.consultantProfile?.category;
            const matches = consultantCategory === dbCategoryName;
            if (matches) {
              console.log('[CONSULTANT_LIST] Match found - Consultant:', user.fullName, 'Category:', consultantCategory);
            }
            return matches;
          });
          
          console.log('[CONSULTANT_LIST] Consultants after category filter:', approvedConsultants.length);
        }
        
        // Transform consultants data for display
        const transformedConsultants = approvedConsultants.map(user => {
          const profile = user.consultantRequest.consultantProfile;
          return {
            _id: user._id,
            name: user.fullName || 'Unknown',
            email: user.email,
            phone: user.phone,
            profilePicture: user.profileImage || null,
            location: user.location || 'Available Online',
            primaryCategory: profile.category || category?.displayTitle || 'General Consulting',
            specializedServices: profile.Specialized || profile.keySkills || [],
            keySkills: profile.keySkills || [],
            sessionFee: profile.sessionFee || null,
            yearsOfExperience: profile.yearsOfExperience || 0,
            qualification: profile.qualification || '',
            fieldOfStudy: profile.fieldOfStudy || '',
            university: profile.university || '',
            graduationYear: profile.graduationYear || null,
            shortBio: profile.shortBio || '',
            languages: profile.languages || ['English'],
            daysPerWeek: profile.daysPerWeek || '',
            days: profile.days || [],
            availableTimePerDay: profile.availableTimePerDay || '',
            profileHealth: profile.profileHealth || 0,
            wallet: profile.wallet || 0,
            // Mock rating data - in production, this would come from reviews
            rating: Math.random() * (5.0 - 4.0) + 4.0, // Random rating between 4.0-5.0
            reviewCount: Math.floor(Math.random() * 50) + 1,
            isApproved: true,
            status: 'approved',
            isOnline: Math.random() > 0.3, // Mock online status
          };
        });
        
        // Sort consultants by rating and experience
        transformedConsultants.sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.yearsOfExperience - a.yearsOfExperience;
        });
        
        console.log('[CONSULTANT_LIST] Final transformed consultants:', transformedConsultants.length);
        console.log('[CONSULTANT_LIST] Sample consultant:', transformedConsultants[0]);
        
        setConsultants(transformedConsultants);
      } else {
        console.error('[CONSULTANT_LIST] API Error:', result?.error);
        Alert.alert('Error', result?.error || 'Failed to load consultants');
        setConsultants([]);
      }
    } catch (error) {
      console.error('[CONSULTANT_LIST] Exception fetching consultants:', error);
      
      let errorMessage = 'Failed to load consultants';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
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

    const searchLower = searchQuery.toLowerCase();
    const filtered = consultants.filter(consultant => {
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
        consultant.university?.toLowerCase().includes(searchLower) ||
        consultant.fieldOfStudy?.toLowerCase().includes(searchLower) ||
        consultant.shortBio?.toLowerCase().includes(searchLower)
      );
    });
    
    setFilteredConsultants(filtered);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  const handleViewProfile = (consultant) => {
    const expertData = {
      _id: consultant._id,
      fullName: consultant.name,
      email: consultant.email,
      phone: consultant.phone,
      profileImage: consultant.profilePicture,
      location: consultant.location,
      consultantRequest: {
        status: 'approved',
        consultantProfile: {
          category: consultant.primaryCategory,
          keySkills: consultant.keySkills,
          Specialized: consultant.specializedServices,
          sessionFee: consultant.sessionFee,
          yearsOfExperience: consultant.yearsOfExperience,
          qualification: consultant.qualification,
          fieldOfStudy: consultant.fieldOfStudy,
          university: consultant.university,
          graduationYear: consultant.graduationYear,
          shortBio: consultant.shortBio,
          languages: consultant.languages,
          daysPerWeek: consultant.daysPerWeek,
          days: consultant.days,
          availableTimePerDay: consultant.availableTimePerDay,
          profileHealth: consultant.profileHealth,
          wallet: consultant.wallet
        }
      }
    };
    
    navigation.navigate('ExpertProfileScreen', { expert: expertData });
  };

  const handleBookNow = (consultant) => {
    const expertData = {
      _id: consultant._id,
      fullName: consultant.name,
      email: consultant.email,
      phone: consultant.phone,
      profileImage: consultant.profilePicture,
      location: consultant.location,
      consultantRequest: {
        status: 'approved',
        consultantProfile: {
          sessionFee: consultant.sessionFee,
          category: consultant.primaryCategory,
          keySkills: consultant.keySkills,
          Specialized: consultant.specializedServices,
          yearsOfExperience: consultant.yearsOfExperience,
          qualification: consultant.qualification,
          fieldOfStudy: consultant.fieldOfStudy,
          university: consultant.university,
          graduationYear: consultant.graduationYear,
          shortBio: consultant.shortBio,
          languages: consultant.languages,
          daysPerWeek: consultant.daysPerWeek,
          days: consultant.days,
          availableTimePerDay: consultant.availableTimePerDay,
          profileHealth: consultant.profileHealth,
          wallet: consultant.wallet
        }
      }
    };
    
    setSelectedConsultant(expertData);
    setShowBookingModal(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderStars = (rating = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Icon key={i} name="star" size={14} color="#FBBF24" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Icon key="half" name="star-half" size={14} color="#FBBF24" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Icon key={`empty-${i}`} name="star-border" size={14} color="#FBBF24" />
      );
    }

    return stars;
  };

  const renderConsultantCard = (consultant) => (
    <View key={consultant._id} style={styles.consultantCard}>
      <View style={styles.cardContent}>
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
                <Icon name="person" size={28} color="#059669" />
              </View>
            )}
            {consultant.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          
          <View style={styles.consultantInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.consultantName}>
                {consultant.name}
              </Text>
              {consultant.isApproved && (
                <View style={styles.verifiedBadge}>
                  <Icon name="verified" size={14} color="#22C55E" />
                </View>
              )}
            </View>
            
            <Text style={styles.category}>
              {consultant.qualification && consultant.university 
                ? `${consultant.qualification}${consultant.fieldOfStudy ? ` in ${consultant.fieldOfStudy}` : ''}`
                : consultant.primaryCategory
              }
            </Text>

            {consultant.university && (
              <Text style={styles.university} numberOfLines={1}>
                {consultant.university}
                {consultant.graduationYear && ` • ${consultant.graduationYear}`}
              </Text>
            )}
            
            {consultant.keySkills && consultant.keySkills.length > 0 && (
              <Text style={styles.skills} numberOfLines={1}>
                {consultant.keySkills.slice(0, 3).join(', ')}
                {consultant.keySkills.length > 3 && '...'}
              </Text>
            )}
            
            <View style={styles.ratingRow}>
              <View style={styles.starsContainer}>
                {renderStars(consultant.rating)}
              </View>
              <Text style={styles.ratingText}>
                {consultant.rating.toFixed(1)}
              </Text>
              <Text style={styles.reviewCount}>
                ({consultant.reviewCount})
              </Text>
            </View>
          </View>
        </View>

        {consultant.sessionFee && (
          <View style={styles.feeContainer}>
            <Text style={styles.sessionFee}>
              ₹{consultant.sessionFee}/session
            </Text>
          </View>
        )}

        <View style={styles.detailsRow}>
          {consultant.yearsOfExperience > 0 && (
            <View style={styles.detailItem}>
              <Icon name="work" size={14} color="#6B7280" />
              <Text style={styles.detailText}>
                {consultant.yearsOfExperience}y exp
              </Text>
            </View>
          )}
          
          {consultant.languages && consultant.languages.length > 0 && (
            <View style={styles.detailItem}>
              <Icon name="language" size={14} color="#6B7280" />
              <Text style={styles.detailText}>
                {consultant.languages.slice(0, 2).join(', ')}
              </Text>
            </View>
          )}

          {consultant.location && (
            <View style={styles.detailItem}>
              <Icon name="location-on" size={14} color="#6B7280" />
              <Text style={styles.detailText} numberOfLines={1}>
                {consultant.location}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => handleViewProfile(consultant)}
            activeOpacity={0.7}
          >
            <Icon name="person" size={16} color="#059669" />
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.bookNowButton}
            onPress={() => handleBookNow(consultant)}
            activeOpacity={0.7}
          >
            <Icon name="calendar-today" size={16} color="#ffffff" />
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {category?.displayTitle || 'Consultants'}
        </Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.subtitle}>
          {filteredConsultants.length} experts available
          {category?.title && ` in ${category.displayTitle}`}
        </Text>
        
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search experts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Icon name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading consultants...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.consultantsList}>
            {filteredConsultants.length > 0 ? (
              filteredConsultants.map(renderConsultantCard)
            ) : (
              <View style={styles.noResultsContainer}>
                <View style={styles.noResultsIcon}>
                  <Icon name="search-off" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.noResultsTitle}>No consultants found</Text>
                <Text style={styles.noResultsText}>
                  {searchQuery.trim() 
                    ? 'Try searching with different keywords'
                    : `No consultants available for ${category?.displayTitle || 'this category'} at the moment`
                  }
                </Text>
                {searchQuery.trim() && (
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={clearSearch}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
      
      {showBookingModal && selectedConsultant && (
        <UnifiedBookingModal
          visible={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedConsultant(null);
          }}
          expert={selectedConsultant}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSpacer: {
    width: 40,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Scroll View
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  consultantsList: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Consultant Card Styles
  consultantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardContent: {
    padding: 16,
  },
  profileSection: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F9FAFB',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  consultantInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  consultantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  verifiedBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  category: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  university: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  skills: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  reviewCount: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  feeContainer: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  sessionFee: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  viewProfileText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bookNowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  bookNowText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // No Results State
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  clearSearchButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Bottom Padding
  bottomPadding: {
    height: 100,
  },
});

export default ConsultantListScreen;