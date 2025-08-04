// src/components/Dashboard/WalletSection.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';

const WalletSection = ({ user, onAuthError }) => {
  const [walletData, setWalletData] = useState({
    balance: 0,
    transactions: [],
    earnings: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Fetch wallet data from existing bookings endpoint
  const fetchWalletData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      // Use existing getUserBookings endpoint to get transaction data
      const bookingsResult = await ApiService.getUserBookings();
      
      if (bookingsResult.success) {
        const bookings = bookingsResult.data || [];
        
        // Calculate wallet data from bookings
        let totalSpent = 0;
        let earnings = 0;
        const transactions = [];

        bookings.forEach(booking => {
          if (booking.status === 'completed' && booking.payment) {
            const amount = booking.consultant?.consultantRequest?.consultantProfile?.sessionFee || 0;
            
            // If current user is the consultant, it's earnings
            if (booking.consultant?._id === user?._id) {
              earnings += amount;
              transactions.push({
                id: booking._id,
                type: 'earning',
                amount: amount,
                date: booking.updatedAt || booking.createdAt,
                description: `Session with ${booking.user?.fullName || 'User'}`,
                status: 'completed'
              });
            } 
            // If current user is the client, it's expense
            else if (booking.user?._id === user?._id) {
              totalSpent += amount;
              transactions.push({
                id: booking._id,
                type: 'payment',
                amount: amount,
                date: booking.updatedAt || booking.createdAt,
                description: `Session with ${booking.consultant?.fullName || 'Consultant'}`,
                status: 'completed'
              });
            }
          }
        });

        // Calculate balance (earnings - spent)
        const balance = earnings - totalSpent;

        setWalletData({
          balance,
          transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
          earnings,
          totalSpent
        });
      } else {
        console.warn('[WALLET] Failed to fetch wallet data:', bookingsResult.error);
        if (onAuthError && onAuthError(bookingsResult)) return;
        
        setWalletData({ balance: 0, transactions: [], earnings: 0, totalSpent: 0 });
      }
    } catch (error) {
      console.error('[WALLET] Error fetching wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id, onAuthError]);

  // Handle add money using existing create-order endpoint
  const handleAddMoney = async () => {
    if (!addMoneyAmount || parseFloat(addMoneyAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amount = parseFloat(addMoneyAmount);
    if (amount < 10) {
      Alert.alert('Error', 'Minimum amount is ₹10');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Use existing create-order endpoint
      const orderResult = await ApiService.apiCall('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ amount: amount * 100 }) // Convert to paise
      });

      if (orderResult.success) {
        Alert.alert(
          'Payment Order Created', 
          `Order created for ₹${amount}. Integrate with Razorpay SDK to complete payment.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setAddMoneyAmount('');
                setShowAddMoney(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', orderResult.error || 'Failed to create payment order');
      }
    } catch (error) {
      console.error('[WALLET] Error creating payment order:', error);
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData(false);
  }, [fetchWalletData]);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#4CAF50']}
        />
      }
    >
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Ionicons name="wallet-outline" size={24} color="#4CAF50" />
          <Text style={styles.balanceTitle}>Wallet Balance</Text>
        </View>
        <Text style={styles.balanceAmount}>
          ₹{walletData.balance.toFixed(2)}
        </Text>
        <Text style={styles.balanceSubtext}>Available Balance</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{walletData.earnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{walletData.totalSpent.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowAddMoney(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
          <Text style={styles.actionButtonText}>Add Money</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="send-outline" size={20} color="#666" />
          <Text style={styles.actionButtonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Add Money Modal */}
      {showAddMoney && (
        <View style={styles.addMoneyContainer}>
          <View style={styles.addMoneyCard}>
            <Text style={styles.addMoneyTitle}>Add Money to Wallet</Text>
            
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount (₹)"
              value={addMoneyAmount}
              onChangeText={setAddMoneyAmount}
              keyboardType="numeric"
              maxLength={6}
            />
            
            <View style={styles.quickAmounts}>
              {[100, 500, 1000, 2000].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setAddMoneyAmount(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>₹{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.addMoneyActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddMoney(false);
                  setAddMoneyAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddMoney}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Add Money</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.transactionSection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {walletData.transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Complete sessions to see your transaction history
            </Text>
          </View>
        ) : (
          walletData.transactions.map((transaction, index) => (
            <View key={transaction.id || index} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.transactionIcon, 
                  { backgroundColor: transaction.type === 'earning' ? '#e8f5e8' : '#fff3e0' }
                ]}>
                  <Ionicons 
                    name={transaction.type === 'earning' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                    size={20} 
                    color={transaction.type === 'earning' ? '#4CAF50' : '#FF9800'} 
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.date)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.transactionRight}>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'earning' ? '#4CAF50' : '#FF9800' }
                ]}>
                  {transaction.type === 'earning' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>COMPLETED</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  addMoneyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  addMoneyCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  addMoneyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#f0f8f0',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickAmountText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  addMoneyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#666',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  transactionSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '500',
  },
});

export default WalletSection;