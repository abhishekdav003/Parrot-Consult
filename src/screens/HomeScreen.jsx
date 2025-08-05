import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
// Import custom components
import HeroSection from '../components/HeroSection/HeroSection';
import ExpertsSection from '../components/ExpertsSection/ExpertsSection';
import UserReviews from '../components/UserReviews/UserReviews';
import GetStartedSection from '../components/GetStartedSection/GetStartedSection';
import BottomNavigation from '../components/Navbar/Navbar'; // Updated import name
import CategorySection from '../components/Category/CategorySection';

const HomeScreen = () => (
  <View style={styles.container}>
    <ScrollView 
      style={styles.scrollContainer} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <HeroSection />
      <CategorySection />
      <ExpertsSection />
      <UserReviews />
      <GetStartedSection />
      <View style={styles.bottomPadding} />
    </ScrollView>
  </View>
);


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  bottomPadding: {
    height: 80, // Space for bottom navigation
  },
});

export default HomeScreen;