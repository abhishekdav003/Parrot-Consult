// src/components/Dashboard/EnhancedSessionCard.jsx - COMPLETE PRODUCTION READY CODE
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  Animated,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const EnhancedSessionCard = ({ booking, isConsultantView = false }) => {
  const navigation = useNavigation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [showTimeAlert, setShowTimeAlert] = useState(false);
  const [timeInfo, setTimeInfo] = useState('');
  const [canJoin, setCanJoin] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState('upcoming');

  // Debug: Log booking data to help troubleshoot
  useEffect(() => {
    console.log('[SESSION_CARD] Booking data:', {
      id: booking._id,
      consultant: booking.consultant,
      consultantName: booking.consultantName,
      user: booking.user,
      isConsultantView: isConsultantView
    });
  }, [booking, isConsultantView]);

  // ✅ CRITICAL: 5-minute rule validation with complete logic
  const calculateMeetingStatus = useCallback(() => {
    if (!booking?.bookingDateTime) {
      return { 
        canJoin: false, 
        timeInfo: 'Time not available',
        status: 'unavailable',
        minutesUntilStart: null
      };
    }
    
    const bookingTime = new Date(booking.bookingDateTime);
    const now = new Date();
    const timeDiff = bookingTime - now;
    const minutesDiff = Math.floor(timeDiff / 60000);
    const sessionDuration = booking.duration || 30;
    
    // Meeting has already started
    if (minutesDiff < 0) {
      const minutesAfterStart = Math.abs(minutesDiff);
      
      // Meeting is still within duration
      if (minutesAfterStart < sessionDuration) {
        return {
          canJoin: true,
          timeInfo: `In Progress (${sessionDuration - minutesAfterStart}m remaining)`,
          status: 'in-progress',
          minutesUntilStart: minutesDiff
        };
      } else {
        // Meeting has ended
        return {
          canJoin: false,
          timeInfo: 'Session Ended',
          status: 'ended',
          minutesUntilStart: minutesDiff
        };
      }
    }
    
    // Meeting is in future - ✅ 5-MINUTE RULE
    // Can ONLY join 5 minutes before or less
    if (minutesDiff <= 5) {
      return {
        canJoin: true,
        timeInfo: minutesDiff === 0 ? 'Starting Now' : `Starting in ${minutesDiff}m`,
        status: 'ready',
        minutesUntilStart: minutesDiff
      };
    }
    
    // Too early to join - MORE than 5 minutes before
    const hours = Math.floor(minutesDiff / 60);
    const mins = minutesDiff % 60;
    
    let displayTime;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      displayTime = `Starts in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      displayTime = `Starts in ${hours}h ${mins}m`;
    } else {
      displayTime = `Starts in ${mins} minute${mins > 1 ? 's' : ''}`;
    }
    
    return {
      canJoin: false,
      timeInfo: displayTime,
      status: 'upcoming',
      minutesUntilStart: minutesDiff
    };
  }, [booking]);

  // Update meeting status every 30 seconds
  useEffect(() => {
    const updateStatus = () => {
      const status = calculateMeetingStatus();
      setTimeInfo(status.timeInfo);
      setCanJoin(status.canJoin);
      setMeetingStatus(status.status);
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [calculateMeetingStatus]);

  // Handle join call with comprehensive validation
  const handleJoinCall = useCallback(() => {
    const status = calculateMeetingStatus();
    
    if (!status.canJoin) {
      if (status.status === 'ended') {
        setShowTimeAlert({
          type: 'ended',
          title: 'Session Ended',
          message: 'This consultation session has already ended. Please book a new session if you need further consultation.',
          icon: 'close-circle-outline',
          color: '#FF3B30'
        });
      } else if (status.status === 'upcoming') {
        const absMinutes = Math.abs(status.minutesUntilStart);
        const waitTime = absMinutes - 5;
        setShowTimeAlert({
          type: 'too-early',
          title: 'Too Early to Join',
          message: `This meeting will be available to join 5 minutes before the scheduled time.\n\nYou can join in ${waitTime} minute${waitTime !== 1 ? 's' : ''}.`,
          icon: 'time-outline',
          color: '#FF9500',
          countdown: waitTime
        });
      } else {
        setShowTimeAlert({
          type: 'unavailable',
          title: 'Cannot Join Meeting',
          message: 'This meeting is currently unavailable. Please check the meeting status and time.',
          icon: 'alert-circle-outline',
          color: '#8E8E93'
        });
      }
      return;
    }

    // Animate press for better UX
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

    // Navigate to video call
    try {
      console.log('[SESSION_CARD] Navigating to VideoCall with booking:', booking._id);
      navigation.navigate('VideoCall', {
        bookingId: booking._id,
        channelName: booking.meetingLink || booking._id,
      });
    } catch (error) {
      console.error('[SESSION_CARD] Navigation error:', error);
      setShowTimeAlert({
        type: 'error',
        title: 'Navigation Error',
        message: 'Failed to start video call. Please try again.',
        icon: 'alert-circle-outline',
        color: '#FF3B30'
      });
    }
  }, [booking, calculateMeetingStatus, scaleAnim, navigation]);

  // Format date and time beautifully
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
          minute: '2-digit',
          hour12: true
        }),
        dayName: date.toLocaleDateString('en-GB', { weekday: 'short' })
      };
    } catch (error) {
      console.error('[SESSION_CARD] Date formatting error:', error);
      return { date: 'N/A', time: 'N/A', dayName: 'N/A' };
    }
  }, []);

  // Status configuration with proper colors
  const getStatusConfig = useCallback((status) => {
    const configs = {
      pending: { 
        color: '#FF9500', 
        bg: '#FFF4E6', 
        icon: 'time-outline',
        label: 'Pending'
      },
      scheduled: { 
        color: '#059669', 
        bg: '#F0FDF4', 
        icon: 'calendar-outline',
        label: 'Scheduled'
      },
      'in-progress': { 
        color: '#007AFF', 
        bg: '#E6F3FF', 
        icon: 'play-circle-outline',
        label: 'In Progress'
      },
      completed: { 
        color: '#059669', 
        bg: '#F0FDF4', 
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
    return configs[status] || configs.scheduled;
  }, []);

  // Memoized values for performance
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
  
  const participantName = useMemo(() => {
    try {
      if (isConsultantView) {
        // For consultant view, show client name
        return booking.user?.fullName || booking.user?.name || 'Client';
      }
      
      // For user view, show consultant name
      const consultant = booking.consultant;
      
      // Handle different data structures
      if (typeof consultant === 'object' && consultant !== null) {
        return consultant.fullName || consultant.name || 'Consultant';
      } else if (typeof consultant === 'string') {
        // If consultant is just an ID, try to get name from other sources
        return booking.consultantName || 'Consultant';
      }
      
      return 'Consultant';
    } catch (error) {
      console.error('[SESSION_CARD] Error getting participant name:', error);
      return isConsultantView ? 'Client' : 'Consultant';
    }
  }, [isConsultantView, booking]);

  const participantInitial = useMemo(
    () => participantName.charAt(0).toUpperCase(),
    [participantName]
  );

  return (
    <>
      <Animated.View 
        style={[
          styles.sessionCard,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        {/* Header Section */}
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.9}
          style={styles.cardHeader}
        >
          <View style={styles.participantInfo}>
            <View style={[
              styles.avatar,
              { backgroundColor: isConsultantView ? '#059669' : '#007AFF' }
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
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Session Details Section */}
        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={[styles.detailIconBg, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons 
                  name="calendar-outline" 
                  size={14} 
                  color="#059669" 
                />
              </View>
              <Text style={styles.detailText}>{dayName}, {date}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={[styles.detailIconBg, { backgroundColor: '#FFF4E6' }]}>
                <Ionicons 
                  name="time-outline" 
                  size={14} 
                  color="#FF9500" 
                />
              </View>
              <Text style={styles.detailText}>{time}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={[styles.detailIconBg, { backgroundColor: '#E6F3FF' }]}>
                <Ionicons 
                  name="hourglass-outline" 
                  size={14} 
                  color="#007AFF" 
                />
              </View>
              <Text style={styles.detailText}>{booking.duration || 30} min</Text>
            </View>
          </View>
        </View>

        {/* Time Info Badge - Shows meeting availability */}
        {isUpcoming && (
          <View style={[
            styles.timeInfoContainer,
            { 
              backgroundColor: canJoin ? '#F0FDF4' : '#FFF4E6',
              borderColor: canJoin ? '#059669' : '#FF9500',
            }
          ]}>
            <View style={styles.timeInfoContent}>
              <Ionicons 
                name={canJoin ? "videocam" : "time-outline"} 
                size={16} 
                color={canJoin ? "#059669" : "#FF9500"} 
              />
              <Text style={[
                styles.timeInfoText,
                { color: canJoin ? "#059669" : "#FF9500" }
              ]}>
                {timeInfo}
              </Text>
              {canJoin && (
                <View style={styles.readyIndicator}>
                  <View style={styles.readyDot} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Consultation Notes - Expandable */}
        {booking.consultationDetail && isExpanded && (
          <View style={styles.consultationNote}>
            <View style={styles.noteHeader}>
              <Ionicons name="document-text-outline" size={16} color="#059669" />
              <Text style={styles.noteLabel}>Consultation Notes</Text>
            </View>
            <Text style={styles.noteText}>
              {booking.consultationDetail}
            </Text>
          </View>
        )}

        {/* Action Buttons - For Upcoming Sessions */}
        {isUpcoming && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[
                styles.joinButton,
                { 
                  backgroundColor: canJoin 
                    ? (isConsultantView ? '#059669' : '#007AFF')
                    : '#E5E5EA'
                }
              ]}
              onPress={handleJoinCall}
              activeOpacity={0.8}
              disabled={!canJoin}
            >
              <Ionicons 
                name="videocam" 
                size={20} 
                color={canJoin ? "#fff" : "#8E8E93"} 
              />
              <Text style={[
                styles.joinButtonText,
                { color: canJoin ? '#fff' : '#8E8E93' }
              ]}>
                {canJoin 
                  ? (booking.status === 'in-progress' ? 'Rejoin Video Call' : 'Join Video Call')
                  : 'Meeting Not Available Yet'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Completed Session Badge */}
        {booking.status === 'completed' && (
          <View style={styles.completedSection}>
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={styles.completedText}>Session Completed Successfully</Text>
            </View>
          </View>
        )}

        {/* Expand/Collapse Button */}
        {booking.consultationDetail && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#8E8E93" 
            />
            <Text style={styles.expandText}>
              {isExpanded ? 'Show Less' : 'Show More'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Time Alert Modal - Beautiful alerts for all scenarios */}
      <Modal
        visible={!!showTimeAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertContainer}>
            {/* Alert Icon */}
            <View style={[
              styles.alertIconContainer,
              { backgroundColor: showTimeAlert?.color + '15' }
            ]}>
              <Ionicons 
                name={showTimeAlert?.icon} 
                size={48} 
                color={showTimeAlert?.color} 
              />
            </View>
            
            {/* Alert Title */}
            <Text style={styles.alertTitle}>{showTimeAlert?.title}</Text>
            
            {/* Alert Message */}
            <Text style={styles.alertMessage}>{showTimeAlert?.message}</Text>
            
            {/* Countdown Badge - Only for "too early" scenario */}
            {showTimeAlert?.type === 'too-early' && (
              <View style={styles.countdownContainer}>
                <View style={styles.countdownBadge}>
                  <Ionicons name="time-outline" size={16} color="#FF9500" />
                  <Text style={styles.countdownText}>
                    Available in {showTimeAlert.countdown} min
                  </Text>
                </View>
              </View>
            )}
            
            {/* Close Button */}
            <TouchableOpacity
              style={[
                styles.alertButton,
                { backgroundColor: showTimeAlert?.color }
              ]}
              onPress={() => setShowTimeAlert(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.alertButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  // Main Card Container
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },

  // Header Styles
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

  // Status Badge Styles
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Session Details Styles
  sessionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
  },

  // Time Info Badge Styles
  timeInfoContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  timeInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInfoText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  readyIndicator: {
    marginLeft: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },

  // Consultation Notes Styles
  consultationNote: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },

  // Action Button Styles
  actionButtons: {
    marginTop: 4,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Completed Section Styles
  completedSection: {
    marginTop: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 8,
  },

  // Expand/Collapse Button Styles
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
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  alertIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  countdownContainer: {
    marginBottom: 20,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
    marginLeft: 6,
  },
  alertButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default EnhancedSessionCard;