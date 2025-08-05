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

const ConsultantListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { category } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [consultants, setConsultants] = useState([]);
  const [filteredConsultants, setFilteredConsultants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConsultants();
  }, [category]);

  useEffect(() => {
    filterConsultants();
  }, [searchQuery, consultants]);

  const fetchConsultants = async () => {
    try {
      setLoading(true);
      console.log('[CONSULTANT_LIST] Fetching consultants for category:', category?.title);
      
      // Since there's no specific endpoint for getting consultants by category,
      // we'll fetch all approved consultants and filter by category on frontend
      const result = await ApiService.getAllApprovedConsultants();
      
      if (result.success) {
        let consultantData = result.data || [];
        console.log('[CONSULTANT_LIST] Fetched consultants:', consultantData);
        
        // Filter by category if provided
        if (category?.title) {
          consultantData = consultantData.filter(consultant => 
            consultant.primaryCategory === category.title ||
            consultant.specializedServices?.some(service => 
              service.toLowerCase().includes(category.title.toLowerCase())
            )
          );
        }
        
        setConsultants(consultantData);
      } else {
        console.error('[CONSULTANT_LIST] Error fetching consultants:', result.error);
        Alert.alert('Error', result.error || 'Failed to load consultants');
        setConsultants([]);
      }
    } catch (error) {
      console.error('[CONSULTANT_LIST] Exception fetching consultants:', error);
      Alert.alert('Error', 'Failed to load consultants');
      setConsultants([]);
    } finally {
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
        )
      );
    });
    setFilteredConsultants(filtered);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleViewProfile = (consultant) => {
    // Navigate to consultant profile screen
    navigation.navigate('ConsultantProfile', { consultant });
  };

  const handleBookNow = (consultant) => {
    // Navigate to booking screen
    navigation.navigate('BookingScreen', { consultant });
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
              {consultant.isApproved && consultant.status === 'approved' && (
                <View style={styles.vettedBadge}>
                  <Text style={styles.vettedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.specialization}>
              {consultant.specializedServices?.length > 0 
                ? consultant.specializedServices.join(', ')
                : consultant.primaryCategory || 'General Consulting'
              }
            </Text>
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
            {consultant.hourlyRate && (
              <Text style={styles.hourlyRate}>
                ${consultant.hourlyRate}/hour
              </Text>
            )}
            {consultant.experience && (
              <Text style={styles.experience}>
                {consultant.experience} years experience
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
        <Text style={styles.headerTitle}>{category?.title || 'Consultants'}</Text>
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
                    : `No consultants available for ${category?.title || 'this category'}`
                  }
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
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
    marginBottom: 8,
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
  hourlyRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  experience: {
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