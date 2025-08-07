import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuth } from '../context/AuthContext';

const PaymentScreen = ({ 
  visible, 
  onClose, 
  bookingData, 
  razorpayOrder, 
  onPaymentSuccess,
  expert 
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const sessionFee = expert?.consultantRequest?.consultantProfile?.sessionFee || 0;
  const duration = parseInt(bookingData?.duration || '30');
  const { user } = useAuth();
  
  
  const calculateAmount = () => {
    if (duration === 30) {
      return sessionFee;
    } else if (duration === 60) {
      return Math.round(sessionFee * 1.8);
    }
    return sessionFee;
  };

  const getImageSource = () => {
    if (!expert?.profileImage || 
        expert.profileImage === '' || 
        expert.profileImage.includes('amar-jha.dev') || 
        expert.profileImage.includes('MyImg-BjWvYtsb.svg')) {
      return { uri: 'https://via.placeholder.com/60x60/f0f0f0/999999?text=' + encodeURIComponent(expert?.fullName?.charAt(0) || 'E') };
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
    
    return { uri: 'https://via.placeholder.com/60x60/f0f0f0/999999?text=' + encodeURIComponent(expert?.fullName?.charAt(0) || 'E') };
  };

  const handlePayment = async () => {
  try {
    setPaymentProcessing(true);

    const imageSource = getImageSource();

    const options = {
      description: `Consultation with ${expert.fullName}`,
      image: imageSource.uri,
      currency: 'INR',
      key: 'rzp_test_31csbH4WG6RLV5', // 🔁 Replace with your actual Razorpay key
      amount: razorpayOrder.amount,
      order_id: razorpayOrder.id,
      name: 'parrot',
      prefill: {
        email: user?.email || 'example@example.com',
        contact: user?.phone || '9999999999',
        name: user?.fullName || 'User'
      },
      theme: { color: '#2E7D32' }
    };

    const data = await RazorpayCheckout.open(options);

    const paymentVerificationData = {
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
      bookingId: bookingData.bookingId,
    };

    const verifyResult = await ApiService.verifyRazorpayPayment(paymentVerificationData);

    if (verifyResult.success) {
      setPaymentProcessing(false);
      if (typeof onPaymentSuccess === 'function') {
        onPaymentSuccess();
      } else {
        console.warn('onPaymentSuccess is not a function');
      }
    } else {
      throw new Error(verifyResult.error || 'Payment verification failed');
    }
  } catch (error) {
    console.error('Payment Error:', error);
    setPaymentProcessing(false);
    Alert.alert('Payment Error', error.description || error.message || 'Payment failed. Please try again.');
  }
};


  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          
          <View style={styles.consultantRow}>
            <Image
              source={getImageSource()}
              style={styles.consultantImage}
            />
            <View style={styles.consultantInfo}>
              <Text style={styles.consultantName}>{expert?.fullName}</Text>
              <Text style={styles.consultantRole}>
                {expert?.consultantRequest?.consultantProfile?.category || 'Consultant'}
              </Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {new Date(bookingData?.datetime).toLocaleDateString()} at{' '}
                {new Date(bookingData?.datetime).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{duration} minutes</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Session Fee</Text>
              <Text style={styles.detailValue}>₹{calculateAmount().toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{calculateAmount().toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          <View style={styles.paymentMethodCard}>
            <Icon name="payment" size={24} color="#2E7D32" />
            <Text style={styles.paymentMethodText}>Razorpay (UPI, Cards, NetBanking)</Text>
            <Icon name="security" size={20} color="#666" />
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Icon name="lock" size={16} color="#666" />
          <Text style={styles.securityText}>
            Your payment information is secure and encrypted
          </Text>
        </View>
      </View>

      {/* Pay Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.payButton, paymentProcessing && styles.disabledButton]}
          onPress={handlePayment}
          disabled={paymentProcessing}
          activeOpacity={0.8}
        >
          {paymentProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.payButtonText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>
              Pay ₹{calculateAmount().toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  consultantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  consultantImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  consultantInfo: {
    flex: 1,
  },
  consultantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  consultantRole: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
  },
  paymentMethodText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  payButton: {
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
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default PaymentScreen;