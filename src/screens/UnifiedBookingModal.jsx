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
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentScreen from './PaymentScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

const UnifiedBookingModal = ({ visible, onClose, expert }) => {
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();
  
  // State management for all screens
  const [currentStep, setCurrentStep] = useState('howItWorks');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [projectDetails, setProjectDetails] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(false);
  
  // Payment related states
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [razorpayOrder, setRazorpayOrder] = useState(null);

  // New states for dynamic data
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);

  const today = new Date();

  // Canonicalize any day inputs (full names, short names, numbers, or ranges) to JS indexes: Sun=0..Sat=6
const normalizeAvailableDays = (rawDays) => {
  if (!Array.isArray(rawDays) || rawDays.length === 0) return new Set();

  const map = {
    '0': 0, '7': 0, sun: 0, sunday: 0,
    '1': 1, mon: 1, monday: 1,
    '2': 2, tue: 2, tues: 2, tuesday: 2,
    '3': 3, wed: 3, weds: 3, wednesday: 3,
    '4': 4, thu: 4, thur: 4, thurs: 4, thursday: 4,
    '5': 5, fri: 5, friday: 5,
    '6': 6, sat: 6, saturday: 6,
  };

  const out = new Set();

  const addIdx = (s) => {
    const key = s.toLowerCase().replace(/\./g, '').trim();
    const idx = map[key] ?? map[key.slice(0, 3)];
    if (typeof idx === 'number') out.add(idx);
  };

  rawDays.forEach((d) => {
    const txt = String(d).trim();
    // Support ranges like "Mon-Fri" or "2-5"
    if (txt.includes('-')) {
      const [a, b] = txt.split('-').map((x) => x.trim());
      const start = map[a.toLowerCase()] ?? map[a.toLowerCase().slice(0, 3)] ?? (isNaN(+a) ? undefined : (+a % 7));
      const end   = map[b.toLowerCase()] ?? map[b.toLowerCase().slice(0, 3)] ?? (isNaN(+b) ? undefined : (+b % 7));
      if (typeof start === 'number' && typeof end === 'number') {
        let i = start;
        // walk circularly until we hit end
        while (true) {
          out.add(i);
          if (i === end) break;
          i = (i + 1) % 7;
        }
        return;
      }
    }
    addIdx(txt);
  });

  return out;
};

