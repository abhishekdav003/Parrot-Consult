import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CategorySection = () => {
  const navigation = useNavigation();

  const categories = [
    {
      id: 1,
      title: 'IT Consulting',
      description: 'Get support and guidance for your technology',
      icon: 'computer',
    },
    {
      id: 2,
      title: 'Ecommerce Consulting',
      description: 'Spice up the profitability of your online business',
      icon: 'shopping-cart',
    },
    {
      id: 3,
      title: 'Legal Consulting',
      description: 'Navigate complex legal decisions with confidence and expertise',
      icon: 'gavel',
    },
  ];

  const handleCategoryPress = (category) => {
    navigation.navigate('Categories');
  };

  const handleViewAllCategories = () => {
    navigation.navigate('Categories');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.titleUnderline} />
        </View>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={handleViewAllCategories}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Icon name="arrow-forward" size={16} color="#059669" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.categoriesContainer}>
        {categories.map((category, index) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              index === categories.length - 1 && styles.lastCard
            ]}
            onPress={() => handleCategoryPress(category)}
            activeOpacity={0.8}
          >
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                  <Icon name={category.icon} size={22} color="#059669" />
                </View>
              </View>
              
              <View style={styles.textContent}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>
                  {category.description}
                </Text>
              </View>
              
              <View style={styles.arrowContainer}>
                <Icon name="arrow-forward-ios" size={14} color="#94A3B8" />
              </View>
            </View>
            
            {/* Bottom border accent */}
            <View style={styles.bottomAccent} />
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Section bottom border */}
      <View style={styles.sectionBorder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
  },
  
  // Header Styles
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.2,
  },
  titleUnderline: {
    width: 40,
    height: 2,
    backgroundColor: '#10B981',
    borderRadius: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  viewAllText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Categories Container
  categoriesContainer: {
    gap: 12,
  },
  
  // Category Card Styles
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  lastCard: {
    marginBottom: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  
  // Icon Styles
  iconContainer: {
    marginRight: 16,
  },
  iconBackground: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  
  // Text Content
  textContent: {
    flex: 1,
    paddingRight: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.1,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Arrow Container
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  // Accent Elements
  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#10B981',
    opacity: 0.6,
  },
  
  // Section Border
  sectionBorder: {
    marginTop: 20,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: -16,
  },
});

export default CategorySection;