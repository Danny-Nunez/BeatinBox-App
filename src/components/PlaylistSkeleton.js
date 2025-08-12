import React from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const THUMBNAIL_SIZE = 60;

const PlaylistSkeleton = () => {
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {[...Array(8)].map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardContent}>
            <Animated.View style={[styles.thumbnail, { opacity }]} />
            <View style={styles.textContainer}>
              <Animated.View style={[styles.titleSkeleton, { opacity }]} />
              <Animated.View style={[styles.subtitleSkeleton, { opacity }]} />
            </View>
            <Animated.View style={[styles.chevronSkeleton, { opacity }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    paddingRight: 16,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
    marginRight: 15,
  },
  titleSkeleton: {
    height: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  subtitleSkeleton: {
    height: 14,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    width: '40%',
  },
  chevronSkeleton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
});

export default PlaylistSkeleton;
