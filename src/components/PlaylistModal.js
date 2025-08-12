import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { addSongToPlaylist, getPlaylists, getCachedPlaylists, checkSongInPlaylist } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import PlaylistSkeleton from './PlaylistSkeleton';
import NotificationOverlay from './NotificationOverlay';

import SlideUpModal from './SlideUpModal';
import CreatePlaylistModal from './CreatePlaylistModal';

const PlaylistModal = ({ onClose, song }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState(null);
  const [duplicateError, setDuplicateError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotification, setShowNotification] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      // Try to get cached data first
      const cachedData = await getCachedPlaylists();
      if (cachedData) {
        setPlaylists(cachedData);
      }

      // Fetch fresh data
      const data = await getPlaylists();
      if (data) {
        setPlaylists(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch playlists');
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setError('Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  // Fetch playlists when modal opens
  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleSelectPlaylist = useCallback(async (playlist) => {
    if (loadingPlaylistId) return; // Prevent multiple simultaneous requests
    
    setLoadingPlaylistId(playlist.id);
    setDuplicateError(null);
    
    // Ensure loading state is cleared after 15 seconds max
    const timeoutId = setTimeout(() => {
      setLoadingPlaylistId(null);
      setError('Request timed out. Please try again.');
    }, 15000);

    try {
      // Check if song already exists in playlist
      const exists = await checkSongInPlaylist(playlist.id, song.videoId);
      if (exists) {
        setDuplicateError(`"${song.title}" is already in this playlist`);
        clearTimeout(timeoutId);
        setLoadingPlaylistId(null);
        setShowNotification(true); // Show notification for duplicates
        return;
      }

      await addSongToPlaylist(playlist.id, {
        videoId: song.videoId,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail
      });

      clearTimeout(timeoutId);
      try {
        await fetchPlaylists(); // Refresh playlists data
      } catch (refreshError) {
        console.error('Failed to refresh user data:', refreshError);
      }
      setShowNotification(true); // Show notification last, modal will close after animation
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error adding song to playlist:', error);
      setError(error instanceof Error ? error.message : 'Failed to add song to playlist');
    } finally {
      setLoadingPlaylistId(null);
    }
  }, [loadingPlaylistId, song, fetchPlaylists]);

  // Prevent re-renders of playlist items
  const renderPlaylistItem = useCallback(({ item: playlist }) => {
    const firstSong = playlist.songs[0]?.song;
    const isLoading = loadingPlaylistId === playlist.id;
    
    return (
      <TouchableOpacity 
        style={styles.playlistItem}
        onPress={() => handleSelectPlaylist(playlist)}
        disabled={loadingPlaylistId !== null}
      >
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ 
              uri: firstSong?.thumbnail 
                ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(firstSong.thumbnail)}`
                : 'https://www.beatinbox.com/defaultcover.png'
            }}
            style={styles.thumbnail}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.playlistInfo}>
          <Text 
            style={[
              styles.playlistName, 
              isLoading && styles.playlistNameLoading
            ]} 
            numberOfLines={1}
          >
            {playlist.name}
          </Text>
          <Text style={styles.songCount}>
            {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}
          </Text>
          {duplicateError && playlist.id === loadingPlaylistId && (
            <Text style={styles.duplicateError}>{duplicateError}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleSelectPlaylist, loadingPlaylistId, duplicateError]);

  const renderNewPlaylistButton = () => (
    <TouchableOpacity 
      style={styles.newPlaylistButton}
      onPress={() => setShowCreateModal(true)}
    >
      <View style={styles.newPlaylistContent}>
        <Ionicons name="add" size={24} color="#1DB954" />
        <Text style={styles.newPlaylistText}>New playlist</Text>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading) {
      return <PlaylistSkeleton />;
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Couldn't load playlists</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchPlaylists}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={playlists}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderNewPlaylistButton}
      />
    );
  };

  return (
    <>
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Add to Playlist</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        {renderContent()}
        <NotificationOverlay
          visible={showNotification}
          message={duplicateError || "1 song added"}
          thumbnail={song.thumbnail}
          type={duplicateError ? 'error' : 'success'}
          onHide={() => {
            setShowNotification(false);
            onClose(); // Only close modal after notification animation completes
          }}
        />
      </LinearGradient>

      {showCreateModal && (
        <SlideUpModal visible={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <CreatePlaylistModal 
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchPlaylists}
          />
        </SlideUpModal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  newPlaylistButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  newPlaylistContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newPlaylistText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  container: {
    flex: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16
  },
  listContent: {
    padding: 15
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4
  },
  playlistInfo: {
    marginLeft: 15,
    flex: 1
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  thumbnailContainer: {
    position: 'relative',
    width: 50,
    height: 50,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  songCount: {
    color: '#999',
    fontSize: 14
  },
  duplicateError: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 2,
  },
  playlistNameLoading: {
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center'
  }
});

export default PlaylistModal;
