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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentScreen from './PaymentScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

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
                {expert?.consultantRequest?.consultantProfile?.shortBio || 
                 "Let's discuss your project requirements and how I can help you achieve your goals."}
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

          {/* Show consultant availability info */}
          {expert?.consultantRequest?.consultantProfile && (
            <View style={styles.availabilityInfo}>
              <Text style={styles.availabilityTitle}>Consultant Availability:</Text>
              <Text style={styles.availabilityText}>
                Available {expert.consultantRequest.consultantProfile.daysPerWeek || '5'} days per week
              </Text>
              <Text style={styles.availabilityText}>
                {expert.consultantRequest.consultantProfile.availableTimePerDay || '8 hours'} per day
              </Text>
              <Text style={styles.availabilityText}>
                {expert.consultantRequest.consultantProfile.yearsOfExperience} years of experience
              </Text>
              <Text style={styles.availabilityText}>
                Days: {expert.consultantRequest.consultantProfile.days?.join(', ') || 'Not specified'}
              </Text>
            </View>
          )}
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

          {/* Available days info */}
          {expert?.consultantRequest?.consultantProfile?.days && (
            <View style={styles.availableDaysInfo}>
              <Text style={styles.availableDaysTitle}>Available Days:</Text>
              <Text style={styles.availableDaysText}>
                {expert.consultantRequest.consultantProfile.days.join(', ')}
              </Text>
            </View>
          )}

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
              
              {loadingAvailability ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2E7D32" />
                  <Text style={styles.loadingText}>Loading available slots...</Text>
                </View>
              ) : availableTimeSlots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
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
                <View style={styles.timeSlotsContainer}>
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
          Time: {availableTimeSlots.find(slot => slot.id === selectedTime)?.label}
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
    marginRight: 32,
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
    marginBottom: 24,
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
  availabilityInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  availabilityText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
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
    marginBottom: 16,
    marginTop: 16,
  },
  availableDaysInfo: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  availableDaysTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  availableDaysText: {
    fontSize: 13,
    color: '#2E7D32',
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  noSlotsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  noSlotsSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
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