import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as api from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const [playlistCount, setPlaylistCount] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  // Update current user when user prop changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

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

  const handleImagePicker = async () => {
    try {
      console.log('=== Starting image picker ===');
      console.log('Requesting permissions...');
      
      // Request permission with additional logging
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission result:', JSON.stringify(permissionResult));
      
      if (!permissionResult.granted) {
        console.log('Permission denied');
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      console.log('Permission granted, opening image library...');
      
      // Pick image with proper options (using deprecated but working API)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Using deprecated but working API
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker completed');
      console.log('Image picker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Image selected successfully');
        await uploadProfileImage(result.assets[0]);
      } else {
        console.log('Image selection cancelled or failed');
        Alert.alert('Info', 'Image selection cancelled');
      }
    } catch (error) {
      console.error('=== Error in handleImagePicker ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
    }
  };

  const uploadProfileImage = async (imageAsset) => {
    setUploadingImage(true);
    
    try {
      console.log('Uploading image:', imageAsset);
      
      // Get session token for authentication
      const sessionToken = await AsyncStorage.getItem('@auth_session_token');
      if (!sessionToken) {
        throw new Error('User not authenticated');
      }

      // Convert image to base64 for upload
      console.log('Converting image to base64...');
      const imageResponse = await fetch(imageAsset.uri);
      const blob = await imageResponse.blob();
      
      // Convert blob to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log('Base64 conversion completed, length:', base64Data.length);

      // Prepare the request body with base64 data
      const requestBody = {
        assets: [{
          uri: `data:${imageAsset.mimeType || 'image/jpeg'};base64,${base64Data}`,
          type: 'image',
          fileName: imageAsset.fileName || 'profile-image.jpg',
          mimeType: imageAsset.mimeType || 'image/jpeg',
          width: imageAsset.width,
          height: imageAsset.height,
          fileSize: imageAsset.fileSize,
          base64: base64Data
        }]
      };

      const response = await fetch('https://expo-backend-bi5x.onrender.com/mobile/uploads/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload response:', result);
      
      if (result.success) {
        // Update local user state with new image URL
        const updatedUser = { ...user, image: result.data.url };
        setCurrentUser(updatedUser);
        
        // Try to update auth context if available
        if (updateUser) {
          try {
            await updateUser(updatedUser);
          } catch (authError) {
            console.log('Auth update failed, but local state updated:', authError);
          }
        }
        
        Alert.alert('Success', 'Profile image updated successfully!');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to upload image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

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
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={handleImagePicker}
              disabled={uploadingImage}
            >
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']} // Blue to purple gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileImageGradient}
              />
              <Image
                source={{ 
                  uri: currentUser?.image || 'https://www.beatinbox.com/default-user.png'
                }}
                style={styles.profileImage}
              />
              
              {/* Camera Icon Overlay */}
              <View style={styles.cameraIconContainer}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={20} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{currentUser?.name}</Text>
            <Text style={styles.email}>{currentUser?.email}</Text>
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
  profileImageContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageGradient: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    zIndex: 1,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
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
