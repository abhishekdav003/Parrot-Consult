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
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

// Responsive sizing utilities
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const WalletSection = ({ user, onAuthError }) => {
  // State Management
  const [walletData, setWalletData] = useState({
    balance: 0,
    transactionHistory: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [withdrawing, setWithdrawing] = useState(false);

  // Fetch wallet data from backend
  const fetchWalletData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const ApiService = require('../../services/ApiService').default;

      // Fetch wallet data
      const walletResult = await ApiService.apiCall('/user/fetchWalletData', {
        method: 'GET',
      });

      // Fetch completed bookings to show earnings
      const bookingsResult = await ApiService.apiCall('/booking/getbookingsviaConsultantid', {
        method: 'GET',
      });

      if (walletResult.success && walletResult.data) {
        const walletBalance = walletResult.data.wallet || 0;
        const withdrawalHistory = walletResult.data.withdrawalHistory || [];

        // Transform withdrawal history to transaction history format
        const withdrawalTransactions = withdrawalHistory.map((withdrawal) => ({
          _id: withdrawal._id,
          type: 'withdrawal',
          amount: withdrawal.amount,
          status: withdrawal.status || 'completed',
          date: withdrawal.date || withdrawal.createdAt,
          transactionId: withdrawal.transactionId,
          description: 'Withdrawal to bank account',
        }));

        // Transform completed bookings to earning transactions
        let earningTransactions = [];
        if (bookingsResult.success && Array.isArray(bookingsResult.data)) {
          earningTransactions = bookingsResult.data
            .filter((booking) => booking.status === 'completed' && booking.payment)
            .map((booking) => ({
              _id: booking._id,
              type: 'earning',
              amount: booking.consultant?.consultantRequest?.consultantProfile?.sessionFee || 0,
              status: 'completed',
              date: booking.completedAt || booking.bookingDateTime,
              transactionId: booking.payment?.transactionId || booking.payment,
              description: `Session with ${booking.user?.fullName || 'Client'}`,
              bookingId: booking._id,
            }));
        }

        // Combine and sort transactions by date (newest first)
        const allTransactions = [...withdrawalTransactions, ...earningTransactions].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        setWalletData({
          balance: walletBalance,
          transactionHistory: allTransactions,
        });

        // Animate fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      } else {
        console.warn('[WALLET] Failed to fetch wallet data:', walletResult.error);

        if (walletResult.needsLogin && onAuthError) {
          onAuthError(walletResult);
          return;
        }

        Alert.alert(
          'Error',
          walletResult.error || 'Failed to load wallet data. Please try again.',
          [{ text: 'OK' }]
        );

        setWalletData({
          balance: 0,
          transactionHistory: [],
        });
      }
    } catch (error) {
      console.error('[WALLET] Error fetching wallet data:', error);
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onAuthError, fadeAnim]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData(false);
  }, [fetchWalletData]);

  // Handle withdrawal
  const handleWithdraw = useCallback(() => {
    if (walletData.balance <= 0) {
      Alert.alert(
        'Insufficient Balance',
        'You need a minimum balance to withdraw funds.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Withdraw Funds',
      `Do you want to withdraw ${formatCurrency(walletData.balance)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Withdraw',
          style: 'default',
          onPress: async () => {
            try {
              setWithdrawing(true);

              const ApiService = require('../../services/ApiService').default;
              
              // Call withdrawal API
              const result = await ApiService.apiCall('/user/withdraw', {
                method: 'POST',
                body: JSON.stringify({ amount: walletData.balance }),
              });

              if (result.success) {
                Alert.alert(
                  'Withdrawal Request Submitted',
                  'Your withdrawal request has been submitted successfully. The amount will be credited to your registered bank account within 3-5 business days.',
                  [
                    {
                      text: 'OK',
                      onPress: () => fetchWalletData(false),
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Withdrawal Failed',
                  result.error || 'Failed to process withdrawal request. Please try again later.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('[WALLET] Withdrawal error:', error);
              Alert.alert(
                'Withdrawal Failed',
                'Failed to process withdrawal request. Please try again later.',
                [{ text: 'OK' }]
              );
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  }, [walletData.balance, fetchWalletData]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return '';

    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get transaction status config
  const getTransactionStatusConfig = (status, type) => {
    const configs = {
      pending: {
        color: '#F59E0B',
        backgroundColor: '#FEF3C7',
        icon: 'time-outline',
        label: 'PENDING',
      },
      completed: {
        color: '#10B981',
        backgroundColor: '#D1FAE5',
        icon: 'checkmark-circle-outline',
        label: 'COMPLETED',
      },
      failed: {
        color: '#EF4444',
        backgroundColor: '#FEE2E2',
        icon: 'close-circle-outline',
        label: 'FAILED',
      },
      scheduled: {
        color: '#3B82F6',
        backgroundColor: '#DBEAFE',
        icon: 'calendar-outline',
        label: 'SCHEDULED',
      },
    };

    return configs[status] || configs.pending;
  };

  // Get transaction type icon
  const getTransactionTypeIcon = (type) => {
    const icons = {
      withdrawal: 'arrow-up-circle-outline',
      earning: 'arrow-down-circle-outline',
      credit: 'add-circle-outline',
      debit: 'remove-circle-outline',
    };

    return icons[type] || 'swap-horizontal-outline';
  };

  // Get transaction type color
  const getTransactionTypeColor = (type) => {
    const colors = {
      withdrawal: {
        color: '#EF4444',
        backgroundColor: '#FEE2E2',
      },
      earning: {
        color: '#10B981',
        backgroundColor: '#D1FAE5',
      },
      credit: {
        color: '#10B981',
        backgroundColor: '#D1FAE5',
      },
      debit: {
        color: '#EF4444',
        backgroundColor: '#FEE2E2',
      },
    };

    return colors[type] || { color: '#6B7280', backgroundColor: '#F3F4F6' };
  };

  // Calculate statistics
  const calculateStats = () => {
    const completedTransactions = walletData.transactionHistory.filter(
      (t) => t.status === 'completed'
    );

    const totalWithdrawals = completedTransactions.filter(
      (t) => t.type === 'withdrawal'
    ).length;

    const totalEarnings = completedTransactions
      .filter((t) => t.type === 'earning')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalTransactions = walletData.transactionHistory.length;

    return {
      totalWithdrawals,
      totalEarnings,
      totalTransactions,
    };
  };

  const stats = calculateStats();

  // Initial load
  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading your wallet...</Text>
      </View>
    );
  }

  // Check if user is consultant
  if (user?.role !== 'consultant') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.notConsultantContainer}>
            <View style={styles.notConsultantIcon}>
              <Ionicons name="briefcase-outline" size={moderateScale(64)} color="#D1D5DB" />
            </View>
            <Text style={styles.notConsultantTitle}>Consultant Wallet</Text>
            <Text style={styles.notConsultantText}>
              This feature is only available for consultants. Upgrade your profile to consultant to
              access wallet features and start earning.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="wallet" size={moderateScale(28)} color="#10B981" />
              </View>
              <Text style={styles.balanceTitle}>Wallet Balance</Text>
            </View>

            <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(walletData.balance)}
            </Text>

            <Text style={styles.balanceSubtext}>Available balance from completed sessions</Text>

            <TouchableOpacity
              style={[
                styles.withdrawButton,
                (walletData.balance <= 0 || withdrawing) && styles.withdrawButtonDisabled,
              ]}
              onPress={handleWithdraw}
              activeOpacity={0.8}
              disabled={walletData.balance <= 0 || withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons
                    name="cash-outline"
                    size={moderateScale(20)}
                    color={walletData.balance > 0 ? '#ffffff' : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.withdrawButtonText,
                      walletData.balance <= 0 && styles.withdrawButtonTextDisabled,
                    ]}
                  >
                    Withdraw Funds
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="trending-up-outline" size={moderateScale(20)} color="#10B981" />
              </View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(stats.totalEarnings)}
              </Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="swap-horizontal-outline" size={moderateScale(20)} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{stats.totalTransactions}</Text>
              <Text style={styles.statLabel}>Total Transactions</Text>
            </View>
          </View>

          {/* Transaction History */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <Ionicons name="time-outline" size={moderateScale(20)} color="#6B7280" />
          </View>

          <View style={styles.transactionsContainer}>
            {walletData.transactionHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="receipt-outline" size={moderateScale(64)} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                <Text style={styles.emptyText}>
                  Your transaction history will appear here once you start earning from sessions or
                  make withdrawals.
                </Text>
              </View>
            ) : (
              walletData.transactionHistory.map((transaction, index) => {
                const statusConfig = getTransactionStatusConfig(
                  transaction.status,
                  transaction.type
                );
                const typeIcon = getTransactionTypeIcon(transaction.type);
                const typeColor = getTransactionTypeColor(transaction.type);
                const isCredit = transaction.type === 'earning' || transaction.type === 'credit';

                return (
                  <View
                    key={transaction._id || index}
                    style={[
                      styles.transactionItem,
                      index === walletData.transactionHistory.length - 1 &&
                        styles.transactionItemLast,
                    ]}
                  >
                    <View style={styles.transactionLeft}>
                      <View
                        style={[
                          styles.transactionIcon,
                          { backgroundColor: typeColor.backgroundColor },
                        ]}
                      >
                        <Ionicons
                          name={typeIcon}
                          size={moderateScale(22)}
                          color={typeColor.color}
                        />
                      </View>

                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDescription} numberOfLines={1}>
                          {transaction.description ||
                            (transaction.type === 'withdrawal'
                              ? 'Withdrawal'
                              : 'Session Earnings')}
                        </Text>
                        <View style={styles.transactionMeta}>
                          <Ionicons
                            name="calendar-outline"
                            size={moderateScale(12)}
                            color="#9CA3AF"
                          />
                          <Text style={styles.transactionDate}>
                            {formatDate(transaction.date || transaction.createdAt)}
                          </Text>
                          {transaction.date && (
                            <>
                              <Ionicons
                                name="time-outline"
                                size={moderateScale(12)}
                                color="#9CA3AF"
                                style={{ marginLeft: scale(8) }}
                              />
                              <Text style={styles.transactionTime}>
                                {formatTime(transaction.date)}
                              </Text>
                            </>
                          )}
                        </View>
                        {transaction.transactionId && (
                          <Text style={styles.transactionId} numberOfLines={1}>
                            ID: {transaction.transactionId}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.transactionRight}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: isCredit ? '#10B981' : '#EF4444' },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {isCredit ? '+ ' : '- '}
                        {formatCurrency(transaction.amount)}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusConfig.backgroundColor },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={moderateScale(20)} color="#10B981" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                Your wallet balance is updated automatically after each completed session. You can
                withdraw your earnings at any time, and the funds will be transferred to your
                registered bank account within 3-5 business days.
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(16),
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(24),
  },
  content: {
    padding: scale(16),
  },

  // Not Consultant View
  notConsultantContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
    paddingVertical: verticalScale(80),
    minHeight: height * 0.7,
  },
  notConsultantIcon: {
    marginBottom: verticalScale(24),
  },
  notConsultantTitle: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: verticalScale(12),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textAlign: 'center',
  },
  notConsultantText: {
    fontSize: moderateScale(16),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: moderateScale(24),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Balance Card
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(20),
    padding: scale(24),
    marginBottom: verticalScale(16),
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  balanceIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
  },
  balanceTitle: {
    fontSize: moderateScale(18),
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  balanceAmount: {
    fontSize: moderateScale(40),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: verticalScale(8),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  balanceSubtext: {
    fontSize: moderateScale(14),
    color: '#9CA3AF',
    marginBottom: verticalScale(20),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  withdrawButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minHeight: verticalScale(50),
  },
  withdrawButtonDisabled: {
    backgroundColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0,
  },
  withdrawButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: scale(8),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  withdrawButtonTextDisabled: {
    color: '#9CA3AF',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(20),
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: scale(16),
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  statValue: {
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: verticalScale(4),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Transactions
  transactionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: verticalScale(16),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(40),
  },
  emptyIconContainer: {
    marginBottom: verticalScale(16),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: verticalScale(8),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: moderateScale(20),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionItemLast: {
    borderBottomWidth: 0,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(12),
  },
  transactionIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: verticalScale(6),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(4),
    flexWrap: 'wrap',
  },
  transactionDate: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginLeft: scale(4),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionTime: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginLeft: scale(4),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionId: {
    fontSize: moderateScale(11),
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    marginBottom: verticalScale(6),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionAmountNegative: {
    // Additional styling for negative amounts if needed
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(6),
  },
  statusText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: moderateScale(12),
    padding: scale(16),
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  infoIconContainer: {
    marginRight: scale(12),
    marginTop: verticalScale(2),
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#065F46',
    marginBottom: verticalScale(4),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  infoText: {
    fontSize: moderateScale(13),
    color: '#047857',
    lineHeight: moderateScale(18),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default WalletSection;