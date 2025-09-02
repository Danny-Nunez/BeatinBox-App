import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as api from '../services/api';

const AddArtistScreen = ({ navigation, route }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`https://www.beatinbox.com/api/youtubemusic?q=${encodeURIComponent(query)}&type=artist`);
      const data = await response.json();
      
      if (data.content && data.content.length > 0) {
        const artists = data.content.filter(item => item.type === 'artist');
        setSearchResults(artists);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search for artists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddArtist = async (artist) => {
    try {
      // Log the artist data being sent
      const artistData = {
        browseId: artist.browseId,
        name: artist.name,
        thumbnails: artist.thumbnails
      };
      console.log('Sending artist data to API:', JSON.stringify(artistData, null, 2));
      
      // Call the backend API to add the artist to favorites
      const result = await api.addFavoriteArtist(artistData);
      console.log('API call successful, result:', result);
      
      // Log the result structure to see what the backend returns
      if (result.results && result.results.length > 0) {
        const addedArtist = result.results[0];
        console.log('Added artist details:', JSON.stringify(addedArtist, null, 2));
        console.log('Added artist favoriteArtist object:', JSON.stringify(addedArtist.favoriteArtist, null, 2));
      }
      
      Alert.alert(
        'Success', 
        `${artist.name} has been added to your favorites!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Just go back - ProfileScreen will refresh on focus
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error adding artist:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Error', `Failed to add artist to favorites: ${error.message}`);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient 
        colors={['#000', '#1a1a1a']}
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Artist</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for an artist..."
              placeholderTextColor="#666"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleSearch}
            disabled={loading || !query.trim()}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {!loading && hasSearched && searchResults.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={48} color="#666" />
            <Text style={styles.noResultsText}>No artists found</Text>
            <Text style={styles.noResultsSubtext}>Try a different search term</Text>
          </View>
        )}

        {!loading && searchResults.length > 0 && (
          <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.resultsTitle}>Search Results</Text>
            {searchResults.map((artist, index) => (
              <TouchableOpacity 
                key={artist.browseId || index} 
                style={styles.artistCard}
                onPress={() => handleAddArtist(artist)}
              >
                <View style={styles.artistImageContainer}>
                  <Image
                    source={{ 
                      uri: artist.thumbnails?.[0]?.url || 'https://www.beatinbox.com/default-artist.png'
                    }}
                    style={styles.artistImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.artistInfo}>
                  <Text style={styles.artistName} numberOfLines={2}>
                    {artist.name}
                  </Text>
                  <Text style={styles.artistType}>Artist</Text>
                </View>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => handleAddArtist(artist)}
                >
                  <Ionicons name="add-circle" size={24} color="#1DB954" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 34,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 5,
  },
  searchButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingTop: 100,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  noResultsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
  },
  noResultsSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  artistImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#333',
    marginRight: 15,
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  artistType: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    padding: 5,
  },
});

export default AddArtistScreen; 