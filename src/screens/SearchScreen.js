import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { LinearGradient } from 'expo-linear-gradient';

const SearchScreen = ({ navigation }) => {
  const { playSong } = usePlayer();
  const inputRef = React.useRef(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [artist, setArtist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const genreFadeAnim = React.useRef(new Animated.Value(0)).current;
  const inputWidthAnim = React.useRef(new Animated.Value(1)).current;
  const inputSlideAnim = React.useRef(new Animated.Value(0)).current;
  const titleFadeAnim = React.useRef(new Animated.Value(1)).current;
  const [inputFocused, setInputFocused] = useState(false);

  const handleInputFocus = () => {
    setInputFocused(true);
    setShowSuggestions(true);
    Animated.parallel([
      Animated.timing(inputSlideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(titleFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(inputWidthAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start();
  };

  const handleInputBlur = () => {
    if (!query) {
      setInputFocused(false);
      Animated.parallel([
        Animated.timing(inputSlideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(titleFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(inputWidthAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start();
    }
  };

  useEffect(() => {
    if (!loading && !showSuggestions) {
      Animated.timing(genreFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        delay: 100
      }).start();
    }
  }, [loading, showSuggestions]);

  useEffect(() => {
    if (suggestions.length > 0 && showSuggestions) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [suggestions.length, showSuggestions]);

  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [query]);

  const fetchSuggestions = async () => {
    if (!query.trim()) return;
    
    setSuggestionsLoading(true);
    try {
      const [artistData, songsData, videosData] = await Promise.all([
        fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(query)}&type=artist`)
          .then(res => res.json()),
        fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(query)}&type=song`)
          .then(res => res.json()),
        fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(query)}&type=video`)
          .then(res => res.json())
      ]);

      const combinedSuggestions = [
        ...(artistData.content?.slice(0, 3) || []).map(item => ({ ...item, type: 'artist' })),
        ...(songsData.content?.slice(0, 6) || []).map(item => ({ ...item, type: 'song' })),
        ...(videosData.content?.slice(0, 4) || []).map(item => ({ ...item, type: 'video' }))
      ];

      setSuggestions(combinedSuggestions);
    } catch (error) {
      console.error('Suggestions error:', error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setArtist(null);
    setSongs([]);
    setVideos([]);
    setSuggestions([]);
    setInputFocused(false);
    setShowSuggestions(false);
    inputRef.current?.blur();
    
    // Reset animations to initial state
    Animated.parallel([
      Animated.timing(inputSlideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(inputWidthAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start();
  };

  const handleSearch = async (forcedQuery = null) => {
    const searchQuery = forcedQuery || query;
    if (!searchQuery.trim()) return;

    Keyboard.dismiss();
    setShowSuggestions(false);
    setLoading(true);
    setQuery(searchQuery); // Update query if it was forced
    try {
      const [artistData, songsData, videosData] = await Promise.all([
        fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(searchQuery)}&type=artist`)
          .then(res => res.json()),
        fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(searchQuery)}&type=song`)
          .then(res => res.json()),
        fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(searchQuery)}&type=video`)
          .then(res => res.json())
      ]);

      // Get first artist result only
      setArtist(artistData.content.find(item => item.type === 'artist'));
      setSongs(songsData.content);
      setVideos(videosData.content);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.searchWrapper}>
          <Animated.Text style={[styles.searchTitle, { opacity: titleFadeAnim }]}>
            Search
          </Animated.Text>
          <Animated.View style={[
            styles.searchContainer,
            {
              transform: [{ translateY: inputSlideAnim }]
            }
          ]}>
            <Animated.View 
              style={[
                styles.inputContainer,
                {
                  flex: inputWidthAnim
                }
              ]}
            >
              <Ionicons 
                name="search" 
                size={20} 
                color="#666" 
                style={styles.searchIcon}
              />
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Search artists, songs, or videos"
                placeholderTextColor="#666"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              {suggestionsLoading && (
                <ActivityIndicator size="small" color="#666" style={styles.loadingSpinner} />
              )}
            </Animated.View>
            {(query.length > 0 || inputFocused) && (
              <TouchableOpacity style={styles.searchButton} onPress={clearSearch}>
                <Text style={styles.searchButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </View>

      {/* Scrollable Content */}
      {!loading && !showSuggestions && (
        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.genresContainer}>
            <View style={styles.genresGrid}>
            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'hiphop' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/hiphop.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Hip Hop</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'pop' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/pop.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Pop</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'rock' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/rock.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Rock</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'electronic' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/electronic.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Dance & Electronic</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'rnb' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/RNB.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>R&B & Soul</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'latin' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/latin.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Latin</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'reggae' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/reggae.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Reggae & Caribbean</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'party' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/party.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Party</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.genreButton} onPress={() => navigation.navigate('Genre', { genre: 'goodvibe' })}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/goodvibe.jpg' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Good Vibe</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.genreButton} onPress={() => handleSearch('workout')}>
              <Animated.Image 
                source={{ uri: 'https://www.beatinbox.com/defaultcover.png' }}
                style={[styles.genreImage, { opacity: genreFadeAnim }]}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.genreOverlay}
              >
                <Text style={styles.genreText}>Workout</Text>
              </LinearGradient>
            </TouchableOpacity>
            </View>
          </View>

          {/* Artist Section */}
          {artist && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Artist</Text>
              <TouchableOpacity 
                style={styles.artistCard}
                onPress={() => navigation.navigate('Artist', {
                  artistId: artist.browseId,
                  artistName: artist.name
                })}
              >
                <Image
                  source={{ 
                    uri: artist.thumbnails?.find(t => t.width === 120)?.url
                      ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(artist.thumbnails.find(t => t.width === 120).url)}`
                      : 'https://www.beatinbox.com/default-thumbnail.png'
                  }}
                  style={styles.artistImage}
                />
                <View style={styles.artistTextContainer}>
                  <Text style={styles.artistName}>{artist.name}</Text>
                  <Text style={styles.artistTitle}>Artist</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Songs Section */}
          {songs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Songs</Text>
              {songs.map((song, index) => (
                <TouchableOpacity
                  key={song.videoId}
                  style={styles.songRow}
                  onPress={() => playSong({
                    id: song.videoId,
                    title: song.name,
                    artist: Array.isArray(song.artist) 
                      ? song.artist.map(a => a.name).join(', ')
                      : song.artist.name,
                    thumbnail: song.thumbnails?.[0]?.url || 'https://www.beatinbox.com/default-thumbnail.png'
                  })}
                >
                  <Image
                    source={{ 
                      uri: song.thumbnails?.[0]?.url
                        ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(song.thumbnails[0].url)}`
                        : 'https://www.beatinbox.com/default-thumbnail.png'
                    }}
                    style={styles.songThumbnail}
                  />
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={1}>{song.name}</Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {Array.isArray(song.artist) 
                        ? song.artist.map(a => a.name).join(', ')
                        : song.artist.name}
                    </Text>
                  </View>
                  <Text style={styles.songDuration}>
                    {formatDuration(song.duration)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Videos Section */}
          {videos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Videos</Text>
              {videos.map((video) => (
                <TouchableOpacity
                  key={video.videoId}
                  style={styles.videoCard}
                  onPress={() => playSong({
                    id: video.videoId,
                    title: video.name,
                    artist: video.author,
                    thumbnail: video.thumbnails?.url || 'https://www.beatinbox.com/default-thumbnail.png'
                  })}
                >
                  <Image
                    source={{ 
                      uri: video.thumbnails?.url
                        ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(video.thumbnails.url)}`
                        : 'https://www.beatinbox.com/default-thumbnail.png'
                    }}
                    style={styles.videoThumbnail}
                  />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={1}>{video.name}</Text>
                    <View style={styles.videoMetaInfo}>
                      <Text style={styles.videoAuthor}>{video.author}</Text>
                      <Text style={styles.videoDot}>•</Text>
                      <Text style={styles.videoViews}>{video.views}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Artist Suggestions */}
      {!loading && suggestions.length > 0 && query.trim() && showSuggestions && (
        <Animated.View style={[styles.suggestionsContainer, { opacity: fadeAnim, flex: 1 }]}>
          <LinearGradient
            colors={['#1a1a1a', '#000']}
            style={StyleSheet.absoluteFill}
          />
          <ScrollView
            onScrollBeginDrag={() => Keyboard.dismiss()}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={`${suggestion.type}-${suggestion.type === 'artist' ? suggestion.browseId : suggestion.videoId}`}
                style={styles.suggestionItem}
                onPress={() => {
                  if (suggestion.type === 'artist') {
                    navigation.navigate('Artist', {
                      artistId: suggestion.browseId,
                      artistName: suggestion.name
                    });
                  } else if (suggestion.type === 'song') {
                    playSong({
                      id: suggestion.videoId,
                      title: suggestion.name,
                      artist: Array.isArray(suggestion.artist) 
                        ? suggestion.artist.map(a => a.name).join(', ')
                        : suggestion.artist?.name,
                      thumbnail: suggestion.thumbnails?.[0]?.url || 'https://www.beatinbox.com/default-thumbnail.png'
                    });
                  } else if (suggestion.type === 'video') {
                    playSong({
                      id: suggestion.videoId,
                      title: suggestion.name,
                      artist: suggestion.author,
                      thumbnail: suggestion.thumbnails?.url || 'https://www.beatinbox.com/default-thumbnail.png'
                    });
                  }
                }}
              >
                <Image
                  source={{ 
                    uri: suggestion.type === 'artist' 
                      ? (suggestion.thumbnails?.find(t => t.width === 120)?.url || 'https://www.beatinbox.com/default-thumbnail.png')
                      : suggestion.type === 'song'
                      ? (suggestion.thumbnails?.[0]?.url || 'https://www.beatinbox.com/default-thumbnail.png')
                      : (suggestion.thumbnails?.url || 'https://www.beatinbox.com/default-thumbnail.png')
                  }}
                  style={[
                    styles.suggestionThumbnail,
                    suggestion.type === 'artist' && { borderRadius: 25 }
                  ]}
                />
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {suggestion.type === 'song' || suggestion.type === 'video' ? suggestion.name : suggestion.name}
                  </Text>
                  <Text style={styles.suggestionSubtitle}>
                    {suggestion.type === 'song' ? 
                      (Array.isArray(suggestion.artist) ? suggestion.artist.map(a => a.name).join(', ') : suggestion.artist?.name) :
                      suggestion.type === 'video' ? 
                      suggestion.author :
                      'Artist'}
                  </Text>
                  <Text style={styles.suggestionType}>{suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E11D48" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#000',
    zIndex: 10,
  },
  scrollContent: {
    flex: 1,
  },
  genresContainer: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 120,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  genreButton: {
    width: '48%',
    aspectRatio: 1.5,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  genreImage: {
    width: '100%',
    height: '100%',
  },
  genreOverlay: {
    position: 'absolute',
    bottom: -0.5,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 10,
  },
  genreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchWrapper: {
    paddingTop: 15,
  },
  searchTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 0,
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  searchIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    height: 40,
    color: '#fff',
    paddingHorizontal: 12,
    fontSize: 16,
  },
  loadingSpinner: {
    marginRight: 15,
  },
  searchButton: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  artistTextContainer: {
    marginLeft: 15,
  },
  artistName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistTitle: {
    color: '#999',
    fontSize: 14,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  songThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 0,
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
  songArtist: {
    color: '#999',
    fontSize: 14,
  },
  songDuration: {
    color: '#999',
    fontSize: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 176,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginHorizontal: 15,
    overflow: 'hidden',
    zIndex: 1,
    marginBottom: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionThumbnail: {
    width: 50,
    height: 50,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionSubtitle: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
  },
  suggestionType: {
    color: '#ACBDFF',
    fontSize: 12,
    marginTop: 2,
  },
  videoCard: {
    marginBottom: 15,
  },
  videoThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 0,
    marginBottom: 10,
  },
  videoInfo: {
    paddingHorizontal: 5,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  videoMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoAuthor: {
    color: '#999',
    fontSize: 14,
  },
  videoDot: {
    color: '#999',
    marginHorizontal: 5,
  },
  videoViews: {
    color: '#999',
    fontSize: 14,
  },
});

export default SearchScreen;
