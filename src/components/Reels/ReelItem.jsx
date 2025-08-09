// src/components/Reels/ReelItem.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  Modal,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReelItem = ({ reel, isActive, onLike, onComment, currentUser }) => {
  const [paused, setPaused] = useState(!isActive);
  const [muted, setMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  
  const videoRef = useRef(null);
  const likeAnimation = useRef(new Animated.Value(0)).current;
  const heartAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setPaused(!isActive);
  }, [isActive]);

  const handleVideoPress = () => {
    setPaused(!paused);
    setShowProgress(true);
    setTimeout(() => setShowProgress(false), 2000);
  };

  const handleDoubleTap = () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to like reels');
      return;
    }

    setLiked(!liked);
    onLike(reel._id);

    // Heart animation
    Animated.sequence([
      Animated.timing(heartAnimation, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Like animation
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLike = () => {
    if (currentUser) {
      setLiked(!liked);
      onLike(reel._id);
      
      Animated.sequence([
        Animated.timing(heartAnimation, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Alert.alert('Login Required', 'Please login to like reels');
    }
  };

  const handleCommentSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }

    if (!commentText.trim()) return;

    setSubmittingComment(true);
    const success = await onComment(reel._id, commentText.trim());
    
    if (success) {
      setCommentText('');
      setShowComments(false);
    }
    setSubmittingComment(false);
  };

  const handleProgress = (data) => {
    setProgress(data.currentTime);
    setDuration(data.seekableDuration);
  };

  const formatCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.videoContainer} 
        onPress={handleVideoPress}
        onLongPress={handleDoubleTap}
        activeOpacity={1}
      >
        <Video
          ref={videoRef}
          source={{ uri: reel.URL }}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={paused}
          muted={muted}
          onProgress={handleProgress}
          onError={(error) => console.log('Video error:', error)}
        />
        
        {/* Play/Pause Button */}
        {paused && (
          <Animated.View style={styles.playButton}>
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)']}
              style={styles.playButtonGradient}
            >
              <Ionicons name="play" size={60} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </Animated.View>
        )}

        {/* Progress Bar */}
        {showProgress && duration > 0 && (
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

        {/* Double Tap Heart Animation */}
        <Animated.View 
          style={[
            styles.doubleTapHeart,
            {
              opacity: likeAnimation,
              transform: [
                { scale: likeAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1.5]
                })}
              ]
            }
          ]}
        >
          <Ionicons name="heart" size={80} color="#ff3040" />
        </Animated.View>
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

      {/* Right Side Actions */}
      <View style={styles.rightActions}>
        {/* User Avatar */}
        <TouchableOpacity style={styles.avatarContainer}>
          <Image 
            source={{ 
              uri: reel.user?.profileImage || 'https://via.placeholder.com/50'
            }}
            style={styles.avatar}
          />
          <View style={styles.followButton}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale: heartAnimation }] }}>
            <Ionicons 
              name={liked ? "heart" : "heart-outline"} 
              size={32} 
              color={liked ? "#ff3040" : "#fff"} 
            />
          </Animated.View>
          <Text style={styles.actionText}>{formatCount(reel.likes || 0)}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowComments(true)}
        >
          <Ionicons name="chatbubble-outline" size={30} color="#fff" />
          <Text style={styles.actionText}>
            {formatCount(reel.comments?.length || 0)}
          </Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={30} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        {/* Mute/Unmute Button */}
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

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <Text style={styles.username}>@{reel.user?.fullName || 'User'}</Text>
        {reel.description && (
          <Text style={styles.description} numberOfLines={3}>
            {reel.description}
          </Text>
        )}
        {reel.hashtags && (
          <Text style={styles.hashtags}>
            {reel.hashtags.map(tag => `#${tag}`).join(' ')}
          </Text>
        )}
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.commentsModal}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.commentsList}>
            {reel.comments?.length > 0 ? (
              reel.comments.map((comment, index) => (
                <View key={index} style={styles.commentItem}>
                  <Image 
                    source={{ 
                      uri: comment.user?.profileImage || 'https://via.placeholder.com/30'
                    }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUser}>
                      {comment.user?.fullName || 'User'}
                    </Text>
                    <Text style={styles.commentText}>{comment.comment}</Text>
                  </View>
                  <TouchableOpacity style={styles.commentLike}>
                    <Ionicons name="heart-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubText}>Be the first to comment!</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.commentInputContainer}>
            <Image 
              source={{ 
                uri: currentUser?.profileImage || 'https://via.placeholder.com/30'
              }}
              style={styles.inputAvatar}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Add a comment..."
              placeholderTextColor="#999"
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { opacity: commentText.trim() ? 1 : 0.5 }
              ]}
              onPress={handleCommentSubmit}
              disabled={submittingComment || !commentText.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color="#4CAF50" 
              />
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
  playButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonGradient: {
    borderRadius: 40,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    right: 80,
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  doubleTapHeart: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  followButton: {
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
    marginVertical: 16,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 80,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hashtags: {
    color: '#4FC3F7',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  commentsModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  commentLike: {
    padding: 4,
  },
  noComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  noCommentsSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  inputAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
    fontSize: 14,
    color: '#000',
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
});

export default ReelItem;