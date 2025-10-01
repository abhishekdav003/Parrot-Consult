import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReelItem = ({ reel, isActive, onLike, onComment, currentUser, navigation }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState([]);
  const [paused, setPaused] = useState(!isActive);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const likeAnimation = useRef(new Animated.Value(1)).current;
  const heartAnimation = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);

  // Initialize state from reel prop
  useEffect(() => {
    setIsLiked(reel.isLiked || false);
    setLikes(reel.likes || 0);
    setComments(reel.comments || []);
  }, [reel._id]);

  // Sync with prop updates (for like/comment actions)
  useEffect(() => {
    if (reel.isLiked !== undefined && reel.isLiked !== isLiked) {
      setIsLiked(reel.isLiked);
    }
    if (reel.likes !== undefined && reel.likes !== likes) {
      setLikes(reel.likes);
    }
    if (reel.comments !== undefined) {
      setComments(reel.comments);
    }
  }, [reel.isLiked, reel.likes, reel.comments]);

  // Update paused state when active status changes
  useEffect(() => {
    setPaused(!isActive);
    if (!isActive && videoRef.current) {
      videoRef.current.seek(0);
    }
  }, [isActive]);

  // Handle profile navigation
  const handleProfilePress = useCallback(() => {
    if (!navigation) {
      console.warn('[ReelItem] Navigation prop not provided');
      return;
    }

    if (!reel.user) {
      Alert.alert('Info', 'User profile not available');
      return;
    }

    // Pause video when navigating away
    setPaused(true);

    console.log('[ReelItem] Navigating to profile:', {
      userId: reel.user._id,
      userName: reel.user.fullName
    });

    // Navigate to ExpertProfileScreen with user data
    navigation.navigate('ExpertProfileScreen', {
      expert: reel.user
    });
  }, [navigation, reel.user]);

  // Handle like action
  const handleLike = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to like reels');
      return;
    }

    const originalLikedState = isLiked;
    const originalLikes = likes;
    
    // Optimistic update
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikes(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

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
      if (!result || !result.success) {
        // Revert on failure
        setIsLiked(originalLikedState);
        setLikes(originalLikes);
      }
    } catch (error) {
      console.error('[ReelItem] Like error:', error);
      // Revert on error
      setIsLiked(originalLikedState);
      setLikes(originalLikes);
    }
  }, [currentUser, isLiked, likes, onLike, reel._id]);

  // Handle comment submission
  const handleComment = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }

    if (!commentText.trim()) return;
    
    setSubmittingComment(true);
    try {
      const result = await onComment(reel._id, commentText.trim());
      if (result && result.success) {
        setCommentText('');
      } else {
        Alert.alert('Error', 'Failed to post comment. Please try again.');
      }
    } catch (error) {
      console.error('[ReelItem] Comment error:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  }, [currentUser, commentText, onComment, reel._id]);

  // Handle share
  const handleShare = useCallback(async () => {
    try {
      const shareUrl = reel.URL || `https://parrotconsult.com/reel/${reel._id.split('_')[0]}`;
      const shareMessage = `Check out this reel${reel.user?.fullName ? ` by ${reel.user.fullName}` : ''}!\n\n${reel.description ? reel.description + '\n\n' : ''}${shareUrl}`;

      const result = await Share.share({
        message: shareMessage,
        url: shareUrl,
        title: 'Share Reel',
      });

      if (result.action === Share.sharedAction) {
        console.log('[ReelItem] Shared successfully');
      }
    } catch (error) {
      console.error('[ReelItem] Share error:', error);
      Alert.alert('Error', 'Failed to share reel');
    }
  }, [reel]);

  // Handle custom share to different platforms
  const handleCustomShare = useCallback((platform) => {
    const shareUrl = reel.URL || `https://parrotconsult.com/reel/${reel._id.split('_')[0]}`;
    const shareText = `Check out this reel${reel.user?.fullName ? ` by ${reel.user.fullName}` : ''}!`;
    
    switch (platform) {
      case 'whatsapp':
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`)
          .catch(() => Alert.alert('Error', 'WhatsApp is not installed'));
        break;
        
      case 'twitter':
        Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`)
          .catch(() => Alert.alert('Error', 'Unable to open Twitter'));
        break;
        
      case 'facebook':
        Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)
          .catch(() => Alert.alert('Error', 'Unable to open Facebook'));
        break;
        
      case 'copy':
        Clipboard.setString(shareUrl);
        Alert.alert('Copied!', 'Link copied to clipboard');
        break;
        
      case 'sms':
        Linking.openURL(`sms:?body=${encodeURIComponent(shareText + ' ' + shareUrl)}`)
          .catch(() => Alert.alert('Error', 'Unable to open SMS'));
        break;
        
      default:
        handleShare();
    }
    setShowShareModal(false);
  }, [reel, handleShare]);

  // Handle video error
  const handleVideoError = useCallback((error) => {
    console.error('[ReelItem] Video error:', error);
    setVideoError(true);
    setBuffering(false);
  }, []);

  // Handle video load
  const handleVideoLoad = useCallback(() => {
    setBuffering(false);
    setVideoError(false);
  }, []);

  // Handle video buffer
  const handleVideoBuffer = useCallback(({ isBuffering }) => {
    setBuffering(isBuffering);
  }, []);

  // Format count
  const formatCount = useCallback((count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  // Render comment item
  const renderCommentItem = useCallback(({ item }) => (
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
    </View>
  ), []);

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        {videoError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#fff" />
            <Text style={styles.errorText}>Failed to load video</Text>
          </View>
        ) : (
          <>
            <Video
              ref={videoRef}
              source={{ uri: reel.URL }}
              style={styles.video}
              paused={paused}
              repeat={true}
              resizeMode="cover"
              muted={muted}
              volume={1.0}
              playInBackground={false}
              playWhenInactive={false}
              onLoad={handleVideoLoad}
              onBuffer={handleVideoBuffer}
              onError={handleVideoError}
              posterResizeMode="cover"
              bufferConfig={{
                minBufferMs: 15000,
                maxBufferMs: 50000,
                bufferForPlaybackMs: 2500,
                bufferForPlaybackAfterRebufferMs: 5000
              }}
            />

            {/* Buffering Indicator */}
            {buffering && (
              <View style={styles.bufferingContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}

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
          </>
        )}
      </View>

      {/* Bottom Gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomGradient}
      />

      {/* Content Overlay */}
      <View style={styles.contentContainer}>
        {/* Left side - User info & description */}
        <View style={styles.leftContent}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            <Image
              source={{ 
                uri: reel.user?.profileImage || 'https://via.placeholder.com/40'
              }}
              style={styles.avatar}
            />
            <Text style={styles.username} numberOfLines={1}>
              {reel.user?.fullName || 'Unknown User'}
            </Text>
          </TouchableOpacity>
          
          {reel.description ? (
            <Text style={styles.description} numberOfLines={3}>
              {reel.description}
            </Text>
          ) : null}
        </View>

        {/* Right side - Actions */}
        <View style={styles.rightContent}>
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
              {formatCount(comments.length)}
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
        </View>
      </View>

      {/* Comments Modal */}
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
              <Text style={styles.commentsTitle}>
                Comments ({formatCount(comments.length)})
              </Text>
              <View style={styles.placeholder} />
            </View>

            {/* Comments List */}
            <FlatList
              data={comments}
              keyExtractor={(item, index) => `comment-${index}-${item.user?._id || index}`}
              renderItem={renderCommentItem}
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
                  editable={!submittingComment}
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
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Share Modal */}
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
                <Text style={styles.shareOptionText}>More</Text>
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
                <Text style={styles.shareOptionText}>Copy</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  bufferingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  heartAnimation: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
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
    paddingRight: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rightContent: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
    minWidth: 50,
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

  // Comments Modal
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
    paddingLeft: 8,
  },

  // Share Modal
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
  },
  shareOption: {
    alignItems: 'center',
    marginBottom: 20,
    width: '30%',
  },
  shareIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
});

export default ReelItem;