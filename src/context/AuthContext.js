import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/auth';
import * as api from '../services/api';
import * as WebBrowser from 'expo-web-browser';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  // Function to refresh user data from database
  const refreshUserData = useCallback(async () => {
    // Keep existing user data since we already have it from login/session
    setUser(currentUser => ({
      ...currentUser,
      playlists: currentUser.playlists || []
    }));
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const googleAuth = authService.useGoogleAuth();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = await authService.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Attempting login...', { email });
      const session = await authService.login(email, password);
      console.log('Login result:', session);
      
      if (session?.user) {
        setUser(session.user);
        console.log('User set after login:', session.user);
      } else {
        console.error('No user data in session:', session);
        throw new Error('No user data in session');
      }
    } catch (err) {
      console.error('Login error in context:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await authService.signup(name, email, password);
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (userData) => {
    try {
      setUser(userData);
      // Optionally save to storage or send to backend
      await authService.updateUserSession(userData);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting Google sign-in flow...');
      
      if (!googleAuth.promptAsync) {
        throw new Error('Google auth not initialized');
      }
      
      // Prompt the user to sign in with Google
      const result = await googleAuth.promptAsync();
      console.log('Google auth result returned from promptAsync:', result);
      
      if (result?.type === 'success') {
        console.log('Google auth successful, handling login...');
        try {
          const session = await authService.handleGoogleLogin(result, googleAuth.request);
          console.log('Session received:', session);
          
          if (session?.user) {
            setUser(session.user);
            console.log('User set successfully:', session.user);
            
            // Verify session is working
            const verifiedSession = await authService.getSession();
            console.log('Verified session:', verifiedSession);
            
            if (!verifiedSession?.user) {
              throw new Error('Failed to verify session');
            }

            // Add a small delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return session; // Return session for LoginScreen to handle navigation
          } else {
            console.error('No user data in session:', session);
            throw new Error('No user data in session');
          }
        } catch (loginError) {
          console.error('Failed to handle Google login:', loginError);
          throw loginError;
        }
      } else {
        console.error('Google sign in failed or was cancelled:', result);
        throw new Error('Google sign in was cancelled or failed');
      }
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Failed to sign in with Google');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [googleAuth]);
  

  const resetPassword = async (email) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.resetPassword(email);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading: isLoading || isInitializing,
        error,
        login,
        signup,
        logout,
        updateUser,
        resetPassword,
        handleGoogleSignIn,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
