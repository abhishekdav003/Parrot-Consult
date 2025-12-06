import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, FlatList, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HeroSection = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchAnimation] = useState(new Animated.Value(0));

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to ChatBot with the search query
      navigation.navigate('ChatBot', { query: searchQuery.trim() });
    }
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    // Don't show recommendations on focus
    Animated.timing(searchAnimation, {
      toValue: 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    if (!searchQuery.trim()) {
      Animated.timing(searchAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };



  const renderSearchResult = ({ item }) => (
    <TouchableOpacity style={styles.searchResultItem}>
      <View style={styles.searchResultContent}>
        <Text style={styles.searchResultTitle}>{item.title}</Text>
        <Text style={styles.searchResultDescription}>{item.description}</Text>
      </View>
      <View style={styles.searchResultArrow}>
        <Text style={styles.arrowIcon}>→</Text>
      </View>
    </TouchableOpacity>
  );



  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground}>
        
        {/* Logo/Parrot Image */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.parrotLogo}
            resizeMode="contain"
          />
        </View>
        
        {/* Main Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.mainTitle}>
            Fly Higher with the Right{'\n'}Advice
          </Text>
          
          <Text style={styles.subtitle}>
            Get expert guidance across a range of fields.
          </Text>
          
          <Text style={styles.question}>
            What can we assist you with?
          </Text>
          
          {/* Enhanced Search Input */}
          <Animated.View 
            style={[
              styles.searchContainer,
              {
                transform: [{
                  scale: searchAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.02, 1.05]
                  })
                }]
              }
            ]}
          >
            <View style={styles.searchInputWrapper}>
              <TextInput
                style={[
                  styles.searchInput,
                  isSearchFocused && styles.searchInputFocused
                ]}
                placeholder="Type your concern here..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                multiline={true}
                numberOfLines={2}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={[
                styles.searchButton,
                searchQuery.trim() && styles.searchButtonActive
              ]}
              onPress={handleSearch}
              disabled={!searchQuery.trim()}
            >
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.resultsTitle}>Search Results</Text>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 500,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#F5E6A3',
    paddingHorizontal: 20,
    paddingVertical: 40,
    position: 'relative',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  parrotLogo: {
    width: 180,
    height: 180,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C5530',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  question: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 320,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 44,
    textAlignVertical: 'top',
    paddingRight: 30,
    lineHeight: 22,
  },
  searchInputFocused: {
    color: '#2C5530',
  },
  clearButton: {
    position: 'absolute',
    right: 5,
    top: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    fontSize: 12,
    color: '#666',
  },
  searchButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 15,
    width: 44,
    height: 44,
    marginLeft: 12,
  },
  searchButtonActive: {
    backgroundColor: '#28A745',
    shadowColor: '#28A745',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  searchIcon: {
    fontSize: 20,
  },
  searchResultsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    minWidth: 320,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5530',
    marginBottom: 10,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchResultDescription: {
    fontSize: 14,
    color: '#666',
  },
  searchResultArrow: {
    marginLeft: 10,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#28A745',
    fontWeight: 'bold',
  },

});

export default HeroSection;