// src/components/Dashboard/UploadReelSection.jsx - PRODUCTION READY & FULLY OPTIMIZED
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  FlatList,
  Modal,
  Animated,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import ApiService from '../../services/ApiService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing
const getResponsiveSizes = () => {
  if (SCREEN_WIDTH < 360) return { small: true, tablet: false, scale: 0.8 };
  if (SCREEN_WIDTH < 768) return { small: SCREEN_WIDTH < 400, tablet: false, scale: 1 };
  return { small: false, tablet: true, scale: 1.2 };
};

const SIZES = getResponsiveSizes();

// Video format validation
const ALLOWED_VIDEO_FORMATS = [
  'video/mp4',
  'video/quicktime'
];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 60; // 60 seconds
const MAX_DESCRIPTION_LENGTH = 500;

const UploadReelSection = ({ user, onRefresh }) => {
  // State management
  const [description, setDescription] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [myReels, setMyReels] = useState([]);
  const [loadingReels, setLoadingReels] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [reelToDelete, setReelToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Check consultant status
  const isConsultant = user?.role === 'consultant' || user?.consultantRequest?.status === 'approved';

  useEffect(() => {
    if (isConsultant && activeTab === 'myReels') {
      fetchMyReels();
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConsultant, activeTab]);

  /**
   * Fetch user's reels with error handling
   */
  const fetchMyReels = async (showLoading = true) => {
    if (showLoading) setLoadingReels(true);

    try {
      const result = await ApiService.getUserReels();

      if (result.success) {
        setMyReels(result.data || []);
      } else {
        if (!showLoading) {
          Alert.alert('Error', result.error || 'Failed to load reels');
        }
      }
    } catch (error) {
      console.error('[UploadReel] Fetch error:', error);
      if (!showLoading) {
        Alert.alert('Error', 'Failed to load reels');
      }
    } finally {
      setLoadingReels(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyReels(false);
  }, []);

  /**
   * Validate video file
   */
  const validateVideo = (video) => {
    // Check file existence
    if (!video || !video.uri) {
      return { valid: false, error: 'Invalid video file' };
    }

    // Check file size
    if (video.fileSize && video.fileSize > MAX_VIDEO_SIZE) {
      return { 
        valid: false, 
        error: `Video size must be less than ${Math.round(MAX_VIDEO_SIZE / (1024 * 1024))}MB` 
      };
    }

    // Check duration
    if (video.duration && video.duration > MAX_VIDEO_DURATION) {
      return { 
        valid: false, 
        error: `Video duration must be under ${MAX_VIDEO_DURATION} seconds` 
      };
    }

    // Check format
    if (video.type && !video.type.startsWith('video/')) {
  return {
    valid: false,
    error: 'Invalid file type. Please select a video file.'
  };
}


    return { valid: true };
  };

  /**
   * Select video with comprehensive validation
   */
  const selectVideo = useCallback(() => {
    const options = {
      mediaType: 'video',
      quality: 0.8,
      videoQuality: 'medium',
      durationLimit: MAX_VIDEO_DURATION,
      selectionLimit: 1,
      includeBase64: false,
      includeExtra: true,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('[UploadReel] User cancelled video selection');
        return;
      }

      if (response.errorCode) {
        console.error('[UploadReel] ImagePicker Error:', response.errorCode);
        Alert.alert('Error', response.errorMessage || 'Failed to select video');
        return;
      }

      if (response.error) {
        console.error('[UploadReel] ImagePicker Error:', response.error);
        Alert.alert('Error', 'Failed to select video');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const video = response.assets[0];
        
        console.log('[UploadReel] Video selected:', {
          fileName: video.fileName,
          fileSize: video.fileSize,
          duration: video.duration,
          type: video.type,
          uri: video.uri
        });

        // Validate video
        const validation = validateVideo(video);
        if (!validation.valid) {
          Alert.alert('Invalid Video', validation.error);
          return;
        }

        // Ensure proper file name
        const fileName = video.fileName || `video_${Date.now()}.mp4`;
        const fileType = video.type || 'video/mp4';

        // Set selected video with normalized data
        const normalizedVideo = {
          uri: video.uri,
          fileName: fileName,
          name: fileName,
          type: fileType,
          fileSize: video.fileSize,
          duration: video.duration,
          width: video.width,
          height: video.height,
        };

        setSelectedVideo(normalizedVideo);

        // Animate selection
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

        console.log('[UploadReel] ✅ Video validated and selected');
      } else {
        Alert.alert('Error', 'No video selected');
      }
    });
  }, []);

  /**
   * Upload reel with comprehensive error handling
   */
  const uploadReel = async () => {
    // Validation checks
    if (!selectedVideo) {
      Alert.alert('No Video', 'Please select a video first');
      return;
    }

    if (!selectedVideo.uri) {
      Alert.alert('Invalid Video', 'Video file is missing. Please select again.');
      setSelectedVideo(null);
      return;
    }

    if (!description.trim()) {
      Alert.alert('No Description', 'Please add a description for your reel');
      return;
    }

    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      Alert.alert('Description Too Long', `Maximum ${MAX_DESCRIPTION_LENGTH} characters allowed`);
      return;
    }

    // Revalidate video before upload
    const validation = validateVideo(selectedVideo);
    if (!validation.valid) {
      Alert.alert('Invalid Video', validation.error);
      setSelectedVideo(null);
      return;
    }

    Alert.alert(
      'Upload Reel',
      'Upload this reel to your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            setUploading(true);
            setUploadProgress(0);

            // Progress simulation
            const progressInterval = setInterval(() => {
              setUploadProgress((prev) => {
                if (prev >= 90) return 90;
                return prev + 5;
              });
            }, 300);

            try {
              console.log('[UploadReel] 🚀 Starting upload...', {
                videoUri: selectedVideo.uri,
                videoName: selectedVideo.fileName,
                videoType: selectedVideo.type,
                description: description.trim().substring(0, 50) + '...',
              });

              // Call API with proper parameters
              const result = await ApiService.uploadReel({
                video: selectedVideo,
                description: description.trim(),
              });

              clearInterval(progressInterval);
              setUploadProgress(100);

              if (result.success) {
                console.log('[UploadReel] ✅ Upload successful!');
                
                Alert.alert(
                  '✅ Success!',
                  'Your reel has been uploaded successfully',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reset form
                        setDescription('');
                        setSelectedVideo(null);
                        setUploadProgress(0);
                        
                        // Switch to My Reels tab
                        setActiveTab('myReels');
                        fetchMyReels();
                        
                        // Notify parent to refresh feed
                        if (onRefresh) {
                          onRefresh();
                        }
                      },
                    },
                  ]
                );
              } else {
                console.error('[UploadReel] ❌ Upload failed:', result.error);
                Alert.alert(
                  'Upload Failed',
                  result.error || 'Failed to upload reel. Please try again.'
                );
              }
            } catch (error) {
              clearInterval(progressInterval);
              console.error('[UploadReel] ❌ Upload exception:', error);
              Alert.alert(
                'Upload Error',
                error.message || 'An error occurred while uploading. Please check your connection and try again.'
              );
            } finally {
              setUploading(false);
              setUploadProgress(0);
            }
          },
        },
      ]
    );
  };

  /**
   * Delete reel with confirmation
   */
  const deleteReel = async () => {
    if (!reelToDelete) return;

    setDeleting(true);

    try {
      const result = await ApiService.deleteReel(reelToDelete._id);

      if (result.success) {
        Alert.alert('✅ Success', 'Reel deleted successfully');
        setDeleteModalVisible(false);
        setReelToDelete(null);
        fetchMyReels(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to delete reel');
      }
    } catch (error) {
      console.error('[UploadReel] Delete error:', error);
      Alert.alert('Error', 'Failed to delete reel');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Remove selected video
   */
  const removeSelectedVideo = () => {
    if (uploading) return;
    
    Alert.alert(
      'Remove Video',
      'Remove selected video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelectedVideo(null);
            setUploadProgress(0);
          },
        },
      ]
    );
  };

  /**
   * Render reel item
   */
  const renderReelItem = ({ item }) => (
    <View style={styles.reelCard}>
      <View style={styles.reelThumbnailContainer}>
        <Image
          source={{ uri: item.URL }}
          style={styles.reelThumbnail}
          resizeMode="cover"
        />
        <View style={styles.reelOverlay}>
          <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.reelStats}>
          <View style={styles.reelStat}>
            <Ionicons name="heart" size={12} color="#fff" />
            <Text style={styles.reelStatText}>{item.likes || 0}</Text>
          </View>
          <View style={styles.reelStat}>
            <Ionicons name="chatbubble" size={12} color="#fff" />
            <Text style={styles.reelStatText}>{item.comments?.length || 0}</Text>
          </View>
        </View>
      </View>

      <View style={styles.reelInfo}>
        <Text style={styles.reelDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
        <Text style={styles.reelDate}>
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          setReelToDelete(item);
          setDeleteModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  /**
   * Render upload tab
   */
  const renderUploadTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.uploadContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.uploadHeader}>
        <Ionicons name="videocam" size={32 * SIZES.scale} color="#8B5CF6" />
        <Text style={styles.uploadTitle}>Upload Your Reel</Text>
        <Text style={styles.uploadSubtitle}>
          Share your expertise with the community
        </Text>
      </View>

      <View style={styles.videoSelectorContainer}>
        {selectedVideo ? (
          <Animated.View style={[styles.videoSelected, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.videoPreview}>
              <Image
                source={{ uri: selectedVideo.uri }}
                style={styles.videoPreviewImage}
                resizeMode="cover"
              />
              <View style={styles.videoPreviewOverlay}>
                <Ionicons name="checkmark-circle" size={40} color="#10B981" />
              </View>
            </View>

            <View style={styles.videoDetails}>
              <Text style={styles.videoName} numberOfLines={1}>
                {selectedVideo.fileName || selectedVideo.name || 'Video selected'}
              </Text>
              <View style={styles.videoMeta}>
                {selectedVideo.fileSize && (
                  <Text style={styles.videoMetaText}>
                    {formatFileSize(selectedVideo.fileSize)}
                  </Text>
                )}
                {selectedVideo.duration && selectedVideo.fileSize && (
                  <Text style={styles.videoMetaDot}>•</Text>
                )}
                {selectedVideo.duration && (
                  <Text style={styles.videoMetaText}>
                    {formatDuration(selectedVideo.duration)}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.removeVideoButton}
              onPress={removeSelectedVideo}
              disabled={uploading}
            >
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={styles.videoSelector}
            onPress={selectVideo}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={44 * SIZES.scale} color="#8B5CF6" />
            <Text style={styles.videoSelectorTitle}>Select Video</Text>
            <Text style={styles.videoSelectorSubtitle}>
              MP4, MOV • Max 50MB • Up to 60s
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.inputLabel}>
          Description <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.descriptionInputWrapper}>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Write a caption for your reel... (Max 500 characters)"
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            maxLength={MAX_DESCRIPTION_LENGTH}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!uploading}
          />
          <Text style={styles.characterCount}>
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>
        </View>
      </View>

      {uploading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Uploading your reel...</Text>
            <Text style={styles.progressPercentage}>{uploadProgress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar, 
                { width: `${uploadProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressNote}>Please don't close the app</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.uploadButton,
          (!selectedVideo || !description.trim() || uploading) && styles.uploadButtonDisabled,
        ]}
        onPress={uploadReel}
        disabled={!selectedVideo || !description.trim() || uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={18} color="#fff" />
            <Text style={styles.uploadButtonText}>Upload Reel</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.guidelinesContainer}>
        <Text style={styles.guidelinesTitle}>📋 Upload Guidelines</Text>
        <View style={styles.guideline}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.guidelineText}>Keep videos under 60 seconds</Text>
        </View>
        <View style={styles.guideline}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.guidelineText}>Use vertical videos (9:16 ratio preferred)</Text>
        </View>
        <View style={styles.guideline}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.guidelineText}>Add clear, descriptive captions</Text>
        </View>
        <View style={styles.guideline}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.guidelineText}>File size must be under 50MB</Text>
        </View>
      </View>
    </ScrollView>
  );

  /**
   * Render my reels tab
   */
  const renderMyReelsTab = () => (
    <View style={styles.tabContent}>
      {loadingReels ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading your reels...</Text>
        </View>
      ) : myReels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={56} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Reels Yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload your first reel to start sharing your expertise
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setActiveTab('upload')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Upload Reel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myReels}
          renderItem={renderReelItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.reelsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#8B5CF6']}
              tintColor="#8B5CF6"
            />
          }
          ListHeaderComponent={() => (
            <View style={styles.reelsHeader}>
              <Text style={styles.reelsCount}>
                {myReels.length} {myReels.length === 1 ? 'Reel' : 'Reels'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );

  // Not consultant - Show upgrade message
  if (!isConsultant) {
    return (
      <View style={styles.notConsultantContainer}>
        <Ionicons name="lock-closed" size={56} color="#CBD5E1" />
        <Text style={styles.notConsultantTitle}>Consultant Access Only</Text>
        <Text style={styles.notConsultantSubtitle}>
          Apply to become a consultant to upload and share reels
        </Text>
        <TouchableOpacity style={styles.notConsultantButton} activeOpacity={0.7}>
          <Text style={styles.notConsultantButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upload' && styles.activeTab]}
          onPress={() => setActiveTab('upload')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={18}
            color={activeTab === 'upload' ? '#8B5CF6' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>
            Upload
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'myReels' && styles.activeTab]}
          onPress={() => setActiveTab('myReels')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="albums-outline"
            size={18}
            color={activeTab === 'myReels' ? '#8B5CF6' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'myReels' && styles.activeTabText]}>
            My Reels
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'upload' ? renderUploadTab() : renderMyReelsTab()}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="trash-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Delete Reel?</Text>
            <Text style={styles.modalMessage}>
              This action cannot be undone. Your reel will be permanently deleted.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={deleteReel}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: SIZES.small ? 10 : 14,
    marginTop: SIZES.small ? 10 : 14,
    borderRadius: 10,
    padding: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.small ? 8 : 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#F3F4F6',
  },
  tabText: {
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  uploadContainer: {
    padding: SIZES.small ? 10 : 14,
    paddingBottom: 28,
  },
  uploadHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: SIZES.small ? 18 : 22,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
  },
  uploadSubtitle: {
    fontSize: SIZES.small ? 12 : 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  videoSelectorContainer: {
    marginBottom: 16,
  },
  videoSelector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.small ? 24 : 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  videoSelectorTitle: {
    fontSize: SIZES.small ? 14 : 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
  },
  videoSelectorSubtitle: {
    fontSize: SIZES.small ? 11 : 12,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  videoSelected: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.small ? 10 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  videoPreview: {
    width: SIZES.small ? 70 : 85,
    height: SIZES.small ? 70 : 85,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  videoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  videoPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDetails: {
    flex: 1,
    marginLeft: SIZES.small ? 10 : 12,
    marginRight: 6,
  },
  videoName: {
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoMetaText: {
    fontSize: SIZES.small ? 11 : 12,
    color: '#64748B',
  },
  videoMetaDot: {
    marginHorizontal: 4,
    color: '#CBD5E1',
  },
  removeVideoButton: {
    padding: 2,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  descriptionInputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  descriptionInput: {
    padding: SIZES.small ? 10 : 12,
    fontSize: SIZES.small ? 13 : 14,
    color: '#1E293B',
    minHeight: SIZES.small ? 70 : 85,
    maxHeight: SIZES.small ? 100 : 120,
  },
  characterCount: {
    fontSize: 11,
    color: '#94A3B8',
    paddingHorizontal: 12,
    paddingBottom: 10,
    textAlign: 'right',
  },
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: SIZES.small ? 12 : 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressText: {
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressPercentage: {
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: SIZES.small ? 12 : 14,
    borderRadius: 10,
    marginBottom: 20,
    gap: 6,
    elevation: 3,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  uploadButtonDisabled: {
    backgroundColor: '#CBD5E1',
    elevation: 0,
    shadowOpacity: 0,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: SIZES.small ? 13 : 14,
    fontWeight: '700',
  },
  guidelinesContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: SIZES.small ? 12 : 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  guidelinesTitle: {
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  guidelineText: {
    flex: 1,
    fontSize: SIZES.small ? 11 : 12,
    color: '#64748B',
    lineHeight: SIZES.small ? 16 : 18,
  },
  reelsHeader: {
    paddingHorizontal: SIZES.small ? 10 : 14,
    paddingVertical: SIZES.small ? 10 : 12,
  },
  reelsCount: {
    fontSize: SIZES.small ? 14 : 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  reelsList: {
    paddingHorizontal: SIZES.small ? 10 : 14,
    paddingBottom: 16,
  },
  reelCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: SIZES.small ? 10 : 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  reelThumbnailContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    position: 'relative',
  },
  reelThumbnail: {
    width: '100%',
    height: '100%',
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelStats: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 12,
  },
  reelStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  reelStatText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  reelInfo: {
    padding: SIZES.small ? 10 : 12,
    paddingRight: 40,
  },
  reelDescription: {
    fontSize: SIZES.small ? 12 : 13,
    color: '#1E293B',
    lineHeight: SIZES.small ? 16 : 18,
    marginBottom: 4,
  },
  reelDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: SIZES.small ? 12 : 13,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: SIZES.small ? 16 : 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: SIZES.small ? 12 : 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: SIZES.small ? 18 : 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '600',
  },
  notConsultantContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F8FAFC',
  },
  notConsultantTitle: {
    fontSize: SIZES.small ? 16 : 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 6,
  },
  notConsultantSubtitle: {
    fontSize: SIZES.small ? 12 : 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: SIZES.small ? 18 : 20,
    marginBottom: 20,
  },
  notConsultantButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  notConsultantButtonText: {
    color: '#fff',
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SIZES.small ? 16 : 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: SIZES.small ? 16 : 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: SIZES.small ? 12 : 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: SIZES.small ? 18 : 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.small ? 10 : 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalDeleteButton: {
    backgroundColor: '#EF4444',
  },
  modalDeleteText: {
    fontSize: SIZES.small ? 12 : 13,
    fontWeight: '600',
    color: '#fff',
  },
});

export default UploadReelSection;