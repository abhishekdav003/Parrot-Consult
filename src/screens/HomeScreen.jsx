// src/screens/HomeScreen.jsx
import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import HeroSection from '../components/HeroSection/HeroSection';
import ExpertsSection from '../components/ExpertsSection/ExpertsSection';
import UserReviews from '../components/UserReviews/UserReviews';
import GetStartedSection from '../components/GetStartedSection/GetStartedSection';
import CategorySection from '../components/Category/CategorySection';
import UnifiedBookingModal from '../screens/UnifiedBookingModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate dynamic navbar height (same logic as in Navbar component)
const getNavbarHeight = (insets) => {
  const isSmallScreen = SCREEN_HEIGHT < 700;
  const isTablet = SCREEN_WIDTH > 768;
  const BASE_HEIGHT = isTablet ? 80 : isSmallScreen ? 65 : 70;
  return BASE_HEIGHT + insets.bottom;
};

const HomeScreen = () => {
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState(null);
  
  // Get safe area insets for proper spacing calculations
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic bottom padding to account for navbar
  const bottomPadding = useMemo(() => {
    const navbarHeight = getNavbarHeight(insets);
    const additionalPadding = 20; // Extra space for better UX
    return navbarHeight + additionalPadding;
  }, [insets]);

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: bottomPadding, // Dynamic bottom padding
            }
          ]}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
        >
          <HeroSection />
          <CategorySection />
          <ExpertsSection onBookNow={handleOpenBooking} />
          <UserReviews />
          <GetStartedSection />
        </ScrollView>

        <UnifiedBookingModal
          visible={bookingModalVisible}
          onClose={handleCloseBooking}
          expert={selectedExpert}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: { 
    flex: 1,
  },
  scrollContainer: { 
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default HomeScreen;