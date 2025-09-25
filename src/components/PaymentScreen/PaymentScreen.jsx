import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';

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

  // Mock payment processing for demo - replace with actual Razorpay integration
  const handlePayment = async () => {
    try {
      setPaymentProcessing(true);
      
      if (!razorpayOrder || !bookingData) {
        throw new Error('Payment details not available');
      }

      // Mock payment success - replace with actual Razorpay integration
      const mockPaymentResult = {
        razorpay_payment_id: `pay_${Date.now()}`,
        razorpay_order_id: razorpayOrder.id,
        razorpay_signature: `mock_signature_${Date.now()}`,
      };

      // Verify payment with backend
      const verifyPayload = {
        bookingId: bookingData.bookingId,
        razorpay_payment_id: mockPaymentResult.razorpay_payment_id,
        razorpay_order_id: mockPaymentResult.razorpay_order_id,
        razorpay_signature: mockPaymentResult.razorpay_signature,
        userId: user._id,
        consultantId: expert._id,
        amount: razorpayOrder.amount,
      };

      const paymentResponse = await ApiService.verifyRazorpayPayment(verifyPayload);
      
      if (paymentResponse.success) {
        onPaymentSuccess();
      } else {
        throw new Error(paymentResponse.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Payment could not be processed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const getImageSource = () => {
    if (!expert?.profileImage || 
        expert.profileImage === '' || 
        expert.profileImage.includes('amar-jha.dev') || 
        expert.profileImage.includes('MyImg-BjWvYtsb.svg')) {
      return { uri: 'https://via.placeholder.com/60x60/D1FAE5/059669?text=' + encodeURIComponent(expert?.fullName?.charAt(0) || 'E') };
    }
    
    if (expert.profileImage.startsWith('http')) {
      return { uri: expert.profileImage };
    }
    
    return { uri: 'https://via.placeholder.com/60x60/D1FAE5/059669?text=' + encodeURIComponent(expert?.fullName?.charAt(0) || 'E') };
  };

  const formatDateTime = () => {
    if (!bookingData?.datetime) return '';
    
    const date = new Date(bookingData.datetime);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ' at ' + date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getAmount = () => {
    return razorpayOrder?.amount ? (razorpayOrder.amount / 100) : 0;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Payment</Text>
            <View style={styles.headerUnderline} />
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Payment Summary Card */}
          <View style={styles.summaryCard}>
  <View style={styles.summaryHeader}>
    <View style={styles.consultantInfo}>
      <Image
        source={getImageSource()}
        style={styles.consultantImage}
        onError={(error) => {
          console.log('Consultant image load error:', error.nativeEvent.error);
        }}
      />
      <View style={styles.consultantDetails}>
        <Text style={styles.consultantName}>{expert?.fullName}</Text>
        <Text style={styles.consultantRole}>
          {expert?.consultantRequest?.consultantProfile?.category || 
           expert?.consultantRequest?.consultantProfile?.fieldOfStudy}
        </Text>
      </View>
    </View>
    <Text style={styles.paymentTitle}>Payment Summary</Text>
  </View>
</View>


          {/* Booking Details */}
          <View style={styles.bookingDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Icon name="calendar-today" size={16} color="#059669" />
                <Text style={styles.detailLabel}>Date & Time</Text>
              </View>
              <Text style={styles.detailValue}>{formatDateTime()}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Icon name="schedule" size={16} color="#059669" />
                <Text style={styles.detailLabel}>Duration</Text>
              </View>
              <Text style={styles.detailValue}>{bookingData?.duration} minutes</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Icon name="video-call" size={16} color="#059669" />
                <Text style={styles.detailLabel}>Session Type</Text>
              </View>
              <Text style={styles.detailValue}>Video Consultation</Text>
            </View>

            {bookingData?.consultationDetail && (
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <Icon name="notes" size={16} color="#059669" />
                  <Text style={styles.detailLabel}>Details</Text>
                </View>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {bookingData.consultationDetail}
                </Text>
              </View>
            )}
          </View>

          {/* Payment Breakdown */}
          <View style={styles.paymentBreakdown}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Consultation Fee</Text>
              <Text style={styles.breakdownValue}>₹{getAmount()}</Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Fee</Text>
              <Text style={styles.breakdownValue}>₹0</Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Taxes</Text>
              <Text style={styles.breakdownValue}>Included</Text>
            </View>
            
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{getAmount()}</Text>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.paymentMethods}>
            <Text style={styles.methodsTitle}>Payment Method</Text>
            
            <View style={styles.methodOption}>
              <View style={styles.methodLeft}>
                <View style={styles.razorpayIcon}>
                  <Icon name="payment" size={24} color="#3b8c60" />
                </View>
                <View>
                  <Text style={styles.methodName}>Razorpay</Text>
                  <Text style={styles.methodDescription}>
                    UPI, Cards, Net Banking & More
                  </Text>
                </View>
              </View>
              <View style={styles.secureIcon}>
                <Icon name="security" size={16} color="#10B981" />
                <Text style={styles.secureText}>Secure</Text>
              </View>
            </View>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Icon name="lock" size={16} color="#059669" />
            <Text style={styles.securityText}>
              Your payment is secured with 256-bit SSL encryption. We don't store your payment details.
            </Text>
          </View>

          {/* Terms & Conditions */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              By proceeding with payment, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>₹{getAmount()}</Text>
          </View>
          
          <TouchableOpacity
            onPress={handlePayment}
            disabled={paymentProcessing || loading}
            style={[styles.payButton, (paymentProcessing || loading) && styles.disabledButton]}
            activeOpacity={0.8}
          >
            {paymentProcessing || loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Icon name="payment" size={20} color="#ffffff" />
                <Text style={styles.payButtonText}>Pay Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  headerUnderline: {
    width: 30,
    height: 2,
    backgroundColor: '#3b8c60',
    borderRadius: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  summaryHeader: {
    marginBottom: 20,
  },
  consultantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  consultantImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#059669',
    marginRight: 12,
  },
  consultantDetails: {
    flex: 1,
  },
  consultantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  consultantRole: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  bookingDetails: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  paymentBreakdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
  },
  paymentMethods: {
    marginTop: 24,
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  razorpayIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  secureIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  secureText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  securityText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  termsSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#059669',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
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
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amountLabel: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 20,
    color: '#059669',
    fontWeight: '700',
  },
  payButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  disabledButton: {
    opacity: 0.6,
    elevation: 1,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default PaymentScreen