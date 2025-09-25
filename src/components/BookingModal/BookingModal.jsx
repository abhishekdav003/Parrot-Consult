import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import PaymentScreen from '../PaymentScreen/PaymentScreen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const BookingModal = ({ visible, onClose, expert }) => {
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();
  
  // Add debug logging for modal visibility
  useEffect(() => {
    console.log('📭 BookingModal render state:', {
      visible,
      hasExpert: !!expert,
      expertName: expert?.fullName
    });
  }, [visible, expert]);
  
  // State management
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [consultationDetails, setConsultationDetails] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  
  // Payment related states
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [razorpayOrder, setRazorpayOrder] = useState(null);

  // Dynamic data states
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);

  const today = new Date();

  // Generate available dates based on consultant's schedule
  useEffect(() => {
    if (expert && visible) {
      generateAvailableDates();
    }
  }, [expert, visible]);

  // Fetch time slots when date is selected
  useEffect(() => {
    if (selectedDate && expert) {
      fetchTimeSlots(selectedDate);
    }
  }, [selectedDate, expert]);

  const generateAvailableDates = () => {
    if (!expert?.consultantRequest?.consultantProfile?.days) {
      setAvailableDates([]);
      return;
    }

    const consultantDays = expert.consultantRequest.consultantProfile.days.map(day => day.trim());
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (consultantDays.includes(dayName)) {
        dates.push({
          date: date.toISOString().split('T')[0],
          dayName,
          displayDate: date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          fullDate: date
        });
      }
    }

    setAvailableDates(dates);
  };

  const fetchTimeSlots = async (dateObj) => {
    try {
      setLoadingAvailability(true);
      
      // Generate time slots (9 AM - 3 PM as per frontend)
      const slots = generateTimeSlots();
      
      // Fetch booked slots for this date
      const bookedSlotsResult = await ApiService.getBookedSlots(expert._id, dateObj.fullDate);
      let bookedTimes = [];
      
      if (bookedSlotsResult.success) {
        bookedTimes = (bookedSlotsResult.data || []).map(slot => slot.time);
        setBookedSlots(bookedTimes);
      }

      // Filter out booked slots
      const availableSlots = slots.filter(slot => 
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

  const generateTimeSlots = () => {
    const slots = [];
    const startTime = 9; // 9 AM
    const endTime = 15; // 3 PM
    
    for (let hour = startTime; hour < endTime; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const displayTime = new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        slots.push({
          id: timeStr,
          label: displayTime
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
      return { uri: 'https://via.placeholder.com/80x80/D1FAE5/059669?text=' + encodeURIComponent(expert?.fullName?.charAt(0) || 'E') };
    }
    
    if (expert.profileImage.startsWith('http')) {
      return { uri: expert.profileImage };
    }
    
    return { uri: 'https://via.placeholder.com/80x80/D1FAE5/059669?text=' + encodeURIComponent(expert?.fullName?.charAt(0) || 'E') };
  };

  const resetState = () => {
    setSelectedDuration('30');
    setSelectedDate(null);
    setSelectedTime(null);
    setConsultationDetails('');
    setCurrentMonth(new Date());
    setLoading(false);
    setShowPaymentScreen(false);
    setBookingData(null);
    setRazorpayOrder(null);
    setAvailableTimeSlots([]);
    setBookedSlots([]);
    setAvailableDates([]);
  };

  const handleClose = () => {
    console.log('🚪 Closing BookingModal...');
    resetState();
    onClose();
  };

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

  const handleBookMeeting = async () => {
    if (!checkAuthentication()) return;
    
    if (!selectedDate || !selectedTime) {
      Alert.alert('Selection Required', 'Please select both date and time for your consultation.');
      return;
    }

    if (expert._id === user._id) {
      Alert.alert("Error", "Booking yourself is not allowed.");
      return;
    }

    try {
      setLoading(true);
      
      // Combine date and time
      const combinedDateTime = new Date(`${selectedDate.date}T${selectedTime}:00`);
      
      const payload = {
        datetime: combinedDateTime.toISOString(),
        duration: parseInt(selectedDuration),
        consultationDetail: consultationDetails || 'General consultation',
        consultantId: expert._id,
        userId: user._id,
      };

      console.log('Creating booking with payload:', payload);

      const result = await ApiService.createBooking(payload);
      
      if (!result.success) {
        if (result.needsLogin) {
          Alert.alert(
            'Session Expired',
            'Please login again to continue.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Login', onPress: () => {
                handleClose();
                navigation.navigate('Login');
              }}
            ]
          );
          return;
        }
        throw new Error(result.error || 'Failed to create booking');
      }

      const { bookingId, razorpayOrder } = result.data;

      if (razorpayOrder && razorpayOrder.id) {
        // Payment required
        setBookingData({
          ...payload,
          bookingId
        });
        setRazorpayOrder(razorpayOrder);
        setShowPaymentScreen(true);
      } else {
        // Free trial or no payment required
        Alert.alert(
          'Booking Confirmed!',
          'Your consultation has been scheduled successfully.',
          [{ text: 'OK', onPress: handleClose }]
        );
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Booking Error', error.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentScreen(false);
    Alert.alert(
      'Payment Successful!',
      'Your consultation has been booked successfully.',
      [{ text: 'OK', onPress: handleClose }]
    );
  };

  const handlePaymentClose = () => {
    setShowPaymentScreen(false);
  };

  const getSessionFee = () => {
    return expert?.consultantRequest?.consultantProfile?.sessionFee || 1000;
  };

  // Don't render if not visible or no expert
  if (!visible || !expert) {
    console.log('❌ BookingModal NOT rendering - visible:', visible, 'expert:', !!expert);
    return null;
  }

  console.log('✅ BookingModal IS RENDERING for expert:', expert.fullName, 'showPaymentScreen:', showPaymentScreen);

  // Use absolute positioning overlay instead of Modal
  return (
    <>
      {/* Main Booking Overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.backdrop}>
          <TouchableOpacity 
            style={styles.backdropTouch} 
            activeOpacity={1} 
            onPress={handleClose}
          />
        </View>
        
        <SafeAreaView style={styles.container}>
          {/* Debug Header - Remove after testing */}
          <View style={{ backgroundColor: 'red', padding: 10, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              BOOKING MODAL IS OPEN - {expert.fullName}
            </Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Book a consultation</Text>
              <View style={styles.headerUnderline} />
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Expert Profile Section */}
            <View style={styles.expertSection}>
              <View style={styles.expertHeader}>
                <View style={styles.expertImageContainer}>
                  <Image
                    source={getImageSource()}
                    style={styles.expertImage}
                    onError={(error) => {
                      console.log('Expert image load error:', error.nativeEvent.error);
                    }}
                  />
                  <View style={styles.verifiedBadge}>
                    <Icon name="verified" size={16} color="#10B981" />
                  </View>
                </View>
                
                <View style={styles.expertInfo}>
                  <Text style={styles.expertName}>{expert.fullName}</Text>
                  <Text style={styles.expertCategory}>
                    {expert.consultantRequest?.consultantProfile?.category || 
                     expert.consultantRequest?.consultantProfile?.fieldOfStudy}
                  </Text>
                  <Text style={styles.expertBio} numberOfLines={2}>
                    {expert.consultantRequest?.consultantProfile?.shortBio}
                  </Text>
                </View>
              </View>
            </View>

            {/* Duration Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How long would you like to meet for?</Text>
              <View style={styles.durationContainer}>
                <TouchableOpacity
                  style={[
                    styles.durationOption,
                    selectedDuration === '30' && styles.selectedDuration
                  ]}
                  onPress={() => setSelectedDuration('30')}
                  activeOpacity={0.7}
                >
                  <View style={styles.durationInfo}>
                    <Text style={[
                      styles.durationTime,
                      selectedDuration === '30' && styles.selectedText
                    ]}>30 minutes</Text>
                  </View>
                  <Text style={[
                    styles.durationPrice,
                    selectedDuration === '30' && styles.selectedPrice
                  ]}>
                    ₹{getSessionFee()}
                  </Text>
                  {selectedDuration === '30' && (
                    <View style={styles.selectedIndicator}>
                      <Icon name="check" size={16} color="#059669" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.dateScrollContainer}
                contentContainerStyle={styles.dateContainer}
              >
                {availableDates.map((dateObj) => (
                  <TouchableOpacity
                    key={dateObj.date}
                    style={[
                      styles.dateOption,
                      selectedDate?.date === dateObj.date && styles.selectedDate
                    ]}
                    onPress={() => {
                      setSelectedDate(dateObj);
                      setSelectedTime(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dateDay,
                      selectedDate?.date === dateObj.date && styles.selectedDateText
                    ]}>{dateObj.dayName}</Text>
                    <Text style={[
                      styles.dateText,
                      selectedDate?.date === dateObj.date && styles.selectedDateText
                    ]}>{dateObj.displayDate}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Time Selection */}
            {selectedDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Time</Text>
                {loadingAvailability ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={styles.loadingText}>Loading available times...</Text>
                  </View>
                ) : availableTimeSlots.length === 0 ? (
                  <View style={styles.noSlotsContainer}>
                    <Text style={styles.noSlotsText}>No available time slots for this date</Text>
                  </View>
                ) : (
                  <View style={styles.timeContainer}>
                    {availableTimeSlots.map((time) => (
                      <TouchableOpacity
                        key={time.id}
                        style={[
                          styles.timeOption,
                          selectedTime === time.id && styles.selectedTime
                        ]}
                        onPress={() => setSelectedTime(time.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.timeText,
                          selectedTime === time.id && styles.selectedTimeText
                        ]}>
                          {time.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Consultation Details */}
            {selectedDate && selectedTime && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Consultation Detail</Text>
                <TextInput
                  value={consultationDetails}
                  onChangeText={setConsultationDetails}
                  placeholder="Please describe your project or what you'd like to discuss during the consultation..."
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}
          </ScrollView>

          {/* Book Button */}
          {selectedDate && selectedTime && (
            <View style={styles.bottomSection}>
              <TouchableOpacity
                onPress={handleBookMeeting}
                disabled={loading}
                style={[styles.bookButton, loading && styles.disabledButton]}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Icon name="event" size={20} color="#ffffff" />
                    <Text style={styles.bookButtonText}>Book Meeting</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* Payment Screen Modal */}
      {showPaymentScreen && (
        <PaymentScreen
          visible={showPaymentScreen}
          onClose={handlePaymentClose}
          bookingData={bookingData}
          razorpayOrder={razorpayOrder}
          onPaymentSuccess={handlePaymentSuccess}
          expert={expert}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouch: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: 50, // Space from top
    marginHorizontal: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#103e39',
    marginBottom: 4,
  },
  headerUnderline: {
    width: 40,
    height: 2,
    backgroundColor: '#3b8c60',
    borderRadius: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  expertSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  expertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expertImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  expertImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  expertInfo: {
    flex: 1,
  },
  expertName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#103e39',
    marginBottom: 4,
  },
  expertCategory: {
    fontSize: 14,
    color: '#3b8c60',
    fontWeight: '500',
    marginBottom: 8,
  },
  expertBio: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#103e39',
    marginBottom: 16,
  },
  durationContainer: {
    gap: 12,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  selectedDuration: {
    backgroundColor: '#F0FDF4',
    borderColor: '#3b8c60',
  },
  durationInfo: {
    flex: 1,
  },
  durationTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  selectedText: {
    color: '#3b8c60',
  },
  durationPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  selectedPrice: {
    color: '#3b8c60',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  dateScrollContainer: {
    marginBottom: 8,
  },
  dateContainer: {
    paddingHorizontal: 4,
    gap: 12,
  },
  dateOption: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedDate: {
    backgroundColor: '#3b8c60',
    borderColor: '#3b8c60',
  },
  dateDay: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#1E293B',
    textAlign: 'center',
  },
  selectedDateText: {
    color: '#ffffff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
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
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeOption: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  selectedTime: {
    backgroundColor: '#3b8c60',
    borderColor: '#3b8c60',
  },
  timeText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedTimeText: {
    color: '#ffffff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  bottomSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bookButton: {
    backgroundColor: '#3b8c60',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#3b8c60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingModal;