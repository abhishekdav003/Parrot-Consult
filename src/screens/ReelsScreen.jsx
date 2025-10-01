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
  Platform,
  Text,
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const flatListRef = useRef(null);
  const isMounted = useRef(true);
  const baseReels = useRef([]);
  const isLooping = useRef(false);
  
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 200,
  }).current;

  // Create looped reels for infinite scroll
  const createLoopedReels = useCallback((baseReelsArray) => {
    if (!baseReelsArray || baseReelsArray.length === 0) return [];
    
    const LOOP_MULTIPLIER = 3;
    const loopedReels = [];
    
    for (let i = 0; i < LOOP_MULTIPLIER; i++) {
      baseReelsArray.forEach((reel, idx) => {
        loopedReels.push({
          ...reel,
          _id: `${reel._id}_loop_${i}_${idx}`,
          originalId: reel._id,
        });
      });
    }
    
    return loopedReels;
  }, []);

  // Fetch reels with infinite scroll support
  const fetchReels = useCallback(async (pageNum = 1, refresh = false) => {
    if (!isMounted.current) return;
    
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      } else if (pageNum > 1) {
        setIsLoadingMore(true);
      }

      console.log(`[Reels] Fetching page ${pageNum}`);
      const result = await ApiService.getAllReels(pageNum, 15);
      
      if (!isMounted.current) return;
      
      if (result.success) {
        const newReels = result.data || [];
        console.log(`[Reels] Fetched ${newReels.length} reels`);
        
        if (refresh || pageNum === 1) {
          baseReels.current = newReels;
          const loopedReels = createLoopedReels(newReels);
          setReels(loopedReels);
          setHasMore(newReels.length >= 15);
          
          if (loopedReels.length > 0) {
            const middleIndex = Math.floor(loopedReels.length / 3);
            setTimeout(() => {
              if (flatListRef.current && isMounted.current) {
                flatListRef.current.scrollToIndex({
                  index: middleIndex,
                  animated: false,
                });
                setCurrentIndex(middleIndex);
              }
            }, 100);
          }
        } else {
          const existingIds = new Set(baseReels.current.map(r => r._id));
          const uniqueNewReels = newReels.filter(r => !existingIds.has(r._id));
          
          if (uniqueNewReels.length > 0) {
            baseReels.current = [...baseReels.current, ...uniqueNewReels];
            const loopedReels = createLoopedReels(baseReels.current);
            setReels(loopedReels);
            setHasMore(newReels.length >= 15);
          } else {
            setHasMore(false);
            isLooping.current = true;
          }
        }
      } else {
        console.error('[Reels] Fetch error:', result.error);
        if (!refresh && pageNum === 1) {
          Alert.alert('Error', result.error || 'Failed to load reels');
        }
      }
    } catch (error) {
      console.error('[Reels] Fetch exception:', error);
      if (!refresh && pageNum === 1) {
        Alert.alert('Error', 'Failed to load reels. Please check your connection.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  }, [createLoopedReels]);

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    fetchReels(1, true);
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle screen focus - pause videos when screen loses focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setHidden(true);
      setIsScreenFocused(true);
      
      return () => {
        StatusBar.setHidden(false);
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Handle infinite loop repositioning
  const handleScrollEnd = useCallback(() => {
    if (reels.length === 0 || !baseReels.current.length) return;
    
    const totalReels = reels.length;
    const baseReelsCount = baseReels.current.length;
    const sectionSize = baseReelsCount;
    
    if (currentIndex < sectionSize) {
      const newIndex = currentIndex + sectionSize;
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: newIndex,
          animated: false,
        });
        setCurrentIndex(newIndex);
      }
    } else if (currentIndex >= totalReels - sectionSize) {
      const offset = currentIndex - (totalReels - sectionSize);
      const newIndex = sectionSize + offset;
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: newIndex,
          animated: false,
        });
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex, reels.length]);

  // Load more reels
  const handleLoadMore = useCallback(() => {
    if (isLooping.current) return;
    
    if (!isLoadingMore && !loading && !refreshing && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage, false);
    }
  }, [isLoadingMore, loading, refreshing, page, hasMore, fetchReels]);

  // Refresh reels
  const handleRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    isLooping.current = false;
    baseReels.current = [];
    fetchReels(1, true);
  }, [fetchReels]);

  // Handle like with optimistic update
  const handleLike = useCallback(async (reelId) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to like reels');
      return { success: false };
    }

    const originalReelId = reelId.includes('_loop_') 
      ? reelId.split('_loop_')[0] 
      : reelId;
    
    setReels(prev => prev.map(reel => {
      const currentOriginalId = reel.originalId || reel._id;
      const compareId = currentOriginalId.includes('_loop_')
        ? currentOriginalId.split('_loop_')[0]
        : currentOriginalId;
        
      if (compareId === originalReelId) {
        const newIsLiked = !reel.isLiked;
        return {
          ...reel,
          isLiked: newIsLiked,
          likes: newIsLiked ? (reel.likes || 0) + 1 : Math.max(0, (reel.likes || 0) - 1)
        };
      }
      return reel;
    }));

    try {
      const result = await ApiService.likeReel(originalReelId);
      
      if (result.success && result.data) {
        setReels(prev => prev.map(reel => {
          const currentOriginalId = reel.originalId || reel._id;
          const compareId = currentOriginalId.includes('_loop_')
            ? currentOriginalId.split('_loop_')[0]
            : currentOriginalId;
            
          if (compareId === originalReelId) {
            return {
              ...reel,
              likes: result.data.likes,
              isLiked: result.data.isLiked
            };
          }
          return reel;
        }));
        
        baseReels.current = baseReels.current.map(reel => {
          if (reel._id === originalReelId) {
            return {
              ...reel,
              likes: result.data.likes,
              isLiked: result.data.isLiked
            };
          }
          return reel;
        });
        
        return result;
      } else {
        setReels(prev => prev.map(reel => {
          const currentOriginalId = reel.originalId || reel._id;
          const compareId = currentOriginalId.includes('_loop_')
            ? currentOriginalId.split('_loop_')[0]
            : currentOriginalId;
            
          if (compareId === originalReelId) {
            const revertIsLiked = !reel.isLiked;
            return {
              ...reel,
              isLiked: revertIsLiked,
              likes: revertIsLiked ? (reel.likes || 0) + 1 : Math.max(0, (reel.likes || 0) - 1)
            };
          }
          return reel;
        }));
        return result;
      }
    } catch (error) {
      console.error('[Reels] Like error:', error);
      setReels(prev => prev.map(reel => {
        const currentOriginalId = reel.originalId || reel._id;
        const compareId = currentOriginalId.includes('_loop_')
          ? currentOriginalId.split('_loop_')[0]
          : currentOriginalId;
          
        if (compareId === originalReelId) {
          const revertIsLiked = !reel.isLiked;
          return {
            ...reel,
            isLiked: revertIsLiked,
            likes: revertIsLiked ? (reel.likes || 0) + 1 : Math.max(0, (reel.likes || 0) - 1)
          };
        }
        return reel;
      }));
      return { success: false };
    }
  }, [user]);

  // Handle comment
  const handleComment = useCallback(async (reelId, comment) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to comment');
      return { success: false };
    }

    const originalReelId = reelId.includes('_loop_') 
      ? reelId.split('_loop_')[0] 
      : reelId;

    try {
      const result = await ApiService.addComment(originalReelId, comment);
      
      if (result.success && result.data) {
        setReels(prev => prev.map(reel => {
          const currentOriginalId = reel.originalId || reel._id;
          const compareId = currentOriginalId.includes('_loop_')
            ? currentOriginalId.split('_loop_')[0]
            : currentOriginalId;
            
          if (compareId === originalReelId) {
            return {
              ...reel,
              comments: result.data
            };
          }
          return reel;
        }));
        
        baseReels.current = baseReels.current.map(reel => {
          if (reel._id === originalReelId) {
            return {
              ...reel,
              comments: result.data
            };
          }
          return reel;
        });
        
        return result;
      }
      return result;
    } catch (error) {
      console.error('[Reels] Comment error:', error);
      return { success: false };
    }
  }, [user]);

  // Back navigation
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Track visible items
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        setCurrentIndex(index);
      }
    }
  }).current;

  // Handle momentum scroll end
  const handleMomentumScrollEnd = useCallback(() => {
    handleScrollEnd();
  }, [handleScrollEnd]);

  // Render reel item - pass screen focus state to pause videos when navigating away
  const renderItem = useCallback(({ item, index }) => (
    <ReelItem
      reel={item}
      isActive={index === currentIndex && isScreenFocused}
      onLike={handleLike}
      onComment={handleComment}
      currentUser={user}
      navigation={navigation}
    />
  ), [currentIndex, isScreenFocused, handleLike, handleComment, user, navigation]);

  // Key extractor
  const keyExtractor = useCallback((item) => item._id, []);

  // Item layout
  const getItemLayout = useCallback((data, index) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  // Footer loader
  const ListFooterComponent = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      );
    }
    return null;
  }, [isLoadingMore]);

  // Empty state
  const ListEmptyComponent = useCallback(() => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="film-outline" size={64} color="#666" />
        <Text style={styles.emptyText}>No reels available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchReels(1, true)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, fetchReels]);

  if (loading && reels.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar hidden={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading reels...</Text>
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
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.8}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
        updateCellsBatchingPeriod={50}
        scrollEventThrottle={16}
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
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
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
  emptyContainer: {
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReelsScreen;