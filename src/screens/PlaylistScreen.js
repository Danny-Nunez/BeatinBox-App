import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { removeSongFromPlaylist } from '../services/api';
import NotificationOverlay from '../components/NotificationOverlay';

const PlaylistScreen = ({ route, navigation }) => {
  const { playlist: initialPlaylist } = route.params;
  const [playlist, setPlaylist] = useState(initialPlaylist);
  const { playSong, isPlaying, currentSong, togglePlay } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSongId, setLoadingSongId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showNotification, setShowNotification] = useState(false);
  const [removedSong, setRemovedSong] = useState(null);
  const { refreshUserData, user } = useAuth();

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshUserData();
    }, [refreshUserData])
  );

  // Update playlist when user data changes
  useEffect(() => {
    if (user?.playlists?.length) {
      const updatedPlaylist = user.playlists.find(p => p.id === playlist.id);
      if (updatedPlaylist) {
        setPlaylist(updatedPlaylist);
      }
    }
  }, [user?.playlists, playlist.id]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshUserData();
    } catch (error) {
      console.error('Error refreshing playlist:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePlaySong = async (song, index) => {
    // If this is the current song, just toggle play/pause
    if (song.videoId === currentSong?.id) {
      togglePlay();
      return;
    }

    setLoadingSongId(song.videoId);
    try {
      // Convert playlist songs to the format expected by playSong
      const songList = playlist.songs.map(item => ({
        id: item.song.videoId,
        title: item.song.title,
        artist: item.song.artist,
        thumbnail: item.song.thumbnail,
      }));
      
      await playSong({
        id: song.videoId,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
      }, songList);
    } catch (error) {
      console.error('Error playing song:', error);
    } finally {
      setLoadingSongId(null);
    }
  };

  const handleRemoveSong = async (song) => {
    try {
      setShowMenu(false);
      
      // Optimistically update UI
      const updatedSongs = playlist.songs.filter(
        item => item.song.videoId !== song.videoId
      );
      setPlaylist(prev => ({
        ...prev,
        songs: updatedSongs
      }));

      // First sync with server
      await removeSongFromPlaylist(playlist.id, song.videoId);
      refreshUserData(); // Don't await, let it update in background

      // Show notification last
      setRemovedSong(song);
      setShowNotification(true);
    } catch (error) {
      console.error('Error removing song:', error);
      // Revert optimistic update on error
      refreshUserData();
    }
  };

  const renderSongItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[
        styles.songItem,
        isPlaying && item.song.videoId === currentSong?.id && styles.playingSong
      ]}
      onPress={() => handlePlaySong(item.song, index)}
      disabled={loadingSongId !== null}
    >
      {loadingSongId === item.song.videoId ? (
        <ActivityIndicator size="small" color="#1DB954" style={styles.songNumber} />
      ) : isPlaying && item.song.videoId === currentSong?.id ? (
        <Ionicons name="pause" size={16} color="#1DB954" style={styles.songNumber} />
      ) : (
        <Text style={[
          styles.songNumber,
          item.song.videoId === currentSong?.id && styles.currentSongNumber
        ]}>
          {index + 1}
        </Text>
      )}
      <Image 
        source={{ 
          uri: item.song.thumbnail 
            ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(item.song.thumbnail)}`
            : 'https://www.beatinbox.com/defaultcover.png'
        }} 
        style={styles.songThumbnail}
      />
      <View style={styles.songInfo}>
        <Text 
          style={[
            styles.songTitle,
            item.song.videoId === currentSong?.id && styles.currentSongTitle
          ]} 
          numberOfLines={1}
        >
          {item.song.title}
        </Text>
        <Text 
          style={[
            styles.songArtist,
            item.song.videoId === currentSong?.id && styles.currentSongArtist
          ]} 
          numberOfLines={1}
        >
          {item.song.artist}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={(event) => {
          const { pageX, pageY } = event.nativeEvent;
          setSelectedSong(item.song);
          setMenuPosition({ x: pageX - 160, y: pageY - 50 });
          setShowMenu(true);
        }}
      >
        <MaterialCommunityIcons name="dots-vertical" size={24} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          {playlist.songs[0]?.song.thumbnail && (
            <Image
              source={{ 
              uri: playlist.songs[0].song.thumbnail 
                ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(playlist.songs[0].song.thumbnail)}`
                : 'https://www.beatinbox.com/defaultcover.png'
            }}
              style={styles.playlistImage}
            />
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.playlistName}>{playlist.name}</Text>
            <Text style={styles.songCount}>
              {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}
            </Text>
            <TouchableOpacity 
              style={[styles.playAllButton, isLoading && styles.playAllButtonDisabled]}
              onPress={() => handlePlaySong(playlist.songs[0].song, 0)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.playAllContent}>
                  <Ionicons 
                    name={isPlaying && currentSong?.id === playlist.songs[0].song.videoId ? "pause" : "play"} 
                    size={20} 
                    color="#fff" 
                    style={styles.playAllIcon}
                  />
                  <Text style={styles.playAllText}>
                    {isPlaying && currentSong?.id === playlist.songs[0].song.videoId ? 'Pause' : 'Play All'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <FlatList
        data={playlist.songs}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.songList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
          />
        }
      />
      {/* Song Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
      <View style={[styles.menuPopup, { top: menuPosition.y, left: menuPosition.x }]}>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => {
            handleRemoveSong(selectedSong);
            setShowMenu(false);
          }}
        >
          <MaterialCommunityIcons name="minus-circle" size={24} color="#ff4444" />
          <Text style={[styles.menuText, { color: '#ff4444' }]}>Remove Song</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => {
            const firstArtist = selectedSong.artist.split(',')[0].trim();
            navigation.navigate('ArtistScreen', {
              artistName: firstArtist
            });
            setShowMenu(false);
          }}
        >
          <Ionicons name="mic-outline" size={24} color="#fff" />
          <Text style={styles.menuText}>View Artist</Text>
        </TouchableOpacity>
      </View>
        </TouchableOpacity>
      </Modal>
      <NotificationOverlay
        visible={showNotification}
        message="1 song removed"
        thumbnail={removedSong?.thumbnail}
        onHide={() => {
          setShowNotification(false);
          setRemovedSong(null);
        }}
        type="error"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingBottom: 140,
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 10,
  },
  playlistImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'flex-start',
  },
  playlistName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  songCount: {
    color: '#999',
    fontSize: 16,
    marginBottom: 16,
  },
  playAllButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  playAllButtonDisabled: {
    opacity: 0.7,
  },
  playAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAllIcon: {
    marginRight: 8,
  },
  playAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  songList: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: 160, // Add extra padding for player bar
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#111',
    marginBottom: 8,
    opacity: 1,
  },
  playingSong: {
    backgroundColor: '#1a1a1a',
    // borderColor: '#1DB954',
    borderWidth: 1,
  },
  songNumber: {
    color: '#999',
    fontSize: 14,
    width: 30,
    textAlign: 'center',
    lineHeight: 20,
  },
  currentSongNumber: {
    color: '#1DB954',
  },
  songThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginLeft: 8,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  currentSongTitle: {
    color: '#1DB954',
    fontWeight: '600',
  },
  songArtist: {
    color: '#999',
    fontSize: 14,
  },
  currentSongArtist: {
    color: '#1DB954',
    opacity: 0.8,
  },
  menuButton: {
    padding: 8,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuPopup: {
    position: 'absolute',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    width: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  menuText: {
    color: '#fff',
    marginLeft: 12,
    fontSize: 16,
  },
});

export default PlaylistScreen;
