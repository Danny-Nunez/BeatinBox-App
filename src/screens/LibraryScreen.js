import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
  Modal,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { getPlaylists, getCachedPlaylists, deletePlaylist } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PlaylistSkeleton from '../components/PlaylistSkeleton';
import CreatePlaylistModal from '../components/CreatePlaylistModal';

const SwipeablePlaylistCard = ({ playlist, onPress, onDelete }) => {
  const translateX = new Animated.Value(0);
  const scale = new Animated.Value(1);
  const deleteOpacity = new Animated.Value(0);
  const firstSong = playlist.songs[0]?.song;

  const resetAnimation = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(deleteOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event) => {
    const { state, translationX } = event.nativeEvent;

    if (state === State.END) {
      const swipeThreshold = -120; // Full delete threshold

      if (translationX < swipeThreshold) {
        // Trigger delete - pass reset function to handle cancel
        onDelete(playlist, resetAnimation);
      } else {
        // Snap back to original position
        resetAnimation();
      }
    }
  };

  // Update delete background opacity based on swipe progress
  React.useEffect(() => {
    const listener = translateX.addListener(({ value }) => {
      const progress = Math.min(Math.abs(value) / 60, 1); // Normalize to 0-1
      deleteOpacity.setValue(progress);
    });

    return () => {
      translateX.removeListener(listener);
    };
  }, []);

  return (
    <View style={styles.swipeContainer}>
      {/* Delete background */}
      <Animated.View 
        style={[
          styles.deleteBackground,
          {
            opacity: deleteOpacity,
          }
        ]}
      >
        <View style={styles.deleteContent}>
          <Ionicons name="trash" size={24} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </View>
      </Animated.View>

      {/* Swipeable card */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 0]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateX }, { scale }],
              zIndex: 2,
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.cardContent}
            onPress={() => onPress(playlist)}
            activeOpacity={0.7}
          >
            <Image
              source={{ 
                uri: firstSong?.thumbnail 
                  ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(firstSong.thumbnail)}`
                  : 'https://www.beatinbox.com/defaultcover.png'
              }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.textContainer}>
              <Text style={styles.playlistName} numberOfLines={1}>
                {playlist.name}
              </Text>
              <Text style={styles.songCount}>
                {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const LibraryScreen = ({ navigation }) => {
  const { user, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState(user?.playlists || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [skipCache, setSkipCache] = useState(false);

  const showError = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Error', message);
    }
  };

  const showSuccess = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Success', message);
    }
  };

  const fetchPlaylists = useCallback(async (showLoadingState = false) => {
    if (!user?.email || authLoading) return;
    
    try {
      if (showLoadingState) {
        setIsRefreshing(true);
      }
      
      console.log('Fetching playlists for user:', user.email);
      const data = await getPlaylists();
      
      if (data) {
        setPlaylists(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch playlists');
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setError(error.message);
      showError('Failed to update playlists');
    } finally {
      setIsRefreshing(false);
      setIsFirstLoad(false);
    }
  }, [user?.email, authLoading]);

  // Load cached data and fetch fresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user) {
        const loadData = async () => {
          // Skip cache if we just deleted an item to prevent showing stale data
          if (skipCache) {
            setSkipCache(false); // Reset the flag
            fetchPlaylists(true);
            return;
          }
          
          // Try to load cached data first
          const cachedData = await getCachedPlaylists();
          if (cachedData) {
            setPlaylists(cachedData);
            setIsFirstLoad(false);
            // Fetch fresh data in background
            fetchPlaylists(false);
          } else {
            // No cache, show skeleton and fetch
            fetchPlaylists(true);
          }
        };
        
        loadData();
      }
    }, [user?.email, authLoading, skipCache])
  );

  const handleRefresh = () => {
    fetchPlaylists(true);
  };

  const handleRetry = () => {
    setError(null);
    fetchPlaylists(true);
  };

  const handleCreatePlaylistSuccess = () => {
    // Refresh playlists after creating a new one
    fetchPlaylists(true);
  };

  const handleDeletePlaylist = async (playlist, resetAnimation) => {
    try {
      Alert.alert(
        'Delete Playlist',
        `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              // Reset animation when user cancels
              if (resetAnimation) {
                resetAnimation();
              }
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePlaylist(playlist.id);
                // Remove from local state immediately for better UX
                const updatedPlaylists = playlists.filter(p => p.id !== playlist.id);
                setPlaylists(updatedPlaylists);
                
                // Update the cache with the new playlist data
                try {
                  await AsyncStorage.setItem('@playlists_cache', JSON.stringify(updatedPlaylists));
                  await AsyncStorage.setItem('@playlists_timestamp', Date.now().toString());
                } catch (cacheError) {
                  console.log('Cache update error:', cacheError);
                }
                
                // Set flag to skip cache on next load to prevent showing deleted item
                setSkipCache(true);
                
                showSuccess('Playlist deleted successfully');
              } catch (error) {
                console.error('Error deleting playlist:', error);
                showError('Failed to delete playlist. Please try again.');
                // Refresh to restore the playlist in the list if delete failed
                fetchPlaylists(true);
                // Reset animation on error
                if (resetAnimation) {
                  resetAnimation();
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in delete handler:', error);
      showError('An error occurred. Please try again.');
      // Reset animation on error
      if (resetAnimation) {
        resetAnimation();
      }
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Library</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Create an Account</Text>
          <Text style={styles.emptySubtext}>Sign up to start creating playlists and save your favorite songs</Text>
          <TouchableOpacity 
            style={styles.signupButton} 
            onPress={() => navigation.navigate('Login', { 
              initialMode: 'signup',
              options: {
                headerShown: false
              }
            })}
          >
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isFirstLoad) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Library</Text>
        </View>
        <PlaylistSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !playlists?.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Library</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Couldn't load playlists</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!playlists?.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Library</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No playlists yet</Text>
          <Text style={styles.emptySubtext}>Create a playlist to get started</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={playlists}
        renderItem={({ item }) => (
          <SwipeablePlaylistCard 
            playlist={item} 
            onPress={(playlist) => navigation.navigate('Playlist', { playlist })}
            onDelete={handleDeletePlaylist}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />
      
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreatePlaylistSuccess}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 80,
    backgroundColor: '#000',
    borderBottomWidth: 0,
    borderBottomColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: '#ff4444',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 12,
    paddingRight: 20,
    zIndex: 1,
  },
  deleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 150, // Reduced padding for player bar
    paddingHorizontal: 12,
  },
  card: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    paddingLeft: 12,
    paddingRight: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
    marginRight: 15,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  songCount: {
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
   
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingIndicator: {
    marginBottom: 16,
  },
  loadingText: {
    color: '#999',
  },
  signupButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  signupButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LibraryScreen;
