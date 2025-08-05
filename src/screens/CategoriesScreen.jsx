import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CategoriesScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
  {
    id: 1,
    title: 'tech', // Changed to match database
    displayTitle: 'IT Consulting',
    description: 'Get support and guidance on technology solutions',
    icon: 'computer',
  },
  {
    id: 2,
    title: 'E-commerce', // Changed to match database
    displayTitle: 'Ecommerce Consulting',
    description: 'Spice up your online business for growth',
    icon: 'shopping-cart',
  },
  {
    id: 3,
    title: 'Legal', // Changed to match database
    displayTitle: 'Legal Consulting',
    description: 'Navigate complex legal decisions with confidence and expertise',
    icon: 'gavel',
  },
  {
    id: 4,
    title: 'Marketing', // Changed to match database
    displayTitle: 'Marketing Consulting',
    description: 'Boost your brand visibility and customer engagement',
    icon: 'campaign',
  },
  {
    id: 5,
    title: 'Finance', // Changed to match database
    displayTitle: 'Financial Consulting',
    description: 'Expert advice on financial planning and investment strategies',
    icon: 'account-balance',
  },
  {
    id: 6,
    title: 'HR', // Changed to match database
    displayTitle: 'HR Consulting',
    description: 'Human resource management and talent acquisition solutions',
    icon: 'people',
  },
  {
    id: 7,
    title: 'Business', // Changed to match database
    displayTitle: 'Business Consulting',
    description: 'Strategic business advice for growth and optimization',
    icon: 'business',
  },
  {
    id: 8,
    title: 'Other', // Changed to match database
    displayTitle: 'Other Consulting',
    description: 'Various other consulting services and expertise',
    icon: 'miscellaneous-services',
  },
];

  const filteredCategories = categories.filter(category =>
    category.displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBack = () => {
    console.log('Back button pressed'); // Debug log
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  const handleCategorySelect = (category) => {
  console.log('Navigating to consultant list for category:', category.displayTitle);
  navigation.navigate('ConsultantList', { 
    category: {
      title: category.title, // This should match backend category field
      displayTitle: category.displayTitle,
      description: category.description,
      icon: category.icon
    }
  });
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        </View>
      </View>

      {/* Categories List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.categoriesContainer}>
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryItem}
              onPress={() => handleCategorySelect(category)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryContent}>
                <View style={styles.iconContainer}>
                  <Icon name={category.icon} size={28} color="#2E7D32" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.categoryTitle}>{category.displayTitle}</Text>
                  <Text style={styles.categoryDescription}>
                    {category.description}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {filteredCategories.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Icon name="search-off" size={48} color="#ccc" />
            <Text style={styles.noResultsText}>No categories found</Text>
            <Text style={styles.noResultsSubtext}>
              Try searching with different keywords
            </Text>
          </View>
        )}
      </ScrollView>
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchIcon: {
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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

export default CategoriesScreen;