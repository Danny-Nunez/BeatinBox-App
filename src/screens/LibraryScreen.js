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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { getPlaylists, getCachedPlaylists } from '../services/api';
import PlaylistSkeleton from '../components/PlaylistSkeleton';

const PlaylistCard = ({ playlist, onPress }) => {
  const firstSong = playlist.songs[0]?.song;
  
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(playlist)}>
      <View style={styles.cardContent}>
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
      </View>
    </TouchableOpacity>
  );
};

const LibraryScreen = ({ navigation }) => {
  const { user, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState(user?.playlists || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState(null);

  const showError = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Error', message);
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
    }, [user?.email, authLoading])
  );

  const handleRefresh = () => {
    fetchPlaylists(true);
  };

  const handleRetry = () => {
    setError(null);
    fetchPlaylists(true);
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
      </View>
      <FlatList
        data={playlists}
        renderItem={({ item }) => (
          <PlaylistCard 
            playlist={item} 
            onPress={(playlist) => navigation.navigate('Playlist', { playlist })}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingBottom: 140,
  },
  header: {
    height: 60,
    backgroundColor: '#000',
    borderBottomWidth: 0,
    borderBottomColor: '#222',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 160, // Add extra padding for player bar
  },
  card: {
    paddingHorizontal: 0,
    paddingVertical: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
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
    paddingBottom: 100,
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
