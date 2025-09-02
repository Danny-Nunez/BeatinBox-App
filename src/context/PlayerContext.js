import React, { createContext, useState, useContext, useEffect } from 'react';

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset everything when unmounting
  useEffect(() => {
    return () => {
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
    if (currentIndex < playlist.length - 1) {
      const nextSong = playlist[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      setCurrentSong({
        id: nextSong.id,
        title: nextSong.title,
        artist: nextSong.artist || nextSong.channel?.name || '',
        thumbnail: nextSong.thumbnail
      });
    }
  };

  const playPrevious = () => {
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
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <PlayerContext.Provider value={{ 
      currentSong, 
      playSong, 
      playNext, 
      playPrevious,
      hasNext: currentIndex < playlist.length - 1,
      hasPrevious: currentIndex > 0,
      isPlaying,
      togglePlay
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
