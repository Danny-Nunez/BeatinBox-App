import React, { useEffect, useState } from 'react';
import SlideUpModal from '../components/SlideUpModal';
import PlaylistModal from '../components/PlaylistModal';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  FlatList
} from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { MaterialIcons, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PopupMenu = ({ visible, onClose, position, onAddToPlaylist, onViewAlbum }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={StyleSheet.absoluteFill} 
        onPress={onClose}
      >
        <View style={[styles.popupMenu, {
          top: position.y - 80,
          right: 20,
        }]}>
          <TouchableOpacity 
            style={styles.popupOption}
            onPress={onAddToPlaylist}
          >
            <MaterialIcons name="playlist-add" size={20} color="#fff" />
            <Text style={styles.popupText}>Add to Playlist</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.popupOption}
            onPress={onViewAlbum}
          >
            <MaterialIcons name="album" size={20} color="#fff" />
            <Text style={styles.popupText}>View Album</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const ArtistScreen = ({ route, navigation }) => {
  const { artistId, artistName } = route.params;
  const { 
    currentSong,
    isPlaying,
    playSong,
    togglePlay
  } = usePlayer();

  const [artistData, setArtistData] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [artistImage, setArtistImage] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const fetchArtistAlbums = async (artistName) => {
    try {
      const response = await fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(artistName)}&type=album`);
      if (!response.ok) throw new Error('Failed to fetch artist albums');
      
      const data = await response.json();
      const albumsList = data.content.filter(item => item.type === 'album');
      console.log('Artist albums:', albumsList);
      setAlbums(albumsList);
    } catch (error) {
      console.error('Error fetching artist albums:', error);
    }
  };

  const fetchArtistSongs = async (artistName) => {
    try {
      const response = await fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(artistName)}&type=song`);
      if (!response.ok) throw new Error('Failed to fetch artist songs');
      
      const data = await response.json();
      const songs = data.content
        .filter(item => item.type === 'song')
        .slice(0, 20);
      console.log('Artist top songs:', songs);
      setTopSongs(songs);
    } catch (error) {
      console.error('Error fetching artist songs:', error);
    }
  };

  const fetchArtistImage = async (artistName) => {
    try {
      const response = await fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(artistName)}&type=artist`);
      if (!response.ok) throw new Error('Failed to fetch artist image');
      
      const data = await response.json();
      const matchingArtist = data.content?.find((item) => 
        item.type === 'artist' && 
        item.name.toLowerCase() === artistName.toLowerCase()
      );
      
      if (matchingArtist?.thumbnails?.[0]) {
        console.log('Artist thumbnails:', matchingArtist.thumbnails);
        // Modify URL to use higher resolution
        const highResUrl = matchingArtist.thumbnails[0].url.replace(/w60-h60/, 'w240-h240');
        setArtistImage(highResUrl);
      }
    } catch (error) {
      console.error('Error fetching artist image:', error);
    }
  };

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        // Start fetching artist content immediately with the name
        await Promise.all([
          fetchArtistImage(artistName),
          fetchArtistSongs(artistName),
          fetchArtistAlbums(artistName)
        ]);

        // Create minimal artist data structure
        setArtistData({
          contents: {
            sectionListRenderer: {
              contents: [{
                musicAnalyticsSectionRenderer: {
                  content: {
                    perspectiveMetadata: {
                      name: artistName
                    }
                  }
                }
              }]
            }
          }
        });
      } catch (err) {
        console.error('Error fetching artist data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (artistId) {
      fetchArtistData();
    }
  }, [artistId]);

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

  if (!artistData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  const name = artistData.contents.sectionListRenderer.contents[0]
    .musicAnalyticsSectionRenderer.content.perspectiveMetadata.name;

  const handlePlaySong = (song, index) => {
    const isCurrentSongPlaying = currentSong?.id === song.videoId && isPlaying;
    
    if (isCurrentSongPlaying) {
      // If this song is currently playing, just toggle pause
      togglePlay();
    } else {
      // If it's a different song or not playing, start playing it
      const formattedSong = {
        id: song.videoId,
        title: song.name || 'Unknown Title',
        artist: song.artist?.name || 'Unknown Artist',
        thumbnail: song.thumbnails?.[0]?.url || null
      };

      const formattedSongList = topSongs.map(s => ({
        id: s.videoId,
        title: s.name || 'Unknown Title',
        artist: s.artist?.name || 'Unknown Artist',
        thumbnail: s.thumbnails?.[0]?.url || null
      }));

      playSong(formattedSong, formattedSongList);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
      {/* Artist Header */}
      <View style={styles.header}>
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: artistImage ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(artistImage)}` : null
            }}
            style={styles.artistImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
            locations={[0, 0.6, 0.9]}
            style={styles.gradient}
          />
          <View style={styles.artistInfo}>
            <Text style={styles.artistName}>{name}</Text>
            <Text style={styles.artistType}>Artist</Text>
          </View>
        </View>
      </View>

      {/* Albums */}
      <View style={styles.albumsContainer}>
        <Text style={styles.sectionTitle}>Albums</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={albums}
          keyExtractor={item => item.browseId}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.albumCard}
              onPress={() => {
                navigation.navigate('Album', {
                  albumId: item.browseId,
                  albumName: item.name
                });
              }}
            >
              <Image
                source={{ 
                  uri: item.thumbnails.find(t => t.width === 226)?.url
                    ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(item.thumbnails.find(t => t.width === 226).url)}`
                    : null
                }}
                style={styles.albumImage}
              />
              <Text style={styles.albumTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.albumYear}>{item.year}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.albumList}
        />
      </View>

      {/* Top Songs */}
      <View style={styles.songsContainer}>
        <Text style={styles.sectionTitle}>Top Songs</Text>
        {topSongs.map((song, index) => {
          const thumbnail = song.thumbnails?.[0]?.url || null;
          const title = song.name || 'Unknown Title';
          const artist = song.artist?.name || 'Unknown Artist';
          const videoId = song.videoId;
          const isCurrentlyPlaying = currentSong?.id === videoId && isPlaying;

          return (
            <View key={videoId} style={styles.songRow}>
              <TouchableOpacity 
                style={styles.thumbnailContainer}
                onPress={() => handlePlaySong(song, index)}
              >
                <Image
                  source={{ uri: thumbnail ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(thumbnail)}` : null }}
                  style={styles.songThumbnail}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.songInfo}
                onPress={() => handlePlaySong(song, index)}
              >
                <Text style={[styles.songTitle, isCurrentlyPlaying && styles.activeSongTitle]} numberOfLines={1}>{title}</Text>
                <Text style={[styles.songArtist, isCurrentlyPlaying && styles.activeSongArtist]} numberOfLines={1}>{artist}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={(event) => {
                  const { pageY } = event.nativeEvent;
                  setMenuPosition({ x: 0, y: pageY });
                  setSelectedSong(song);
                  setMenuVisible(true);
                }}
              >
                <Entypo name="dots-three-vertical" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      </ScrollView>
      
      <PopupMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        position={menuPosition}
        onAddToPlaylist={() => {
          setMenuVisible(false);
          setShowPlaylistModal(true);
        }}
        onViewAlbum={() => {
          setMenuVisible(false);
          navigation.navigate('Album', { 
            albumId: selectedSong?.album?.id,
            albumName: selectedSong?.album?.name
          });
        }}
      />

      <SlideUpModal
        visible={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
      >
        <PlaylistModal
          onClose={() => setShowPlaylistModal(false)}
          song={{
            videoId: selectedSong?.videoId,
            title: selectedSong?.name || 'Unknown Title',
            artist: selectedSong?.artist?.name || 'Unknown Artist',
            thumbnail: selectedSong?.thumbnails?.[0]?.url || null
          }}
        />
      </SlideUpModal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#000',
    paddingBottom: 20,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120, // Space for player bar
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
  header: {
    backgroundColor: '#1a1a1a',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  artistImage: {
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
  artistInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  artistName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  artistType: {
    fontSize: 18,
    color: '#9CA3AF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  albumsContainer: {
    paddingVertical: 20,
  },
  albumList: {
    paddingHorizontal: 20,
  },
  albumCard: {
    width: 226,
    marginRight: 15,
  },
  albumImage: {
    width: 226,
    height: 226,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
  },
  albumTitle: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  albumYear: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  songsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  songThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  activeSongTitle: {
    color: '#ACBDFF',
  },
  activeSongArtist: {
    color: '#ACBDFF',
    opacity: 0.8,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  popupMenu: {
    position: 'absolute',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  popupText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  songTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default ArtistScreen;
