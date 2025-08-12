import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';

const API_URL = 'https://www.beatinbox.com/api';
const SESSION_TOKEN_KEY = '@auth_session_token';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

// Get redirect URI based on platform
export const getRedirectUri = () => Platform.select({
  native: 'com.googleusercontent.apps.163014883667-g0g2t71ei8aroin55ahhtcq491tk2ts8:/oauth2redirect/google',
  default: 'https://auth.expo.io/@dnunez22/beatinbox-new-52'
});

// Google OAuth configuration
const googleConfig = {
  iosClientId: '163014883667-g0g2t71ei8aroin55ahhtcq491tk2ts8.apps.googleusercontent.com',
  androidClientId: '163014883667-g0g2t71ei8aroin55ahhtcq491tk2ts8.apps.googleusercontent.com',
  webClientId: '163014883667-q065j1a659gksa5agkvqo9i5nh3lipf6.apps.googleusercontent.com',
  scopes: ['openid', 'profile', 'email'],
  redirectUri: getRedirectUri()
};

export const initializeGoogleAuth = () => {
  return googleConfig;
};

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    ...googleConfig,
    responseType: ResponseType.Code,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent'
    }
  });
  return { request, response, promptAsync };
};

export const handleGoogleLogin = async (response, request) => {
  console.log('Google login response:', response);
  console.log('Auth request details:', {
    hasCodeVerifier: !!request?.codeVerifier,
    redirectUri: getRedirectUri()
  });
  
  if (response?.type === 'success') {
    try {
      const { params } = response;
      console.log('Google auth params:', params);
      
      if (!params?.code) {
        console.error('No authorization code found in response');
        throw new Error('No authorization code found in response');
      }

      console.log('Using authorization code to get user info');

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: params.code,
          client_id: Platform.OS === 'web' ? googleConfig.webClientId : googleConfig.iosClientId,
          redirect_uri: getRedirectUri(),
          grant_type: 'authorization_code',
          code_verifier: request?.codeVerifier || ''
        }).toString()
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        throw new Error(`Token exchange failed: ${tokenData.error}`);
      }

      console.log('Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        hasIdToken: !!tokenData.id_token,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        idTokenPreview: tokenData.id_token?.substring(0, 20) + '...'
      });

      // Get user info using the access token
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      const userInfo = await userInfoResponse.json();
      console.log('Google user info:', userInfo);

      // Use dedicated Google login endpoint
      console.log('Sending to backend:', {
        accessToken: tokenData.access_token?.substring(0, 20) + '...',
        email: userInfo.email,
        name: userInfo.name,
        googleId: userInfo.id,
        image: userInfo.picture
      });
      
      const loginResponse = await fetch(`${API_URL}/auth/mobile/google`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          email: userInfo.email,
          accessToken: tokenData.access_token,
          name: userInfo.name,
          image: userInfo.picture,
          googleId: userInfo.id
        }),
      });

      const responseText = await loginResponse.text();
      console.log('Login response text:', responseText);

      let sessionData;
      try {
        sessionData = JSON.parse(responseText);
      } catch (error) {
        console.error('Failed to parse login response:', error);
        throw new Error('Invalid response format from server');
      }

      if (!sessionData.sessionToken || !sessionData.user) {
        console.error('Invalid session data:', sessionData);
        throw new Error(sessionData.error || 'Invalid response from server');
      }

      console.log('Login successful, session data:', sessionData);

      // Store the session token
      await AsyncStorage.setItem(SESSION_TOKEN_KEY, sessionData.sessionToken);
      
      return sessionData;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  } else {
    throw new Error('Google sign in was cancelled or failed');
  }
};

export const login = async (email, password) => {
  try {
    console.log('Starting login flow...');

    const loginResponse = await fetch(`${API_URL}/auth/mobile/login`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const responseText = await loginResponse.text();
    console.log('Login response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse login response:', error);
      throw new Error('Invalid response format from server');
    }

    if (!data.sessionToken || !data.user) {
      console.error('Invalid login data:', data);
      throw new Error(data.error || 'Invalid response from server');
    }

    console.log('Login successful, data:', data);

    // Store the session token
    await AsyncStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const signup = async (name, email, password) => {
  try {
    const response = await fetch(`${API_URL}/auth/mobile/user`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ 
        name, 
        email, 
        password,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(typeof data.error === 'object' ? JSON.stringify(data.error) : data.error);
    }

    // If registration returns a session, store it
    if (data.sessionToken && data.user) {
      await AsyncStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
    }

    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    const response = await fetch(`${API_URL}/auth/mobile/reset-password`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

export const getSession = async () => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      return null;
    }

    // Validate session with backend
    const response = await fetch(`${API_URL}/auth/mobile/session`, {
      method: 'GET',
      headers: {
        ...defaultHeaders,
        'Authorization': `Bearer ${sessionToken}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Clear invalid token
        await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
        return null;
      }
      throw new Error(`Session request failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      user: data.user,
      sessionToken
    };
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};

export const signOut = async () => {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) {
      // Notify backend about logout
      await fetch(`${API_URL}/auth/mobile/logout`, {
        method: 'POST',
        headers: {
          ...defaultHeaders,
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
    }
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error('Sign out error:', error);
    // Still remove the token even if server call fails
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
    throw error;
  }
};
