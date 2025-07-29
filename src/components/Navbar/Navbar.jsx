import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  ScrollView
} from 'react-native';

const { width } = Dimensions.get('window');

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    { title: 'Home', active: false },
    { title: 'Categories', active: false },
    { title: 'How it Works', active: false },
    { title: 'About Us', active: false }
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const renderDesktopNav = () => (
    <View style={styles.desktopContainer}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>consult</Text>
      </View>

      {/* Navigation Items */}
      <View style={styles.navItems}>
        {navigationItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.navItem}>
            <Text style={styles.navText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Join Button */}
      <TouchableOpacity style={styles.joinButton}>
        <Text style={styles.joinButtonText}>Join as Consultant</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMobileNav = () => (
    <View style={styles.mobileContainer}>
      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.mobileLogo}
            resizeMode="contain"
          />
          <Text style={styles.mobileLogoText}>consult</Text>
        </View>

        {/* Hamburger Menu */}
        <TouchableOpacity 
          style={styles.hamburger}
          onPress={toggleMenu}
        >
          <View style={[styles.hamburgerLine, isMenuOpen && styles.hamburgerLineActive]} />
          <View style={[styles.hamburgerLine, isMenuOpen && styles.hamburgerLineActive]} />
          <View style={[styles.hamburgerLine, isMenuOpen && styles.hamburgerLineActive]} />
        </TouchableOpacity>
      </View>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <View style={styles.mobileMenu}>
          <ScrollView style={styles.mobileMenuScroll}>
            {navigationItems.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.mobileNavItem}
                onPress={() => setIsMenuOpen(false)}
              >
                <Text style={styles.mobileNavText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.mobileJoinButton}
              onPress={() => setIsMenuOpen(false)}
            >
              <Text style={styles.mobileJoinButtonText}>Join as Consultant</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.navbar}>
      {width >= 768 ? renderDesktopNav() : renderMobileNav()}
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: '#2d7a4b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  
  // Desktop Styles
  desktopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 64,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  logo: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  
  navItems: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'center',
  },
  
  navItem: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  
  navText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  
  joinButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flex: 1,
    alignItems: 'flex-end',
  },
  
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Mobile Styles
  mobileContainer: {
    width: '100%',
  },
  
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
  },
  
  mobileLogo: {
    width: 32,
    height: 32,
    marginRight: 6,
  },
  
  mobileLogoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  
  hamburger: {
    padding: 4,
  },
  
  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: 'white',
    marginVertical: 2,
    borderRadius: 2,
  },
  
  hamburgerLineActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  
  mobileMenu: {
    backgroundColor: '#2d7a4b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  mobileMenuScroll: {
    maxHeight: 300,
  },
  
  mobileNavItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  mobileNavText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  
  mobileJoinButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  
  mobileJoinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Navbar;