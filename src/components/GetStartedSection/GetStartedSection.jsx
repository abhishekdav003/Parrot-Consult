import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const GetStartedSection = ({ onStartApplication, navigation }) => {
  const steps = [
    {
      id: 1,
      icon: 'log-in-outline',
      title: 'Sign Up / Login in Dashboard',
      description: 'Create your account or log into your existing dashboard to get started.',
      iconBg: '#10B981',
    },
    {
      id: 2,
      icon: 'arrow-up-circle-outline',
      title: 'Select Profile Upgrade',
      description: 'Navigate to your profile and click on the "Upgrade to Consultant" option.',
      iconBg: '#10B981',
    },
    {
      id: 3,
      icon: 'clipboard-outline',
      title: 'Fill All Required Data',
      description: 'Complete your profile with expertise areas, experience, and qualifications.',
      iconBg: '#10B981',
    },
    {
      id: 4,
      icon: 'mail-outline',
      title: 'Get Approved via Email',
      description: "Once approved, you'll receive an email notification to start consulting.",
      iconBg: '#10B981',
    },
  ];

  const renderStep = (step, index) => (
    <View key={step.id} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        {/* Step Icon */}
        <View style={[styles.stepIconContainer, { backgroundColor: step.iconBg }]}>
          <Ionicons name={step.icon} size={24} color="#ffffff" />
        </View>

        {/* Step Details */}
        <View style={styles.stepDetails}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
        </View>

        {/* Step Number Badge */}
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumber}>{step.id}</Text>
        </View>
      </View>

      {/* Connecting Line */}
      {index < steps.length - 1 && <View style={styles.connectingLine} />}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeIconContainer}>
          <Ionicons name="people-outline" size={20} color="#10B981" />
        </View>
        <Text style={styles.welcomeText}>Currently welcoming new consultants</Text>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>How to Get Started</Text>
          <Text style={styles.headerSubtitle}>
            Follow these simple steps to become a verified consultant and start earning
          </Text>
        </View>

        {/* Steps Container */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => renderStep(step, index))}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              console.log('Start Application button pressed');
              if (onStartApplication && typeof onStartApplication === 'function') {
                console.log('Calling onStartApplication callback');
                onStartApplication();
              } else {
                console.warn('onStartApplication prop not provided or not a function');
                // Fallback navigation if prop not provided
                if (navigation && navigation.navigate) {
                  navigation.navigate('Dashboard', { initialSection: 'upgrade' });
                }
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="rocket-outline" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Start Your Application</Text>
              <Ionicons name="chevron-forward" size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* Support Link */}
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => {
              console.log('Support button clicked - navigating to ChatBot with support message');
              if (navigation && navigation.navigate) {
                // Navigate to ChatBot with "need support" query
                navigation.navigate('ChatBot', {
                  query: 'need support'
                });
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={16} color="#10B981" />
            <Text style={styles.supportText}>Need help? Contact support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Welcome Message
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeIconContainer: {
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Main Content
  mainContent: {
    marginTop: 24,
    paddingHorizontal: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Steps Container
  stepsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 32,
  },

  // Individual Step
  stepContainer: {
    position: 'relative',
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  stepDetails: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    marginLeft: 12,
    marginTop: 12,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  connectingLine: {
    position: 'absolute',
    left: 23,
    top: 64,
    bottom: -16,
    width: 2,
    backgroundColor: '#E2E8F0',
  },

  // Action Container
  actionContainer: {
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 16,
    minWidth: width * 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginHorizontal: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  supportText: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 6,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});

export default GetStartedSection;