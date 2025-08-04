import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, FlatList, Animated } from 'react-native';

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchAnimation] = useState(new Animated.Value(0));

  const handleSearch = () => {
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      setSearchResults([
        { id: 1, title: "Expert found for your query", description: "Connecting you with the right advisor..." },
        { id: 2, title: "Related consultations", description: "Similar questions from other users" }
      ]);
      setShowRecommendations(false);
      
      // Add search animation
      Animated.spring(searchAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
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

  const searchRecommendations = [
    { id: 1, text: "Career guidance for software engineers", icon: "💼" },
    { id: 2, text: "Investment advice for beginners", icon: "💰" },
    { id: 3, text: "Health and wellness tips", icon: "🏥" },
    { id: 4, text: "Business strategy consulting", icon: "📊" },
    { id: 5, text: "Legal advice for startups", icon: "⚖️" }
  ];

  const handleRecommendationPress = (recommendation) => {
    setSearchQuery(recommendation.text);
    setIsSearchFocused(true);
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

  const renderRecommendation = ({ item }) => (
    <TouchableOpacity 
      style={styles.recommendationItem}
      onPress={() => handleRecommendationPress(item)}
    >
      <Text style={styles.recommendationIcon}>{item.icon}</Text>
      <Text style={styles.recommendationText}>{item.text}</Text>
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

        
          {/* Call-to-action Button */}
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaIcon}>🤔</Text>
            <Text style={styles.ctaText}>
              Not sure who to consult? Let us guide you!
            </Text>
          </TouchableOpacity>
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
    width: 120,
    height: 150,
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
  recommendationsContainer: {
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
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5530',
    marginBottom: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recommendationIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  ctaButton: {
    backgroundColor: '#28A745',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 300,
    shadowColor: '#28A745',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});

export default HeroSection;