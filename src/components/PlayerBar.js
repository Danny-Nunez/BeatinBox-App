import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions, LayoutAnimation, Platform, UIManager, Easing, AppState, Alert } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressBar from './ProgressBar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as authService from '../services/auth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PlayerBar = ({ color = '#1a1a1a', onFullscreenChange }) => {
  const { 
    currentSong, 
    lastKnownSong,
    playNext, 
    playPrevious, 
    hasNext, 
    hasPrevious,
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    restartSong
  } = usePlayer();
  const { user } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [textInitialized, setTextInitialized] = useState(false);
  const controlsTimeout = useRef(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const artistScrollX = useRef(new Animated.Value(0)).current;
  const artistOpacity = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const lastTimeRef = useRef(0);
  const scrollActiveRef = useRef(false);
  const artistScrollActiveRef = useRef(false);
  const currentScrollAnimationRef = useRef(null);
  const currentArtistScrollAnimationRef = useRef(null);
  const lastSongTitleRef = useRef('');
  const animationInitializedRef = useRef(false);
  const scrollLoopRunningRef = useRef(false);
  const [screenDimensions, setScreenDimensions] = useState(() => ({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height
  }));

  useEffect(() => {
    const updateDimensions = ({ window }) => {
      setScreenDimensions({
        width: window.width,
        height: window.height
      });
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription.remove();
  }, []);



  // Check like status when song changes or user logs out
  useEffect(() => {
    if (user && currentSong?.id) {
      checkIfLiked();
    } else {
      // Reset like status when user logs out or no song is playing
      setIsLiked(false);
      setIsLikeLoading(false);
    }
  }, [user, currentSong?.id, checkIfLiked]);

  // Force re-render when user status changes to ensure PlayerBar stays visible
  useEffect(() => {
    console.log('🔄 PlayerBar: User status changed, forcing visibility check', {
      hasUser: !!user,
      hasSong: !!(currentSong || lastKnownSong)
    });
    
    // Force a small re-render delay to ensure proper layering after logout
    if (!user && (currentSong || lastKnownSong)) {
      setTimeout(() => {
        console.log('🎯 PlayerBar: Forcing layout refresh after logout');
        setMinimized(prev => prev); // Trigger a re-render
      }, 100);
    }
  }, [user, currentSong, lastKnownSong]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

    // Check if current song is liked
  const checkIfLiked = useCallback(async () => {
    const songToCheck = currentSong || lastKnownSong;
    if (!user || !songToCheck?.id) {
      console.log('checkIfLiked: Missing user or song ID', { user: !!user, songId: songToCheck?.id, songToCheck });
      return;
    }
    
    try {
      const session = await authService.getSession();
      if (!session?.sessionToken) {
        console.log('No session token available');
        return;
      }
      
      console.log('Checking like status for song:', songToCheck.id);
      const response = await fetch(`https://expo-backend-bi5x.onrender.com/mobile/playlists/songs/${songToCheck.id}/like`, {
        method: 'GET',
        headers: {
          'x-session-token': session.sessionToken,
        }
      });
      
      console.log('Like check response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Like check response data:', data);
        setIsLiked(data.isLiked);
      } else {
        console.log('Like check failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  }, [user, currentSong?.id, lastKnownSong?.id]);



  // Like/unlike song
  const toggleLike = async () => {
    const songToLike = currentSong || lastKnownSong;
    console.log('toggleLike called with:', { 
      user: !!user, 
      songId: songToLike?.id, 
      songToLike,
      isLiked 
    });
    console.log('Full user object:', user);
    console.log('User sessionToken:', user?.sessionToken);
    
    if (!user || !songToLike?.id) {
      Alert.alert('Error', 'Please log in to like songs');
      return;
    }

    if (isLikeLoading) return;
    setIsLikeLoading(true);

    try {
      const session = await authService.getSession();
      if (!session?.sessionToken) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setIsLikeLoading(false);
        return;
      }

      if (isLiked) {
        // Unlike song
        console.log('Unliking song:', songToLike.id);
        const response = await fetch(`https://expo-backend-bi5x.onrender.com/mobile/playlists/songs/${songToLike.id}/like`, {
          method: 'DELETE',
          headers: {
            'x-session-token': session.sessionToken,
          }
        });

        console.log('Unlike response status:', response.status);
        if (response.ok) {
          setIsLiked(false);
        } else {
          const errorText = await response.text();
          console.log('Unlike failed with status:', response.status, 'Error:', errorText);
          Alert.alert('Error', 'Failed to unlike song');
        }
      } else {
        // Like song
        const requestBody = {
          title: songToLike.title || songToLike.id,
          artist: songToLike.artist || 'Unknown Artist',
          thumbnail: songToLike.thumbnail || ''
        };
        
        console.log('Liking song:', songToLike.id, 'with body:', requestBody);
        console.log('Session token being sent:', session.sessionToken);
        console.log('Full headers being sent:', {
          'Content-Type': 'application/json',
          'x-session-token': session.sessionToken,
        });
        
        const response = await fetch(`https://expo-backend-bi5x.onrender.com/mobile/playlists/songs/${songToLike.id}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': session.sessionToken,
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Like response status:', response.status);
        if (response.ok) {
          setIsLiked(true);
        } else {
          const errorText = await response.text();
          console.log('Like failed with status:', response.status, 'Error:', errorText);
          Alert.alert('Error', 'Failed to like song');
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    } finally {
      setIsLikeLoading(false);
    }
  };

  const startTitleScroll = useCallback(() => {
    const songForScroll = currentSong || lastKnownSong;
    if (!songForScroll?.title) {
      setTextInitialized(false);
      animationInitializedRef.current = false;
      return;
    }
    
    // Check if animation is already initialized for this song
    const currentSongId = songForScroll.id || songForScroll.title;
    console.log('🔍 Animation check:', {
      currentSongId,
      initialized: animationInitializedRef.current,
      isMatch: animationInitializedRef.current === currentSongId
    });
    
    if (animationInitializedRef.current === currentSongId) {
      console.log('⏭️ Animation already initialized for this song, skipping');
      return;
    }
    
    const titleLength = songForScroll.title.length;
    console.log('🎵 Title scroll check:', songForScroll.title, 'Length:', titleLength);
    
    // Mark as initialized for this song
    animationInitializedRef.current = currentSongId;
    console.log('✅ Marked as initialized:', currentSongId);
    
    // Set opacity to 0 first, before making text visible in DOM
    titleOpacity.setValue(0);
    artistOpacity.setValue(0);
    
    // Set text as initialized to show it can start fading in
    setTextInitialized(true);
    
    // Only scroll if title is longer than what fits in container (approximately 25-30 chars)
    if (titleLength <= 25) {
      console.log('Title fits in container, no scroll needed - Length:', titleLength);
      // Fade in short titles that don't need scrolling
      scrollActiveRef.current = false;
      scrollX.setValue(0);
      
      const fadeInAnimation = Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      });
      fadeInAnimation.start();
      return;
    }
    
    // Set up scrolling for long titles
    scrollActiveRef.current = true;
    lastSongTitleRef.current = songForScroll.title;
    
    // Calculate scroll parameters based on character count
    const charWidth = 15; // pixels per character
    const containerWidth = 320; // container width
    const totalTextWidth = titleLength * charWidth;
    const scrollDistance = totalTextWidth - containerWidth + 60; // Add padding
    
    // Calculate scroll duration based on character count (more chars = longer duration)
    const baseTimePerChar = 200; // milliseconds per character
    const scrollDuration = Math.max(6000, titleLength * baseTimePerChar);
    
    console.log('Scroll setup - Chars:', titleLength, 'Distance:', scrollDistance, 'Duration:', scrollDuration);
    
    // Separate function for just scrolling (with fade-in at reset)
    const doScroll = () => {
      if (!scrollActiveRef.current) {
        console.log('⚠️ Scroll not active, aborting doScroll');
        return;
      }
      
      if (scrollLoopRunningRef.current) {
        console.log('⚠️ Scroll loop already running, aborting doScroll');
        return;
      }
      
      scrollLoopRunningRef.current = true;
      console.log('🚀 Starting title scroll animation');
      const scrollAnimation = Animated.timing(scrollX, {
        toValue: -scrollDistance,
        duration: scrollDuration,
        useNativeDriver: true,
        easing: Easing.linear
      });
      
      currentScrollAnimationRef.current = scrollAnimation;
      scrollAnimation.start(() => {
        if (!scrollActiveRef.current) return;
        
        // Wait 2 seconds at the end, then loop back with fade-in
        setTimeout(() => {
          if (scrollActiveRef.current) {
            // Reset position and fade out
            scrollX.setValue(0);
            titleOpacity.setValue(0);
            
            setTimeout(() => {
              if (scrollActiveRef.current) {
                console.log('🔄 Looping title scroll animation with fade-in');
                // Fade in at the beginning of each loop
                const fadeInAnimation = Animated.timing(titleOpacity, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                  easing: Easing.out(Easing.ease)
                });
                
                                 fadeInAnimation.start(() => {
                   // Wait a bit, then continue scrolling
                   setTimeout(() => {
                     if (scrollActiveRef.current) {
                       scrollLoopRunningRef.current = false; // Reset flag before next loop
                       doScroll(); // Continue the loop
                     }
                   }, 2000);
                 });
              }
            }, 500);
          }
        }, 2000);
      });
    };
    
    // Initial fade-in, then start scrolling
    const startScrolling = () => {
      // Reset position and start with text invisible
      scrollX.setValue(0);
      titleOpacity.setValue(0);
      
      // Fade in the text first (only once)
      console.log('Fading in title text');
      const fadeInAnimation = Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      });
      
      fadeInAnimation.start(() => {
        // Wait 3 seconds after fade-in, then start scrolling
        setTimeout(() => {
          if (scrollActiveRef.current) {
            doScroll(); // Start the scroll loop
          }
        }, 3000);
      });
    };
    
    // Start the scrolling
    startScrolling();
  }, [currentSong?.title, lastKnownSong?.title, scrollX, titleOpacity]);

  const startArtistScroll = useCallback(() => {
    const songForScroll = currentSong || lastKnownSong;
    if (!songForScroll?.artist) {
      return;
    }
    
    const artistLength = songForScroll.artist.length;
    console.log('Artist scroll check:', songForScroll.artist, 'Length:', artistLength);
    
    // Only scroll if artist name is longer than what fits in container (approximately 20-25 chars)
    if (artistLength <= 20) {
      console.log('Artist fits in container, no scroll needed - Length:', artistLength);
      // Fade in short artist names that don't need scrolling
      artistScrollActiveRef.current = false;
      artistScrollX.setValue(0);
      artistOpacity.setValue(0);
      
      const fadeInAnimation = Animated.timing(artistOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      });
      fadeInAnimation.start();
      return;
    }
    
    // Set up scrolling for long artist names
    artistScrollActiveRef.current = true;
    
    // Calculate scroll parameters based on character count
    const charWidth = 12; // pixels per character for artist text
    const containerWidth = 320; // container width
    const totalTextWidth = artistLength * charWidth;
    const scrollDistance = totalTextWidth - containerWidth + 50; // Add padding
    
    // Calculate scroll duration based on character count (more chars = longer duration)
    const baseTimePerChar = 180; // milliseconds per character (slightly faster than title)
    const scrollDuration = Math.max(5000, artistLength * baseTimePerChar);
    
    console.log('Artist scroll setup - Chars:', artistLength, 'Distance:', scrollDistance, 'Duration:', scrollDuration);
    
    // Separate function for just scrolling (with fade-in at reset)
    const doArtistScroll = () => {
      console.log('Starting artist scroll animation');
      const scrollAnimation = Animated.timing(artistScrollX, {
        toValue: -scrollDistance,
        duration: scrollDuration,
        useNativeDriver: true,
        easing: Easing.linear
      });
      
      currentArtistScrollAnimationRef.current = scrollAnimation;
      scrollAnimation.start(() => {
        if (!artistScrollActiveRef.current) return;
        
        // Wait 1.5 seconds at the end, then loop back with fade-in
        setTimeout(() => {
          if (artistScrollActiveRef.current) {
            // Reset position and fade out
            artistScrollX.setValue(0);
            artistOpacity.setValue(0);
            
            setTimeout(() => {
              if (artistScrollActiveRef.current) {
                console.log('Looping artist scroll animation with fade-in');
                // Fade in at the beginning of each loop
                const fadeInAnimation = Animated.timing(artistOpacity, {
                  toValue: 1,
                  duration: 250,
                  useNativeDriver: true,
                  easing: Easing.out(Easing.ease)
                });
                
                fadeInAnimation.start(() => {
                  // Wait a bit, then continue scrolling
                  setTimeout(() => {
                    if (artistScrollActiveRef.current) {
                      doArtistScroll(); // Continue the loop
                    }
                  }, 1500);
                });
              }
            }, 400);
          }
        }, 1500);
      });
    };
    
    // Initial fade-in, then start scrolling
    const startScrolling = () => {
      // Reset position and start with text invisible
      artistScrollX.setValue(0);
      artistOpacity.setValue(0);
      
      // Fade in the text first (only once)
      console.log('Fading in artist text');
      const fadeInAnimation = Animated.timing(artistOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      });
      
      fadeInAnimation.start(() => {
        // Wait 2 seconds after fade-in, then start scrolling
        setTimeout(() => {
          if (artistScrollActiveRef.current) {
            doArtistScroll(); // Start the scroll loop
          }
        }, 2000);
      });
    };
    
    // Start the scrolling
    startScrolling();
  }, [currentSong?.artist, lastKnownSong?.artist, artistScrollX, artistOpacity]);

  // Add cleanup function to stop animations
  const stopTitleScroll = useCallback(() => {
    // Set scroll as inactive
    scrollActiveRef.current = false;
    artistScrollActiveRef.current = false;
    
    // Reset last song title to allow new songs to start
    lastSongTitleRef.current = '';
    
    // Reset animation initialization flag
    animationInitializedRef.current = false;
    
    // Reset scroll loop flag
    scrollLoopRunningRef.current = false;
    
    // Reset text initialization state
    setTextInitialized(false);
    
    // Stop stored animation references
    if (currentScrollAnimationRef.current) {
      currentScrollAnimationRef.current.stop();
      currentScrollAnimationRef.current = null;
    }
    if (currentArtistScrollAnimationRef.current) {
      currentArtistScrollAnimationRef.current.stop();
      currentArtistScrollAnimationRef.current = null;
    }
    
    // Stop animations
    scrollX.stopAnimation();
    titleOpacity.stopAnimation();
    artistScrollX.stopAnimation();
    artistOpacity.stopAnimation();
    
    // Reset values
    scrollX.setValue(0);
    titleOpacity.setValue(0);
    artistScrollX.setValue(0);
    artistOpacity.setValue(0);
    
    console.log('Title and artist scroll stopped and cleaned up');
  }, [scrollX, titleOpacity, artistScrollX, artistOpacity]);

  useEffect(() => {
    const currentSongId = (currentSong || lastKnownSong)?.id || (currentSong || lastKnownSong)?.title;
    
    console.log('🔄 useEffect triggered:', {
      currentSongId,
      initialized: animationInitializedRef.current,
      needsInit: currentSongId && animationInitializedRef.current !== currentSongId
    });
    
    // Only initialize if we have a song and haven't initialized this song yet
    if (currentSongId && animationInitializedRef.current !== currentSongId) {
      console.log('🆕 New song detected, initializing animations for:', currentSongId);
      
      // Stop any existing animations first
      stopTitleScroll();
      
      // Start new scroll animation after a short delay
      const timer = setTimeout(() => {
        console.log('⏰ Timer fired, starting animations');
        startTitleScroll();
        startArtistScroll();
      }, 100);
      
      return () => {
        console.log('🧹 Cleaning up timer');
        clearTimeout(timer);
      };
    } else {
      console.log('⏭️ Skipping animation init - same song or no song');
    }
  }, [currentSong?.id, lastKnownSong?.id]);

  const toggleFullscreen = useCallback(async () => {
    try {
      const newFullscreenState = !isFullscreen;
      let currentVideoTime = 0;
      
      try {
        currentVideoTime = await playerRef.current?.getCurrentTime() || 0;
      } catch (error) {
        console.error('Error getting current time:', error);
      }
      
      if (newFullscreenState) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        setIsFullscreen(true);
        onFullscreenChange?.(true);
        controlsTimeout.current = setTimeout(() => {
          setControlsVisible(false);
        }, 3000);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsFullscreen(false);
        onFullscreenChange?.(false);
        setControlsVisible(true);
      }

      // Wait for orientation change to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (currentVideoTime > 0) {
        try {
          await playerRef.current?.seekTo(currentVideoTime);
        } catch (error) {
          console.error('Error seeking to time:', error);
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      setIsFullscreen(false);
      onFullscreenChange?.(false);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [isFullscreen, onFullscreenChange]);

  const toggleControls = useCallback(() => {
    setControlsVisible(!controlsVisible);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    if (!controlsVisible) {
      controlsTimeout.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [controlsVisible]);

  useEffect(() => {
    const lockPortrait = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (error) {
        console.error('Error locking orientation:', error);
      }
    };

    // Lock to portrait on mount
    lockPortrait();

    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      // Lock to portrait on unmount
      lockPortrait();
    };
  }, []);

  useEffect(() => {
    if (currentSong) {
      setPlaying(true);
      // Start title scroll animation after a delay
      setTimeout(() => {
        startTitleScroll();
      }, 2000);
    }
  }, [currentSong, startTitleScroll]);

  const onStateChange = useCallback((state) => {
    console.log('Player state changed:', state);
    if (state === "ended") {
      setProgress(0);
      
      // Handle repeat "one" mode - restart the same song
      if (repeatMode === 'one') {
        // Restart the same video by seeking to beginning
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          setPlaying(true);
        }
      } else {
        // Normal behavior - go to next song
        playNext();
        setPlaying(true);
      }
    } else if (state === "playing") {
      setPlaying(true);
    } else if (state === "paused") {
      setPlaying(false);
    } else if (state === "unstarted") {
      // When a new video is loaded, ensure it starts playing
      if (currentSong?.id) {
        setPlaying(true);
      }
    }
  }, [playNext, currentSong?.id, repeatMode]);

  const togglePlaying = useCallback(() => {
    setPlaying(prev => !prev);
  }, []);

  // Handle next button press with repeat mode logic
  const handleNextPress = useCallback(() => {
    if (repeatMode === 'one') {
      // Restart the current song by seeking to beginning
      if (playerRef.current) {
        playerRef.current.seekTo(0);
        setProgress(0);
        setCurrentTime(0);
      }
    } else {
      // Normal next behavior
      playNext();
    }
  }, [repeatMode, playNext]);

  // Handle previous button press with repeat mode logic
  const handlePreviousPress = useCallback(() => {
    if (repeatMode === 'one') {
      // Restart the current song by seeking to beginning
      if (playerRef.current) {
        playerRef.current.seekTo(0);
        setProgress(0);
        setCurrentTime(0);
      }
    } else {
      // Normal previous behavior
      playPrevious();
    }
  }, [repeatMode, playPrevious]);

  useEffect(() => {
    if (currentSong) {
      setProgress(0);
      // Force playing state to true and ensure it's applied after a brief delay
      setTimeout(() => {
        setPlaying(true);
      }, 100);
    }
  }, [currentSong?.id]);

  // Reset player state when video ID changes
  useEffect(() => {
    if (currentSong?.id) {
      setPlaying(true);
    }
  }, [currentSong?.id]);

  const handleSeek = useCallback(async (seekProgress) => {
    try {
      if (!playerRef.current) return;
      
      const duration = await playerRef.current.getDuration().catch(() => 0);
      if (duration > 0) {
        await playerRef.current.seekTo(seekProgress * duration);
        setProgress(seekProgress);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, []);

  const getCurrentTime = useCallback(async () => {
    try {
      if (!playerRef.current) return;
      
      const time = await playerRef.current.getCurrentTime().catch(() => 0);
      const totalDuration = await playerRef.current.getDuration().catch(() => 0);
      
      if (time !== null && totalDuration !== null) {
        // Check if there was a sudden jump forward (indicating 10s forward button press)
        const timeDiff = time - lastTimeRef.current;
        if (timeDiff >= 9 && timeDiff <= 11) { // Check for ~10 second jump
          playNext();
          return;
        }
        
        setCurrentTime(time);
        lastTimeRef.current = time;
        setDuration(totalDuration);
        setProgress(totalDuration > 0 ? time / totalDuration : 0);
      }
    } catch (error) {
      console.error('Error getting video progress:', error);
    }
  }, [playNext]);

  useEffect(() => {
    let interval;
    if (playing) {
      interval = setInterval(getCurrentTime, 1000);
    }
    return () => clearInterval(interval);
  }, [playing, getCurrentTime]);

    const onDragGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragY } }],
    { useNativeDriver: true }
  );

  const onDragHandlerStateChange = useCallback((event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      // Add subtle opacity change during drag
      const { translationY } = event.nativeEvent;
      const dragProgress = Math.min(translationY / 100, 1);
      const newOpacity = 1 - (dragProgress * 0.3); // Reduce opacity by up to 30%
      opacity.setValue(newOpacity);
    } else if (event.nativeEvent.state === State.END) {
      const { translationY } = event.nativeEvent;
      
      // If dragged down more than 100px, minimize
      if (translationY > 200) {
        // Set translateY to current drag position before resetting dragY
        translateY.setValue(translationY);
        dragY.setValue(0);
        
        // Slide down the expanded view
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease)
        }).start(() => {
          // After slide down, show minimized and slide it up
          translateY.setValue(SCREEN_HEIGHT);
          setMinimized(true);
          // Small delay to ensure minimized state is set before animation
          setTimeout(() => {
            Animated.timing(translateY, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease)
            }).start();
          }, 10);
        });
      } else {
        // Snap back to expanded position
        Animated.parallel([
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true
          })
        ]).start();
      }
    }
  }, [translateY, opacity, dragY]);

  const toggleMinimize = useCallback(async () => {
    if (isFullscreen) {
      await toggleFullscreen();
      return;
    }

    if (minimized) {
      // Start from bottom with opacity 0
      translateY.setValue(SCREEN_HEIGHT);
      opacity.setValue(0);
      setMinimized(false);
      
      // Animate up while fading in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        })
      ]).start();
          } else {
        setMinimized(true);
        opacity.setValue(1);
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease)
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease)
          })
        ]).start(() => {
          translateY.setValue(0);
          opacity.setValue(1);
        });
      }
  }, [minimized, translateY, opacity, isFullscreen, toggleFullscreen]);

  useEffect(() => {
    const subscriptions = [];

    // App state subscription
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        setPlaying(playing);
      }
    });


    return () => {
      appStateSubscription.remove();
      subscriptions.forEach(sub => sub.remove());
    };
  }, [playing, playNext]);

  const renderVideoPlayer = useCallback(() => (
    <YoutubePlayer
      ref={playerRef}
      height={isFullscreen ? screenDimensions.height : 300}
      width={screenDimensions.width}
      play={playing}
      videoId={currentSong?.id}
      onChangeState={onStateChange}
      initialPlayerParams={{
        controls: false,
        modestbranding: true,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        start: Math.floor(lastTimeRef.current),
        playsinline: 1,
        preventFullScreen: true
      }}
      onProgress={(event) => {
        const timeDiff = event.currentTime - lastTimeRef.current;
        if (timeDiff >= 9 && timeDiff <= 11) {
          playNext();
          return;
        }
        lastTimeRef.current = event.currentTime;
      }}
      webViewProps={{
        allowsInlineMediaPlayback: true,
        mediaPlaybackRequiresUserAction: false,
        bounces: false,
        scrollEnabled: false
      }}
    />
  ), [isFullscreen, screenDimensions, playing, currentSong?.id, onStateChange]);

  // Use current song if available, otherwise use last known song
  const displaySong = currentSong || lastKnownSong;
  
  // The PlayerBar should remain visible as long as there's a song (current or last known)
  // regardless of user authentication status
  if (!displaySong) {
    console.log('❌ PlayerBar: No current song or last known song, returning null');
    return null;
  }

  if (!currentSong && lastKnownSong) {
    console.log('⚠️ PlayerBar: Using last known song because currentSong is temporarily null:', {
      lastKnownSong: lastKnownSong?.title,
      hasUser: !!user
    });
  } else if (!currentSong && !lastKnownSong) {
    console.log('🚨 PlayerBar: Both currentSong and lastKnownSong are null - this should not happen during logout');
  }

  console.log('✅ PlayerBar: Rendering with song:', {
    songTitle: displaySong?.title,
    isCurrentSong: !!currentSong,
    hasUser: !!user,
    minimized: minimized,
    containerStyle: minimized ? 'minimized' : 'expanded'
  });



  const videoPlayer = renderVideoPlayer();

  if (isFullscreen) {
    return (
      <View style={styles.fullscreenContainer}>
        <View style={styles.videoWrapper}>
          {videoPlayer}
        </View>
        <TouchableOpacity 
          activeOpacity={1}
          onPress={toggleControls}
          style={StyleSheet.absoluteFill}
        >
          {controlsVisible && (
            <View style={styles.fullscreenControls}>
              <TouchableOpacity 
                onPress={toggleFullscreen}
                style={styles.exitFullscreenButton}
              >
                <Ionicons name="contract" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.fullscreenProgressContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <ProgressBar progress={progress} onSeek={handleSeek} isExpanded={true} />
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
              
              {/* Repeat icon for fullscreen */}
              <TouchableOpacity 
                onPress={toggleRepeat}
                style={styles.fullscreenRepeatButton}
              >
                <Ionicons 
                  name={repeatMode === 'one' ? "refresh" : "repeat"} 
                  size={32} 
                  color={repeatMode !== 'none' ? "#4CAF50" : "#fff"} 
                />
                <Text style={styles.heartText}>
                  {repeatMode === 'none' ? 'Repeat' : repeatMode === 'one' ? 'One' : 'All'}
                </Text>
              </TouchableOpacity>

              {/* Shuffle icon for fullscreen */}
              <TouchableOpacity 
                onPress={toggleShuffle}
                style={styles.fullscreenShuffleButton}
              >
                <Ionicons 
                  name="shuffle" 
                  size={32} 
                  color={isShuffled ? "#4CAF50" : "#fff"} 
                />
                <Text style={styles.heartText}>
                  {isShuffled ? "Shuffled" : "Shuffle"}
                </Text>
              </TouchableOpacity>

              {/* Heart icon for like/unlike in fullscreen */}
              {user && (
                <TouchableOpacity 
                  onPress={toggleLike}
                  disabled={isLikeLoading}
                  style={styles.fullscreenHeartButton}
                >
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={32} 
                    color={isLiked ? "#ff4444" : "#fff"} 
                  />
                  <Text style={styles.heartText}>
                    {isLiked ? "Liked" : "Like"}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.fullscreenButtons}>
                <TouchableOpacity 
                  onPress={handlePreviousPress}
                  disabled={repeatMode === 'one' ? false : !hasPrevious}
                  style={[styles.fullscreenButton, (repeatMode === 'one' ? false : !hasPrevious) && styles.buttonDisabled]}
                >
                  <Ionicons name="play-skip-back" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={togglePlaying} style={styles.fullscreenPlayButton}>
                  <Ionicons name={playing ? "pause" : "play"} size={40} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleNextPress}
                  disabled={repeatMode === 'one' ? false : !hasNext}
                  style={[styles.fullscreenButton, (repeatMode === 'one' ? false : !hasNext) && styles.buttonDisabled]}
                >
                  <Ionicons name="play-skip-forward" size={30} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        minimized ? styles.minimized : styles.expanded,
        { 
          transform: [{ translateY: Animated.add(translateY, dragY) }],
          opacity: minimized ? 1 : opacity
        }
      ]}
    >
      <Animated.View style={[styles.videoContainer, { 
        position: 'absolute',
        top: minimized ? -1000 : 160,
        left: 0,
        right: 0,
        height: 300,
        zIndex: minimized ? -1 : 1,
        opacity: minimized ? 0 : opacity,
      }]}>
        <View style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Video Player */}
          <View style={StyleSheet.absoluteFill}>
            {videoPlayer}
          </View>
          
          {/* Floating Action Buttons - Centered Layout */}
          <View style={styles.floatingButtonsContainer}>
            <TouchableOpacity 
              onPress={toggleRepeat}
              style={styles.floatingButton}
            >
              <Ionicons 
                name={repeatMode === 'one' ? "refresh" : "repeat"} 
                size={32} 
                color={repeatMode !== 'none' ? "#4CAF50" : "#fff"} 
              />
              <Text style={styles.floatingButtonText}>
                {repeatMode === 'none' ? 'Repeat' : repeatMode === 'one' ? 'One' : 'All'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={toggleShuffle}
              style={styles.floatingButton}
            >
              <Ionicons 
                name="shuffle" 
                size={32} 
                color={isShuffled ? "#4CAF50" : "#fff"} 
              />
              <Text style={styles.floatingButtonText}>
                {isShuffled ? "Shuffled" : "Shuffle"}
              </Text>
            </TouchableOpacity>

            {user && (
              <TouchableOpacity 
                onPress={toggleLike}
                disabled={isLikeLoading}
                style={styles.floatingButton}
              >
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={32} 
                  color={isLiked ? "#ff4444" : "#fff"} 
                />
                <Text style={styles.floatingButtonText}>
                  {isLiked ? "Liked" : "Like"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={toggleControls}
            style={StyleSheet.absoluteFill}
          >
            {!minimized && controlsVisible && (
              <TouchableOpacity 
                style={[styles.fullscreenButton, { position: 'absolute', right: 0, bottom: 20 }]}
                onPress={toggleFullscreen}
              >
                <Ionicons name="expand" size={24} color="white" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          
        </View>
      </Animated.View>
      {minimized && (
        <LinearGradient
          colors={[color, 'black']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}
      {!minimized && (
        <Animated.View style={[styles.expandedContainer, { opacity: opacity }]}>
          <PanGestureHandler
            onGestureEvent={onDragGestureEvent}
            onHandlerStateChange={onDragHandlerStateChange}
          >
            <Animated.View style={styles.dragIndicatorContainer}>
              <View style={styles.dragLine} />
            </Animated.View>
          </PanGestureHandler>
  
          <View style={styles.expandedInfo}>
            
            
            <View style={styles.titleContainer}>
              {textInitialized && (
                <Animated.Text 
                  style={[
                    styles.expandedTitle,
                    { 
                      transform: [{ translateX: scrollX }],
                      position: 'absolute',
                      left: 0,
                      opacity: titleOpacity,
                    }
                  ]}
                >
                  {displaySong?.title || 'No song playing'}
                </Animated.Text>
              )}
            </View>
            <View style={styles.artistContainer}>
              {textInitialized && (
                <Animated.Text 
                  style={[
                    styles.expandedArtist,
                    { 
                      transform: [{ translateX: artistScrollX }],
                      position: 'absolute',
                      left: 0,
                      opacity: artistOpacity,
                    }
                  ]}
                >
                  {displaySong?.artist || 'No artist'}
                </Animated.Text>
              )}
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
            <ProgressBar progress={progress} onSeek={handleSeek} isExpanded={true} />
          </View>

          <View style={styles.expandedControls}>
            <TouchableOpacity 
              onPress={handlePreviousPress} 
              style={[styles.expandedButton, (repeatMode === 'one' ? false : !hasPrevious) && styles.buttonDisabled]}
              disabled={repeatMode === 'one' ? false : !hasPrevious}
            >
              <Ionicons name="play-skip-back" size={35} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlaying} style={styles.expandedPlayButton}>
              <Ionicons 
                name={playing ? "pause" : "play"} 
                size={50} 
                color="white" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleNextPress} 
              style={[styles.expandedButton, (repeatMode === 'one' ? false : !hasNext) && styles.buttonDisabled]}
              disabled={repeatMode === 'one' ? false : !hasNext}
            >
              <Ionicons name="play-skip-forward" size={35} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {minimized && (
        <View style={styles.minimizedContent}>
          <TouchableOpacity 
            style={styles.songInfoContainer} 
            onPress={toggleMinimize}
          >
            <View style={styles.miniPlayerContainer}>
              <Image 
                source={{ 
                  uri: displaySong?.thumbnail 
                    ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(displaySong.thumbnail)}`
                    : 'https://www.beatinbox.com/defaultcover.png'
                }} 
                style={styles.miniThumbnail}
              />
            </View>

            <View style={styles.songInfo}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {displaySong?.title || 'No song playing'}
            </Text>
            <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
              {displaySong?.artist || 'No artist'}
            </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.buttons}>
            <TouchableOpacity 
              onPress={handlePreviousPress} 
              style={[styles.button, (repeatMode === 'one' ? false : !hasPrevious) && styles.buttonDisabled]}
              disabled={repeatMode === 'one' ? false : !hasPrevious}
            >
              <Ionicons name="play-skip-back" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlaying} style={styles.button}>
              <Ionicons 
                name={playing ? "pause" : "play"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleNextPress} 
              style={[styles.button, (repeatMode === 'one' ? false : !hasNext) && styles.buttonDisabled]}
              disabled={repeatMode === 'one' ? false : !hasNext}
            >
              <Ionicons name="play-skip-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.minimizedProgress}>
            <ProgressBar progress={progress} onSeek={handleSeek} isExpanded={false} />
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
    elevation: 1000,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  minimized: {
    height: 80,
    bottom: 75,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    zIndex: 2,
  },
  expanded: {
    height: SCREEN_HEIGHT,
    bottom: 0,
    backgroundColor: 'black',
  },
  expandedContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  dragIndicatorContainer: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingBottom: 20,
    // Add visual feedback for dragging
  
  },
  dragLine: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
    marginBottom: 10,
  },
  videoContainer: {
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  fullscreenButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 100,
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 0,
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  fullscreenControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: 20,
    zIndex: 998,
  },
  exitFullscreenButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    zIndex: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  fullscreenProgressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 10,
  },
  fullscreenButtons: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenButton: {
    marginHorizontal: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPlayButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  expandedInfo: {
    marginTop: 360,
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    overflow: 'hidden',
  },
  titleContainer: {
    overflow: 'hidden',
    height: 32,
    backgroundColor: 'transparent',
    position: 'relative',
    width: '100%',
  },
  expandedTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'left',
    marginBottom: 8,
    flexShrink: 0,
    minWidth: '200%',
  },
  expandedArtist: {
    fontSize: 18,
    color: '#999',
    textAlign: 'left',
    marginBottom: 8,
    flexShrink: 0,
    minWidth: '200%',
  },
  artistContainer: {
    overflow: 'hidden',
    height: 24, // Adjust height for artist text
    backgroundColor: 'transparent',
    position: 'relative',
    width: '100%',
  },
  progressContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 15,
  },
  timeText: {
    color: '#999',
    fontSize: 12,
  },
  expandedControls: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedButton: {
    marginHorizontal: 30,
  },
  expandedPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  minimizedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  miniPlayerContainer: {
    width: 50,
    height: 50,
    marginRight: 15,
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniThumbnail: {
    width: 50,
    height: 50,
  },
  songInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: '#999',
    fontSize: 12,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 20,
    marginRight: 0,
  },
  button: {
    marginHorizontal: 5,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  minimizedProgress: {
    position: 'absolute',
    bottom: 62,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  floatingButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    marginHorizontal: 15,
    alignItems: 'center',
    minWidth: 60,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  fullscreenRepeatButton: {
    position: 'absolute',
    right: 200, // Position to the left of the shuffle button
    top: 20,
    padding: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  fullscreenShuffleButton: {
    position: 'absolute',
    right: 140, // Position to the left of the heart button
    top: 20,
    padding: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  fullscreenHeartButton: {
    position: 'absolute',
    right: 80, // Position to the left of the exit button
    top: 20,
    padding: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  heartText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default PlayerBar;
