// src/screens/SplashScreen.jsx
import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, Text, StatusBar } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.replace('Main');
    }, 2000); // 2 seconds

    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2D5A47" barStyle="light-content" />
      
      {/* Main cream card */}
      <View style={styles.mainCard}>
        {/* Top tagline */}
        <View style={styles.topSection}>
          <Text style={styles.tagline}>FLY HIGHER WITH RIGHT ADVICE</Text>
        </View>

        {/* Logo section */}
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {/* Small circle */}
          <View style={styles.circle} />
          
          {/* Company text */}
          <Text style={styles.companyText}>
            A Product of FEB TECH IT SOLUTIONS PVT. LTD.
          </Text>
        </View>
      </View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D5A47', // Dark green background matching the image
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.05,
  },
  mainCard: {
    backgroundColor: '#F5F5DC', // Cream/beige background for the main card
    borderRadius: 20,
    width: '100%',
    height: '90%',
    paddingVertical: height * 0.04,
    paddingHorizontal: width * 0.06,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  topSection: {
    flex: 0.15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.02,
  },
  tagline: {
    fontSize: width * 0.045, // Responsive font size
    fontWeight: '600',
    color: '#2D5A47', // Dark green color for text on cream background
    textAlign: 'center',
    letterSpacing: 1.5,
    lineHeight: width * 0.055,
    fontFamily: 'System', // You can replace with custom font if available
  },
  logoSection: {
    flex: 0.65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: Math.min(width * 0.65, height * 0.4), // Responsive sizing
    height: Math.min(width * 0.65, height * 0.4),
    maxWidth: 280,
    maxHeight: 280,
  },
  bottomSection: {
    flex: 0.2,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: height * 0.01,
  },
  circle: {
    width: width * 0.025, // Small responsive circle
    height: width * 0.025,
    borderRadius: (width * 0.025) / 2,
    backgroundColor: '#2D5A47', // Dark green circle
    marginBottom: height * 0.02,
  },
  companyText: {
    fontSize: width * 0.032, // Smaller responsive font
    color: '#2D5A47', // Dark green text
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
    lineHeight: width * 0.04,
  },
});

export default SplashScreen;