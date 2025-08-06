// src/screens/HomeScreen.jsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import HeroSection from '../components/HeroSection/HeroSection';
import ExpertsSection from '../components/ExpertsSection/ExpertsSection';
import UserReviews from '../components/UserReviews/UserReviews';
import GetStartedSection from '../components/GetStartedSection/GetStartedSection';
import CategorySection from '../components/Category/CategorySection';
import UnifiedBookingModal from '../screens/UnifiedBookingModal';

const HomeScreen = () => {
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState(null);

  const handleOpenBooking = (expert) => {
    console.log('Opening booking for expert:', expert);
    setSelectedExpert(expert);
    setBookingModalVisible(true);
  };

  const handleCloseBooking = () => {
    setSelectedExpert(null);
    setBookingModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection />
        <CategorySection />
        <ExpertsSection onBookNow={handleOpenBooking} />
        <UserReviews />
        <GetStartedSection />
        <View style={styles.bottomPadding} />
      </ScrollView>

      <UnifiedBookingModal
        visible={bookingModalVisible}
        onClose={handleCloseBooking}
        expert={selectedExpert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: {},
  bottomPadding: { height: 20 },
});

export default HomeScreen;