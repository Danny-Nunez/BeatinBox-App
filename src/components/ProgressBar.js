import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, PanResponder, Dimensions, Animated } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ProgressBar = ({ progress = 0, onSeek, isExpanded = false }) => {
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 30);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);
  const progressBarRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(progress * (SCREEN_WIDTH - 30))).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Get actual container width on mount and when expanded state changes
    if (progressBarRef.current) {
      progressBarRef.current.measure((x, y, width) => {
        const actualWidth = width - 30; // Account for padding
        setContainerWidth(actualWidth);
        // Update animation value with new width
        if (!isDragging) {
          translateXAnim.setValue(progress * actualWidth);
        }
      });
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isDragging) {
      Animated.spring(translateXAnim, {
        toValue: progress * containerWidth,
        useNativeDriver: true,
        tension: 40,
        friction: 7
      }).start();
    }
  }, [progress, isDragging, containerWidth]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => true,
    onPanResponderGrant: (evt) => {
      evt.stopPropagation();
      setIsDragging(true);
      const currentProgress = isDragging ? dragProgress : progress;
      setDragProgress(currentProgress);
      translateXAnim.setValue(currentProgress * containerWidth);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          useNativeDriver: true,
          tension: 40,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        })
      ]).start();
    },
    onPanResponderMove: (evt, gestureState) => {
      evt.stopPropagation();
      if (isExpanded) {
        // For expanded view, use pageX relative to the container
        progressBarRef.current.measure((x, y, width, height, pageXOffset) => {
          const relativeX = Math.max(0, Math.min(containerWidth, evt.nativeEvent.pageX - pageXOffset));
          const newProgress = relativeX / containerWidth;
          setDragProgress(newProgress);
          translateXAnim.setValue(newProgress * containerWidth);
        });
      } else {
        // For collapsed view, use locationX directly
        const { locationX } = evt.nativeEvent;
        const newProgress = Math.max(0, Math.min(1, locationX / containerWidth));
        setDragProgress(newProgress);
        translateXAnim.setValue(newProgress * containerWidth);
      }
    },
    onPanResponderRelease: (evt) => {
      evt.stopPropagation();
      setIsDragging(false);
      onSeek(dragProgress);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 40,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        })
      ]).start();
    },
  });

  const progressStyle = {
    transform: [
      {
        scaleX: translateXAnim.interpolate({
          inputRange: [0, containerWidth],
          outputRange: [0, 1]
        })
      }
    ]
  };

  const dotStyle = {
    transform: [
      {
        translateX: translateXAnim
      },
      {
        scale: scaleAnim
      }
    ],
    opacity: opacityAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1]
    })
  };

  return (
    <View 
      ref={progressBarRef}
      style={styles.container} 
      {...panResponder.panHandlers}
      hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
    >
      <View style={styles.background}>
        <Animated.View 
          style={[
            styles.progress,
            progressStyle
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot,
            dotStyle
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
  },
  background: {
    height: 3,
    backgroundColor: '#333333',
    borderRadius: 1.5,
  },
  progress: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 1.5,
    transform: [{ scaleX: 0 }],
    transformOrigin: 'left',
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    top: -4.5,
    marginLeft: -6,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ProgressBar;
