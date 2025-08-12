import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { MaterialIcons, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AlbumScreen = ({ route, navigation }) => {
  const { albumId, albumName } = route.params;
  const { 
    currentSong,
    isPlaying,
    playSong
  } = usePlayer();

  const [albumData, setAlbumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        const response = await fetch(`https://www.beatinbox.com/api/getalbum?albumId=${albumId}`);
        if (!response.ok) throw new Error('Failed to fetch album data');
        
        const data = await response.json();
        console.log('Album data:', data);
        setAlbumData(data);
      } catch (err) {
        console.error('Error fetching album data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [albumId]);

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

  if (!albumData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No album data found</Text>
      </View>
    );
  }

  const handlePlaySong = (song, index) => {
    const formattedSong = {
      id: song.videoId,
      title: song.name,
      artist: song.artist.name,
      thumbnail: song.thumbnails.find(t => t.width === 226)?.url
    };

    const formattedSongList = albumData.songs.map(s => ({
      id: s.videoId,
      title: s.name,
      artist: s.artist.name,
      thumbnail: s.thumbnails.find(t => t.width === 226)?.url
    }));

    playSong(formattedSong, formattedSongList);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Album Header */}
        <View style={styles.header}>
          <Image
            source={{ 
              uri: albumData.thumbnails.find(t => t.width === 544)?.url
                ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(albumData.thumbnails.find(t => t.width === 544).url)}`
                : null
            }}
            style={styles.albumArt}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.gradient}
          />
          <View style={styles.albumInfo}>
            <Text style={styles.albumTitle}>{albumData.name}</Text>
            <Text style={styles.artistName}>{albumData.artist.name}</Text>
            <Text style={styles.albumYear}>{albumData.year}</Text>
          </View>
        </View>

        {/* Songs List */}
        <View style={styles.songsList}>
          {albumData.songs.map((song, index) => {
            const isCurrentlyPlaying = currentSong?.id === song.videoId && isPlaying;

            return (
              <TouchableOpacity
                key={song.videoId}
                style={styles.songRow}
                onPress={() => handlePlaySong(song, index)}
              >
                <View style={styles.songNumberContainer}>
                  <Text style={styles.songNumber}>{index + 1}</Text>
                </View>
                <View style={styles.songInfo}>
                  <Text 
                    style={[styles.songTitle, isCurrentlyPlaying && styles.activeText]} 
                    numberOfLines={1}
                  >
                    {song.name}
                  </Text>
                  <Text 
                    style={[styles.songArtist, isCurrentlyPlaying && styles.activeText]} 
                    numberOfLines={1}
                  >
                    {song.artist.name}
                  </Text>
                </View>
                <Text style={styles.songDuration}>
                  {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingBottom: 140,
  },
  scrollView: {
    flex: 1,
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
    position: 'relative',
    height: 400,
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  albumInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  albumTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  artistName: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  albumYear: {
    fontSize: 16,
    color: '#9CA3AF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  songsList: {
    padding: 20,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  songNumberContainer: {
    width: 30,
    alignItems: 'center',
  },
  songNumber: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
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
  songDuration: {
    color: '#9CA3AF',
    fontSize: 14,
    width: 45,
    textAlign: 'right',
  },
  activeText: {
    color: '#E11D48',
  },
});

export default AlbumScreen;
