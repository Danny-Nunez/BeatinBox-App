import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Modal, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayer } from '../context/PlayerContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SlideUpModal from '../components/SlideUpModal';
import PlaylistModal from '../components/PlaylistModal';
import { searchArtist } from '../services/api';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SONG_IMAGE_WIDTH = 60;
const SONG_INFO_WIDTH = 215;
const SONG_PADDING = 5;
const COLUMN_WIDTH = SONG_IMAGE_WIDTH + SONG_INFO_WIDTH + (SONG_PADDING * 2);
const COLUMN_MARGIN = 15;

const GenreScreen = ({ navigation, route }) => {
  const { playSong } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        delay: 100
      }).start();
    }
  }, [loading]);

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
        const firstArtist = selectedSong.artist.split(',')[0].trim();
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
    loadData();
  }, []);

  const getGenreEndpoint = (genre) => {
    switch (genre) {
      case 'pop':
        return 'https://www.beatinbox.com/api/get-mobile-pop-feed-url';
      case 'hiphop':
        return 'https://www.beatinbox.com/api/get-mobile-hiphop-feed-url';
        case 'rock':
        return 'https://www.beatinbox.com/api/get-mobile-rock-feed-url';
        case 'electronic':
        return 'https://www.beatinbox.com/api/get-mobile-electronic-feed-url';
        case 'rnb':
        return 'https://www.beatinbox.com/api/get-mobile-rnb-feed-url';
        case 'reggae':
        return 'https://www.beatinbox.com/api/get-mobile-reggae-feed-url';
        case 'latin':
        return 'https://www.beatinbox.com/api/get-mobile-latin-feed-url';
        case 'party':
        return 'https://www.beatinbox.com/api/get-mobile-party-feed-url'
        case 'goodvibe':
        return 'https://www.beatinbox.com/api/get-mobile-goodvibe-feed-url'
      default:
        return 'https://www.beatinbox.com/api/get-mobile-pop-feed-url';
    }
  };

  const loadData = async () => {
    try {
      const genre = route.params?.genre || 'pop';
      const endpoint = getGenreEndpoint(genre);
      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.success && data.data.musicItems) {
        const songsSection = data.data.musicItems.find(item => item.title === "Songs");
        const playlistSections = data.data.musicItems.filter(item => item.title !== "Songs");
        
        if (songsSection) {
          const formattedSongs = songsSection.contents.map(song => ({
            id: song.videoId,
            title: song.title,
            artist: song.artists,
            thumbnail: song.thumbnail,
            playlistId: song.playlistId
          }));
          setSongs(formattedSongs);
        }
        
        setPlaylists(playlistSections);
      }
      setError(null);
    } catch (error) {
      console.error('Error loading songs:', error);
      setError('Unable to load songs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={{ uri: 'https://assets2.lottiefiles.com/packages/lf20_p8bfn5to.json' }}
          autoPlay
          loop
          style={{ width: 100, height: 100 }}
        />
      </View>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#000', '#1a1a1a']} style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#000', '#1a1a1a']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
              {route.params?.genre === 'hiphop'
                ? 'Hip Hop'
                : route.params?.genre === 'rock'
                ? 'Rock'
                : route.params?.genre === 'rnb'
                ? 'R&B & Soul'
                : route.params?.genre === 'latin'
                ? 'Latin'
                : route.params?.genre === 'party'
                ? 'Party'
                : route.params?.genre === 'goodvibe'
                ? 'Good Vibe'
                : route.params?.genre === 'reggae'
                ? 'Reggae & Caribbean'
                : route.params?.genre === 'electronic'
                ? 'Dance & Electronic'
                : 'Pop'}
            </Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={[styles.content, !songs?.length && { marginBottom: 0 }]}>
            {songs && songs.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleSongs}>Popular Songs</Text>
                <TouchableOpacity 
                  style={styles.playAllButton}
                  onPress={() => playSong(songs[0], songs)}
                >
                  <Ionicons name="play-circle" size={24} color="#fff" />
                  <Text style={styles.playAllText}>Play All</Text>
                </TouchableOpacity>
              </View>
            )}

            {songs && songs.length > 0 && (
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                snapToInterval={COLUMN_WIDTH + COLUMN_MARGIN}
                decelerationRate="fast"
                style={styles.slider}
                contentContainerStyle={styles.sliderContent}
              >
              {chunkArray(songs, 4).map((column, colIndex) => (
                <View key={colIndex} style={styles.songColumn}>
                  {column.map((song) => (
                    <TouchableOpacity
                      key={`${colIndex}-${song.id}`}
                      style={styles.songItem}
                      onPress={() => playSong(song, songs)}
                    >
                      <View style={styles.songMainContent}>
                        <Animated.Image
                          source={{ uri: song.thumbnail }}
                          style={[styles.songImage, { opacity: fadeAnim }]}
                        />
                        <View style={styles.songInfo}>
                          <Text
                            style={styles.songTitle}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {song.title}
                          </Text>
                          <Text
                            style={styles.songArtist}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {song.artist}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={(event) => handleMenuPress(song, event)}
                      >
                        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              </ScrollView>
            )}
          </View>

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
                artist: selectedSong?.artist,
                thumbnail: selectedSong?.thumbnail
              }}
            />
          </SlideUpModal>

          {/* Playlist Sections */}
          {playlists.map((section, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.playlistScroll}
                contentContainerStyle={styles.playlistScrollContent}
              >
                {section.contents.map((playlist, pIndex) => (
                  <TouchableOpacity
                    key={pIndex}
                    style={styles.playlistCard}
                    onPress={() => {
                      const cleanId = playlist.playlistId.replace('VL', '');
                      navigation.navigate('PlaylistDetail', {
                        playlistId: cleanId,
                        title: playlist.title,
                        thumbnail: playlist.thumbnail,
                        artists: playlist.artists
                      });
                    }}
                  >
                    <View style={styles.playlistImageContainer}>
                      <Animated.Image
                        source={{ uri: playlist.thumbnail }}
                        style={[styles.playlistThumbnail, { opacity: fadeAnim }]}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.playlistGradient}
                      />
                      <View style={styles.playlistInfo}>
                        <Text style={styles.playlistTitle} numberOfLines={2}>
                          {playlist.title}
                        </Text>
                        <Text style={styles.playlistArtists} numberOfLines={1}>
                          {playlist.artists}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playlistScroll: {
    marginBottom: 20,
  },
  playlistScrollContent: {
    paddingHorizontal: 15,
  },
  playlistCard: {
    width: 200,
    marginRight: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  playlistImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  playlistThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  playlistGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    borderRadius: 8,
  },
  playlistInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  playlistTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  playlistArtists: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  container: {
    flex: 1,
    paddingBottom: 120,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 15,
  },
  sectionTitleSongs: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    paddingLeft: 15,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  playAllText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  slider: {
    marginBottom: 20,
  },
  sliderContent: {
    paddingHorizontal: 0,
  },
  songColumn: {
    flexDirection: 'column',
    width: COLUMN_WIDTH,
    marginRight: COLUMN_MARGIN,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    borderRadius: 8,
    padding: SONG_PADDING,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  songMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songImage: {
    width: SONG_IMAGE_WIDTH,
    height: SONG_IMAGE_WIDTH,
    borderRadius: 4,
  },
  songInfo: {
    marginLeft: 15,
    width: SONG_INFO_WIDTH,
    paddingRight: 40,
  },
  menuButton: {
    padding: 8,
    position: 'absolute',
    right: 0,
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
    color: '#ffffff',
    marginLeft: 12,
    fontSize: 16,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  songTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  songArtist: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
});

export default GenreScreen;
