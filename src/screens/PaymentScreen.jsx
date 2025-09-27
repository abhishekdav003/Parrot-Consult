import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';
import { useAuth } from '../context/AuthContext';
import BookingSuccessModal from '../components/BookingSuccessModal/BookingSuccessModal';

const PaymentScreen = ({ 
  visible, 
  onClose, 
  bookingData, 
  razorpayOrder, 
  onPaymentSuccess, 
  expert 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Debug logging
  console.log('[PAYMENT] PaymentScreen rendered with props:', {
    visible,
    hasBookingData: !!bookingData,
    hasRazorpayOrder: !!razorpayOrder,
    hasExpert: !!expert,
    razorpayOrderData: razorpayOrder,
    bookingDataContent: bookingData
  });

  // FIXED: Validation with better error messages
  const validateProps = () => {
    const errors = [];
    
    if (!bookingData) errors.push('Booking data is missing');
    if (!razorpayOrder) errors.push('Payment order is missing');
    if (!expert) errors.push('Expert information is missing');
    if (!user) errors.push('User information is missing');
    
    return errors;
  };

  const propErrors = validateProps();

  // Add success modal close handler
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onPaymentSuccess(); // This will close the payment screen and booking modal
  };

  // FIXED: Better error UI with retry option
  if (propErrors.length > 0) {
    console.error('[PAYMENT] Missing required props:', propErrors);
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name="arrow-back" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Error</Text>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name="close" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Payment Setup Error</Text>
          <Text style={styles.errorText}>
            {propErrors.join(', ')}. Please try booking again.
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={onClose}>
              <Icon name="refresh" size={16} color="#ffffff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const getImageSource = () => {
    if (!expert?.profileImage || expert.profileImage === '') {
      return { uri: `https://via.placeholder.com/48x48/059669/ffffff?text=${expert?.fullName?.charAt(0) || 'E'}` };
    }
    return { uri: expert.profileImage };
  };

  const formatAmount = (amount) => {
    return (amount / 100).toLocaleString('en-IN');
  };

  const formatDateTime = () => {
    if (!bookingData?.datetime) return '';
    const date = new Date(bookingData.datetime);
    return date.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // FIXED: Better Razorpay integration with proper error handling
  const initializeRazorpayPayment = async () => {
    try {
      console.log('[PAYMENT] Initializing Razorpay payment...');
      setPaymentProcessing(true);

      // Check if RazorpayCheckout is available
      const RazorpayCheckout = require('react-native-razorpay').default;
      
      if (!RazorpayCheckout) {
        // Fallback to simulation if Razorpay is not properly installed
        console.log('[PAYMENT] Razorpay not available, using simulation');
        handleSimulatedPayment();
        return;
      }

      const options = {
        description: `Consultation with ${expert.fullName}`,
        image: expert.profileImage || 'https://via.placeholder.com/100x100',
        currency: 'INR',
        key: 'rzp_test_31csbH4WG6RLV5', // Replace with your actual Razorpay key
        amount: razorpayOrder.amount,
        name: 'ParrotConsult',
        order_id: razorpayOrder.id,
        prefill: {
          email: user.email || '',
          contact: user.phone || user.phoneNumber || '',
          name: user.fullName || '',
        },
        theme: { color: '#059669' }
      };

      console.log('[PAYMENT] Opening Razorpay with options:', options);

      RazorpayCheckout.open(options)
        .then((data) => {
          console.log('[PAYMENT] Razorpay success:', data);
          handlePaymentSuccess({
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_order_id: data.razorpay_order_id,
            razorpay_signature: data.razorpay_signature
          });
        })
        .catch((error) => {
          console.log('[PAYMENT] Razorpay error:', error);
          setPaymentProcessing(false);
          
          if (error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
            Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
          } else {
            Alert.alert(
              'Payment Failed', 
              error.description || 'Payment could not be processed. Please try again.',
              [
                { text: 'Try Again', onPress: () => initializeRazorpayPayment() },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        });

    } catch (error) {
      console.error('[PAYMENT] Payment initialization error:', error);
      setPaymentProcessing(false);
      
      // If Razorpay is not installed, offer simulation
      Alert.alert(
        'Payment Setup',
        'Razorpay SDK is not properly configured. Would you like to simulate the payment for testing?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Simulate Payment', onPress: handleSimulatedPayment }
        ]
      );
    }
  };

  // FIXED: Improved simulation with better UX
  const handleSimulatedPayment = () => {
    Alert.alert(
      'Payment Simulation',
      `Amount: ₹${formatAmount(razorpayOrder?.amount || 0)}\n\nThis is a test environment. In production, this would process through Razorpay.`,
      [
        { 
          text: 'Cancel Payment', 
          style: 'cancel',
          onPress: () => {
            setPaymentProcessing(false);
            console.log('[PAYMENT] Payment simulation cancelled');
          }
        },
        { 
          text: 'Simulate Success', 
          onPress: () => {
            console.log('[PAYMENT] Simulating payment success...');
            
            const mockPaymentResponse = {
              razorpay_payment_id: 'pay_mock_' + Date.now(),
              razorpay_order_id: razorpayOrder.id,
              razorpay_signature: 'mock_signature_' + Date.now()
            };

            handlePaymentSuccess(mockPaymentResponse);
          }
        }
      ]
    );
  };

  // FIXED: Improved payment success handling with success modal
  const handlePaymentSuccess = async (paymentResponse) => {
    try {
      console.log('[PAYMENT] Processing payment success:', paymentResponse);
      setLoading(true);

      const verificationData = {
        bookingId: bookingData.bookingId,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        userId: user._id,
        consultantId: expert._id,
        amount: razorpayOrder.amount,
      };

      console.log('[PAYMENT] Verification data:', verificationData);

      const result = await ApiService.verifyRazorpayPayment(verificationData);

      if (result.success) {
        console.log('[PAYMENT] Payment verification successful');
        setLoading(false);
        setPaymentProcessing(false);
        
        // Show success modal instead of alert
        setShowSuccessModal(true);
      } else {
        throw new Error(result.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('[PAYMENT] Payment verification error:', error);
      setLoading(false);
      setPaymentProcessing(false);
      
      Alert.alert(
        'Payment Verification Failed',
        error.message || 'Payment verification failed. Please contact support if amount was deducted.',
        [
          { 
            text: 'Contact Support', 
            onPress: () => {
              // You can add support contact logic here
              Linking.openURL('mailto:support@parrotconsult.com');
            }
          },
          { 
            text: 'Try Again', 
            onPress: () => initializeRazorpayPayment()
          },
          { 
            text: 'Close', 
            style: 'cancel'
          }
        ]
      );
    }
  };

  // FIXED: Better cancellation handling
  const handlePaymentCancel = () => {
    if (paymentProcessing || loading) {
      Alert.alert(
        'Payment in Progress',
        'Please wait for the current payment process to complete.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment? Your booking will not be confirmed.',
      [
        { text: 'Continue Payment', style: 'cancel' },
        { 
          text: 'Cancel Payment', 
          style: 'destructive',
          onPress: () => {
            console.log('[PAYMENT] Payment cancelled by user');
            onClose();
          }
        }
      ]
    );
  };

  console.log('[PAYMENT] Rendering PaymentScreen UI');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePaymentCancel} style={styles.headerButton}>
          <Icon name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <TouchableOpacity onPress={handlePaymentCancel} style={styles.headerButton}>
          <Icon name="close" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Payment Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          
          {/* Consultant Info */}
          <View style={styles.consultantRow}>
            <Image source={getImageSource()} style={styles.consultantImage} />
            <View style={styles.consultantInfo}>
              <Text style={styles.consultantName}>{expert?.fullName}</Text>
              <Text style={styles.consultantCategory}>
                {expert?.consultantRequest?.consultantProfile?.category || 'Professional'} Consultant
              </Text>
            </View>
          </View>

          {/* Booking Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Icon name="schedule" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>{bookingData?.duration || 30} minutes</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="calendar-today" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Date & Time:</Text>
              <Text style={styles.detailValue}>{formatDateTime()}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="account-balance-wallet" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Session Fee:</Text>
              <Text style={styles.detailValue}>₹{formatAmount(razorpayOrder?.amount || 0)}</Text>
            </View>
          </View>

          {/* Total Amount */}
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹{formatAmount(razorpayOrder?.amount || 0)}</Text>
            </View>
            <Text style={styles.currencyNote}>Amount in Indian Rupees (INR)</Text>
          </View>
        </View>

        {/* Payment Methods Info */}
        <View style={styles.paymentMethodsCard}>
          <Text style={styles.paymentMethodsTitle}>Secure Payment via Razorpay</Text>
          <View style={styles.paymentMethodsGrid}>
            <View style={styles.paymentMethodItem}>
              <Icon name="credit-card" size={20} color="#059669" />
              <Text style={styles.paymentMethodText}>Cards</Text>
            </View>
            <View style={styles.paymentMethodItem}>
              <Icon name="account-balance" size={20} color="#059669" />
              <Text style={styles.paymentMethodText}>Net Banking</Text>
            </View>
            <View style={styles.paymentMethodItem}>
              <Icon name="phone-android" size={20} color="#059669" />
              <Text style={styles.paymentMethodText}>UPI</Text>
            </View>
            <View style={styles.paymentMethodItem}>
              <Icon name="account-balance-wallet" size={20} color="#059669" />
              <Text style={styles.paymentMethodText}>Wallets</Text>
            </View>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Icon name="security" size={16} color="#10B981" />
          <Text style={styles.securityText}>
            Your payment is secured with 256-bit SSL encryption
          </Text>
        </View>

        {/* Payment Status Indicator */}
        {(paymentProcessing || loading) && (
          <View style={styles.statusIndicator}>
            <ActivityIndicator size="small" color="#059669" />
            <Text style={styles.statusText}>
              {loading ? 'Verifying payment...' : 'Processing payment...'}
            </Text>
          </View>
        )}
      </View>

      {/* Payment Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.payButton, (loading || paymentProcessing) && styles.payButtonDisabled]}
          onPress={initializeRazorpayPayment}
          disabled={loading || paymentProcessing}
        >
          {loading || paymentProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="payment" size={20} color="#fff" />
              <Text style={styles.payButtonText}>
                Pay ₹{formatAmount(razorpayOrder?.amount || 0)}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.disclaimerText}>
          By proceeding, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>

      {/* Success Modal */}
      <BookingSuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        expertName={expert?.fullName}
        dateTime={formatDateTime()}
        duration={bookingData?.duration?.toString()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // Error Container
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  // Consultant Row
  consultantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  consultantCategory: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Details Section
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Total Section
  totalSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  currencyNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Payment Methods Card
  paymentMethodsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentMethodsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paymentMethodItem: {
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 10,
    color: '#059669',
    marginTop: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  securityText: {
    fontSize: 12,
    color: '#047857',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Status Indicator
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Bottom Section
  bottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  payButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 12,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default PaymentScreen;