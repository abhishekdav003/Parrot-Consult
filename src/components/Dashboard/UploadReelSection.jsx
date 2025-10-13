// src/components/Dashboard/UploadReelSection.jsx - PRODUCTION READY
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
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import ApiService from '../../services/ApiService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;
const IS_TABLET = SCREEN_WIDTH >= 768;

const UploadReelSection = ({ user, onRefresh }) => {
  // States
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
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'myReels'

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Check if user is consultant
  const isConsultant = user?.role === 'consultant' || user?.consultantRequest?.status === 'approved';

  useEffect(() => {
    if (isConsultant && activeTab === 'myReels') {
      fetchMyReels();
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConsultant, activeTab]);

  // Fetch user's reels
  const fetchMyReels = async (showLoading = true) => {
    if (showLoading) {
      setLoadingReels(true);
    }
    
    try {
      const result = await ApiService.getUserReels();
      
      if (result.success) {
        setMyReels(result.data || []);
      } else {
        console.warn('[REEL_UPLOAD] Failed to fetch reels:', result.error);
        if (!showLoading) {
          Alert.alert('Error', result.error || 'Failed to load your reels');
        }
      }
    } catch (error) {
      console.error('[REEL_UPLOAD] Error fetching reels:', error);
      if (!showLoading) {
        Alert.alert('Error', 'Failed to load your reels');
      }
    } finally {
      setLoadingReels(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyReels(false);
  }, []);

  // Video selection with validation
  const selectVideo = useCallback(() => {
    const options = {
      mediaType: 'video',
      quality: 0.8,
      videoQuality: 'medium',
      durationLimit: 60, // 60 seconds max
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('[REEL_UPLOAD] User cancelled video selection');
        return;
      }

      if (response.error || response.errorCode) {
        console.error('[REEL_UPLOAD] ImagePicker Error:', response.error);
        Alert.alert('Error', 'Failed to select video. Please try again.');
        return;
      }

      if (response.assets && response.assets[0]) {
        const video = response.assets[0];

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (video.fileSize > maxSize) {
          Alert.alert(
            'File Too Large',
            'Video size should be less than 50MB. Please select a smaller video.'
          );
          return;
        }

        // Validate duration (max 60 seconds)
        if (video.duration && video.duration > 60) {
          Alert.alert(
            'Video Too Long',
            'Video duration should be less than 60 seconds. Please select a shorter video.'
          );
          return;
        }

        // Validate video format
        const validFormats = ['video/mp4', 'video/quicktime', 'video/x-matroska'];
        if (video.type && !validFormats.includes(video.type)) {
          Alert.alert(
            'Invalid Format',
            'Please select a video in MP4, MOV, or MKV format.'
          );
          return;
        }

        setSelectedVideo(video);
        
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

        console.log('[REEL_UPLOAD] Video selected:', {
          name: video.fileName,
          size: (video.fileSize / (1024 * 1024)).toFixed(2) + 'MB',
          duration: video.duration ? video.duration.toFixed(1) + 's' : 'N/A',
        });
      }
    });
  }, []);

  // Remove selected video
  const removeSelectedVideo = useCallback(() => {
    setSelectedVideo(null);
    setUploadProgress(0);
  }, []);

  // Upload reel with progress
  const uploadReel = async () => {
    if (!selectedVideo) {
      Alert.alert('No Video', 'Please select a video to upload');
      return;
    }

    if (!description.trim()) {
      Alert.alert('No Description', 'Please add a description for your reel');
      return;
    }

    // Confirm upload
    Alert.alert(
      'Upload Reel',
      'Are you sure you want to upload this reel?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Upload',
          onPress: async () => {
            setUploading(true);
            setUploadProgress(0);

            // Simulate progress (since we can't track actual upload progress)
            const progressInterval = setInterval(() => {
              setUploadProgress((prev) => {
                if (prev >= 90) {
                  clearInterval(progressInterval);
                  return 90;
                }
                return prev + 10;
              });
            }, 500);

            try {
              const result = await ApiService.uploadReel({
                video: selectedVideo,
                description: description.trim(),
              });

              clearInterval(progressInterval);
              setUploadProgress(100);

              if (result.success) {
                Alert.alert(
                  'Success!',
                  'Your reel has been uploaded successfully',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reset form
                        setDescription('');
                        setSelectedVideo(null);
                        setUploadProgress(0);
                        
                        // Switch to My Reels tab and refresh
                        setActiveTab('myReels');
                        fetchMyReels();
                        
                        // Callback
                        onRefresh && onRefresh();
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Upload Failed', result.error || 'Failed to upload reel. Please try again.');
              }
            } catch (error) {
              clearInterval(progressInterval);
              console.error('[REEL_UPLOAD] Upload error:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  // Delete reel with confirmation
  const confirmDeleteReel = useCallback((reel) => {
    setReelToDelete(reel);
    setDeleteModalVisible(true);
  }, []);

  const deleteReel = async () => {
    if (!reelToDelete) return;

    setDeleting(true);

    try {
      const result = await ApiService.deleteReel(reelToDelete._id);

      if (result.success) {
        Alert.alert('Success', 'Reel deleted successfully');
        setDeleteModalVisible(false);
        setReelToDelete(null);
        fetchMyReels(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to delete reel');
      }
    } catch (error) {
      console.error('[REEL_UPLOAD] Delete error:', error);
      Alert.alert('Error', 'Failed to delete reel');
    } finally {
      setDeleting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render reel item
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
            <Ionicons name="heart" size={14} color="#fff" />
            <Text style={styles.reelStatText}>{item.likes || 0}</Text>
          </View>
          <View style={styles.reelStat}>
            <Ionicons name="chatbubble" size={14} color="#fff" />
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
        onPress={() => confirmDeleteReel(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  // Render upload tab
  const renderUploadTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.uploadContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.uploadHeader}>
        <Ionicons name="videocam" size={32} color="#8B5CF6" />
        <Text style={styles.uploadTitle}>Upload Your Reel</Text>
        <Text style={styles.uploadSubtitle}>
          Share your expertise with the community
        </Text>
      </View>

      {/* Video Selector */}
      <View style={styles.videoSelectorContainer}>
        {selectedVideo ? (
          <Animated.View style={[styles.videoSelected, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.videoPreview}>
              {selectedVideo.uri && (
                <Image
                  source={{ uri: selectedVideo.uri }}
                  style={styles.videoPreviewImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.videoPreviewOverlay}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
            </View>

            <View style={styles.videoDetails}>
              <Text style={styles.videoName} numberOfLines={1}>
                {selectedVideo.fileName || 'Video selected'}
              </Text>
              <View style={styles.videoMeta}>
                <Text style={styles.videoMetaText}>
                  {formatFileSize(selectedVideo.fileSize)}
                </Text>
                {selectedVideo.duration && (
                  <>
                    <Text style={styles.videoMetaDot}>•</Text>
                    <Text style={styles.videoMetaText}>
                      {formatDuration(selectedVideo.duration)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.removeVideoButton}
              onPress={removeSelectedVideo}
              disabled={uploading}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={styles.videoSelector}
            onPress={selectVideo}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={48} color="#8B5CF6" />
            <Text style={styles.videoSelectorTitle}>Select Video</Text>
            <Text style={styles.videoSelectorSubtitle}>
              MP4, MOV • Max 50MB • Up to 60s
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Description Input */}
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
            maxLength={500}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!uploading}
          />
          <Text style={styles.characterCount}>
            {description.length}/500
          </Text>
        </View>
      </View>

      {/* Upload Progress */}
      {uploading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Uploading...</Text>
            <Text style={styles.progressPercentage}>{uploadProgress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Upload Button */}
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
            <Ionicons name="cloud-upload" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>Upload Reel</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Guidelines */}
      <View style={styles.guidelinesContainer}>
        <Text style={styles.guidelinesTitle}>Upload Guidelines</Text>
        <View style={styles.guideline}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.guidelineText}>Keep videos under 60 seconds</Text>
        </View>
        <View style={styles.guideline}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.guidelineText}>Use high-quality vertical videos (9:16 ratio recommended)</Text>
        </View>
        <View style={styles.guideline}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.guidelineText}>Add clear descriptions to help users find your content</Text>
        </View>
        <View style={styles.guideline}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.guidelineText}>Ensure content is relevant to your expertise</Text>
        </View>
      </View>
    </ScrollView>
  );

  // Render my reels tab
  const renderMyReelsTab = () => (
    <View style={styles.tabContent}>
      {loadingReels ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading your reels...</Text>
        </View>
      ) : myReels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Reels Yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload your first reel to start sharing your expertise
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setActiveTab('upload')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Upload Reel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myReels}
          renderItem={renderReelItem}
          keyExtractor={(item, index) => item._id || index.toString()}
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

  // Not a consultant view
  if (!isConsultant) {
    return (
      <View style={styles.notConsultantContainer}>
        <Ionicons name="lock-closed" size={64} color="#CBD5E1" />
        <Text style={styles.notConsultantTitle}>Consultant Access Only</Text>
        <Text style={styles.notConsultantSubtitle}>
          You need to be an approved consultant to upload reels
        </Text>
        <TouchableOpacity
          style={styles.notConsultantButton}
          onPress={() => {
            // Navigate to upgrade section or show info
            Alert.alert(
              'Become a Consultant',
              'Apply to become a consultant to start uploading reels and sharing your expertise.',
              [{ text: 'OK' }]
            );
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.notConsultantButtonText}>Learn More</Text>
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
            size={20}
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
            size={20}
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
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>

            <Text style={styles.modalTitle}>Delete Reel?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this reel? This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={deleteReel}
                disabled={deleting}
                activeOpacity={0.7}
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

  // Tab Selector
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: IS_SMALL_DEVICE ? 12 : 16,
    marginTop: IS_SMALL_DEVICE ? 12 : 16,
    borderRadius: 12,
    padding: 4,
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
    paddingVertical: IS_SMALL_DEVICE ? 10 : 12,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#F3F4F6',
  },
  tabText: {
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Tab Content
  tabContent: {
    flex: 1,
  },

  // Upload Tab
  uploadContainer: {
    padding: IS_SMALL_DEVICE ? 12 : 16,
    paddingBottom: 32,
  },
  uploadHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadTitle: {
    fontSize: IS_SMALL_DEVICE ? 20 : 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  uploadSubtitle: {
    fontSize: IS_SMALL_DEVICE ? 13 : 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },

  // Video Selector
  videoSelectorContainer: {
    marginBottom: 20,
  },
  videoSelector: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: IS_SMALL_DEVICE ? 32 : 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  videoSelectorTitle: {
    fontSize: IS_SMALL_DEVICE ? 16 : 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  videoSelectorSubtitle: {
    fontSize: IS_SMALL_DEVICE ? 12 : 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },

  // Video Selected
  videoSelected: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: IS_SMALL_DEVICE ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  videoPreview: {
    width: IS_SMALL_DEVICE ? 80 : 100,
    height: IS_SMALL_DEVICE ? 80 : 100,
    borderRadius: 12,
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
    marginLeft: IS_SMALL_DEVICE ? 12 : 16,
    marginRight: 8,
  },
  videoName: {
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoMetaText: {
    fontSize: IS_SMALL_DEVICE ? 12 : 13,
    color: '#64748B',
  },
  videoMetaDot: {
    marginHorizontal: 6,
    color: '#CBD5E1',
  },
  removeVideoButton: {
    padding: 4,
  },

  // Description
  descriptionContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  descriptionInputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  descriptionInput: {
    padding: IS_SMALL_DEVICE ? 12 : 16,
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    color: '#1E293B',
    minHeight: IS_SMALL_DEVICE ? 80 : 100,
    maxHeight: IS_SMALL_DEVICE ? 120 : 150,
  },
  characterCount: {
    fontSize: 12,
    color: '#94A3B8',
    paddingHorizontal: 16,
    paddingBottom: 12,
    textAlign: 'right',
  },

  // Progress
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: IS_SMALL_DEVICE ? 14 : 16,
    marginBottom: 20,
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
    marginBottom: 12,
  },
  progressText: {
    fontSize: IS_SMALL_DEVICE ? 13 : 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressPercentage: {
    fontSize: IS_SMALL_DEVICE ? 13 : 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },

  // Upload Button
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: IS_SMALL_DEVICE ? 14 : 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
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
    fontSize: IS_SMALL_DEVICE ? 15 : 16,
    fontWeight: '700',
  },

  // Guidelines
  guidelinesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: IS_SMALL_DEVICE ? 14 : 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  guidelinesTitle: {
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  guidelineText: {
    flex: 1,
    fontSize: IS_SMALL_DEVICE ? 12 : 13,
    color: '#64748B',
    lineHeight: IS_SMALL_DEVICE ? 18 : 20,
  },

  // My Reels Tab
  reelsHeader: {
    paddingHorizontal: IS_SMALL_DEVICE ? 12 : 16,
    paddingVertical: IS_SMALL_DEVICE ? 12 : 16,
  },
  reelsCount: {
    fontSize: IS_SMALL_DEVICE ? 16 : 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  reelsList: {
    paddingHorizontal: IS_SMALL_DEVICE ? 12 : 16,
    paddingBottom: 20,
  },
  reelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: IS_SMALL_DEVICE ? 12 : 16,
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
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 16,
  },
  reelStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reelStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  reelInfo: {
    padding: IS_SMALL_DEVICE ? 12 : 16,
    paddingRight: 48,
  },
  reelDescription: {
    fontSize: IS_SMALL_DEVICE ? 13 : 14,
    color: '#1E293B',
    lineHeight: IS_SMALL_DEVICE ? 18 : 20,
    marginBottom: 6,
  },
  reelDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: IS_SMALL_DEVICE ? 13 : 14,
    color: '#64748B',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: IS_SMALL_DEVICE ? 18 : 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: IS_SMALL_DEVICE ? 13 : 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: IS_SMALL_DEVICE ? 20 : 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    fontWeight: '600',
  },

  // Not Consultant
  notConsultantContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F8FAFC',
  },
  notConsultantTitle: {
    fontSize: IS_SMALL_DEVICE ? 18 : 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
  },
  notConsultantSubtitle: {
    fontSize: IS_SMALL_DEVICE ? 13 : 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: IS_SMALL_DEVICE ? 20 : 22,
    marginBottom: 24,
  },
  notConsultantButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  notConsultantButtonText: {
    color: '#fff',
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    fontWeight: '600',
  },

  // Delete Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: IS_SMALL_DEVICE ? 20 : 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: IS_SMALL_DEVICE ? 18 : 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: IS_SMALL_DEVICE ? 13 : 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: IS_SMALL_DEVICE ? 20 : 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: IS_SMALL_DEVICE ? 12 : 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    fontWeight: '600',
    color: '#64748B',
  },
  modalDeleteButton: {
    backgroundColor: '#EF4444',
  },
  modalDeleteText: {
    fontSize: IS_SMALL_DEVICE ? 14 : 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default UploadReelSection;