// src/components/Dashboard/UploadReelSection.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import ApiService from '../../services/ApiService';

const UploadReelSection = ({ user, onRefresh }) => {
  const [description, setDescription] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploading, setUploading] = useState(false);

  const selectVideo = () => {
    const options = {
      mediaType: 'video',
      quality: 0.8,
      videoQuality: 'medium',
      durationLimit: 60, // 60 seconds max
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) return;
      
      if (response.assets && response.assets[0]) {
        const video = response.assets[0];
        
        // Check file size (max 50MB)
        if (video.fileSize > 50 * 1024 * 1024) {
          Alert.alert('Error', 'Video size should be less than 50MB');
          return;
        }
        
        setSelectedVideo(video);
      }
    });
  };

  const uploadReel = async () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video');
      return;
    }

    setUploading(true);
    
    try {
      const result = await ApiService.uploadReel({
        video: selectedVideo,
        description: description.trim()
      });

      if (result.success) {
        Alert.alert('Success', 'Reel uploaded successfully!');
        setDescription('');
        setSelectedVideo(null);
        onRefresh && onRefresh();
      } else {
        Alert.alert('Error', result.error || 'Failed to upload reel');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload reel');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Reel</Text>
      
      <TouchableOpacity 
        style={styles.videoSelector} 
        onPress={selectVideo}
        disabled={uploading}
      >
        <Ionicons 
          name={selectedVideo ? "checkmark-circle" : "videocam"} 
          size={32} 
          color={selectedVideo ? "#4CAF50" : "#666"} 
        />
        <Text style={styles.videoText}>
          {selectedVideo ? "Video Selected" : "Select Video"}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={styles.descriptionInput}
        placeholder="Write a caption..."
        value={description}
        onChangeText={setDescription}
        maxLength={500}
        multiline
        disabled={uploading}
      />

      <TouchableOpacity 
        style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        onPress={uploadReel}
        disabled={uploading || !selectedVideo}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  videoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 12,
  },
  videoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default UploadReelSection;