const availableDayIndexes = useMemo(() => {
  const days = expert?.consultantRequest?.consultantProfile?.days;
  const set = normalizeAvailableDays(days || []);
  console.log('Available days (normalized):', Array.from(set));
  return set;
}, [expert]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // Fetch time slots when date is selected
  useEffect(() => {
    if (selectedDate && expert) {
      fetchTimeSlots(selectedDate);
    }
  }, [selectedDate, expert]);

  // Clear selection when month changes
  useEffect(() => {
    if (selectedDate) {
      const selectedMonth = selectedDate.getMonth();
      const currentViewMonth = currentMonth.getMonth();
      const selectedYear = selectedDate.getFullYear();
      const currentViewYear = currentMonth.getFullYear();
      
      if (selectedMonth !== currentViewMonth || selectedYear !== currentViewYear) {
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableTimeSlots([]);
      }
    }
  }, [currentMonth]);

  // Fetch time slots and booked slots
  const fetchTimeSlots = async (date) => {
    try {
      setLoadingAvailability(true);

      // Check if day is available
      const dayIndex = date.getDay();
      if (availableDayIndexes.size > 0 && !availableDayIndexes.has(dayIndex)) {
        setAvailableTimeSlots([]);
        setLoadingAvailability(false);
        return;
      }

      // Generate time slots based on consultant availability
      const generatedSlots = generateTimeSlots(date);
      
      // Fetch booked slots for this date
      const bookedSlotsResult = await ApiService.getBookedSlots(expert._id, date);
      let bookedTimes = [];
      
      if (bookedSlotsResult.success) {
        bookedTimes = (bookedSlotsResult.data || []).map(slot => slot.time);
        setBookedSlots(bookedTimes);
      }

      // Filter out booked slots
      const availableSlots = generatedSlots.filter(slot => 
        !bookedTimes.includes(slot.id)
      );

      setAvailableTimeSlots(availableSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Generate time slots based on consultant's available time per day
  const generateTimeSlots = (selectedDate) => {
    if (!expert?.consultantRequest?.consultantProfile) return [];

    const profile = expert.consultantRequest.consultantProfile;
    
    // Parse availableTimePerDay - could be "8 hours", "6-8 hours", etc.
    const availableTimeStr = profile.availableTimePerDay || '8';
    const hoursMatch = availableTimeStr.match(/(\d+)/);
    const availableHours = hoursMatch ? parseInt(hoursMatch[1]) : 8;
    
    // Business hours: 9 AM to 9 PM (with consultant's available hours)
    const startHour = 9;
    const maxEndHour = Math.min(21, startHour + availableHours); // Cap at 9 PM
    
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    // If it's today, start from current time + 30 minutes buffer
    let earliestTime = new Date(selectedDate);
    if (isToday) {
      const bufferTime = new Date(now.getTime() + 30 * 60 * 1000);
      earliestTime.setHours(bufferTime.getHours(), bufferTime.getMinutes(), 0, 0);
    } else {
      earliestTime.setHours(startHour, 0, 0, 0);
    }

    const slots = [];
    
    // Generate 30-minute slots
    for (let hour = startHour; hour < maxEndHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // Skip past times and too early times
        if (slotTime < earliestTime) continue;
        
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const displayTime = slotTime.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        slots.push({
          id: timeStr,
          label: displayTime,
          datetime: slotTime
        });
      }
    }

    return slots;
  };

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
    setShowPaymentScreen(false);
    setBookingData(null);
    setRazorpayOrder(null);
    setAvailableTimeSlots([]);
    setBookedSlots([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Check authentication before proceeding
  const checkAuthentication = () => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Login Required',
        'Please login to book a consultation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => {
            handleClose();
            navigation.navigate('Login');
          }}
        ]
      );
      return false;
    }
    return true;
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
        if (!checkAuthentication()) return;
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

  // Calculate session fees based on duration and consultant's rate
  const getSessionFee = (duration) => {
    const baseRate = expert?.consultantRequest?.consultantProfile?.sessionFee || 1000;
    if (duration === '30') {
      return baseRate;
    } else if (duration === '60') {
      return Math.round(baseRate * 1.8);
    }
    return baseRate;
  };

  // Check if date should be disabled
  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Past dates are disabled
    if (checkDate < today) return true;
    
    // If no availability set, allow all future dates
    if (availableDayIndexes.size === 0) return false;
    
    // Check if day is in consultant's available days
    const dayIndex = checkDate.getDay();
    return !availableDayIndexes.has(dayIndex);
  };

  const handleDateSelect = (date) => {
    if (isDateDisabled(date)) {
      return;
    }
    
    console.log('Selecting date:', date);
    console.log('[Select]', date.toDateString(), 'weekday=', date.getDay());

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
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }
    
    // Current month days
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
    
    // Next month days to fill grid
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
  }, [currentMonth, selectedDate, today, availableDayIndexes]);

  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'long'
    });
  };

  const handleCreateBooking = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Selection Required', 'Please select both date and time for your consultation.');
      return;
    }

    try {
      setLoading(true);
      
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const bookingDateTime = new Date(selectedDate);
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Check if booking is at least 30 minutes from now
      const nowPlus30 = new Date(Date.now() + 30 * 60 * 1000);
      if (bookingDateTime.getTime() < nowPlus30.getTime()) {
        Alert.alert('Invalid Time', 'Please choose a time at least 30 minutes from now.');
        setLoading(false);
        return;
      }
      
      // Prepare booking data
      const newBookingData = {
        consultantId: expert._id,
        userId: user._id,
        datetime: bookingDateTime.toISOString(),
        duration: parseInt(selectedDuration),
        consultationDetail: projectDetails || 'General consultation'
      };

      console.log('Creating booking with data:', newBookingData);

      const result = await ApiService.createBooking(newBookingData);
      console.log('Booking API result:', result);
      
      if (!result.success) {
        if (result.needsLogin) {
          Alert.alert(
            'Login Required',
            'Your session has expired. Please login again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Login', onPress: () => {
                handleClose();
                navigation.navigate('Login');
              }}
            ]
          );
          return;
        } else {
          throw new Error(result.error || 'Failed to create booking');
        }
      }

      // Handle successful booking
      if (selectedDuration === '5' || !result.data?.razorpayOrder) {
        // Free trial or no payment required
        setBookingCreated(true);
        setCurrentStep('confirmation');
        Alert.alert(
          'Booking Confirmed!', 
          'Your consultation has been scheduled successfully.',
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        // Payment required
        setBookingData({
          ...newBookingData,
          bookingId: result.data.bookingId
        });
        setRazorpayOrder(result.data.razorpayOrder);
        setShowPaymentScreen(true);
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      Alert.alert('Booking Error', error.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    setShowPaymentScreen(false);
    setBookingCreated(true);
    setCurrentStep('confirmation');
    Alert.alert(
      'Payment Successful!',
      'Your consultation has been booked successfully.',
      [{ text: 'OK', onPress: handleClose }]
    );
  };

  const handlePaymentClose = () => {
    setShowPaymentScreen(false);
  };

  // Render different steps
  const renderHowItWorks = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Book a Consultation</Text>
          <Text style={styles.subtitle}>How it works</Text>
          <View style={styles.titleUnderline} />
        </View>

        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <View style={styles.stepIconContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepLine} />
            </View>
            <View style={styles.stepContentRight}>
              <Text style={styles.stepTitle}>Choose your consultant</Text>
              <Text style={styles.stepDescription}>
                Select the consultant who best fits your needs
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIconContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepLine} />
            </View>
            <View style={styles.stepContentRight}>
              <Text style={styles.stepTitle}>Select date & time</Text>
              <Text style={styles.stepDescription}>
                Pick an available slot that works for you
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIconContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
            </View>
            <View style={styles.stepContentRight}>
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
              <Icon name="check" size={12} color="#fff" />
            )}
          </View>
          <Text style={styles.checkboxText}>Don't show again</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={goToNextStep}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Icon name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDurationSelection = () => (
    <View style={styles.stepContainer}>
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.consultantSection}>
          <Text style={styles.sectionLabel}>During our meeting</Text>
          
          <View style={styles.consultantCard}>
            <View style={styles.consultantImageContainer}>
              <Image
                source={getImageSource()}
                style={styles.consultantImage}
                onError={(error) => {
                  console.log('Consultant image load error:', error.nativeEvent.error);
                }}
              />
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.consultantInfo}>
              <Text style={styles.consultantMessage}>
                {expert?.consultantRequest?.consultantProfile?.shortBio || 
                 "Let's discuss your project requirements and how I can help you achieve your goals."}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.durationSection}>
          <Text style={styles.sectionTitle}>How long would you like to meet?</Text>
          
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
                <View style={styles.durationContent}>
                  <View style={styles.durationLeft}>
                    <Text style={[
                      styles.durationTime,
                      selectedDuration === '5' && styles.selectedDurationTime
                    ]}>
                      5 min
                    </Text>
                    <Text style={[
                      styles.durationLabel,
                      selectedDuration === '5' && styles.selectedDurationLabel
                    ]}>
                      Free Trial
                    </Text>
                  </View>
                  <View style={styles.durationRight}>
                    <Text style={[
                      styles.durationPrice,
                      selectedDuration === '5' && styles.selectedDurationPrice
                    ]}>
                      FREE
                    </Text>
                  </View>
                </View>
                {selectedDuration === '5' && (
                  <View style={styles.selectedIndicator}>
                    <Icon name="check-circle" size={20} color="#059669" />
                  </View>
                )}
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
              <View style={styles.durationContent}>
                <View style={styles.durationLeft}>
                  <Text style={[
                    styles.durationTime,
                    selectedDuration === '30' && styles.selectedDurationTime
                  ]}>
                    30 min
                  </Text>
                  <Text style={[
                    styles.durationLabel,
                    selectedDuration === '30' && styles.selectedDurationLabel
                  ]}>
                    Standard
                  </Text>
                </View>
                <View style={styles.durationRight}>
                  <Text style={[
                    styles.durationPrice,
                    selectedDuration === '30' && styles.selectedDurationPrice
                  ]}>
                    ₹{getSessionFee('30').toLocaleString()}
                  </Text>
                </View>
              </View>
              {selectedDuration === '30' && (
                <View style={styles.selectedIndicator}>
                  <Icon name="check-circle" size={20} color="#059669" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.durationOption,
                selectedDuration === '60' && styles.selectedDurationOption
              ]}
              onPress={() => setSelectedDuration('60')}
              activeOpacity={0.7}
            >
              <View style={styles.durationContent}>
                <View style={styles.durationLeft}>
                  <Text style={[
                    styles.durationTime,
                    selectedDuration === '60' && styles.selectedDurationTime
                  ]}>
                    60 min
                  </Text>
                  <Text style={[
                    styles.durationLabel,
                    selectedDuration === '60' && styles.selectedDurationLabel
                  ]}>
                    Extended
                  </Text>
                </View>
                <View style={styles.durationRight}>
                  <Text style={[
                    styles.durationPrice,
                    selectedDuration === '60' && styles.selectedDurationPrice
                  ]}>
                    ₹{getSessionFee('60').toLocaleString()}
                  </Text>
                  <Text style={styles.durationSavings}>Save 10%</Text>
                </View>
              </View>
              {selectedDuration === '60' && (
                <View style={styles.selectedIndicator}>
                  <Icon name="check-circle" size={20} color="#059669" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Show consultant availability info */}
          {expert?.consultantRequest?.consultantProfile && (
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityHeader}>
                <Icon name="info-outline" size={16} color="#059669" />
                <Text style={styles.availabilityTitle}>Consultant Availability</Text>
              </View>
              <View style={styles.availabilityContent}>
                <View style={styles.availabilityItem}>
                  <Icon name="schedule" size={14} color="#64748B" />
                  <Text style={styles.availabilityText}>
                    {expert.consultantRequest.consultantProfile.availableTimePerDay || '8 hours'} per day
                  </Text>
                </View>
                <View style={styles.availabilityItem}>
                  <Icon name="calendar-today" size={14} color="#64748B" />
                  <Text style={styles.availabilityText}>
                    {expert.consultantRequest.consultantProfile.daysPerWeek || '5'} days per week
                  </Text>
                </View>
                <View style={styles.availabilityItem}>
                  <Icon name="star" size={14} color="#64748B" />
                  <Text style={styles.availabilityText}>
                    {expert.consultantRequest.consultantProfile.yearsOfExperience} years experience
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={goToNextStep}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Icon name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDateTimeSelection = () => {
    const isBookingReady = selectedDate && selectedTime;
    
    return (
      <View style={styles.stepContainer}>
        <ScrollView 
          style={styles.stepContent} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dateTimeHeader}>
            <Text style={styles.sectionTitle}>When would you like to meet?</Text>
            
            {/* Available days info */}
            {expert?.consultantRequest?.consultantProfile?.days && (
              <View style={styles.infoCard}>
                <Icon name="info-outline" size={16} color="#059669" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Available Days:</Text>
                  <Text style={styles.infoText}>
                    {expert.consultantRequest.consultantProfile.days.join(', ')}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Calendar Section */}
          <View style={styles.calendarSection}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => navigateMonth(-1)}
                activeOpacity={0.7}
              >
                <Icon name="chevron-left" size={20} color="#64748B" />
              </TouchableOpacity>
              
              <Text style={styles.monthYear}>
                {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => navigateMonth(1)}
                activeOpacity={0.7}
              >
                <Icon name="chevron-right" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={styles.weekdaysRow}>
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
                    !dayInfo.isCurrentMonth && styles.inactiveDayText,
                    dayInfo.isSelected && styles.selectedDayText,
                    dayInfo.isToday && !dayInfo.isSelected && styles.todayDayText,
                    dayInfo.isDisabled && dayInfo.isCurrentMonth && styles.disabledDayText,
                  ]}>
                    {dayInfo.date.getDate()}
                  </Text>
                  {dayInfo.isToday && !dayInfo.isSelected && (
                    <View style={styles.todayDot} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Selection */}
          {selectedDate && (
            <View style={styles.timeSection}>
              <Text style={styles.timeTitle}>
                Choose a time on {formatSelectedDate()}
              </Text>
              
              {loadingAvailability ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.loadingText}>Loading available slots...</Text>
                </View>
              ) : availableTimeSlots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <Icon name="event-busy" size={32} color="#94A3B8" />
                  <Text style={styles.noSlotsText}>
                    No available time slots for this date
                  </Text>
                  {bookedSlots.length > 0 && (
                    <Text style={styles.noSlotsSubtext}>
                      Booked slots: {bookedSlots.join(', ')}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.timeSlotsGrid}>
                  {availableTimeSlots.map((slot) => (
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
                      {selectedTime === slot.id && (
                        <View style={styles.timeSlotCheck}>
                          <Icon name="check" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Project Details Section */}
          {isBookingReady && (
            <View style={styles.projectSection}>
              <Text style={styles.projectTitle}>Add your project details</Text>
              <Text style={styles.projectSubtitle}>Help us prepare for a better consultation</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.projectInput}
                  placeholder="Please share your project details (requirements, budget, timelines, etc)"
                  multiline={true}
                  numberOfLines={4}
                  value={projectDetails}
                  onChangeText={setProjectDetails}
                  textAlignVertical="top"
                  placeholderTextColor="#94A3B8"
                />
                <Icon name="edit" size={16} color="#94A3B8" style={styles.inputIcon} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Book Meeting Button */}
        {isBookingReady && (
          <View style={styles.bottomSection}>
            <View style={styles.bookingSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration:</Text>
                <Text style={styles.summaryValue}>{selectedDuration} minutes</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount:</Text>
                <Text style={styles.summaryPrice}>
                  {selectedDuration === '5' ? 'FREE' : `₹${getSessionFee(selectedDuration).toLocaleString()}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={goToNextStep}
              disabled={loading}
              activeOpacity={0.8}
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

  const renderConfirmation = () => (
    <View style={styles.confirmationContainer}>
      <View style={styles.confirmationContent}>
        <View style={styles.successIcon}>
          <Icon name="check-circle" size={64} color="#059669" />
        </View>
        
        <Text style={styles.confirmationTitle}>Booking Confirmed!</Text>
        <Text style={styles.confirmationSubtitle}>
          Your consultation with {expert?.fullName} has been scheduled successfully.
        </Text>
        
        <View style={styles.confirmationCard}>
          <View style={styles.confirmationHeader}>
            <Image source={getImageSource()} style={styles.confirmationImage} />
            <View>
              <Text style={styles.confirmationExpertName}>{expert?.fullName}</Text>
              <Text style={styles.confirmationExpertRole}>
                {expert?.consultantRequest?.consultantProfile?.category}
              </Text>
            </View>
          </View>
          
          <View style={styles.confirmationDetails}>
            <View style={styles.confirmationDetailRow}>
              <Icon name="calendar-today" size={16} color="#059669" />
              <Text style={styles.confirmationDetailText}>
                {selectedDate?.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.confirmationDetailRow}>
              <Icon name="access-time" size={16} color="#059669" />
              <Text style={styles.confirmationDetailText}>
                {availableTimeSlots.find(slot => slot.id === selectedTime)?.label}
              </Text>
            </View>
            <View style={styles.confirmationDetailRow}>
              <Icon name="schedule" size={16} color="#059669" />
              <Text style={styles.confirmationDetailText}>
                {selectedDuration} minutes session
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.confirmationActions}>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Dashboard')}
            activeOpacity={0.8}
          >
            <Icon name="dashboard" size={16} color="#059669" />
            <Text style={styles.secondaryButtonText}>View Dashboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
            <Icon name="check" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const getHeaderTitle = () => {
    switch (currentStep) {
      case 'howItWorks':
        return '';
      case 'duration':
        return 'Select Duration';
      case 'dateTime':
        return 'Choose Date & Time';
      case 'confirmation':
        return '';
      default:
        return '';
    }
  };

  const canGoBack = currentStep !== 'howItWorks' && currentStep !== 'confirmation';

  return (
    <>
      <Modal
        visible={visible && !showPaymentScreen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            {canGoBack ? (
              <TouchableOpacity onPress={goToPreviousStep} style={styles.headerButton}>
                <Icon name="arrow-back" size={20} color="#1E293B" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerButton} />
            )}
            
            {getHeaderTitle() && (
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
                <View style={styles.headerTitleUnderline} />
              </View>
            )}
            
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Icon name="close" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          {currentStep !== 'confirmation' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: currentStep === 'howItWorks' ? '33%' : 
                            currentStep === 'duration' ? '66%' : '100%' 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                Step {currentStep === 'howItWorks' ? '1' : 
                      currentStep === 'duration' ? '2' : '3'} of 3
              </Text>
            </View>
          )}

          {/* Content based on current step */}
          {currentStep === 'howItWorks' && renderHowItWorks()}
          {currentStep === 'duration' && renderDurationSelection()}
          {currentStep === 'dateTime' && renderDateTimeSelection()}
          {currentStep === 'confirmation' && renderConfirmation()}
        </SafeAreaView>
      </Modal>

      {/* Payment Screen Modal */}
      <Modal
        visible={showPaymentScreen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handlePaymentClose}
      >
        <SafeAreaView style={styles.container}>
          <PaymentScreen
            visible={showPaymentScreen}
            onClose={handlePaymentClose}
            bookingData={bookingData}
            razorpayOrder={razorpayOrder}
            onPaymentSuccess={handlePaymentSuccess}
            expert={expert}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // Header Styles
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.1,
  },
  headerTitleUnderline: {
    width: 24,
    height: 2,
    backgroundColor: '#059669',
    borderRadius: 1,
    marginTop: 2,
  },
  
  // Progress Styles
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Step Container
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // How It Works Styles
  titleSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: '#059669',
    borderRadius: 2,
  },
  
  // Steps Styles
  stepsContainer: {
    flex: 1,
    paddingTop: 20,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: '#D1FAE5',
    marginTop: 8,
  },
  stepContentRight: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.2,
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Duration Selection Styles
  consultantSection: {
    marginBottom: 32,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  consultantCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  consultantImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  consultantImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#059669',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  consultantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  consultantMessage: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  durationSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.2,
  },
  durationOptions: {
    marginBottom: 24,
  },
  durationOption: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 12,
    position: 'relative',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedDurationOption: {
    backgroundColor: '#F0FDF4',
    borderColor: '#059669',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  durationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  durationLeft: {
    flex: 1,
  },
  durationTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  selectedDurationTime: {
    color: '#059669',
  },
  durationLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedDurationLabel: {
    color: '#047857',
  },
  durationRight: {
    alignItems: 'flex-end',
  },
  durationPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  selectedDurationPrice: {
    color: '#059669',
  },
  durationSavings: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  
  // Availability Card
  availabilityCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  availabilityContent: {
    gap: 8,
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 13,
    color: '#047857',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Date Time Selection Styles
  dateTimeHeader: {
    paddingTop: 16,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  infoContent: {
    marginLeft: 8,
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  infoText: {
    fontSize: 12,
    color: '#047857',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Calendar Styles
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
    paddingHorizontal: 4,
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekdayHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    width: 32,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayCell: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 16,
    position: 'relative',
  },
  selectedDayCell: {
    backgroundColor: '#059669',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inactiveDayText: {
    color: '#CBD5E1',
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
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#059669',
  },
  
  // Time Selection Styles
  timeSection: {
    marginBottom: 24,
  },
  timeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  noSlotsSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    position: 'relative',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedTimeSlot: {
    backgroundColor: '#059669',
    borderColor: '#059669',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  timeSlotText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedTimeSlotText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  timeSlotCheck: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  
  // Project Details Styles
  projectSection: {
    marginBottom: 24,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  projectSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputContainer: {
    position: 'relative',
  },
  projectInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    paddingRight: 40,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  
  // Bottom Section Styles
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
  
  // Booking Summary
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
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  summaryPrice: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  // Checkbox Styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkboxText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0.2,
  },
  
  // Confirmation Styles
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  confirmationContent: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.3,
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  confirmationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  confirmationImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#059669',
  },
  confirmationExpertName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  confirmationExpertRole: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  confirmationDetails: {
    gap: 12,
  },
  confirmationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmationDetailText: {
    fontSize: 14,
    color: '#1E293B',
    marginLeft: 12,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  confirmationActions: {
    width: '100%',
  },
});

export default UnifiedBookingModal;
