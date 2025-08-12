import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions, LayoutAnimation, Platform, UIManager, Easing, AppState } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressBar from './ProgressBar';
import * as ScreenOrientation from 'expo-screen-orientation';

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
  const opacity = useRef(new Animated.Value(1)).current;
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const lastTimeRef = useRef(0);
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
    }
  }, [currentSong]);

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

  const toggleMinimize = useCallback(async () => {
    if (isFullscreen) {
      await toggleFullscreen();
      return;
    }

    if (minimized) {
      translateY.setValue(SCREEN_HEIGHT);
      opacity.setValue(1);
      setMinimized(false);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }).start();
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
          transform: [{ translateY }],
          opacity: minimized ? 1 : opacity
        }
      ]}
    >
      <View style={[styles.videoContainer, { 
        position: 'absolute',
        top: minimized ? -1000 : 160,
        left: 0,
        right: 0,
        height: 300,
        zIndex: minimized ? -1 : 1,
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
      </View>
      {minimized && (
        <LinearGradient
          colors={[color, 'black']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}
      {!minimized && (
        <View style={styles.expandedContainer}>
          <TouchableOpacity 
            style={styles.dragIndicatorContainer}
            onPress={toggleMinimize}
          >
            <Ionicons name="chevron-down" size={24} color="white" style={styles.chevronIcon} />
          </TouchableOpacity>

          <View style={styles.expandedInfo}>
            <Text style={styles.expandedTitle}>{currentSong?.title || 'No song playing'}</Text>
            <Text style={styles.expandedArtist}>{currentSong?.artist || ''}</Text>
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
        </View>
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
              {currentSong?.artist || ''}
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
  },
  chevronIcon: {
    opacity: 0.8,
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
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  expandedTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  expandedArtist: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginBottom: 0,
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
