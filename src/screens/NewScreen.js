import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import PlaylistModal from '../components/PlaylistModal';
import SlideUpModal from '../components/SlideUpModal';
import { searchArtist } from '../services/api';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayer } from '../context/PlayerContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SONG_IMAGE_WIDTH = 60;
const SONG_INFO_WIDTH = 215;
const SONG_PADDING = 5;
const COLUMN_WIDTH = SONG_IMAGE_WIDTH + SONG_INFO_WIDTH + (SONG_PADDING * 2);
const COLUMN_MARGIN = 15;

const NewScreen = ({ navigation }) => {
  const { playSong } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [musicItems, setMusicItems] = useState([]); 
  const [newReleases, setNewReleases] = useState([]);
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

  const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  const fetchNewReleases = useCallback(async () => {
    try {
      const response = await fetch('https://www.beatinbox.com/api/get-mobile-new-feed-url');
      const { data } = await response.json();
      setNewReleases(data.musicItems[0].contents || []);
    } catch (error) {
      console.error('Error fetching new releases:', error);
    }
  }, []);

  useEffect(() => {
    fetchMusicItems();
    fetchNewReleases();
  }, [fetchNewReleases]);

  const fetchMusicItems = async () => {
    try {
      const response = await fetch('https://www.beatinbox.com/api/get-mobile-feed-songs-url');
      const { data } = await response.json();
      // Sort sections to show trending first
      const sortedSections = data.sections.sort((a, b) => {
        if (a.title === "Trending songs for you") return -1;
        if (b.title === "Trending songs for you") return 1;
        return 0;
      });
      
      // Map the songs to match the expected format
      const formattedSections = sortedSections.map(section => ({
        ...section,
        songs: section.songs.map(song => ({
          id: song.videoId,
          videoId: song.videoId,
          title: song.title,
          artist: song.artist,
          thumbnail: song.thumbnail,
          plays: song.plays
        }))
      }));
      
      setMusicItems(formattedSections);
    } catch (error) {
      console.error('Error fetching music items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* First Songs Section */}
        {musicItems.slice(0, 1).map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.strapline ? (
                <Text style={styles.strapline}>{section.strapline}</Text>
              ) : null}
            </View>
            
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              snapToInterval={COLUMN_WIDTH + COLUMN_MARGIN}
              decelerationRate="fast"
              style={styles.slider}
              contentContainerStyle={styles.sliderContent}
            >
              {chunkArray(section.songs, 4).map((column, colIndex) => (
                <View key={colIndex} style={styles.songColumn}>
                  {column.map((song) => (
                    <TouchableOpacity
                      key={`${colIndex}-${song.videoId}`}
                      style={styles.songItem}
                      onPress={() => {
                        const mappedSongs = section.songs.map(s => ({
                          id: s.videoId,
                          title: s.title,
                          artist: s.artist,
                          thumbnail: s.thumbnail
                        }));
                        playSong({
                          id: song.videoId,
                          title: song.title,
                          artist: song.artist,
                          thumbnail: song.thumbnail
                        }, mappedSongs);
                      }}
                    >
                      <View style={styles.songMainContent}>
                        <Image
                          source={{ 
                            uri: song.thumbnail
                              ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(song.thumbnail)}`
                              : 'https://www.beatinbox.com/default-thumbnail.png'
                          }}
                          style={styles.songImage}
                        />
                        <View style={styles.songInfo}>
                          <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                          <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
                          {song.plays && (
                            <Text style={styles.songPlays} numberOfLines={1}>{song.plays}</Text>
                          )}
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
          </View>
        ))}

        {/* New Releases Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Albums & Singles</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.playlistScroll}
            contentContainerStyle={styles.playlistScrollContent}
          >
            {newReleases.map((release, index) => (
              <TouchableOpacity
                key={index}
                style={styles.playlistCard}
                onPress={() => {
                  const cleanId = release.playlistId.replace('VL', '');
                  navigation.navigate('PlaylistDetail', {
                    playlistId: cleanId,
                    title: release.title,
                    thumbnail: release.thumbnail,
                    artists: release.artists
                  });
                }}
              >
                <View style={styles.playlistImageContainer}>
                  <Image
                    source={{ uri: release.thumbnail }}
                    style={styles.playlistThumbnail}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.playlistGradient}
                  />
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistTitle} numberOfLines={2}>
                      {release.title}
                    </Text>
                    <Text style={styles.playlistArtists} numberOfLines={1}>
                      {release.artists}
                    </Text>
                    {release.isExplicit && (
                      <View style={styles.explicitBadge}>
                        <Text style={styles.explicitText}>E</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Second Songs Section */}
        {musicItems.slice(1).map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.strapline ? (
                <Text style={styles.strapline}>{section.strapline}</Text>
              ) : null}
            </View>
            
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              snapToInterval={COLUMN_WIDTH + COLUMN_MARGIN}
              decelerationRate="fast"
              style={styles.slider}
              contentContainerStyle={styles.sliderContent}
            >
              {chunkArray(section.songs, 4).map((column, colIndex) => (
                <View key={colIndex} style={styles.songColumn}>
                  {column.map((song) => (
                    <TouchableOpacity
                      key={`${colIndex}-${song.videoId}`}
                      style={styles.songItem}
                      onPress={() => {
                        const mappedSongs = section.songs.map(s => ({
                          id: s.videoId,
                          title: s.title,
                          artist: s.artist,
                          thumbnail: s.thumbnail
                        }));
                        playSong({
                          id: song.videoId,
                          title: song.title,
                          artist: song.artist,
                          thumbnail: song.thumbnail
                        }, mappedSongs);
                      }}
                    >
                      <View style={styles.songMainContent}>
                        <Image
                          source={{ 
                            uri: song.thumbnail
                              ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(song.thumbnail)}`
                              : 'https://www.beatinbox.com/default-thumbnail.png'
                          }}
                          style={styles.songImage}
                        />
                        <View style={styles.songInfo}>
                          <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                          <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
                          {song.plays && (
                            <Text style={styles.songPlays} numberOfLines={1}>{song.plays}</Text>
                          )}
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
          </View>
        ))}
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
            videoId: selectedSong?.videoId,
            title: selectedSong?.title,
            artist: selectedSong?.artist,
            thumbnail: selectedSong?.thumbnail
          }}
        />
      </SlideUpModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  explicitBadge: {
    position: 'absolute',
    top: -20,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  explicitText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
  container: {
    flex: 1,
    backgroundColor: '#000',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 160, // Add space for player bar
    marginBottom: 80,
  },
  section: {
    marginBottom: 15,
  },
  sectionHeader: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  strapline: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  slider: {
    marginBottom: 20,
  },
  sliderContent: {
    paddingHorizontal: 15,
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
  songPlays: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
    position: 'absolute',
    right: 0,
  },
  horizontalScroll: {
    marginLeft: 15,
  },
  horizontalScrollContent: {
    paddingRight: 15,
  },
  trendingCard: {
    width: 200,
    marginRight: 15,
  },
  trendingImageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  trendingThumbnail: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  trendingInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  trendingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  trendingMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingArtist: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  trendingDot: {
    color: '#fff',
    marginHorizontal: 6,
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  trendingPlays: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
});

export default NewScreen;
