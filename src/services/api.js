import AsyncStorage from '@react-native-async-storage/async-storage';

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
  try {
    const cloudinaryUrl = await fetchLatestCloudinaryUrl();
    const response = await fetch(cloudinaryUrl);
    const data = await response.json();
    
    // Extract and format the songs data
    const songs = data.contents.sectionListRenderer.contents[0]
      .musicAnalyticsSectionRenderer.content.trackTypes[0].trackViews
      .map(track => ({
        id: track.encryptedVideoId,
        title: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        thumbnail: track.thumbnail.thumbnails[0].url,
        position: track.chartEntryMetadata.currentPosition
      }));

    return songs;
  } catch (error) {
    console.error('Error fetching top 100 songs:', error);
    throw error;
  }
};

const fetchTopArtists = async () => {
  try {
    const response = await fetch('https://www.beatinbox.com/api/popular-artists');
    const data = await response.json();
    
    // Extract and format the artists data
    const artists = data.contents.sectionListRenderer.contents[0]
      .musicAnalyticsSectionRenderer.content.artists[0].artistViews
      .map(artist => ({
        id: artist.id,
        name: artist.name,
        viewCount: artist.viewCount,
        thumbnail: `https://www.beatinbox.com/api/proxy-image?url=${encodeURIComponent(artist.thumbnail.thumbnails[0].url)}`,
        position: artist.chartEntryMetadata.currentPosition
      }));

    return artists;
  } catch (error) {
    console.error('Error fetching top artists:', error);
    throw error;
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

export { 
  fetchTop100Songs,
  fetchTopArtists,
  createOrUpdateUser,
  getPlaylists,
  getCachedPlaylists,
  addSongToPlaylist,
  removeSongFromPlaylist,
  searchArtist,
  createPlaylist,
  checkSongInPlaylist
};
