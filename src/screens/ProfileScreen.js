import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [playlistCount, setPlaylistCount] = useState(0);

  // Load playlist count from AsyncStorage
  useEffect(() => {
    const loadStoredCount = async () => {
      try {
        const storedCount = await AsyncStorage.getItem('@playlist_count');
        if (storedCount !== null) {
          setPlaylistCount(parseInt(storedCount, 10));
        }
      } catch (error) {
        console.error('Error loading stored playlist count:', error);
      }
    };
    loadStoredCount();
  }, []);

  // Fetch and update playlist count
  useEffect(() => {
    const updatePlaylists = async () => {
      try {
        const playlists = await api.getPlaylists();
        if (playlists) {
          const count = playlists.length;
          setPlaylistCount(count);
          // Store the new count
          await AsyncStorage.setItem('@playlist_count', count.toString());
        }
      } catch (error) {
        console.error('Error updating playlists:', error);
      }
    };
    updatePlaylists();
  }, []);

  const handleLogout = async () => {
    try {
      // Clear stored playlist count
      await AsyncStorage.removeItem('@playlist_count');
      await logout();
      navigation.goBack();
    } catch (error) {
      console.error('Error during logout:', error);
      // Still attempt to logout even if clearing storage fails
      await logout();
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#000', '#1a1a1a']}
        style={StyleSheet.absoluteFill}
      >
        <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={{ 
                uri: user?.image || 'https://www.beatinbox.com/default-user.png'
              }}
              style={styles.profileImage}
            />
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{playlistCount}</Text>
              <Text style={styles.statLabel}>Playlists</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ff4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1DB954',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  logoutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default ProfileScreen;
