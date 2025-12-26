// Optimized ExpertListScreen.jsx - Clean tabular format
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
  TextInput,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';

const { width: screenWidth } = Dimensions.get('window');

const ExpertListScreen = ({ route }) => {
  const [experts, setExperts] = useState([]);
  const [filteredExperts, setFilteredExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const navigation = useNavigation();
  const searchInputRef = useRef(null);
  
  const { category, onBookNow } = route?.params || {};

  useEffect(() => {
    fetchExperts();
  }, []);

  useEffect(() => {
    filterExperts();
  }, [searchQuery, experts]);

  const fetchExperts = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      
      console.log('[ExpertsList] Fetching experts...');
      
      const result = await ApiService.getAllUsers();
      
      if (result.success) {
        console.log('[ExpertsList] Total users received:', result.data?.length || 0);
        
        // Filter for consultants
        let approvedExperts = result.data.filter(user => {
          const isConsultant = user.role === 'consultant';
          const hasConsultantRequest = user.consultantRequest;
          return isConsultant || hasConsultantRequest;
        });
        
        console.log('[ExpertsList] Filtered consultants:', approvedExperts.length);
        
        // Apply category filter if provided
        if (category) {
          console.log('[ExpertsList] Filtering by category:', category);
          approvedExperts = approvedExperts.filter(expert => {
            const profile = expert.consultantRequest?.consultantProfile;
            return profile?.category === category || profile?.fieldOfStudy === category;
          });
        }
        
        setExperts(approvedExperts);
        setFilteredExperts(approvedExperts);
        
      } else {
        console.error('[ExpertsList] API Error:', result.error);
        setError(result.error || 'Failed to fetch experts');
      }
      
    } catch (err) {
      console.error('[ExpertsList] Exception:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  const filterExperts = () => {
    if (!searchQuery.trim()) {
      setFilteredExperts(experts);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = experts.filter(expert => {
      const profile = expert.consultantRequest?.consultantProfile;
      return (
        expert.fullName?.toLowerCase().includes(query) ||
        profile?.category?.toLowerCase().includes(query) ||
        profile?.fieldOfStudy?.toLowerCase().includes(query) ||
        profile?.shortBio?.toLowerCase().includes(query)
      );
    });
    
    setFilteredExperts(filtered);
  };

  const handleViewProfile = (expert) => {
    navigation.navigate('ExpertProfile', { expert });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExperts(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.blur();
  };

  const getImageSource = (expert) => {
    if (!expert.profileImage || 
        expert.profileImage === '' || 
        expert.profileImage.includes('amar-jha.dev') || 
        expert.profileImage.includes('MyImg-BjWvYtsb.svg')) {
      return { 
        uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.fullName)}&background=D1FAE5&color=059669&size=80&rounded=true&bold=true`
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
      uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.fullName)}&background=D1FAE5&color=059669&size=80&rounded=true&bold=true`
    };
  };

  const renderExpert = ({ item }) => {
    const profile = item.consultantRequest?.consultantProfile;
    const expertCategory = profile?.category || profile?.fieldOfStudy || 'Consultant';
    const expertBio = profile?.shortBio || `Expert ${expertCategory} consultant`;
    
    return (
      <TouchableOpacity 
        style={styles.expertItem}
        onPress={() => handleViewProfile(item)}
        activeOpacity={0.7}
      >
        <View style={styles.expertContent}>
          {/* Expert Image */}
          <View style={styles.imageContainer}>
            <Image
              source={getImageSource(item)}
              style={styles.expertImage}
              onError={(error) => {
                console.log('Image load error for:', item.fullName, error.nativeEvent.error);
              }}
            />
            <View style={styles.onlineIndicator} />
          </View>

          {/* Expert Info */}
          <View style={styles.expertInfo}>
            <View style={styles.expertHeader}>
              <Text style={styles.expertName} numberOfLines={1}>
                {item.fullName}
              </Text>
              <View style={styles.verifiedContainer}>
                <Icon name="verified" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            
            <Text style={styles.expertCategory} numberOfLines={1}>
              {expertCategory}
            </Text>
            
            <Text style={styles.expertBio} numberOfLines={2}>
              {expertBio}
            </Text>

            <View style={styles.expertStats}>
              {/* <View style={styles.statItem}>
                <Icon name="star" size={14} color="#FBBF24" />
                <Text style={styles.statText}>4.8 (124)</Text>
              </View> */}
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Icon name="language" size={14} color="#6B7280" />
                <Text style={styles.statText}>
                  {profile?.languages?.join(', ') || 'English'}
                </Text>
              </View>
            </View>
          </View>

          {/* Arrow Icon */}
          <View style={styles.arrowContainer}>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </View>
        </View>

        {/* Status Badge */}
        
          
          
        
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>
        {category ? `${category} Experts` : 'All Experts'}
      </Text>
      <Text style={styles.headerSubtitle}>
        {filteredExperts.length} {filteredExperts.length === 1 ? 'expert' : 'experts'} available
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="search-off" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No experts found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search terms' : 'No experts available at the moment'}
      </Text>
      
      {searchQuery && (
        <TouchableOpacity style={styles.clearSearchBtn} onPress={clearSearch}>
          <Text style={styles.clearSearchText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>

        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        <View style={styles.fixedHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitleFixed}>Experts</Text>
          <View style={styles.placeholderButton} />
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading experts...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        <View style={styles.fixedHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitleFixed}>Experts</Text>
          <View style={styles.placeholderButton} />
        </View>

        <View style={styles.centerContainer}>
          <Icon name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchExperts()} activeOpacity={0.7}>
            <Icon name="refresh" size={18} color="#ffffff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitleFixed}>
          {category ? `${category}` : 'All Experts'}
        </Text>
        <View style={styles.placeholderButton} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#9CA3AF" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search experts by name, category..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Icon name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Experts List */}
      <FlatList
        data={filteredExperts}
        renderItem={renderExpert}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        removeClippedSubviews={false}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={10}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header Styles
  fixedHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingVertical: 10,

  // ✅ SAME FIX AS CategoriesScreen
  paddingTop: Platform.OS === 'android'
    ? StatusBar.currentHeight + 0
    : 20,

  backgroundColor: '#FFFFFF',
  borderBottomWidth: 1,
  borderBottomColor: '#F3F4F6',
  elevation: 2,
},

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleFixed: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },

  // Search Styles
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  clearButton: {
    padding: 4,
  },

  // List Styles
  listContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Expert Item Styles - Tabular Format like Categories
  expertItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  expertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  expertImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
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
    borderColor: '#FFFFFF',
  },
  expertInfo: {
    flex: 1,
    paddingRight: 12,
  },
  expertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  expertName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    flex: 1,
    marginRight: 12,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  expertCategory: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  expertBio: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  expertStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 92, // Align with text content
  },

  // Loading & Error States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  clearSearchBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});

export default ExpertListScreen;