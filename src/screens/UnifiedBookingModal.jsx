import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UnifiedBookingModal = ({ visible, onClose, expert, navigation }) => {
  // State management for all screens
  const [currentStep, setCurrentStep] = useState('howItWorks'); // howItWorks, duration, dateTime, confirmation
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [projectDetails, setProjectDetails] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(false);

  const today = new Date();

  // Available time slots - in a real app, this would come from the consultant's availability
  const timeSlots = [
    { id: '12:45', label: '12:45 PM' },
    { id: '13:00', label: '01:00 PM' },
    { id: '13:15', label: '01:15 PM' },
    { id: '14:00', label: '02:00 PM' },
    { id: '14:30', label: '02:30 PM' },
    { id: '15:00', label: '03:00 PM' },
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  const getImageSource = () => {
    if (!expert?.profileImage || 
        expert.profileImage === '' || 
        expert.profileImage.includes('amar-jha.dev') || 
        expert.profileImage.includes('MyImg-BjWvYtsb.svg')) {
      return { uri: 'https://via.placeholder.com/40x40/f0f0f0/999999?text=' + encodeURIComponent(expert?.fullName?.charAt(0) || 'E') };
    }
    
    if (expert.profileImage.startsWith('http')) {
      return { uri: expert.profileImage };
    }
    
    if (expert.profileImage.includes('cloudinary')) {
      return { uri: expert.profileImage };
    }
    
    if (expert.profileImage.startsWith('/uploads/')) {
      return { uri: `http://192.168.0.177:8011${expert.profileImage}` };
    }
    
    return { uri: 'https://via.placeholder.com/40x40/f0f0f0/999999?text=' + encodeURIComponent(expert?.fullName?.charAt(0) || 'E') };
  };

  // Reset all state when modal is closed
  const resetState = () => {
    setCurrentStep('howItWorks');
    setSelectedDuration('30');
    setSelectedDate(null);
    setSelectedTime(null);
    setProjectDetails('');
    setCurrentMonth(new Date());
    setLoading(false);
    setBookingCreated(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Navigation between steps
  const goToNextStep = () => {
    switch (currentStep) {
      case 'howItWorks':
        setCurrentStep('duration');
        break;
      case 'duration':
        setCurrentStep('dateTime');
        break;
      case 'dateTime':
        handleCreateBooking();
        break;
    }
  };

  const goToPreviousStep = () => {
    switch (currentStep) {
      case 'duration':
        setCurrentStep('howItWorks');
        break;
      case 'dateTime':
        setCurrentStep('duration');
        break;
      case 'confirmation':
        setCurrentStep('dateTime');
        break;
    }
  };

  // Calculate session fees based on duration
  const getSessionFee = (duration) => {
    const baseRate = expert?.consultantRequest?.consultantProfile?.sessionFee || 1000;
    if (duration === '30') {
      return baseRate;
    } else {
      return Math.round(baseRate * 1.8); // 60 minutes costs 1.8x the 30-minute rate
    }
  };

  // Date/Time logic
  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateSelect = (date) => {
    if (isDateDisabled(date)) return;
    setSelectedDate(date);
    setSelectedTime(null); // Reset time selection when date changes
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7; // Convert to Monday = 0
    
    const days = [];
    
    // Previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }
    
    // Current month's days
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      const isToday = today.toDateString() === date.toDateString();
      const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();
      const isDisabled = isDateDisabled(date);
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isDisabled,
      });
    }
    
    // Next month's leading days
    const totalCells = Math.ceil(days.length / 7) * 7;
    let nextMonthDay = 1;
    while (days.length < totalCells) {
      const date = new Date(year, month + 1, nextMonthDay);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
      nextMonthDay++;
    }
    
    return days;
  }, [currentMonth, selectedDate, today]);

  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'long'
    });
  };

  // Backend integration
  const handleCreateBooking = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Selection Required', 'Please select both date and time for your consultation.');
      return;
    }

    try {
      setLoading(true);
      
      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        Alert.alert('Error', 'Please login to book a consultation.');
        return;
      }
      
      const user = JSON.parse(userData);
      
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const bookingDateTime = new Date(selectedDate);
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Prepare booking data according to your backend model
      const bookingData = {
        consultantId: expert._id,
        userId: user._id,
        datetime: bookingDateTime.toISOString(),
        duration: parseInt(selectedDuration),
        consultationDetail: projectDetails || 'General consultation'
      };

      console.log('Creating booking with data:', bookingData);

      // Call your backend API
      const result = await ApiService.createBooking(bookingData);
      
      if (result.success) {
        setBookingCreated(true);
        setCurrentStep('confirmation');
        
        // If it's a free trial (5 minutes)
        if (selectedDuration === '5' && result.data.message?.includes('free trial')) {
          Alert.alert(
            'Booking Confirmed!', 
            'Your free trial consultation has been scheduled.',
            [{ text: 'OK', onPress: handleClose }]
          );
        } else if (result.data.razorpayOrder) {
          // Handle payment for paid bookings
          Alert.alert(
            'Booking Created!', 
            'Please complete the payment to confirm your booking.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Pay Now', onPress: () => handlePayment(result.data.razorpayOrder) }
            ]
          );
        }
      } else {
        throw new Error(result.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Payment handling (basic implementation - you'll need to integrate with Razorpay)
  const handlePayment = (razorpayOrder) => {
    // This is where you'd integrate with Razorpay SDK
    console.log('Initiating payment for order:', razorpayOrder);
    Alert.alert('Payment', 'Payment integration would be implemented here.');
  };

  // Render different steps
  const renderHowItWorks = () => (
    <>
      <View style={styles.content}>
        <Text style={styles.title}>Book a consultation</Text>
        <Text style={styles.subtitle}>How it works</Text>

        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Choose your consultant</Text>
              <Text style={styles.stepDescription}>
                Select the consultant who best fits your needs
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select date & time</Text>
              <Text style={styles.stepDescription}>
                Pick an available slot that works for you
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Let's connect</Text>
              <Text style={styles.stepDescription}>
                Meet with your consultant and get the guidance you seek
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setDontShowAgain(!dontShowAgain)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
            {dontShowAgain && (
              <Icon name="check" size={14} color="#fff" />
            )}
          </View>
          <Text style={styles.checkboxText}>Don't show again</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={goToNextStep}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedText}>Get started</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderDurationSelection = () => (
    <>
      <View style={styles.content}>
        <View style={styles.meetingSection}>
          <Text style={styles.sectionTitle}>During our meeting</Text>
          
          <View style={styles.consultantInfo}>
            <Image
              source={getImageSource()}
              style={styles.consultantAvatar}
              onError={(error) => {
                console.log('Consultant image load error:', error.nativeEvent.error);
              }}
            />
            <View style={styles.consultantText}>
              <Text style={styles.consultantMessage}>
                "You decided to take the lead on this new project, but you still feel like you can use some help/guidance? Let's talk about your project requirements."
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.durationSection}>
          <Text style={styles.durationTitle}>How long would you like to meet for?</Text>
          
          <View style={styles.durationOptions}>
            {/* Free 5-minute trial if available */}
            {!expert?.videoFreeTrial && (
              <TouchableOpacity
                style={[
                  styles.durationOption,
                  selectedDuration === '5' && styles.selectedDurationOption
                ]}
                onPress={() => setSelectedDuration('5')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.durationText,
                  selectedDuration === '5' && styles.selectedDurationText
                ]}>
                  5 minutes (Free Trial)
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.durationOption,
                selectedDuration === '30' && styles.selectedDurationOption
              ]}
              onPress={() => setSelectedDuration('30')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.durationText,
                selectedDuration === '30' && styles.selectedDurationText
              ]}>
                30 minutes (₹{getSessionFee('30').toLocaleString()})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.durationOption,
                selectedDuration === '60' && styles.selectedDurationOption
              ]}
              onPress={() => setSelectedDuration('60')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.durationText,
                selectedDuration === '60' && styles.selectedDurationText
              ]}>
                60 minutes (₹{getSessionFee('60').toLocaleString()})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={goToNextStep}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderDateTimeSelection = () => {
    const isBookingReady = selectedDate && selectedTime;
    
    return (
      <>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.question}>When would you like to meet?</Text>

          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigateMonth(-1)}
            >
              <Icon name="chevron-left" size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.monthYear}>
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigateMonth(1)}
            >
              <Icon name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekdaysContainer}>
            {weekdays.map(day => (
              <Text key={day} style={styles.weekdayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((dayInfo, index) => (
              <TouchableOpacity
                key={`${dayInfo.date.getTime()}-${index}`}
                style={[
                  styles.dayCell,
                  dayInfo.isSelected && styles.selectedDay,
                  dayInfo.isToday && !dayInfo.isSelected && styles.todayDay,
                  dayInfo.isDisabled && styles.disabledDay,
                ]}
                onPress={() => handleDateSelect(dayInfo.date)}
                disabled={dayInfo.isDisabled}
                activeOpacity={dayInfo.isDisabled ? 1 : 0.7}
              >
                <Text style={[
                  styles.dayText,
                  !dayInfo.isCurrentMonth && styles.inactiveDayText,
                  dayInfo.isSelected && styles.selectedDayText,
                  dayInfo.isToday && !dayInfo.isSelected && styles.todayDayText,
                  dayInfo.isDisabled && dayInfo.isCurrentMonth && styles.disabledDayText,
                ]}>
                  {dayInfo.date.getDate()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time Selection */}
          {selectedDate && (
            <View style={styles.timeSection}>
              <Text style={styles.timeTitle}>
                Choose a time on {formatSelectedDate()}
              </Text>
              
              <View style={styles.timeSlotsContainer}>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeSlot,
                      selectedTime === slot.id && styles.selectedTimeSlot
                    ]}
                    onPress={() => setSelectedTime(slot.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === slot.id && styles.selectedTimeSlotText
                    ]}>
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Project Details Section */}
          {isBookingReady && (
            <View style={styles.projectSection}>
              <Text style={styles.projectTitle}>Add your project details</Text>
              <TextInput
                style={styles.projectInput}
                placeholder="Please share your project details (requirements, budget, timelines, etc)"
                multiline={true}
                numberOfLines={4}
                value={projectDetails}
                onChangeText={setProjectDetails}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>
          )}
        </ScrollView>

        {/* Book Meeting Button */}
        {isBookingReady && (
          <View style={styles.bottomSection}>
            <TouchableOpacity 
              style={[styles.bookButton, loading && styles.disabledButton]}
              onPress={goToNextStep}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.bookButtonText}>Book meeting</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  const renderConfirmation = () => (
    <View style={styles.confirmationContainer}>
      <Icon name="check-circle" size={80} color="#2E7D32" />
      <Text style={styles.confirmationTitle}>Booking Confirmed!</Text>
      <Text style={styles.confirmationText}>
        Your consultation with {expert?.fullName} has been scheduled.
      </Text>
      
      <View style={styles.confirmationDetails}>
        <Text style={styles.confirmationDetail}>
          Date: {selectedDate?.toLocaleDateString()}
        </Text>
        <Text style={styles.confirmationDetail}>
          Time: {timeSlots.find(slot => slot.id === selectedTime)?.label}
        </Text>
        <Text style={styles.confirmationDetail}>
          Duration: {selectedDuration} minutes
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.doneButton}
        onPress={handleClose}
        activeOpacity={0.8}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const getHeaderTitle = () => {
    switch (currentStep) {
      case 'howItWorks':
        return '';
      case 'duration':
        return 'Book a consultation';
      case 'dateTime':
        return '';
      case 'confirmation':
        return '';
      default:
        return '';
    }
  };

  const canGoBack = currentStep !== 'howItWorks' && currentStep !== 'confirmation';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {canGoBack && (
            <TouchableOpacity onPress={goToPreviousStep} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          )}
          
          {getHeaderTitle() && (
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          )}
          
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Content based on current step */}
        {currentStep === 'howItWorks' && renderHowItWorks()}
        {currentStep === 'duration' && renderDurationSelection()}
        {currentStep === 'dateTime' && renderDateTimeSelection()}
        {currentStep === 'confirmation' && renderConfirmation()}
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 32, // Compensate for back button
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // How It Works styles
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  stepsContainer: {
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  checkboxText: {
    fontSize: 16,
    color: '#666',
  },
  getStartedButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Duration Selection styles
  meetingSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
  },
  consultantInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  consultantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f8f8f8',
  },
  consultantText: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    borderBottomLeftRadius: 4,
  },
  consultantMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  durationSection: {
    flex: 1,
  },
  durationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 20,
  },
  durationOptions: {
    gap: 12,
  },
  durationOption: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  selectedDurationOption: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedDurationText: {
    color: '#fff',
  },
  continueButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Date/Time Selection styles
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    marginTop: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekdayHeader: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 30,
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 20,
  },
  selectedDay: {
    backgroundColor: '#2E7D32',
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  disabledDay: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  inactiveDayText: {
    color: '#ccc',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  todayDayText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  disabledDayText: {
    color: '#ccc',
  },
  timeSection: {
    marginBottom: 24,
  },
  timeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedTimeSlot: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: '600',
  },
  projectSection: {
    marginBottom: 24,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  projectInput: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bookButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Confirmation styles
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  confirmationDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 40,
  },
  confirmationDetail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Common styles
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: '#fff',
  },
});

export default UnifiedBookingModal;