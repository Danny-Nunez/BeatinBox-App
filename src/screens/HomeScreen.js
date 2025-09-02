import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Dimensions, Modal, ActivityIndicator, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { CacheManager, createCacheKey } from '../utils/cache';
import { fetchTop100Songs, fetchTopArtists, fetchCommuteFeed, searchArtist, getFavoriteArtists } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SlideUpModal from '../components/SlideUpModal';
import LoginScreen from '../screens/LoginScreen';
import PlaylistModal from '../components/PlaylistModal';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Calculate optimal column width for 4 songs
const SONG_IMAGE_WIDTH = 60;
const SONG_INFO_WIDTH = 215;
const SONG_PADDING = 5;
const COLUMN_WIDTH = SONG_IMAGE_WIDTH + SONG_INFO_WIDTH + (SONG_PADDING * 2);
const COLUMN_MARGIN = 15;

const HomeScreen = ({ navigation }) => {
  const { playSong, currentSong } = usePlayer();
  const { user, logout } = useAuth();
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [favoriteArtists, setFavoriteArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [liveRadio, setLiveRadio] = useState([]);
  const [liveNews, setLiveNews] = useState([]);
  const [musicItems, setMusicItems] = useState([]);
  const [commuteFeed, setCommuteFeed] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const lottieRef = useRef(null);
  

  

  

  

  


  const handleMenuPress = (song, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedSong(song);
    setMenuPosition({ x: pageX - 160, y: pageY - 100 }); // Adjust position to show menu above the button
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

  function formatViews(num) {
    if (num >= 1e6) {
      return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  }
  

  const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load favorite artists when user changes
  useEffect(() => {
    // Only load favorites when user is fully loaded with an ID
    if (user && user.id) {
      loadFavoriteArtists();
    } else if (user === null) {
      // User is explicitly null (not logged in)
      loadFavoriteArtists();
    }
    // If user is undefined, it means context is still loading, so do nothing
  }, [user]);

  // Set loading to false after both data and favorites are loaded
  useEffect(() => {
    if (!loading && (favoriteArtists.length > 0 || artists.length > 0)) {
      // We have either favorites or top artists, so we can stop loading
    }
  }, [loading, favoriteArtists.length, artists.length]);

  // Refresh favorite artists when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) {
        loadFavoriteArtists();
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  // Reset Lottie animation when loading starts
  useEffect(() => {
    if (loading && lottieRef.current) {
      lottieRef.current.reset();
      lottieRef.current.play();
    }
  }, [loading]);







  const fetchCachedData = async (url, cacheKey) => {
    try {
      // Try cache first
      const cachedData = await CacheManager.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const response = await fetch(url);
      const data = await response.json();
      
      // Cache the result
      await CacheManager.set(cacheKey, data);
      return data;
    } catch (error) {
      // Try to return stale cache data if available
      const staleData = await CacheManager.get(cacheKey);
      if (staleData) {
        return staleData;
      }
      throw error;
    }
  };

  const loadData = async () => {
    try {
      const [songsData, radioData, newsData, homeFeedData, commuteFeedData] = await Promise.all([
        fetchTop100Songs(),
        fetchCachedData('https://www.beatinbox.com/api/music-live', createCacheKey('music-live')),
        fetchCachedData('https://www.beatinbox.com/api/news', createCacheKey('news')),
        fetchCachedData('https://www.beatinbox.com/api/mobile-home-feed', createCacheKey('mobile-home-feed')),
        fetchCommuteFeed()
      ]);
      
      setSongs(songsData);
      setLiveRadio(Object.entries(radioData).map(([name, data]) => ({
        name,
        ...data
      })));
      setLiveNews(Object.entries(newsData).map(([name, data]) => ({
        name,
        ...data
      })));
      setMusicItems(homeFeedData.musicItems || []);
      setCommuteFeed(commuteFeedData || []);
      setError(null);
    } catch (error) {
      console.error('Error loading songs:', error);
      setError('Unable to load songs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Load favorite artists when user is logged in, or top artists as fallback
  const loadFavoriteArtists = async () => {
    // Check if user context is still loading (user might be null initially)
    if (!user) {
      return;
    }
    
    if (user.id) {
      try {
        const favorites = await getFavoriteArtists();
        
        if (favorites && favorites.length > 0) {
          // User has favorites, use those
          setFavoriteArtists(favorites);
          setArtists([]); // Clear top artists since we don't need them
        } else {
          // User has no favorites, load top artists as fallback
          const topArtists = await fetchTopArtists();
          setArtists(topArtists);
          setFavoriteArtists([]);
        }
      } catch (error) {
        // If favorites fail to load, load top artists as fallback
        try {
          const topArtists = await fetchTopArtists();
          setArtists(topArtists);
          setFavoriteArtists([]);
        } catch (fallbackError) {
          // Fallback failed, keep empty state
        }
      }
    } else {
      setFavoriteArtists([]);
      // Load top artists for users without ID
      try {
        const topArtists = await fetchTopArtists();
        setArtists(topArtists);
      } catch (error) {
        // Failed to load top artists
      }
    }
  };



  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : 
                  currentHour < 18 ? 'Good afternoon' : 
                  'Good evening';

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.logoContainer, { backgroundColor: 'transparent' }]}>
            <LottieView
              ref={lottieRef}
              source={require('../../assets/icon.json')}
              style={[styles.loadingLogo, { backgroundColor: 'transparent' }]}
              autoPlay
              loop
              resizeMode="contain"
              colorFilters={[]}
            />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <LinearGradient 
    colors={['#000', '#1a1a1a']}
    style={{ flex: 1 }}
  >
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
    <LinearGradient 
    colors={['#000', '#1a1a1a']}
    style={{ flex: 1 }}
  >
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.greeting}>{greeting}</Text>
            <TouchableOpacity 
              style={styles.userButton}
              onPress={() => {
                if (user) {
                  navigation.navigate('Profile');
                } else {
                  setShowLogin(true);
                }
              }}
            >
              {user ? (
                <View style={styles.userImageContainer}>
                  <LinearGradient
                    colors={['#3B82F6', '#8B5CF6']} // Blue to purple gradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.userImageGradient}
                  />
                  <Image
                    source={{ 
                      uri: user.image || 'https://www.beatinbox.com/default-user.png'
                    }}
                    style={styles.userImage}
                  />
                </View>
              ) : (
                <View style={styles.userImageContainer}>
                  <LinearGradient
                    colors={['#3B82F6', '#8B5CF6']} // Blue to purple gradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.userImageGradient}
                  />
                  <Ionicons name="person-circle-outline" size={32} color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {favoriteArtists.length > 0 ? 'Your Favorite Artists' : 'Top Artists'}
            </Text>


          </View>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            snapToInterval={COLUMN_WIDTH + COLUMN_MARGIN}
            decelerationRate="fast"
            style={styles.slider}
            contentContainerStyle={styles.sliderContent}
          >
            {(() => {
              const artistsToShow = favoriteArtists.length > 0 ? favoriteArtists : artists;
              const isUsingFavorites = favoriteArtists.length > 0;
              

              
              return artistsToShow.map((artist, index) => {
              // Handle both favorite artists and top artists data structures
              const isFavoriteArtist = favoriteArtists.length > 0;
              const artistId = isFavoriteArtist ? artist.browseId : artist.id;
              const artistName = artist.name;
              const artistThumbnail = isFavoriteArtist 
                ? (artist.thumbnails && (Array.isArray(artist.thumbnails) ? artist.thumbnails[0]?.url : artist.thumbnails.url))
                : artist.thumbnail;
              
              // Use proxy for favorite artist images, direct URL for top artists
              // For favorite artists, try to get the largest available thumbnail (w240-h240)
              let imageUri;
              if (isFavoriteArtist && artistThumbnail) {
                // Replace w60-h60 with w240-h240 for better quality
                const enhancedThumbnail = artistThumbnail.replace(/w\d+-h\d+/, 'w240-h240');
                imageUri = `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(enhancedThumbnail)}`;
              } else {
                imageUri = artistThumbnail;
              }



              return (
                <TouchableOpacity 
                  key={artistId} 
                  style={styles.artistCard}
                  onPress={() => navigation.navigate('Artist', {
                    artistId: artistId,
                    artistName: artistName
                  })}
                >
                  <View style={styles.artistImageContainer}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.artistImage}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
                      locations={[0, 0.4, 0.9]}
                      style={styles.artistGradient}
                    />
                    {!isFavoriteArtist && (
                      <Text style={styles.artistRank}>
                        {artist.position}
                      </Text>
                    )}
                    <Text style={styles.artistName} numberOfLines={1}>
                      {artistName}
                    </Text>
                    {!isFavoriteArtist && (
                      <Text style={styles.artistViews} numberOfLines={1}>
                        {formatViews(artist.viewCount)} Views
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            });
          })()}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top 100</Text>
            <TouchableOpacity 
              style={styles.playAllButton}
              onPress={() => songs.length > 0 && playSong(songs[0], songs)}
            >
              <Ionicons name="play-circle" size={24} color="#fff" />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
          </View>
          {/* Slider: Horizontal ScrollView with columns of 4 songs */}
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
                      <Image
                        source={{ uri: song.thumbnail }}
                        style={styles.songImage}
                      />
                      <View style={styles.songInfo}>
                        <Text
                          style={[
                            styles.songTitle,
                            currentSong?.id === song.id && styles.playingText
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {song.title}
                        </Text>
                        <Text
                          style={[
                            styles.songArtist,
                            currentSong?.id === song.id && styles.playingTextSecondary
                          ]}
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

          {/* Live Radio Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Radio</Text>
          </View>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.slider}
            contentContainerStyle={styles.sliderContent}
          >
            {liveRadio.map((station, index) => (
              <TouchableOpacity 
                key={`live-radio-${station.id}-${index}`} 
                style={styles.radioCard}
                onPress={() => playSong({
                  id: station.id,
                  title: station.title,
                  artist: station.channel?.name || '',
                  thumbnail: station.thumbnail
                })}
              >
                <View style={styles.radioImageContainer}>
                  <Image
                    source={{ uri: station.thumbnail }}
                    style={styles.radioImage}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
                    locations={[0, 0.4, 0.9]}
                    style={styles.radioGradient}
                  />
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                    <Text style={styles.viewerCount}>
                      {station.watching > 0 ? `${formatViews(station.watching)} watching` : ''}
                    </Text>
                  </View>
                  <Text style={styles.radioName} numberOfLines={2}>{station.name}</Text>
                  <Text style={styles.channelName} numberOfLines={1}>
                    {station.channel?.name}
                    {station.channel?.verified && (
                      <Ionicons name="checkmark-circle" size={14} color="#1DB954" style={styles.verifiedIcon} />
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Live News Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live News</Text>
          </View>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.slider}
            contentContainerStyle={styles.sliderContent}
          >
            {liveNews.map((station, index) => (
              <TouchableOpacity 
                key={`live-news-${station.id}-${index}`} 
                style={styles.radioCard}
                onPress={() => playSong({
                  id: station.id,
                  title: station.title,
                  artist: station.channel?.name || '',
                  thumbnail: station.thumbnail
                })}
              >
                <View style={styles.radioImageContainer}>
                  <Image
                    source={{ uri: station.thumbnail }}
                    style={styles.radioImage}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
                    locations={[0, 0.4, 0.9]}
                    style={styles.radioGradient}
                  />
                  <View style={styles.liveIndicator}>
                    <View style={[styles.liveDot, { backgroundColor: '#ff0000' }]} />
                    <Text style={styles.liveText}>LIVE NEWS</Text>
                    <Text style={styles.viewerCount}>
                      {station.watching > 0 ? `${formatViews(station.watching)} watching` : ''}
                    </Text>
                  </View>
                  <Text style={styles.radioName} numberOfLines={2}>{station.name}</Text>
                  <Text style={styles.channelName} numberOfLines={1}>
                    {station.channel?.name}
                    {station.channel?.verified && (
                      <Ionicons name="checkmark-circle" size={14} color="#1DB954" style={styles.verifiedIcon} />
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Commute Feed Sections */}
          {commuteFeed.map((section, sectionIndex) => (
            <View key={`commute-${sectionIndex}`} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                style={styles.slider}
                contentContainerStyle={styles.sliderContent}
              >
                {section.contents.map((playlist, index) => (
                  <TouchableOpacity
                    key={`commute-${sectionIndex}-${playlist.playlistId}-${index}`}
                    style={styles.playlistCard}
                    onPress={() => {
                      if (playlist.playlistId.startsWith('MP')) {
                        // Album/Single - navigate to album screen
                        navigation.navigate('Album', {
                          albumId: playlist.playlistId,
                          albumName: playlist.title,
                          albumImage: `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(playlist.thumbnail)}`
                        });
                      } else {
                        // Regular playlist - navigate to playlist detail
                        navigation.navigate('PlaylistDetail', {
                          playlistId: playlist.playlistId,
                          title: playlist.title,
                          thumbnail: `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(playlist.thumbnail)}`,
                          artists: playlist.artists
                        });
                      }
                    }}
                  >
                    <View style={styles.playlistImageContainer}>
                      <Image
                        source={{ uri: `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(playlist.thumbnail)}` }}
                        style={styles.playlistImage}
                      />
                      <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
                        locations={[0, 0.4, 0.9]}
                        style={styles.playlistGradient}
                      />
                      <Text style={styles.playlistTitle} numberOfLines={2}>
                        {playlist.title}
                      </Text>
                      <Text style={styles.playlistArtists} numberOfLines={1}>
                        {playlist.artists}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}

          {/* Music Items Sections */}
          {musicItems.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                style={styles.slider}
                contentContainerStyle={styles.sliderContent}
              >
                {section.contents.map((playlist, index) => (
                  <TouchableOpacity
                    key={`${sectionIndex}-${playlist.videoId || playlist.playlistId}-${index}`}
                    style={styles.playlistCard}
                    onPress={() => {
                      if (playlist.videoId) {
                        // Single song - play it
                        playSong({
                          id: playlist.videoId,
                          title: playlist.title,
                          artist: playlist.artists,
                          thumbnail: `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(playlist.thumbnail)}`
                        });
                      } else if (playlist.playlistId) {
                        // Check if it's an album/single (starts with MP) or regular playlist
                        if (playlist.playlistId.startsWith('MP')) {
                          // Album/Single - navigate to album screen
                          navigation.navigate('Album', {
                            albumId: playlist.playlistId,
                            albumName: playlist.title,
                            albumImage: `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(playlist.thumbnail)}`
                          });
                        } else {
                          // Regular playlist - navigate to playlist detail
                          navigation.navigate('PlaylistDetail', {
                            playlistId: playlist.playlistId,
                            title: playlist.title,
                            thumbnail: `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(playlist.thumbnail)}`,
                            artists: playlist.artists
                          });
                        }
                      }
                    }}
                  >
                    <View style={styles.playlistImageContainer}>
                      <Image
                        source={{ uri: `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(playlist.thumbnail)}` }}
                        style={styles.playlistImage}
                      />
                      <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
                        locations={[0, 0.4, 0.9]}
                        style={styles.playlistGradient}
                      />
                      <Text style={styles.playlistTitle} numberOfLines={2}>
                        {playlist.title}
                      </Text>
                      <Text style={styles.playlistArtists} numberOfLines={1}>
                        {playlist.artists}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      </ScrollView>

      <SlideUpModal
        visible={showLogin}
        onClose={() => setShowLogin(false)}
      >
        <LoginScreen onClose={() => setShowLogin(false)} />
      </SlideUpModal>

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

      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoContainer: {
    marginBottom: 20,
  },

  loadingLogo: {
    width: 150,
    height: 150,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 15,
    marginBottom: 130,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userButton: {
    padding: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 15,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
  songImage: {
    width: SONG_IMAGE_WIDTH,
    height: SONG_IMAGE_WIDTH,
    borderRadius: 4,
  },
  songMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songInfo: {
    marginLeft: 15,
    width: SONG_INFO_WIDTH,
    paddingRight: 40, // Make space for menu button
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
  artistCard: {
    width: COLUMN_WIDTH,
    marginRight: COLUMN_MARGIN,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  artistImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  artistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  artistGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  artistName: {
    position: 'absolute',
    bottom: 26,
    left: 12,
    right: 12,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  artistViews: {
    position: 'absolute',
    bottom: 10,
    left: 13,
    right: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  artistRank: {
    position: 'absolute',
    top: 5,
    left: 10,
    color: 'rgba(255, 255, 255, 0.39)',
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  radioCard: {
    width: COLUMN_WIDTH,
    marginRight: COLUMN_MARGIN,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  radioImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16/9,
  },
  radioImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  radioGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E11D48',
    marginRight: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  viewerCount: {
    color: '#fff',
    fontSize: 12,
  },
  radioName: {
    position: 'absolute',
    bottom: 26,
    left: 12,
    right: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  channelName: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
  },
  userImageContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userImageGradient: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 25,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 23,
    zIndex: 1,
  },
  playlistCard: {
    width: 160,
    height: 200,
    marginRight: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  playlistImageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  playlistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  playlistGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  playlistTitle: {
    position: 'absolute',
    bottom: 26,
    left: 12,
    right: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  playlistArtists: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  playingText: {
    color: '#ACBDFF',
  },
  playingTextSecondary: {
    color: '#ACBDFF',
    opacity: 0.8,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
});

export default HomeScreen;
