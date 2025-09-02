import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions, LayoutAnimation, Platform, UIManager, Easing, AppState } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressBar from './ProgressBar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PlayerBar = ({ color = '#1a1a1a', onFullscreenChange }) => {
  const { currentSong, playNext, playPrevious, hasNext, hasPrevious } = usePlayer();
  const [playing, setPlaying] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimeout = useRef(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const artistScrollX = useRef(new Animated.Value(0)).current;
  const artistOpacity = useRef(new Animated.Value(1)).current;
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const lastTimeRef = useRef(0);
  const scrollActiveRef = useRef(false);
  const artistScrollActiveRef = useRef(false);
  const scrollTimerRef = useRef(null);
  const artistScrollTimerRef = useRef(null);
  const scrollLoopTimerRef = useRef(null);
  const artistScrollLoopTimerRef = useRef(null);
  const currentScrollAnimationRef = useRef(null);
  const currentOpacityAnimationRef = useRef(null);
  const currentArtistScrollAnimationRef = useRef(null);
  const currentArtistOpacityAnimationRef = useRef(null);
  const isLoopRunningRef = useRef(false);
  const isArtistLoopRunningRef = useRef(false);
  const isFirstScrollRef = useRef(true);
  const isFirstArtistScrollRef = useRef(true);
  const lastSongTitleRef = useRef('');
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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startTitleScroll = useCallback(() => {
    if (!currentSong?.title || currentSong.title.length < 30) {
      console.log('Title too short, no scroll needed. Length:', currentSong?.title?.length || 0);
      return;
    }
    
    // Check if this is the same song title (prevent multiple calls)
    if (lastSongTitleRef.current === currentSong.title) {
      console.log('Same song title, skipping startTitleScroll');
      return;
    }
    
    console.log('Starting title scroll for:', currentSong.title);
    console.log('Title length:', currentSong.title.length);
    
    // Set scroll as active and reset first scroll flag for new songs
    scrollActiveRef.current = true;
    lastSongTitleRef.current = currentSong.title; // Store current song title
    
    // Don't reset isFirstScrollRef here - let the first loop complete first
    
    // Calculate scroll distance to show the complete title
    const estimatedCharWidth = 14; // Approximate pixels per character
    const containerWidth = 300; // Approximate container width
    const textWidth = currentSong.title.length * estimatedCharWidth;
    
    // Start text just outside left edge, scroll to show complete title
    const startPosition = 0; // Start from left edge (just outside)
    const scrollDistance = textWidth; // Scroll the full width of the text
    
    console.log('Text width:', textWidth, 'Container width:', containerWidth, 'Start position:', startPosition, 'Scroll distance:', scrollDistance);
    
    // Reset to start position (left edge)
    scrollX.setValue(startPosition);
    
    // Create smooth continuous loop animation with fade effects
    const createScrollLoop = () => {
      // Check if scrolling should still be active
      if (!scrollActiveRef.current) {
        console.log('Scrolling stopped, not creating loop');
        return;
      }
      
      // Prevent multiple loops from running simultaneously
      if (isLoopRunningRef.current) {
        console.log('Loop already running, skipping');
        return;
      }
      
      isLoopRunningRef.current = true;
      console.log('Starting new scroll loop');
      
      // Stop any existing animations and reset both scroll and opacity
      if (currentScrollAnimationRef.current) {
        currentScrollAnimationRef.current.stop();
        currentScrollAnimationRef.current = null;
      }
      if (currentOpacityAnimationRef.current) {
        currentOpacityAnimationRef.current.stop();
        currentOpacityAnimationRef.current = null;
      }
      
      scrollX.stopAnimation();
      titleOpacity.stopAnimation();
      scrollX.setValue(startPosition);
      
      // Only fade in on the second loop (after first scroll completes)
      if (isFirstScrollRef.current) {
        titleOpacity.setValue(1); // Start with opacity 1 (visible) for first scroll
        console.log('First scroll: Start with opacity 1 (no fade-in)');
        startScrollAnimation();
      } else {
        // This is the second loop (after first scroll completed)
        titleOpacity.setValue(0); // Start with opacity 0 for fade-in effect
        console.log('Second loop: Reset opacity to 0 for fade-in effect');
        
        // Create fade-in animation
        const fadeInAnimation = Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        });
        
        currentOpacityAnimationRef.current = fadeInAnimation;
        
        fadeInAnimation.start(() => {
          console.log('Fade in completed, starting scroll delay');
          startScrollAnimation();
        });
      }
      
      function startScrollAnimation() {
        // Wait a moment before starting to scroll so user can read the beginning
        setTimeout(() => {
          if (!scrollActiveRef.current) return;
          
          console.log('Starting scroll animation');
          // Start scrolling - scroll from left to show complete title
          const scrollAnimation = Animated.timing(scrollX, {
            toValue: -scrollDistance,
            duration: 12000, // Increased from 8000ms to 12000ms (slower)
            useNativeDriver: true,
            easing: Easing.linear
          });
          
          currentScrollAnimationRef.current = scrollAnimation;
          
          scrollAnimation.start(() => {
            console.log('Scroll animation completed');
            // Check again before fade out
            if (!scrollActiveRef.current) return;
            
            // Wait for scroll to complete, then show end text, then fade out
            scrollLoopTimerRef.current = setTimeout(() => {
              if (!scrollActiveRef.current) return;
              
              console.log('Starting fade out animation');
              const fadeOutAnimation = Animated.timing(titleOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
                easing: Easing.in(Easing.ease)
              });
              
              currentOpacityAnimationRef.current = fadeOutAnimation;
              
              fadeOutAnimation.start(() => {
                console.log('Fade out completed, looping back');
                // Check again before looping
                if (!scrollActiveRef.current) return;
                
                // Mark that this is no longer the first scroll
                isFirstScrollRef.current = false;
                
                // Reset the loop running flag
                isLoopRunningRef.current = false;
                
                // Loop back to createScrollLoop (don't reset scrollX here)
                scrollLoopTimerRef.current = setTimeout(() => {
                  // If this was the first scroll, add a fade-in effect when restarting
                  if (isFirstScrollRef.current) {
                    console.log('First scroll completed, restarting with fade-in effect');
                    // Reset opacity to 0 so it can fade in on restart
                    titleOpacity.setValue(0);
                    // Small delay to ensure fade-in is visible
                    setTimeout(() => {
                      createScrollLoop();
                    }, 100);
                  } else {
                    createScrollLoop();
                  }
                }, 0);
              });
            }, 0);
          });
        }, 5000);
      }
    };
    
    // Start the loop
    scrollTimerRef.current = setTimeout(createScrollLoop, 2000);
  }, [currentSong?.title, scrollX, titleOpacity]);

  const startArtistScroll = useCallback(() => {
    if (!currentSong?.artist || currentSong.artist.length < 25) {
      console.log('Artist too short, no scroll needed. Length:', currentSong?.artist?.length || 0);
      return;
    }
    
    console.log('Starting artist scroll for:', currentSong.artist);
    console.log('Artist length:', currentSong.artist.length);
    
    // Set artist scroll as active
    artistScrollActiveRef.current = true;
    
    // Calculate scroll distance to show the complete artist name
    const estimatedCharWidth = 12; // Slightly smaller for artist text
    const containerWidth = 300; // Same container width
    const textWidth = currentSong.artist.length * estimatedCharWidth;
    
    // Start text just outside left edge, scroll to show complete artist name
    const startPosition = 0; // Start from left edge
    const scrollDistance = textWidth; // Scroll the full width of the text
    
    console.log('Artist text width:', textWidth, 'Container width:', containerWidth, 'Start position:', startPosition, 'Scroll distance:', scrollDistance);
    
    // Reset to start position (left edge)
    artistScrollX.setValue(startPosition);
    
    // Create smooth continuous loop animation with fade effects
    const createArtistScrollLoop = () => {
      // Check if scrolling should still be active
      if (!artistScrollActiveRef.current) {
        console.log('Artist scrolling stopped, not creating loop');
        return;
      }
      
      // Prevent multiple loops from running simultaneously
      if (isArtistLoopRunningRef.current) {
        console.log('Artist loop already running, skipping');
        return;
      }
      
      isArtistLoopRunningRef.current = true;
      console.log('Starting new artist scroll loop');
      
      // Stop any existing animations and reset both scroll and opacity
      if (currentArtistScrollAnimationRef.current) {
        currentArtistScrollAnimationRef.current.stop();
        currentArtistScrollAnimationRef.current = null;
      }
      if (currentArtistOpacityAnimationRef.current) {
        currentArtistOpacityAnimationRef.current.stop();
        currentArtistOpacityAnimationRef.current = null;
      }
      
      artistScrollX.stopAnimation();
      artistOpacity.stopAnimation();
      artistScrollX.setValue(startPosition);
      
      // Only fade in on the second loop (after first scroll completes)
      if (isFirstArtistScrollRef.current) {
        artistOpacity.setValue(1); // Start with opacity 1 (visible) for first scroll
        console.log('First artist scroll: Start with opacity 1 (no fade-in)');
        startArtistScrollAnimation();
      } else {
        // This is the second loop (after first scroll completed)
        artistOpacity.setValue(0); // Start with opacity 0 for fade-in effect
        console.log('Second artist loop: Reset opacity to 0 for fade-in effect');
        
        // Create fade-in animation
        const fadeInAnimation = Animated.timing(artistOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        });
        
        currentArtistOpacityAnimationRef.current = fadeInAnimation;
        
        fadeInAnimation.start(() => {
          console.log('Artist fade in completed, starting scroll delay');
          startArtistScrollAnimation();
        });
      }
      
      function startArtistScrollAnimation() {
        // Wait a moment before starting to scroll so user can read the beginning
        setTimeout(() => {
          if (!artistScrollActiveRef.current) return;
          
          console.log('Starting artist scroll animation');
          // Start scrolling - scroll from left to show complete artist name
          const scrollAnimation = Animated.timing(artistScrollX, {
            toValue: -scrollDistance,
            duration: 15000, // Increased from 10000ms to 15000ms (slower)
            useNativeDriver: true,
            easing: Easing.linear
          });
          
          currentArtistScrollAnimationRef.current = scrollAnimation;
          
          scrollAnimation.start(() => {
            console.log('Artist scroll animation completed');
            // Check again before fade out
            if (!artistScrollActiveRef.current) return;
            
            // Wait for scroll to complete, then show end text, then fade out
            artistScrollLoopTimerRef.current = setTimeout(() => {
              if (!artistScrollActiveRef.current) return;
              
              console.log('Starting artist fade out animation');
              const fadeOutAnimation = Animated.timing(artistOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
                easing: Easing.in(Easing.ease)
              });
              
              currentArtistOpacityAnimationRef.current = fadeOutAnimation;
              
              fadeOutAnimation.start(() => {
                console.log('Artist fade out completed, looping back');
                // Check again before looping
                if (!artistScrollActiveRef.current) return;
                
                // Mark that this is no longer the first artist scroll
                isFirstArtistScrollRef.current = false;
                
                // Reset the loop running flag
                isArtistLoopRunningRef.current = false;
                
                // Loop back to createArtistScrollLoop
                artistScrollLoopTimerRef.current = setTimeout(createArtistScrollLoop, 0);
              });
            }, 0);
          });
        }, 5000); // Wait 3 seconds before starting to scroll
      }
    };
    
    // Start the artist scroll loop
    artistScrollTimerRef.current = setTimeout(createArtistScrollLoop, 500);
  }, [currentSong?.artist, artistScrollX, artistOpacity]);

  // Add cleanup function to stop animations
  const stopTitleScroll = useCallback(() => {
    // Set scroll as inactive
    scrollActiveRef.current = false;
    artistScrollActiveRef.current = false;
    
    // Reset loop running flag
    isLoopRunningRef.current = false;
    isArtistLoopRunningRef.current = false;
    
    // Reset last song title to allow new songs to start
    lastSongTitleRef.current = '';
    
    // Reset artist scroll flags
    isFirstArtistScrollRef.current = true;
    
    // Stop stored animation references
    if (currentScrollAnimationRef.current) {
      currentScrollAnimationRef.current.stop();
      currentScrollAnimationRef.current = null;
    }
    if (currentOpacityAnimationRef.current) {
      currentOpacityAnimationRef.current.stop();
      currentOpacityAnimationRef.current = null;
    }
    if (currentArtistScrollAnimationRef.current) {
      currentArtistScrollAnimationRef.current.stop();
      currentArtistScrollAnimationRef.current = null;
    }
    if (currentArtistOpacityAnimationRef.current) {
      currentArtistOpacityAnimationRef.current.stop();
      currentArtistOpacityAnimationRef.current = null;
    }
    
    // Stop animations
    scrollX.stopAnimation();
    titleOpacity.stopAnimation();
    artistScrollX.stopAnimation();
    artistOpacity.stopAnimation();
    
    // Reset values
    scrollX.setValue(0);
    titleOpacity.setValue(1);
    artistScrollX.setValue(0);
    artistOpacity.setValue(1);
    
    // Clear all timers
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    
    if (artistScrollTimerRef.current) {
      clearTimeout(artistScrollTimerRef.current);
      artistScrollTimerRef.current = null;
    }
    
    if (scrollLoopTimerRef.current) {
      clearTimeout(scrollLoopTimerRef.current);
      scrollLoopTimerRef.current = null;
    }
    
    if (artistScrollLoopTimerRef.current) {
      clearTimeout(artistScrollLoopTimerRef.current);
      artistScrollLoopTimerRef.current = null;
    }
    
    console.log('Title and artist scroll stopped and cleaned up');
  }, [scrollX, titleOpacity, artistScrollX, artistOpacity]);

  useEffect(() => {
    // Stop any existing animations first
    stopTitleScroll();
    
    // Start new scroll animation after a short delay
    const timer = setTimeout(() => {
      startTitleScroll();
      startArtistScroll(); // Also start artist scrolling
    }, 500);
    
    // Cleanup function to stop animations when component unmounts or song changes
    return () => {
      clearTimeout(timer);
      stopTitleScroll();
    };
  }, [currentSong?.title, startTitleScroll, startArtistScroll, stopTitleScroll]);

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
      playNext();
      setPlaying(true);
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
  }, [playNext, currentSong?.id]);

  const togglePlaying = useCallback(() => {
    setPlaying(prev => !prev);
  }, []);

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

  if (!currentSong) return null;

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
              <View style={styles.fullscreenButtons}>
                <TouchableOpacity 
                  onPress={playPrevious}
                  disabled={!hasPrevious}
                  style={[styles.fullscreenButton, !hasPrevious && styles.buttonDisabled]}
                >
                  <Ionicons name="play-skip-back" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={togglePlaying} style={styles.fullscreenPlayButton}>
                  <Ionicons name={playing ? "pause" : "play"} size={40} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={playNext}
                  disabled={!hasNext}
                  style={[styles.fullscreenButton, !hasNext && styles.buttonDisabled]}
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
          <View style={StyleSheet.absoluteFill}>
            {videoPlayer}
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
                {currentSong?.title || 'No song playing'}
              </Animated.Text>
            </View>
            <View style={styles.artistContainer}>
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
                {currentSong?.artist || 'No artist'}
              </Animated.Text>
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
              onPress={playPrevious} 
              style={[styles.expandedButton, !hasPrevious && styles.buttonDisabled]}
              disabled={!hasPrevious}
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
              onPress={playNext} 
              style={[styles.expandedButton, !hasNext && styles.buttonDisabled]}
              disabled={!hasNext}
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
                  uri: currentSong?.thumbnail 
                    ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(currentSong.thumbnail)}`
                    : 'https://www.beatinbox.com/defaultcover.png'
                }} 
                style={styles.miniThumbnail}
              />
            </View>

            <View style={styles.songInfo}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {currentSong?.title || 'No song playing'}
            </Text>
            <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
              {currentSong?.artist || 'No artist'}
            </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.buttons}>
            <TouchableOpacity 
              onPress={playPrevious} 
              style={[styles.button, !hasPrevious && styles.buttonDisabled]}
              disabled={!hasPrevious}
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
              onPress={playNext} 
              style={[styles.button, !hasNext && styles.buttonDisabled]}
              disabled={!hasNext}
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
    zIndex: 0,
    elevation: 0,
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
});

export default PlayerBar;
