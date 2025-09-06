import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [lastKnownSong, setLastKnownSong] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
  const [shuffledPlaylist, setShuffledPlaylist] = useState([]);
  const [shuffledIndex, setShuffledIndex] = useState(-1);

  // Load last known song from storage on initialization
  useEffect(() => {
    const loadLastKnownSong = async () => {
      try {
        const stored = await AsyncStorage.getItem('lastKnownSong');
        if (stored) {
          const song = JSON.parse(stored);
          setLastKnownSong(song);
          console.log('🔄 Loaded lastKnownSong from storage:', song.title);
        }
      } catch (error) {
        console.error('Error loading lastKnownSong:', error);
      }
    };
    loadLastKnownSong();
  }, []);

  // Debug currentSong changes
  // Track last known song in context and persist to storage
  useEffect(() => {
    if (currentSong) {
      setLastKnownSong(currentSong);
      console.log('🎵 PlayerContext currentSong changed:', `"${currentSong.title}"`);
      console.log('🔄 PlayerContext lastKnownSong updated to:', `"${currentSong.title}"`);
      
      // Persist to storage
      AsyncStorage.setItem('lastKnownSong', JSON.stringify(currentSong))
        .catch(error => console.error('Error saving lastKnownSong:', error));
    } else {
      console.log('🎵 PlayerContext currentSong changed: null');
      console.log('🔒 PlayerContext lastKnownSong preserved:', lastKnownSong ? `"${lastKnownSong.title}"` : 'null');
    }
  }, [currentSong, lastKnownSong]);

  // Reset everything when unmounting
  useEffect(() => {
    return () => {
      console.log('🚨 PlayerProvider is unmounting - this should NOT happen during logout!');
      setCurrentSong(null);
      setPlaylist([]);
      setCurrentIndex(-1);
    };
  }, []);

  const playSong = (song, songList) => {
    setIsPlaying(true);
    if (songList) {
      // Ensure the playlist data has the correct structure
      const formattedPlaylist = songList.map(item => ({
        id: item.id,
        title: item.title,
        artist: item.artist || item.channel?.name || '',
        thumbnail: item.thumbnail
      }));
      setPlaylist(formattedPlaylist);
      setCurrentIndex(formattedPlaylist.findIndex(s => s.id === song.id));
    } else if (!playlist.length) {
      setPlaylist([song]);
      setCurrentIndex(0);
    } else {
      setCurrentIndex(playlist.findIndex(s => s.id === song.id));
    }
    setCurrentSong({
      id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail
    });
  };

  const playNext = () => {
    // Handle repeat one mode - restart the same song
    if (repeatMode === 'one') {
      // For repeat one, we'll handle the restart in the PlayerBar component
      // by seeking to the beginning of the current video
      return;
    }

    if (isShuffled) {
      // Play next song from shuffled playlist
      if (shuffledIndex < shuffledPlaylist.length - 1) {
        const nextSong = shuffledPlaylist[shuffledIndex + 1];
        setShuffledIndex(shuffledIndex + 1);
        setCurrentSong({
          id: nextSong.id,
          title: nextSong.title,
          artist: nextSong.artist || nextSong.channel?.name || '',
          thumbnail: nextSong.thumbnail
        });
      } else if (repeatMode === 'all') {
        // If repeat all is on, restart shuffled playlist
        const firstShuffledSong = shuffledPlaylist[0];
        setShuffledIndex(0);
        setCurrentSong({
          id: firstShuffledSong.id,
          title: firstShuffledSong.title,
          artist: firstShuffledSong.artist || firstShuffledSong.channel?.name || '',
          thumbnail: firstShuffledSong.thumbnail
        });
      }
    } else {
      // Normal sequential playback
      if (currentIndex < playlist.length - 1) {
        const nextSong = playlist[currentIndex + 1];
        setCurrentIndex(currentIndex + 1);
        setCurrentSong({
          id: nextSong.id,
          title: nextSong.title,
          artist: nextSong.artist || nextSong.channel?.name || '',
          thumbnail: nextSong.thumbnail
        });
      } else if (repeatMode === 'all') {
        // If repeat all is on, restart normal playlist
        const firstSong = playlist[0];
        setCurrentIndex(0);
        setCurrentSong({
          id: firstSong.id,
          title: firstSong.title,
          artist: firstSong.artist || firstSong.channel?.name || '',
          thumbnail: firstSong.thumbnail
        });
      }
    }
  };

  const playPrevious = () => {
    // Handle repeat one mode - restart the same song
    if (repeatMode === 'one') {
      // For repeat one, we'll handle the restart in the PlayerBar component
      // by seeking to the beginning of the current video
      return;
    }

    if (isShuffled) {
      // Play previous song from shuffled playlist
      if (shuffledIndex > 0) {
        const prevSong = shuffledPlaylist[shuffledIndex - 1];
        setShuffledIndex(shuffledIndex - 1);
        setCurrentSong({
          id: prevSong.id,
          title: prevSong.title,
          artist: prevSong.artist || prevSong.channel?.name || '',
          thumbnail: prevSong.thumbnail
        });
      }
    } else {
      // Normal sequential playback
      if (currentIndex > 0) {
        const prevSong = playlist[currentIndex - 1];
        setCurrentIndex(currentIndex - 1);
        setCurrentSong({
          id: prevSong.id,
          title: prevSong.title,
          artist: prevSong.artist || prevSong.channel?.name || '',
          thumbnail: prevSong.thumbnail
        });
      }
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Toggle shuffle mode
  const toggleShuffle = () => {
    const newShuffled = !isShuffled;
    setIsShuffled(newShuffled);
    
    if (newShuffled) {
      // Create shuffled playlist
      const shuffled = [...playlist].sort(() => Math.random() - 0.5);
      setShuffledPlaylist(shuffled);
      // Find current song in shuffled playlist
      const shuffledIndex = shuffled.findIndex(s => s.id === currentSong?.id);
      setShuffledIndex(shuffledIndex >= 0 ? shuffledIndex : 0);
    }
  };

  // Toggle repeat mode
  const toggleRepeat = () => {
    if (repeatMode === 'none') {
      setRepeatMode('one');
    } else if (repeatMode === 'one') {
      setRepeatMode('all');
    } else {
      setRepeatMode('none');
    }
  };

  // Restart current song (for repeat one mode)
  const restartSong = () => {
    // This function will be called from PlayerBar to restart the current song
    // by seeking to the beginning
  };

  return (
    <PlayerContext.Provider value={{ 
      currentSong, 
      lastKnownSong,
      playSong, 
      playNext, 
      playPrevious,
      hasNext: isShuffled ? shuffledIndex < shuffledPlaylist.length - 1 : currentIndex < playlist.length - 1,
      hasPrevious: isShuffled ? shuffledIndex > 0 : currentIndex > 0,
      isPlaying,
      togglePlay,
      isShuffled,
      toggleShuffle,
      repeatMode,
      toggleRepeat,
      restartSong
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
