// src/screens/ReelsScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReelItem from '../components/Reels/ReelItem';
import ApiService from '../services/ApiService';
import { useAuth } from '../context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReelsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef(null);

  const fetchReels = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      }

      const result = await ApiService.getAllReels(pageNum);
      
      if (result.success) {
        const newReels = result.data || [];
        
        if (refresh || pageNum === 1) {
          setReels(newReels);
        } else {
          setReels(prev => [...prev, ...newReels]);
        }
        
        setHasMore(newReels.length === 10);
      } else {
        if (!refresh) {
          Alert.alert('Error', result.error || 'Failed to load reels');
        }
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
      if (!refresh) {
        Alert.alert('Error', 'Failed to load reels');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReels(1, true);
  }, [fetchReels]);

  useFocusEffect(
    useCallback(() => {
      // Hide status bar when reels screen is active
      StatusBar.setHidden(true);
      
      if (reels.length === 0) {
        fetchReels(1, true);
      }

      // Show status bar when leaving reels screen
      return () => {
        StatusBar.setHidden(false);
      };
    }, [])
  );

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage);
    }
  };

  const handleRefresh = () => {
    fetchReels(1, true);
  };

  const handleLike = async (reelId) => {
    try {
      const result = await ApiService.likeReel(reelId);
      if (result.success) {
        setReels(prev => prev.map(reel => 
          reel._id === reelId 
            ? { ...reel, likes: result.data.likes }
            : reel
        ));
      }
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  const handleComment = async (reelId, comment) => {
    try {
      const result = await ApiService.addComment(reelId, comment);
      if (result.success) {
        setReels(prev => prev.map(reel => 
          reel._id === reelId 
            ? { ...reel, comments: result.data }
            : reel
        ));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  };

  const handleBackPress = () => {
    navigation.navigate('Home');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  });

  const renderItem = ({ item, index }) => (
    <ReelItem
      reel={item}
      isActive={index === currentIndex}
      onLike={handleLike}
      onComment={handleComment}
      currentUser={user}
    />
  );

  const keyExtractor = (item) => item._id;

  if (loading && reels.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar hidden={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 80,
        }}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && reels.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : null
        }
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  footerLoader: {
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReelsScreen;