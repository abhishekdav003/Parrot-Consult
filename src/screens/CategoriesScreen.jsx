import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

const CategoriesScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnims = useRef({}).current;

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Categories based on your backend model
  const categories = [
    {
      id: 1,
      title: 'IT',
      displayTitle: 'IT Consulting',
      description: 'Get expert guidance on technology solutions, software development, and digital transformation',
      icon: 'computer',
    },
    {
      id: 2,
      title: 'StartUp',
      displayTitle: 'StartUp Consulting',
      description: 'Build and scale your startup with expert guidance on business strategy and growth',
      icon: 'rocket-launch',
    },
    {
      id: 3,
      title: 'Legal',
      displayTitle: 'Legal Consulting',
      description: 'Navigate complex legal decisions with confidence from verified legal professionals',
      icon: 'gavel',
    },
  ];

  const filteredCategories = categories.filter(category =>
    category.displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize scale animations for filtered categories
  useEffect(() => {
    filteredCategories.forEach((category) => {
      if (!scaleAnims[category.id]) {
        scaleAnims[category.id] = new Animated.Value(1);
      }
    });
  }, [filteredCategories]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category.id);
    
    // Animate button press
    if (scaleAnims[category.id]) {
      Animated.sequence([
        Animated.timing(scaleAnims[category.id], {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnims[category.id], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    setTimeout(() => {
      navigation.navigate('ConsultantList', { 
        category: {
          title: category.title,
          displayTitle: category.displayTitle,
          description: category.description,
          icon: category.icon,
        }
      });
      setSelectedCategory(null);
    }, 200);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const CategoryCard = ({ category, index }) => (
    <Animated.View
      style={[
        styles.categoryCard,
        {
          transform: [{ scale: scaleAnims[category.id] || 1 }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.categoryButton,
          selectedCategory === category.id && styles.selectedCategory,
        ]}
        onPress={() => handleCategorySelect(category)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryContent}>
          <View style={styles.iconContainer}>
            <Icon name={category.icon} size={24} color="#22C55E" />
          </View>
          
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>{category.displayTitle}</Text>
            <Text style={styles.categoryDescription} numberOfLines={2}>
              {category.description}
            </Text>
          </View>

          <View style={styles.arrowContainer}>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>

      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Categories</Text>
        
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Search Section */}
      <Animated.View 
        style={[
          styles.searchSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.subtitle}>Find the right expertise for your needs</Text>
        
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
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

        {searchQuery.length > 0 && (
          <Text style={styles.resultsText}>
            {filteredCategories.length} categories found
          </Text>
        )}
      </Animated.View>

      {/* Categories List */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.categoriesContainer}>
          {filteredCategories.map((category, index) => (
            <CategoryCard 
              key={category.id} 
              category={category} 
              index={index}
            />
          ))}
        </View>

        {/* No Results State */}
        {filteredCategories.length === 0 && (
          <Animated.View 
            style={[
              styles.noResultsContainer,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.noResultsIcon}>
              <Icon name="search-off" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.noResultsTitle}>No categories found</Text>
            <Text style={styles.noResultsText}>
              Try searching with different keywords
            </Text>
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={clearSearch}
              activeOpacity={0.8}
            >
              <Text style={styles.clearSearchButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
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
  paddingVertical: 10,

  // ✅ KEY FIX — aligns exactly like MySessionsSection
  paddingTop: Platform.OS === 'android'
    ? StatusBar.currentHeight + 0
    : 20,

  backgroundColor: '#ffffff',
  borderBottomWidth: 1,
  borderBottomColor: '#E5E7EB',
},

  backButton: {
    padding: 4,
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
    marginBottom: 20,
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
    marginBottom: 12,
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
  resultsText: {
    fontSize: 12,
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
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Category Card Styles
  categoryCard: {
    marginBottom: 12,
  },
  categoryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  selectedCategory: {
    borderColor: '#22C55E',
    borderWidth: 2,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  arrowContainer: {
    padding: 4,
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

export default CategoriesScreen;