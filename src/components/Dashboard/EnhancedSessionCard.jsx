// src/components/Dashboard/EnhancedSessionCard.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Platform,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const EnhancedSessionCard = ({ booking, isConsultantView = false }) => {
  const navigation = useNavigation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  // FIXED: Removed time restriction - users can join anytime
  const canJoinCall = useCallback(() => {
    if (!booking?.bookingDateTime) return false;
    
    // Check if session is scheduled or in-progress
    const validStatuses = ['scheduled', 'in-progress'];
    return validStatuses.includes(booking.status);
  }, [booking]);

  // Calculate time info for display
  const getTimeInfo = useCallback(() => {
    if (!booking?.bookingDateTime) return 'Time not available';
    
    const bookingTime = new Date(booking.bookingDateTime);
    const now = new Date();
    const timeDiff = bookingTime - now;
    const minutesDiff = Math.floor(timeDiff / 60000);
    
    // If booking is in the past
    if (minutesDiff < 0) {
      const minutesAfterStart = Math.abs(minutesDiff);
      const sessionDuration = booking.duration || 30;
      
      if (minutesAfterStart < sessionDuration) {
        return `In Progress (${sessionDuration - minutesAfterStart}m remaining)`;
      } else {
        return 'Session Ended';
      }
    }
    
    // If booking is in the future
    const hours = Math.floor(minutesDiff / 60);
    const mins = minutesDiff % 60;
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Starts in ${hours}h ${mins}m`;
    } else if (mins > 0) {
      return `Starts in ${mins} minute${mins > 1 ? 's' : ''}`;
    } else {
      return 'Starting now';
    }
  }, [booking]);

  // Update every minute
  const [timeInfo, setTimeInfo] = useState(getTimeInfo());
  
  useEffect(() => {
    setTimeInfo(getTimeInfo());
    const interval = setInterval(() => {
      setTimeInfo(getTimeInfo());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [getTimeInfo]);

  // Handle join call - FIXED with proper navigation
  const handleJoinCall = useCallback(() => {
    if (!booking?._id) {
      Alert.alert('Error', 'Invalid booking ID');
      return;
    }

    // Animate press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to video call screen
    try {
      console.log('[SESSION_CARD] Navigating to VideoCall with booking:', booking._id);
      
      navigation.navigate('VideoCall', {
        bookingId: booking._id,
        channelName: booking.meetingLink || booking._id,
      });
    } catch (error) {
      console.error('[SESSION_CARD] Navigation error:', error);
      Alert.alert('Error', 'Failed to start video call. Please try again.');
    }
  }, [booking, navigation, scaleAnim]);

  // Format date and time
  const formatDateTime = useCallback((dateString) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        dayName: date.toLocaleDateString('en-GB', { weekday: 'short' })
      };
    } catch (error) {
      console.error('[SESSION_CARD] Date formatting error:', error);
      return { date: 'N/A', time: 'N/A', dayName: 'N/A' };
    }
  }, []);

  // Status configuration
  const getStatusConfig = useCallback((status) => {
    const configs = {
      pending: { 
        color: '#FF9500', 
        bg: '#FFF4E6', 
        icon: 'time-outline',
        label: 'Pending'
      },
      scheduled: { 
        color: '#34C759', 
        bg: '#E8F7ED', 
        icon: 'calendar-check-outline',
        label: 'Scheduled'
      },
      'in-progress': { 
        color: '#007AFF', 
        bg: '#E6F3FF', 
        icon: 'play-circle-outline',
        label: 'In Progress'
      },
      completed: { 
        color: '#8E44AD', 
        bg: '#F3E8FF', 
        icon: 'checkmark-circle-outline',
        label: 'Completed'
      },
      cancelled: { 
        color: '#FF3B30', 
        bg: '#FFE8E6', 
        icon: 'close-circle-outline',
        label: 'Cancelled'
      },
      missed: { 
        color: '#8E8E93', 
        bg: '#F2F2F7', 
        icon: 'alert-circle-outline',
        label: 'Missed'
      }
    };
    return configs[status] || { 
      color: '#8E8E93', 
      bg: '#F2F2F7', 
      icon: 'help-circle-outline',
      label: 'Unknown'
    };
  }, []);

  // Memoized values
  const { date, time, dayName } = useMemo(
    () => formatDateTime(booking.bookingDateTime), 
    [booking.bookingDateTime, formatDateTime]
  );
  
  const statusConfig = useMemo(
    () => getStatusConfig(booking.status), 
    [booking.status, getStatusConfig]
  );
  
  const isUpcoming = useMemo(
    () => ['scheduled', 'pending', 'in-progress'].includes(booking.status),
    [booking.status]
  );
  
  // Get participant name
  const participantName = useMemo(() => {
    try {
      if (isConsultantView) {
        return booking.user?.fullName || booking.user?.name || 'Client';
      }
      return booking.consultant?.fullName || booking.consultant?.name || 'Consultant';
    } catch (error) {
      console.error('[SESSION_CARD] Name extraction error:', error);
      return isConsultantView ? 'Client' : 'Consultant';
    }
  }, [isConsultantView, booking]);

  const participantInitial = useMemo(
    () => participantName.charAt(0).toUpperCase(),
    [participantName]
  );

  // Handle card press
  const handleCardPress = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <Animated.View 
      style={[
        styles.sessionCard,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      {/* Header */}
      <TouchableOpacity 
        onPress={handleCardPress}
        activeOpacity={0.9}
        style={styles.cardHeader}
      >
        <View style={styles.participantInfo}>
          <View style={[
            styles.avatar,
            { backgroundColor: isConsultantView ? '#34C759' : '#007AFF' }
          ]}>
            <Text style={styles.avatarText}>{participantInitial}</Text>
          </View>
          <View style={styles.participantDetails}>
            <Text style={styles.participantName} numberOfLines={1}>
              {participantName}
            </Text>
            <Text style={styles.sessionType}>Video Consultation</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Session Details */}
      <View style={styles.sessionDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons 
              name="calendar-outline" 
              size={16} 
              color={isConsultantView ? '#34C759' : '#007AFF'} 
            />
            <Text style={styles.detailText}>{dayName}, {date}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons 
              name="time-outline" 
              size={16} 
              color={isConsultantView ? '#34C759' : '#007AFF'} 
            />
            <Text style={styles.detailText}>{time}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons 
              name="hourglass-outline" 
              size={16} 
              color={isConsultantView ? '#34C759' : '#007AFF'} 
            />
            <Text style={styles.detailText}>{booking.duration || 30} min</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons 
              name="videocam-outline" 
              size={16} 
              color={isConsultantView ? '#34C759' : '#007AFF'} 
            />
            <Text style={styles.detailText}>Video Call</Text>
          </View>
        </View>
      </View>

      {/* Time Info Badge */}
      {isUpcoming && (
        <View style={[
          styles.timeInfoContainer,
          { 
            backgroundColor: canJoinCall() ? '#E8F7ED' : '#FFF4E6',
            borderColor: canJoinCall() ? '#34C759' : '#FF9500',
          }
        ]}>
          <Ionicons 
            name={canJoinCall() ? "videocam" : "time-outline"} 
            size={16} 
            color={canJoinCall() ? "#34C759" : "#FF9500"} 
          />
          <Text style={[
            styles.timeInfoText,
            { color: canJoinCall() ? "#34C759" : "#FF9500" }
          ]}>
            {timeInfo}
          </Text>
          {canJoinCall() && (
            <View style={styles.readyIndicator}>
              <View style={styles.readyDot} />
            </View>
          )}
        </View>
      )}

      {/* Consultation Details - Expandable */}
      {booking.consultationDetail && isExpanded && (
        <View style={styles.consultationNote}>
          <View style={styles.noteHeader}>
            <Ionicons name="document-text-outline" size={16} color="#007AFF" />
            <Text style={styles.noteLabel}>Consultation Notes</Text>
          </View>
          <Text style={styles.noteText}>
            {booking.consultationDetail}
          </Text>
        </View>
      )}

      {/* Action Buttons - Show for scheduled and in-progress sessions */}
      {isUpcoming && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.joinButton,
              { backgroundColor: isConsultantView ? '#34C759' : '#007AFF' }
            ]}
            onPress={handleJoinCall}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="videocam" 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.joinButtonText}>
              {booking.status === 'in-progress' ? 'Rejoin Video Call' : 'Join Video Call'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Completed Session Actions */}
      {booking.status === 'completed' && (
        <TouchableOpacity 
          style={styles.reviewButton}
          activeOpacity={0.8}
        >
          <Ionicons name="star-outline" size={18} color="#FF9500" />
          <Text style={styles.reviewButtonText}>Rate & Review Session</Text>
        </TouchableOpacity>
      )}

      {/* Expand/Collapse Indicator */}
      {booking.consultationDetail && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={handleCardPress}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#8E8E93" 
          />
          <Text style={styles.expandText}>
            {isExpanded ? 'Show Less' : 'Show More'}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 3,
  },
  sessionType: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
  },
  sessionDetails: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
    fontWeight: '600',
  },
  timeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
  },
  timeInfoText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  readyIndicator: {
    marginLeft: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
  },
  readyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    opacity: 0.6,
  },
  consultationNote: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 22,
    fontWeight: '400',
  },
  actionButtons: {
    marginTop: 4,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4E6',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFDDB3',
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF9500',
    marginLeft: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 4,
  },
});

export default EnhancedSessionCard;