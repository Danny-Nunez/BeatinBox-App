import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CommonActions } from '@react-navigation/native';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const [playlistCount, setPlaylistCount] = useState(0);
  const [favoriteArtists, setFavoriteArtists] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Auto-dismiss Profile screen if user is not logged in
  useEffect(() => {
    if (!user) {
      console.log('🚪 ProfileScreen: User not logged in, dismissing screen');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          })
        );
      }
    }
  }, [user, navigation]);
  const [currentUser, setCurrentUser] = useState(user);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // Update current user when user prop changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);



  // Set navigation header right button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={styles.headerMenuButton} onPress={toggleMenu}>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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

  // Fetch favorite artists
  useEffect(() => {
    const fetchFavoriteArtists = async () => {
      try {
        const response = await api.getFavoriteArtists();
        
        // Handle both old and new API response formats
        let artistsData = null;
        if (response && response.content) {
          // New format: response.content array
          artistsData = response.content;
        } else if (Array.isArray(response)) {
          // Old format: direct array
          artistsData = response;
        }
        
        if (artistsData) {
          setFavoriteArtists(artistsData);
        } else {
          setFavoriteArtists([]);
        }
      } catch (error) {
        console.error('Error fetching favorite artists:', error);
        // For now, we'll show an empty state
        setFavoriteArtists([]);
      }
    };
    fetchFavoriteArtists();
  }, []);

  // Monitor favorite artists state changes


  // Refresh favorite artists when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const refreshFavoriteArtists = async () => {
        try {
          const response = await api.getFavoriteArtists();
          
          // Handle both old and new API response formats
          let artistsData = null;
          if (response && response.content) {
            // New format: response.content array
            artistsData = response.content;
          } else if (Array.isArray(response)) {
            // Old format: direct array
            artistsData = response;
          }
          
          if (artistsData) {
            setFavoriteArtists(artistsData);
          } else {
            setFavoriteArtists([]);
          }
        } catch (error) {
          console.error('Error refreshing favorite artists:', error);
        }
      };
      refreshFavoriteArtists();
    });

    return unsubscribe;
  }, [navigation]);



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


      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
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

  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
  };

  const handlePrivacyPolicy = () => {
    setIsMenuVisible(false);
    // TODO: Navigate to privacy policy screen
    Alert.alert('Privacy Policy', 'Privacy Policy screen coming soon!');
  };

  const handleTermsConditions = () => {
    setIsMenuVisible(false);
    // TODO: Navigate to terms & conditions screen
    Alert.alert('Terms & Conditions', 'Terms & Conditions screen coming soon!');
  };

  const handleRemoveArtist = async (artist) => {
    try {
      Alert.alert(
        'Remove Artist',
        `Are you sure you want to remove ${artist.name} from your favorites?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                // Call the backend API to remove the artist
                await api.removeFavoriteArtist(artist.browseId);
                
                // Update local state after successful API call
                const updatedArtists = favoriteArtists.filter(a => a.browseId !== artist.browseId);
                setFavoriteArtists(updatedArtists);
                
                Alert.alert('Success', `${artist.name} has been removed from your favorites.`);
              } catch (removeError) {
                console.error('Error removing artist:', removeError);
                Alert.alert('Error', 'Failed to remove artist from favorites. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleRemoveArtist:', error);
      Alert.alert('Error', 'Failed to remove artist from favorites. Please try again.');
    }
  };

  const handleLogoutFromMenu = async () => {
    setIsMenuVisible(false);
    try {
      await logout();
      // Properly dismiss the Profile screen and reset navigation stack
      setTimeout(() => {
        // First try to go back (dismiss modal)
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          // Fallback: reset navigation stack to MainTabs
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            })
          );
        }
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
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
            </View>
            
            {/* Profile Title Row */}
            <View style={styles.profileTitleRow}>
              <Text style={styles.name}>{currentUser?.name}</Text>
            </View>
            
            <Text style={styles.email}>{currentUser?.email}</Text>

            {/* Stats Section */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{playlistCount}</Text>
                <Text style={styles.statLabel}>Playlists</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            {/* Favorite Artists Carousel */}
            <View style={styles.favoriteArtistsContainer}>
                      <Text style={styles.sectionTitle}>Favorite Artists ({favoriteArtists.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {/* Add Artist Button */}
                <TouchableOpacity 
                  style={styles.addArtistItem}
                  onPress={() => navigation.navigate('AddArtist')}
                >
                  <View style={styles.addArtistImageContainer}>
                    <LinearGradient
                      colors={['#3B82F6', '#8B5CF6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addArtistGradient}
                    />
                    <Ionicons name="add" size={30} color="#fff" />
                  </View>
                  <Text style={styles.addArtistText}>Add Artist</Text>
                </TouchableOpacity>
                
                {/* Existing Favorite Artists */}
                {favoriteArtists.map((artist, index) => {
                  // Handle both thumbnail data structures:
                  // 1. New artists: thumbnails is a single object
                  // 2. Existing artists: thumbnails is an array of objects
                  let thumbnailUrl = null;
                  
                  if (artist.thumbnails) {
                    if (Array.isArray(artist.thumbnails)) {
                      // Existing artist format: thumbnails array
                      thumbnailUrl = artist.thumbnails[0]?.url;
                    } else {
                      // New artist format: thumbnails single object
                      thumbnailUrl = artist.thumbnails.url;
                    }
                  }
                  
                  // Use proxy image URL like other parts of the app
                  const imageUri = thumbnailUrl 
                    ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}`
                    : 'https://www.beatinbox.com/default-artist.png';
                  
                  return (
                    <View key={artist.browseId} style={styles.artistItem}>
                      <View style={styles.artistImageContainer}>
                        <TouchableOpacity 
                          style={styles.artistImageTouchable}
                          onPress={() => navigation.navigate('Artist', {
                            artistId: artist.browseId,
                            artistName: artist.name
                          })}
                        >
                          <Image
                            source={{ 
                              uri: imageUri
                            }}
                            style={styles.artistImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        
                        {/* Remove Artist Button */}
                        <TouchableOpacity 
                          style={styles.removeArtistButton}
                          onPress={() => handleRemoveArtist(artist)}
                        >
                          <Ionicons name="remove-circle" size={20} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.artistName} numberOfLines={2}>
                        {artist.name}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>


          </View>

          {/* Menu Popup Modal */}
          <Modal
            visible={isMenuVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsMenuVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1} 
              onPress={() => setIsMenuVisible(false)}
            >
              <View style={styles.menuPopup}>
                <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                  <Text style={styles.menuItemText}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleTermsConditions}>
                  <Ionicons name="document-text-outline" size={20} color="#fff" />
                  <Text style={styles.menuItemText}>Terms & Conditions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleLogoutFromMenu}>
                  <Ionicons name="log-out-outline" size={20} color="#ff4444" />
                  <Text style={[styles.menuItemText, styles.logoutMenuText]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
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
    marginBottom: 16,
  },
  profileImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
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
  profileTitleRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    borderBottomWidth: 1,
    borderColor: '#1e1e1e',
    paddingBottom: 30,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 30,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
  },
  favoriteArtistsContainer: {
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  artistsCarousel: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  artistItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  artistImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImageTouchable: {
    width: '100%',
    height: '100%',
  },
  removeArtistButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 2,
  },
  artistName: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    width: 80,
  },
  addArtistItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  addArtistImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addArtistGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  addArtistText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    width: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopup: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    width: '80%',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  logoutMenuText: {
    color: '#ff4444',
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

  headerMenuButton: {
    padding: 5,
  },
});

export default ProfileScreen;

