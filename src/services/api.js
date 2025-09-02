import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager, createCacheKey } from '../utils/cache';

const SESSION_TOKEN_KEY = '@auth_session_token';
const PLAYLISTS_CACHE_KEY = '@playlists_cache';
const PLAYLISTS_TIMESTAMP_KEY = '@playlists_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const API_URL = 'https://beatinbox.com/api/auth';

const fetchLatestCloudinaryUrl = async () => {
  try {
    const response = await fetch('https://www.beatinbox.com/api/get-latest-cloudinary-url?folder=top100-songs');
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error fetching cloudinary URL:', error);
    throw error;
  }
};

const fetchTop100Songs = async () => {
  const cacheKey = createCacheKey('top100songs');
  
  try {
    // Try to get from cache first
    const cachedData = await CacheManager.get(cacheKey);
    if (cachedData) {
      console.log('📦 Using cached top 100 songs');
      return cachedData;
    }

    console.log('🌐 Fetching fresh top 100 songs from API');
    const cloudinaryUrl = await fetchLatestCloudinaryUrl();
    const response = await fetch(cloudinaryUrl);
    const data = await response.json();
    
    // Extract and format the songs data with error handling
    const songs = data.contents?.sectionListRenderer?.contents?.[0]
      ?.musicAnalyticsSectionRenderer?.content?.trackTypes?.[0]?.trackViews
      ?.map(track => {
        try {
          const thumbnailUrl = track.thumbnail?.thumbnails?.[0]?.url;
          return {
            id: track.encryptedVideoId || track.id,
            title: track.name || 'Unknown Title',
            artist: track.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist',
            thumbnail: thumbnailUrl ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}` : null,
            position: track.chartEntryMetadata?.currentPosition || 0
          };
        } catch (trackError) {
          console.error('Error processing track:', trackError, track);
          return null;
        }
      })
      ?.filter(Boolean) || [];

    // Cache the result
    await CacheManager.set(cacheKey, songs);
    return songs;
  } catch (error) {
    console.error('Error fetching top 100 songs:', error);
    
    // Try to return stale cache data if available
    const staleData = await CacheManager.get(cacheKey);
    if (staleData) {
      console.log('⚠️ Using stale cached data due to API error');
      return staleData;
    }
    
    throw error;
  }
};

const fetchTopArtists = async () => {
  const cacheKey = createCacheKey('topartists');
  
  try {
    // Try to get from cache first
    const cachedData = await CacheManager.get(cacheKey);
    if (cachedData) {
      console.log('📦 Using cached top artists');
      return cachedData;
    }

    console.log('🌐 Fetching fresh top artists from API');
    const response = await fetch('https://www.beatinbox.com/api/popular-artists');
    const data = await response.json();
    
    // Extract and format the artists data with error handling, limited to top 20
    const artists = data.contents?.sectionListRenderer?.contents?.[0]
      ?.musicAnalyticsSectionRenderer?.content?.artists?.[0]?.artistViews
      ?.slice(0, 20) // Limit to top 20 artists
      ?.map(artist => {
        try {
          const thumbnailUrl = artist.thumbnail?.thumbnails?.[0]?.url;
          return {
            id: artist.id,
            name: artist.name || 'Unknown Artist',
            viewCount: artist.viewCount || 0,
            thumbnail: thumbnailUrl ? `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}` : null,
            position: artist.chartEntryMetadata?.currentPosition || 0
          };
        } catch (artistError) {
          console.error('Error processing artist:', artistError, artist);
          return null;
        }
      })
      ?.filter(Boolean) || [];

    // Cache the result
    await CacheManager.set(cacheKey, artists);
    return artists;
  } catch (error) {
    console.error('Error fetching top artists:', error);
    
    // Try to return stale cache data if available
    const staleData = await CacheManager.get(cacheKey);
    if (staleData) {
      console.log('⚠️ Using stale cached artists due to API error');
      return staleData;
    }
    
    throw error;
  }
};

const fetchCommuteFeed = async () => {
  const cacheKey = createCacheKey('commute-feed');
  
  try {
    // Try to get from cache first
    const cachedData = await CacheManager.get(cacheKey);
    if (cachedData) {
      console.log('📦 Using cached commute feed');
      return cachedData;
    }

    console.log('🌐 Fetching fresh commute feed from API');
    const response = await fetch('https://www.beatinbox.com/api/get-mobile-commute-feed-url');
    const data = await response.json();
    
    // Extract the music items from the API response
    const musicItems = data?.data?.musicItems || [];

    // Cache the result
    await CacheManager.set(cacheKey, musicItems);
    return musicItems;
  } catch (error) {
    console.error('Error fetching commute feed:', error);
    
    // Try to return stale cache data if available
    const staleData = await CacheManager.get(cacheKey);
    if (staleData) {
      console.log('⚠️ Using stale cached commute feed due to API error');
      return staleData;
    }
    
    return []; // Return empty array on error instead of throwing
  }
};

const createOrUpdateUser = async ({ email, password, name }) => {
  try {
    // Validate required fields
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    const response = await fetch(`${API_URL}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        name: name || null
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create user');
    }

    // Store session token if provided
    if (result.sessionToken) {
      await AsyncStorage.setItem(SESSION_TOKEN_KEY, result.sessionToken);
    }
    
    return result.user;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
};

const getCachedPlaylists = async () => {
  try {
    const cachedData = await AsyncStorage.getItem(PLAYLISTS_CACHE_KEY);
    const timestamp = await AsyncStorage.getItem(PLAYLISTS_TIMESTAMP_KEY);
    
    if (!cachedData || !timestamp) {
      return null;
    }

    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
      return null;
    }

    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Error reading playlists cache:', error);
    return null;
  }
};

const cachePlaylists = async (playlists) => {
  try {
    await AsyncStorage.setItem(PLAYLISTS_CACHE_KEY, JSON.stringify(playlists));
    await AsyncStorage.setItem(PLAYLISTS_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error caching playlists:', error);
  }
};

const getPlaylists = async () => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      console.log('No session token found');
      return null;
    }
    
    console.log('Using session token:', sessionToken);
    const response = await fetch(`${API_URL}/mobile/playlists`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Session-Token': sessionToken
      }
    });
    console.log('Playlists response status:', response.status);
    
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      if (!response.ok) {
        console.error('Failed to fetch playlists:', data.error);
        return null;
      }
      
      // Cache successful response
      await cachePlaylists(data);
      return data;
    } catch (parseError) {
      console.error('Failed to parse playlists response:', text);
      return null;
    }
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return null;
  }
};

