import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const UserGetStartedSection = () => {
  const steps = [
    {
      id: 1,
      icon: 'people-outline',
      title: 'Select an Expert',
      description: 'Browse and choose from our verified consultants based on your expertise needs.',
      iconBg: '#10B981',
    },
    {
      id: 2,
      icon: 'calendar-outline',
      title: 'Pick Date & Time',
      description: 'Select your preferred date and time slot from expert availability calendar.',
      iconBg: '#10B981',
    },
    {
      id: 3,
      icon: 'wallet-outline',
      title: 'Pay the Fees',
      description: 'Complete the secure payment for your consultation session.',
      iconBg: '#10B981',
    },
    {
      id: 4,
      icon: 'link-outline',
      title: 'Get Meeting Link',
      description: 'Meeting link will be available 5 minutes before your scheduled consultation time.',
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
    <View style={styles.container}>
      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeIconContainer}>
          <Ionicons name="sparkles-outline" size={20} color="#10B981" />
        </View>
        <Text style={styles.welcomeText}>Book your consultation now</Text>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>How to Book a Meeting</Text>
          <Text style={styles.headerSubtitle}>
            Follow these simple steps to schedule your consultation with an expert
          </Text>
        </View>

        {/* Steps Container */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => renderStep(step, index))}
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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

  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});

export default UserGetStartedSection;