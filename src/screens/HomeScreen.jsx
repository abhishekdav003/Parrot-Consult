import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

// Import custom components
import HeroSection from '../components/HeroSection/HeroSection';
import Navbar from '../components/Navbar/Navbar';
import ExpertsSection from '../components/ExpertsSection/ExpertsSection';
import UserReviews from '../components/UserReviews/UserReviews';
import GetStartedSection from '../components/GetStartedSection/GetStartedSection';

const HomeScreen = () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
    <Navbar />
    <HeroSection />
    <ExpertsSection />
    <UserReviews />
    <GetStartedSection />
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingVertical: 20,
  },
});

export default HomeScreen;