const addSongToPlaylist = async (playlistId, song) => {
  try {
    console.log('Adding song to playlist:', { playlistId, song });
    
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    console.log('Session token for add song:', sessionToken);
    
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const url = `https://expo-backend-bi5x.onrender.com/mobile/playlists/add-song`;
    console.log('Making request to:', url);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Session-Token': sessionToken
    };

    const body = {
      playlistId,
      song: {
        videoId: song.videoId,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail
      }
    };

    try {
      console.log('Request details:', {
        url,
        method: 'POST',
        headers,
        body
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        try {
          const data = JSON.parse(text);
          throw new Error(data.error || `Server error: ${response.status}`);
        } catch (e) {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = await response.json();

      console.log('Successfully added song:', data);
      return data;
    } catch (fetchError) {
      console.error('Network error details:', {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack,
        cause: fetchError.cause
      });
      throw new Error(`Network error: ${fetchError.message}`);
    }
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    // Ensure we're always throwing an Error object with a message
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const removeSongFromPlaylist = async (playlistId, videoId) => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const url = `https://expo-backend-bi5x.onrender.com/mobile/playlists/${playlistId}/songs/${videoId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-Session-Token': sessionToken
      }
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        throw new Error(data.error || `Server error: ${response.status}`);
      } catch (e) {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const searchArtist = async (query) => {
  try {
    const response = await fetch(`https://www.beatinbox.com/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.artists[0]; // Return first matching artist
  } catch (error) {
    console.error('Error searching artist:', error);
    throw error;
  }
};

const createPlaylist = async (name) => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const response = await fetch('https://expo-backend-bi5x.onrender.com/mobile/playlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        throw new Error(data.error || `Server error: ${response.status}`);
      } catch (e) {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const deletePlaylist = async (playlistId) => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const response = await fetch(`https://expo-backend-bi5x.onrender.com/mobile/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken
      }
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        throw new Error(data.error || `Server error: ${response.status}`);
      } catch (e) {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const checkSongInPlaylist = async (playlistId, videoId) => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const url = `https://expo-backend-bi5x.onrender.com/mobile/playlists/${playlistId}/songs/${videoId}/exists`;
    console.log('Checking song in playlist:', {
      playlistId,
      videoId,
      sessionToken,
      url
    });

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Session-Token': sessionToken
      }
    });

    const text = await response.text();
    console.log('Check song response:', text);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    try {
      const data = JSON.parse(text);
      console.log('Check song parsed data:', data);
      return data.exists;
    } catch (e) {
      console.error('Failed to parse check song response:', e);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error checking song in playlist:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const getFavoriteArtists = async () => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const response = await fetch('https://expo-backend-bi5x.onrender.com/mobile/users/favorite-artists', {
      headers: {
        'Accept': 'application/json',
        'X-Session-Token': sessionToken
      }
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the content array from the response
    if (data.success && data.content && Array.isArray(data.content)) {
      return data.content;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching favorite artists:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const addFavoriteArtist = async (artistData) => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    // Use the batch endpoint with a single artist since the single endpoint doesn't exist
    const requestBody = {
      artists: [{
        browseId: artistData.browseId,
        name: artistData.name,
        thumbnails: artistData.thumbnails?.[0] || null // Take first thumbnail or null
      }]
    };
    
    console.log('addFavoriteArtist - Request details:', {
      url: 'https://expo-backend-bi5x.onrender.com/mobile/users/favorite-artists/batch',
      method: 'POST',
      sessionToken: sessionToken ? 'Present' : 'Missing',
      requestBody: JSON.stringify(requestBody, null, 2)
    });

    const response = await fetch('https://expo-backend-bi5x.onrender.com/mobile/users/favorite-artists/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Session-Token': sessionToken
      },
      body: JSON.stringify(requestBody)
    });

    console.log('addFavoriteArtist - Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('addFavoriteArtist - Backend error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Server error: ${response.status} - ${errorText}`);
      } catch (e) {
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding favorite artist:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const addFavoriteArtistsBatch = async (artistsArray) => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    // Format the data according to backend expectations for batch
    const requestBody = {
      artists: artistsArray.map(artist => ({
        browseId: artist.browseId,
        name: artist.name,
        thumbnails: artist.thumbnails?.[0] || null
      }))
    };
    
    console.log('addFavoriteArtistsBatch - Request details:', {
      url: 'https://expo-backend-bi5x.onrender.com/mobile/users/favorite-artists/batch',
      method: 'POST',
      sessionToken: sessionToken ? 'Present' : 'Missing',
      requestBody: JSON.stringify(requestBody, null, 2)
    });

    const response = await fetch('https://expo-backend-bi5x.onrender.com/mobile/users/favorite-artists/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Session-Token': sessionToken
      },
      body: JSON.stringify(requestBody)
    });

    console.log('addFavoriteArtistsBatch - Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('addFavoriteArtistsBatch - Backend error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Server error: ${response.status} - ${errorText}`);
      } catch (e) {
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding favorite artists batch:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const removeFavoriteArtist = async (browseId) => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const response = await fetch(`https://expo-backend-bi5x.onrender.com/mobile/users/favorite-artists/${browseId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-Session-Token': sessionToken
      }
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error removing favorite artist:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

const checkFavoriteArtistStatus = async (browseId) => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const response = await fetch(`https://expo-backend-bi5x.onrender.com/mobile/users/favorite-artists/${browseId}/status`, {
      headers: {
        'Accept': 'application/json',
        'X-Session-Token': sessionToken
      }
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.isFavorited;
  } catch (error) {
    console.error('Error checking favorite artist status:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Unknown error occurred');
  }
};

export { 
  fetchTop100Songs,
  fetchTopArtists,
  fetchCommuteFeed,
  createOrUpdateUser,
  getPlaylists,
  getCachedPlaylists,
  addSongToPlaylist,
  removeSongFromPlaylist,
  searchArtist,
  createPlaylist,
  deletePlaylist,
  checkSongInPlaylist,
  getFavoriteArtists,
  addFavoriteArtist,
  addFavoriteArtistsBatch,
  removeFavoriteArtist,
  checkFavoriteArtistStatus
};
