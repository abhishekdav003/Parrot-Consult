import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
  Image,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Share,
  Linking,
  Clipboard
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReelItem = ({ reel, isActive, onLike, onComment, currentUser }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likes, setLikes] = useState(reel.likes || 0);
  const [paused, setPaused] = useState(!isActive);
  const [showControls, setShowControls] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const likeAnimation = useRef(new Animated.Value(1)).current;
  const heartAnimation = useRef(new Animated.Value(0)).current;
  const controlsTimeout = useRef(null);

  // Update like state when reel prop changes
  useEffect(() => {
  // Only update if the values have actually changed to prevent unnecessary re-renders
  if (reel.isLiked !== isLiked) {
    setIsLiked(reel.isLiked || false);
  }
  if (reel.likes !== likes) {
    setLikes(reel.likes || 0);
  }
}, [reel.isLiked, reel.likes, isLiked, likes]);

  // Update paused state when active status changes
  useEffect(() => {
    setPaused(!isActive);
  }, [isActive]);

  const handleLike = async () => {
  if (!currentUser) {
    Alert.alert('Login Required', 'Please login to like reels');
    return;
  }

  // Store original state for potential rollback
  const originalLikedState = isLiked;
  const originalLikes = likes;
  
  // Optimistic update
  const newLikedState = !isLiked;
  setIsLiked(newLikedState);
  setLikes(prev => newLikedState ? prev + 1 : prev - 1);

  // Animate like button
  Animated.sequence([
    Animated.timing(likeAnimation, {
      toValue: 1.3,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(likeAnimation, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }),
  ]).start();

  // Show heart animation if liking
  if (newLikedState) {
    Animated.sequence([
      Animated.timing(heartAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }

  try {
    const result = await onLike(reel._id);
    if (result && result.success) {
      // Update with server response to ensure consistency
      setLikes(result.data.likes);
      setIsLiked(result.data.isLiked);
    } else {
      // Revert if server response indicates failure
      setIsLiked(originalLikedState);
      setLikes(originalLikes);
    }
  } catch (error) {
    console.error('Error liking reel:', error);
    // Revert on error
    setIsLiked(originalLikedState);
    setLikes(originalLikes);
  }
};

const handleShare = async () => {
  try {
    const shareUrl = `https://yourapp.com/reel/${reel._id}` || reel.URL;
    const shareMessage = `Check out this amazing reel by ${reel.user?.fullName || 'Unknown User'}!\n\n${reel.description ? reel.description + '\n\n' : ''}${shareUrl}`;

    const result = await Share.share({
      message: shareMessage,
      url: shareUrl,
      title: 'Amazing Reel',
    }, {
      dialogTitle: 'Share this reel',
      subject: 'Check out this reel!',
    });

    if (result.action === Share.sharedAction) {
      console.log('Shared successfully');
      // Optionally track sharing analytics here
      // trackShare(reel._id);
    } else if (result.action === Share.dismissedAction) {
      console.log('Share dismissed');
    }
  } catch (error) {
    console.error('Error sharing:', error);
    Alert.alert('Error', 'Failed to share reel');
  }
};

// Add this function for custom share options
const handleCustomShare = (platform) => {
  const shareUrl = `https://yourapp.com/reel/${reel._id}` || reel.URL;
  const shareText = `Check out this amazing reel by ${reel.user?.fullName || 'Unknown User'}!`;
  
  switch (platform) {
    case 'whatsapp':
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
      Linking.openURL(whatsappUrl).catch(() => {
        Alert.alert('Error', 'WhatsApp is not installed');
      });
      break;
      
    case 'instagram':
      // For Instagram, we'll use the native share which will show Instagram as an option
      handleShare();
      break;
      
    case 'twitter':
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      Linking.openURL(twitterUrl).catch(() => {
        Alert.alert('Error', 'Unable to open Twitter');
      });
      break;
      
    case 'facebook':
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
      Linking.openURL(facebookUrl).catch(() => {
        Alert.alert('Error', 'Unable to open Facebook');
      });
      break;
      
    case 'copy':
      Clipboard.setString(shareUrl);
      Alert.alert('Copied!', 'Link copied to clipboard');
      break;
      
    case 'sms':
      const smsUrl = `sms:?body=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
      Linking.openURL(smsUrl).catch(() => {
        Alert.alert('Error', 'Unable to open SMS');
      });
      break;
      
    default:
      handleShare();
  }
  setShowShareModal(false);
};

  const handleComment = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }

    if (!commentText.trim()) return;
    
    setSubmittingComment(true);
    try {
      const success = await onComment(reel._id, commentText.trim());
      if (success) {
        setCommentText('');
        // Don't close modal, just clear text
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    }
    setSubmittingComment(false);
  };

  const handleVideoPress = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 2000);
  };

  const handleDoubleTap = () => {
    if (!currentUser || isLiked) return;
    handleLike();
  };

  const handleProgress = (data) => {
    setProgress(data.currentTime || 0);
    setDuration(data.seekableDuration || 0);
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Video */}
      <TouchableOpacity 
        style={styles.videoContainer}
        onPress={handleVideoPress}
        onLongPress={() => setPaused(!paused)}
        delayLongPress={500}
        activeOpacity={1}
      >
        <Video
          source={{ uri: reel.URL }}
          style={styles.video}
          paused={paused}
          repeat={true}
          resizeMode="cover"
          muted={muted}
          volume={1.0}
          playInBackground={false}
          playWhenInactive={false}
          onProgress={handleProgress}
          onError={(error) => console.log('Video error:', error)}
        />

        {/* Heart Animation */}
        <Animated.View 
          style={[
            styles.heartAnimation,
            {
              opacity: heartAnimation,
              transform: [{
                scale: heartAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1.2],
                })
              }]
            }
          ]}
        >
          <Ionicons name="heart" size={100} color="#ff3040" />
        </Animated.View>

        {/* Play/Pause Overlay */}
        {(showControls || paused) && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={() => setPaused(!paused)}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)']}
                style={styles.playButtonGradient}
              >
                <Ionicons 
                  name={paused ? "play" : "pause"} 
                  size={50} 
                  color="rgba(255,255,255,0.9)" 
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Bar */}
        {showControls && duration > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(progress / duration) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.timeText}>
              {formatTime(progress)} / {formatTime(duration)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Top Gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={styles.topGradient}
      />

      {/* Bottom Gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomGradient}
      />

      {/* Content Overlay */}
      <View style={styles.contentContainer}>
        {/* Left side - User info & description */}
        <View style={styles.leftContent}>
          <View style={styles.userInfo}>
            <Image
              source={{ 
                uri: reel.user?.profileImage || 'https://via.placeholder.com/40'
              }}
              style={styles.avatar}
            />
            <Text style={styles.username}>
              {reel.user?.fullName || 'Unknown User'}
            </Text>
            <Text style={styles.followDot}>•</Text>
            <TouchableOpacity>
              <Text style={styles.followAction}>Follow</Text>
            </TouchableOpacity>
          </View>
          
          {reel.description && (
            <Text style={styles.description} numberOfLines={3}>
              {reel.description}
            </Text>
          )}
        </View>

        {/* Right side - Actions */}
        <View style={styles.rightContent}>
          {/* Profile Picture */}
          <TouchableOpacity style={styles.profileContainer}>
            <Image
              source={{ 
                uri: reel.user?.profileImage || 'https://via.placeholder.com/40'
              }}
              style={styles.profilePic}
            />
            <View style={styles.addButton}>
              <Ionicons name="add" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={32}
                color={isLiked ? "#ff3040" : "#fff"}
              />
            </Animated.View>
            <Text style={styles.actionText}>{formatCount(likes)}</Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity 
            onPress={() => setShowComments(true)}
            style={styles.actionButton}
          >
            <Ionicons name="chatbubble-outline" size={30} color="#fff" />
            <Text style={styles.actionText}>
              {formatCount(reel.comments?.length || 0)}
            </Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity 
  onPress={() => setShowShareModal(true)}
  style={styles.actionButton}
>
  <Ionicons name="paper-plane-outline" size={30} color="#fff" />
  <Text style={styles.actionText}>Share</Text>
</TouchableOpacity>

          {/* Mute/Unmute */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setMuted(!muted)}
          >
            <Ionicons 
              name={muted ? "volume-mute-outline" : "volume-high-outline"} 
              size={30} 
              color="#fff" 
            />
          </TouchableOpacity>

          {/* More */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Modal - Full Screen */}
      <Modal
        visible={showComments}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowComments(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Header */}
            <View style={styles.commentsHeader}>
              <TouchableOpacity 
                onPress={() => setShowComments(false)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.commentsTitle}>Comments</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Comments List */}
            <FlatList
              data={reel.comments || []}
              keyExtractor={(item, index) => `comment-${index}`}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image
                    source={{ 
                      uri: item.user?.profileImage || 'https://via.placeholder.com/32'
                    }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUsername}>
                        {item.user?.fullName || 'User'}
                      </Text>
                      <Text style={styles.commentTime}>
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{item.comment}</Text>
                  </View>
                  <TouchableOpacity style={styles.commentLike}>
                    <Ionicons name="heart-outline" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              style={styles.commentsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <Ionicons name="chatbubble-outline" size={48} color="#ddd" />
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubText}>Be the first to comment!</Text>
                </View>
              }
              contentContainerStyle={{ flexGrow: 1 }}
            />

            {/* Comment Input */}
            <View style={styles.commentInputContainer}>
              <Image
                source={{ 
                  uri: currentUser?.profileImage || 'https://via.placeholder.com/32'
                }}
                style={styles.inputAvatar}
              />
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#999"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={200}
                  textAlignVertical="center"
                />
                <TouchableOpacity 
                  onPress={handleComment}
                  disabled={!commentText.trim() || submittingComment}
                  style={[
                    styles.sendButton,
                    { 
                      opacity: (commentText.trim() && !submittingComment) ? 1 : 0.5 
                    }
                  ]}
                >
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color="#007AFF" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <Modal
  visible={showShareModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowShareModal(false)}
>
  <View style={styles.shareModalOverlay}>
    <View style={styles.shareModalContainer}>
      <View style={styles.shareModalHeader}>
        <Text style={styles.shareModalTitle}>Share Reel</Text>
        <TouchableOpacity 
          onPress={() => setShowShareModal(false)}
          style={styles.shareCloseButton}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.shareOptionsContainer}>
        {/* Native Share */}
        <TouchableOpacity 
          style={styles.shareOption}
          onPress={handleShare}
        >
          <View style={styles.shareIconContainer}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </View>
          <Text style={styles.shareOptionText}>More Options</Text>
        </TouchableOpacity>

        {/* WhatsApp */}
        <TouchableOpacity 
          style={styles.shareOption}
          onPress={() => handleCustomShare('whatsapp')}
        >
          <View style={[styles.shareIconContainer, { backgroundColor: '#25D366' }]}>
            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          </View>
          <Text style={styles.shareOptionText}>WhatsApp</Text>
        </TouchableOpacity>

        {/* Instagram */}
        <TouchableOpacity 
          style={styles.shareOption}
          onPress={() => handleCustomShare('instagram')}
        >
          <View style={[styles.shareIconContainer, { backgroundColor: '#E4405F' }]}>
            <Ionicons name="logo-instagram" size={24} color="#fff" />
          </View>
          <Text style={styles.shareOptionText}>Instagram</Text>
        </TouchableOpacity>

        {/* Twitter */}
        <TouchableOpacity 
          style={styles.shareOption}
          onPress={() => handleCustomShare('twitter')}
        >
          <View style={[styles.shareIconContainer, { backgroundColor: '#1DA1F2' }]}>
            <Ionicons name="logo-twitter" size={24} color="#fff" />
          </View>
          <Text style={styles.shareOptionText}>Twitter</Text>
        </TouchableOpacity>

        {/* Facebook */}
        <TouchableOpacity 
          style={styles.shareOption}
          onPress={() => handleCustomShare('facebook')}
        >
          <View style={[styles.shareIconContainer, { backgroundColor: '#1877F2' }]}>
            <Ionicons name="logo-facebook" size={24} color="#fff" />
          </View>
          <Text style={styles.shareOptionText}>Facebook</Text>
        </TouchableOpacity>

        {/* SMS */}
        <TouchableOpacity 
          style={styles.shareOption}
          onPress={() => handleCustomShare('sms')}
        >
          <View style={[styles.shareIconContainer, { backgroundColor: '#34C759' }]}>
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          </View>
          <Text style={styles.shareOptionText}>SMS</Text>
        </TouchableOpacity>

        {/* Copy Link */}
        <TouchableOpacity 
          style={styles.shareOption}
          onPress={() => handleCustomShare('copy')}
        >
          <View style={[styles.shareIconContainer, { backgroundColor: '#666' }]}>
            <Ionicons name="copy-outline" size={24} color="#fff" />
          </View>
          <Text style={styles.shareOptionText}>Copy Link</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Share Button */}
      <TouchableOpacity 
        style={styles.quickShareButton}
        onPress={handleShare}
      >
        <Text style={styles.quickShareText}>Quick Share</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  heartAnimation: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
  },
  controlsOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  playButton: {
    borderRadius: 50,
  },
  playButtonGradient: {
    borderRadius: 50,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 220,
    left: 16,
    right: 80,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  leftContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  followDot: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  followAction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rightContent: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  addButton: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#ff3040',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Comments Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardContainer: {
    flex: 1,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  commentLike: {
    padding: 8,
  },
  emptyComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
    maxHeight: 80,
  },
  sendButton: {
    paddingRight: 12,
    paddingVertical: 8,
  },

  // Share Modal Styles
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  shareCloseButton: {
    padding: 8,
  },
  shareOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  shareOption: {
    alignItems: 'center',
    marginBottom: 20,
    width: '23%',
  },
  shareIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareOptionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  quickShareButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  quickShareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReelItem;