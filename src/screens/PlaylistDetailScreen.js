import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { searchArtist } from '../services/api';
import PlaylistModal from '../components/PlaylistModal';
import SlideUpModal from '../components/SlideUpModal';

const PlaylistDetailScreen = ({ route, navigation }) => {
  const { playlistId, title, thumbnail, artists } = route.params;
  const { playSong } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);

  const handleMenuPress = (song, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedSong(song);
    setMenuPosition({ x: pageX - 160, y: pageY - 100 });
    setShowMenu(true);
  };

  const handleAddToPlaylist = () => {
    setShowMenu(false);
    setShowPlaylistModal(true);
  };

  const handleViewArtist = async () => {
    if (selectedSong) {
      try {
        setIsLoadingArtist(true);
        const firstArtist = selectedSong.channel.name.split(',')[0].trim();
        const artistData = await searchArtist(firstArtist);
        
        if (artistData) {
          navigation.navigate('Artist', {
            artistId: artistData.id,
            artistName: firstArtist
          });
        }
      } catch (error) {
        console.error('Error fetching artist data:', error);
      } finally {
        setIsLoadingArtist(false);
        setShowMenu(false);
      }
    }
  };

  useEffect(() => {
    fetchPlaylistDetails();
  }, []);

  const fetchPlaylistDetails = async () => {
    try {
      // Remove 'VL' prefix from the ID
      const cleanId = playlistId.replace('VL', '');
      const response = await fetch(`https://www.beatinbox.com/api/getplaylist?url=https://www.youtube.com/playlist?list=${cleanId}`);
      const data = await response.json();
      setPlaylist(data);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      setError('Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: thumbnail }}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.artists}>{artists}</Text>
          </View>
        </View>

        {/* Songs List */}
        <View style={styles.songsList}>
          {playlist?.videos?.map((video, index) => (
            <TouchableOpacity
              key={video.id}
              style={styles.songItem}
              onPress={() => playSong({
                id: video.id,
                title: video.title,
                artist: video.channel.name,
                thumbnail: video.thumbnail
              }, playlist.videos)}
            >
              <View style={styles.songMainContent}>
                <Image
                  source={{ 
                    uri: video.thumbnail
                      ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(video.thumbnail)}`
                      : 'https://www.beatinbox.com/default-thumbnail.png'
                  }}
                  style={styles.songThumbnail}
                />
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={2}>{video.title}</Text>
                  <Text style={styles.channelName}>{video.channel.name}</Text>
                </View>
                {/* <Text style={styles.duration}>{formatDuration(video.duration)}</Text> */}
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={(event) => handleMenuPress(video, event)}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
            <TouchableOpacity style={styles.menuItem} onPress={handleAddToPlaylist}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text style={styles.menuText}>Add to Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, isLoadingArtist && styles.menuItemDisabled]} 
              onPress={handleViewArtist}
              disabled={isLoadingArtist}
            >
              {isLoadingArtist ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="mic-outline" size={24} color="#fff" />
              )}
              <Text style={styles.menuText}>View Artist</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <SlideUpModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
      >
        <PlaylistModal
          onClose={() => setShowPlaylistModal(false)}
          song={{
            videoId: selectedSong?.id,
            title: selectedSong?.title,
            artist: selectedSong?.channel?.name,
            thumbnail: selectedSong?.thumbnail
          }}
        />
      </SlideUpModal>
    </View>
  );
};

const styles = StyleSheet.create({
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
    color: '#ffffff',
    marginLeft: 12,
    fontSize: 16,
  },
  menuButton: {
    padding: 8,
    position: 'absolute',
    right: 0,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  songMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingBottom: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#E11D48',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    height: 300,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  headerInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  artists: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  songsList: {
    padding: 15,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  songThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  songInfo: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  channelName: {
    color: '#999',
    fontSize: 14,
  },
  duration: {
    color: '#999',
    fontSize: 14,
  },
});

export default PlaylistDetailScreen;
