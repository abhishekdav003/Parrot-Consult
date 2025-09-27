import React, { useState, useMemo, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';
import PaymentScreen from './PaymentScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const UnifiedBookingModal = ({ visible, onClose, expert }) => {
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();
  
  // Core booking states
  const [currentStep, setCurrentStep] = useState('duration');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [consultationDetails, setConsultationDetails] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  
  // Payment states - FIXED: Simplified state management
  const [paymentStep, setPaymentStep] = useState(null); // null, 'payment', 'processing', 'success'
  const [bookingData, setBookingData] = useState(null);
  const [razorpayOrder, setRazorpayOrder] = useState(null);

  // Availability states
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);

  // Constants
  const DURATION = 30; // Fixed 30 minutes as per backend
  const today = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // Parse available days from consultant profile
  const availableDayIndexes = useMemo(() => {
    const days = expert?.consultantRequest?.consultantProfile?.days;
    if (!Array.isArray(days) || days.length === 0) return new Set([1, 2, 3, 4, 5]); // Default to weekdays

    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    const dayIndexes = new Set();
    days.forEach(day => {
      const normalizedDay = day.toLowerCase().trim();
      if (dayMap.hasOwnProperty(normalizedDay)) {
        dayIndexes.add(dayMap[normalizedDay]);
      }
    });

    return dayIndexes.size > 0 ? dayIndexes : new Set([1, 2, 3, 4, 5]);
  }, [expert]);

  // Fetch time slots when date changes
  useEffect(() => {
    if (selectedDate && expert) {
      fetchTimeSlots(selectedDate);
    }
  }, [selectedDate, expert]);

  // Reset when month changes
  useEffect(() => {
    if (selectedDate) {
      const selectedMonth = selectedDate.getMonth();
      const selectedYear = selectedDate.getFullYear();
      const currentViewMonth = currentMonth.getMonth();
      const currentViewYear = currentMonth.getFullYear();
      
      if (selectedMonth !== currentViewMonth || selectedYear !== currentViewYear) {
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableTimeSlots([]);
      }
    }
  }, [currentMonth]);

  // FIXED: Reset all states when modal opens/closes
  useEffect(() => {
    if (visible) {
      console.log('[BOOKING] Modal opened, resetting states');
      setCurrentStep('duration');
      setSelectedDate(null);
      setSelectedTime(null);
      setConsultationDetails('');
      setCurrentMonth(new Date());
      setLoading(false);
      setPaymentStep(null);
      setBookingData(null);
      setRazorpayOrder(null);
      setAvailableTimeSlots([]);
      setBookedSlots([]);
    }
  }, [visible]);

  const fetchTimeSlots = async (date) => {
    try {
      setLoadingAvailability(true);
      
      // Check if selected day is available
      const dayIndex = date.getDay();
      if (!availableDayIndexes.has(dayIndex)) {
        setAvailableTimeSlots([]);
        return;
      }

      // Generate time slots (9 AM to 6 PM, 30-minute intervals)
      const slots = generateTimeSlots(date);
      
      // Fetch booked slots
      const bookedResult = await ApiService.getBookedSlots(expert._id, date);
      let bookedTimes = [];
      
      if (bookedResult.success) {
        bookedTimes = (bookedResult.data || []).map(slot => slot.time);
        setBookedSlots(bookedTimes);
      }

      // Filter available slots
      const availableSlots = slots.filter(slot => !bookedTimes.includes(slot.id));
      setAvailableTimeSlots(availableSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const generateTimeSlots = (selectedDate) => {
    const slots = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    // Business hours: 9 AM to 6 PM
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // Skip past times for today
        if (isToday && slotTime <= new Date(now.getTime() + 30 * 60 * 1000)) {
          continue;
        }
        
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const displayTime = slotTime.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        slots.push({ id: timeStr, label: displayTime, datetime: slotTime });
      }
    }
    
    return slots;
  };

  const getImageSource = () => {
    if (!expert?.profileImage || expert.profileImage === '') {
      return { uri: `https://via.placeholder.com/48x48/059669/ffffff?text=${expert?.fullName?.charAt(0) || 'E'}` };
    }
    return { uri: expert.profileImage };
  };

  const handleClose = () => {
    console.log('[BOOKING] Closing booking modal');
    setCurrentStep('duration');
    setSelectedDate(null);
    setSelectedTime(null);
    setConsultationDetails('');
    setCurrentMonth(new Date());
    setLoading(false);
    setPaymentStep(null);
    setBookingData(null);
    setRazorpayOrder(null);
    setAvailableTimeSlots([]);
    setBookedSlots([]);
    onClose();
  };

  const checkAuthentication = () => {
    if (!isAuthenticated || !user) {
      Alert.alert('Login Required', 'Please login to book a consultation.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => { handleClose(); navigation.navigate('Login'); }}
      ]);
      return false;
    }
    return true;
  };

  const goToNextStep = () => {
    if (currentStep === 'duration') {
      setCurrentStep('dateTime');
    } else if (currentStep === 'dateTime') {
      if (!checkAuthentication()) return;
      handleCreateBooking();
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 'dateTime') {
      setCurrentStep('duration');
    }
  };

  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (checkDate < today) return true;
    
    // Check if day is available
    const dayIndex = checkDate.getDay();
    return !availableDayIndexes.has(dayIndex);
  };

  const handleDateSelect = (date) => {
    if (isDateDisabled(date)) return;
    
    setSelectedDate(date);
    setSelectedTime(null);
    setAvailableTimeSlots([]);
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(null); // Empty cell
    }
    
    // Add all days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
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
    
    // Fill remaining cells to complete the grid (42 cells total - 6 rows × 7 days)
    const totalCells = 42;
    while (days.length < totalCells) {
      days.push(null); // Empty cell
    }
    
    return days;
  }, [currentMonth, selectedDate, today, availableDayIndexes]);

  // FIXED: Improved booking creation with better error handling
  const handleCreateBooking = async () => {
    console.log('[BOOKING] Starting booking creation...');
    
    // Validate inputs
    if (!selectedDate || !selectedTime) {
      Alert.alert('Selection Required', 'Please select both date and time for your consultation.');
      return;
    }

    // Validate expert data
    if (!expert || !expert._id) {
      Alert.alert('Error', 'Expert information is missing. Please try again.');
      return;
    }

    // Validate user data
    if (!user || !user._id) {
      Alert.alert('Error', 'User information is missing. Please login again.');
      return;
    }

    try {
      setLoading(true);
      
      const [hours, minutes] = selectedTime.split(':');
      const bookingDateTime = new Date(selectedDate);
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Validate booking time
      const nowPlus30 = new Date(Date.now() + 30 * 60 * 1000);
      if (bookingDateTime.getTime() < nowPlus30.getTime()) {
        Alert.alert('Invalid Time', 'Please choose a time at least 30 minutes from now.');
        return;
      }
      
      // Prevent self-booking
      if (expert._id === user._id) {
        Alert.alert('Invalid Action', 'You cannot book a consultation with yourself.');
        return;
      }
      
      const newBookingData = {
        consultantId: expert._id,
        userId: user._id,
        datetime: bookingDateTime.toISOString(),
        duration: DURATION,
        consultationDetail: consultationDetails || 'General consultation'
      };

      console.log('[BOOKING] Sending booking data:', newBookingData);

      const result = await ApiService.createBooking(newBookingData);
      console.log('[BOOKING] API Result:', result);
      
      if (!result.success) {
        console.log('[BOOKING] Booking failed:', result.error);
        
        if (result.needsLogin) {
          Alert.alert('Login Required', 'Your session has expired. Please login again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => { handleClose(); navigation.navigate('Login'); }}
          ]);
          return;
        }
        
        Alert.alert('Booking Error', result.error || 'Failed to create booking. Please try again.');
        return;
      }

      // FIXED: Improved payment handling
      if (result.data?.razorpayOrder) {
        console.log('[BOOKING] Payment required, preparing payment screen');
        
        const bookingDataForPayment = { 
          ...newBookingData, 
          bookingId: result.data.bookingId,
          duration: DURATION
        };
        
        console.log('[BOOKING] Setting booking data for payment:', bookingDataForPayment);
        console.log('[BOOKING] Setting razorpay order:', result.data.razorpayOrder);
        
        // Set payment data first
        setBookingData(bookingDataForPayment);
        setRazorpayOrder(result.data.razorpayOrder);
        
        // Then trigger payment step
        setTimeout(() => {
          setPaymentStep('payment');
          console.log('[BOOKING] Payment step activated');
        }, 100);
        
      } else {
        console.log('[BOOKING] No payment required, booking confirmed');
        // Free booking or trial confirmed
        Alert.alert('Booking Confirmed!', 'Your consultation has been scheduled successfully.', [
          { text: 'OK', onPress: handleClose }
        ]);
      }
    } catch (error) {
      console.error('[BOOKING] Booking error:', error);
      Alert.alert('Booking Error', error.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Payment success handler
  const handlePaymentSuccess = () => {
    console.log('[BOOKING] Payment successful, closing all modals');
    setPaymentStep('success');
    
    setTimeout(() => {
      setPaymentStep(null);
      handleClose();
      Alert.alert('Success!', 'Your consultation has been booked successfully.');
    }, 500);
  };

  // FIXED: Payment close handler
  const handlePaymentClose = () => {
    console.log('[BOOKING] Payment screen closed');
    setPaymentStep(null);
    // Keep booking modal open so user can try again
  };

  const getSessionFee = () => {
    return expert?.consultantRequest?.consultantProfile?.sessionFee || 0;
  };

  const renderDurationStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.consultantSection}>
          <View style={styles.consultantCard}>
            <Image source={getImageSource()} style={styles.consultantImage} />
            <View style={styles.consultantInfo}>
              <Text style={styles.consultantName}>{expert?.fullName}</Text>
              <Text style={styles.consultantBio}>
                {expert?.consultantRequest?.consultantProfile?.shortBio || 'Professional consultant ready to help you'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.durationSection}>
          <Text style={styles.sectionTitle}>30-minute consultation</Text>
          <View style={styles.priceCard}>
            <Text style={styles.priceAmount}>₹{getSessionFee().toLocaleString()}</Text>
            <Text style={styles.priceLabel}>Standard session fee</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.primaryButton} onPress={goToNextStep}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Icon name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDateTimeStep = () => {
    const isBookingReady = selectedDate && selectedTime;
    
    return (
      <View style={styles.stepContainer}>
        <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
          {/* Available Days Info */}
          {expert?.consultantRequest?.consultantProfile?.days && (
            <View style={styles.infoCard}>
              <Icon name="info-outline" size={16} color="#059669" />
              <Text style={styles.infoText}>
                Available: {expert.consultantRequest.consultantProfile.days.join(', ')}
              </Text>
            </View>
          )}

          {/* Calendar */}
          <View style={styles.calendarSection}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(-1)}>
                <Icon name="chevron-left" size={20} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.monthYear}>
                {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(1)}>
                <Icon name="chevron-right" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdaysRow}>
              {weekdays.map(day => (
                <Text key={day} style={styles.weekdayHeader}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((dayInfo, index) => {
                if (!dayInfo) {
                  // Empty cell for proper alignment
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }
                
                return (
                  <TouchableOpacity
                    key={`${dayInfo.date.getTime()}-${index}`}
                    style={[
                      styles.dayCell,
                      dayInfo.isSelected && styles.selectedDayCell,
                      dayInfo.isToday && !dayInfo.isSelected && styles.todayDayCell,
                      dayInfo.isDisabled && styles.disabledDayCell,
                    ]}
                    onPress={() => handleDateSelect(dayInfo.date)}
                    disabled={dayInfo.isDisabled}
                    activeOpacity={dayInfo.isDisabled ? 1 : 0.7}
                  >
                    <Text style={[
                      styles.dayText,
                      dayInfo.isSelected && styles.selectedDayText,
                      dayInfo.isToday && !dayInfo.isSelected && styles.todayDayText,
                      dayInfo.isDisabled && styles.disabledDayText,
                    ]}>
                      {dayInfo.date.getDate()}
                    </Text>
                    {dayInfo.isToday && !dayInfo.isSelected && (
                      <View style={styles.todayDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Time Selection */}
          {selectedDate && (
            <View style={styles.timeSection}>
              <Text style={styles.timeTitle}>
                Available times on {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              
              {loadingAvailability ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.loadingText}>Loading available slots...</Text>
                </View>
              ) : availableTimeSlots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <Icon name="event-busy" size={32} color="#94A3B8" />
                  <Text style={styles.noSlotsText}>No available time slots for this date</Text>
                </View>
              ) : (
                <View style={styles.timeSlotsGrid}>
                  {availableTimeSlots.map((slot) => (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.timeSlot, selectedTime === slot.id && styles.selectedTimeSlot]}
                      onPress={() => setSelectedTime(slot.id)}
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
              )}
            </View>
          )}

          {/* Consultation Details */}
          {isBookingReady && (
            <View style={styles.consultationSection}>
              <Text style={styles.consultationTitle}>Consultation details (optional)</Text>
              <TextInput
                style={styles.consultationInput}
                placeholder="Describe your project or what you'd like to discuss..."
                multiline={true}
                numberOfLines={3}
                value={consultationDetails}
                onChangeText={setConsultationDetails}
                textAlignVertical="top"
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}
        </ScrollView>

        {/* Book Button */}
        {isBookingReady && (
          <View style={styles.bottomSection}>
            <View style={styles.bookingSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Session fee:</Text>
                <Text style={styles.summaryPrice}>₹{getSessionFee().toLocaleString()}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={goToNextStep}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Book Meeting</Text>
                  <Icon name="event" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getHeaderTitle = () => {
    return currentStep === 'duration' ? 'Book Consultation' : 'Choose Date & Time';
  };

  // FIXED: Improved modal visibility logic
  const isMainModalVisible = visible && paymentStep !== 'payment';
  const isPaymentModalVisible = paymentStep === 'payment' && bookingData && razorpayOrder && expert;

  // Debug logging
  console.log('[BOOKING MODAL] State:', {
    visible,
    paymentStep,
    isMainModalVisible,
    isPaymentModalVisible,
    hasBookingData: !!bookingData,
    hasRazorpayOrder: !!razorpayOrder,
    hasExpert: !!expert
  });

  return (
    <>
      {/* Main Booking Modal - FIXED: Improved visibility logic */}
      <Modal
        visible={isMainModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            {currentStep === 'dateTime' ? (
              <TouchableOpacity onPress={goToPreviousStep} style={styles.headerButton}>
                <Icon name="arrow-back" size={20} color="#1E293B" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerButton} />
            )}
            
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Icon name="close" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { width: currentStep === 'duration' ? '50%' : '100%' }
              ]} />
            </View>
            <Text style={styles.progressText}>
              Step {currentStep === 'duration' ? '1' : '2'} of 2
            </Text>
          </View>

          {/* Content */}
          {currentStep === 'duration' && renderDurationStep()}
          {currentStep === 'dateTime' && renderDateTimeStep()}
        </SafeAreaView>
      </Modal>

      {/* Payment Modal - FIXED: Simplified structure */}
      {isPaymentModalVisible && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handlePaymentClose}
        >
          <PaymentScreen
            visible={true}
            onClose={handlePaymentClose}
            bookingData={bookingData}
            razorpayOrder={razorpayOrder}
            onPaymentSuccess={handlePaymentSuccess}
            expert={expert}
          />
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  
  // Step Container
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Consultant Section
  consultantSection: {
    marginBottom: 32,
    paddingTop: 16,
  },
  consultantCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  consultantImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#059669',
  },
  consultantInfo: {
    flex: 1,
  },
  consultantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  consultantBio: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  
  // Duration Section
  durationSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
  },
  priceCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '500',
  },
  
  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  infoText: {
    fontSize: 12,
    color: '#047857',
    marginLeft: 8,
    flex: 1,
  },
  
  // Calendar
  calendarSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekdayHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    width: 32,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days = 14.28%
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 20,
  },
  selectedDayCell: {
    backgroundColor: '#059669',
  },
  todayDayCell: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#059669',
  },
  disabledDayCell: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  todayDayText: {
    color: '#059669',
    fontWeight: '700',
  },
  disabledDayText: {
    color: '#CBD5E1',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#059669',
  },
  
  // Time Section
  timeSection: {
    marginBottom: 24,
  },
  timeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748B',
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedTimeSlot: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  timeSlotText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  
  // Consultation Section
  consultationSection: {
    marginBottom: 24,
  },
  consultationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  consultationInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Bottom Section
  bottomSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  bookingSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryPrice: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '700',
  },
  
  // Button Styles
  primaryButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default UnifiedBookingModal;