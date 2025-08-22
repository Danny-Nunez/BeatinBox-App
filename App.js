import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PlayerProvider } from './src/context/PlayerContext';
import { AuthProvider } from './src/context/AuthContext';
import { CacheManager } from './src/utils/cache';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import NewScreen from './src/screens/NewScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import ArtistScreen from './src/screens/ArtistScreen';
import AlbumScreen from './src/screens/AlbumScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import GenreScreen from './src/screens/GenreScreen';

// Components
import PlayerBar from './src/components/PlayerBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenOptions = {
  tabBarStyle: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: 80,
    paddingBottom: 15,
    position: 'absolute',
    bottom: 0,
  },
  tabBarBackground: () => (
    <View 
      style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 90,
        backgroundColor: '#000',
      }} 
    />
  ),
  tabBarActiveTintColor: '#fff',
  tabBarInactiveTintColor: '#666',
  headerShown: false,
  tabBarHideOnKeyboard: true,
};

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#000',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="Home" 
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Artist" 
      component={ArtistScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitle: '',
        animation: 'slide_from_right',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen 
      name="Album" 
      component={AlbumScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitle: '',
        animation: 'slide_from_right',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen 
      name="PlaylistDetail" 
      component={PlaylistDetailScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitle: '',
        animation: 'slide_from_right',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    />
  </Stack.Navigator>
);

const SearchStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#000',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="Search" 
      component={SearchScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="PlaylistDetail" 
      component={PlaylistDetailScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitle: '',
        animation: 'slide_from_right',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen 
      name="Genre" 
      component={GenreScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Artist" 
      component={ArtistScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitle: '',
        animation: 'slide_from_right',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen 
      name="Album" 
      component={AlbumScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitle: '',
        animation: 'slide_from_right',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    />
  </Stack.Navigator>
);

const NewStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#000',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="New" 
      component={NewScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Artist" 
      component={ArtistScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitle: '',
        animation: 'slide_from_right',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen 
      name="PlaylistDetail" 
      component={PlaylistDetailScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitle: '',
        animation: 'slide_from_right',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    />
  </Stack.Navigator>
);

const TabNavigator = ({ isFullscreen }) => (
  <Tab.Navigator 
    screenOptions={{
      ...screenOptions,
      tabBarStyle: {
        ...screenOptions.tabBarStyle,
        display: isFullscreen ? 'none' : 'flex'
      }
    }}
  >
    <Tab.Screen 
      name="HomeTab" 
      component={HomeStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
        title: 'Home'
      }}
    />
    <Tab.Screen 
      name="NewTab" 
      component={NewStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="star" size={size} color={color} />
        ),
        title: 'New'
      }}
    />
    <Tab.Screen 
      name="SearchTab" 
      component={SearchStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="search" size={size} color={color} />
        ),
        title: 'Search'
      }}
    />
    <Tab.Screen 
      name="Library" 
      component={LibraryStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="library" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const LibraryStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#000',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="LibraryHome" 
      component={LibraryScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Playlist" 
      component={PlaylistScreen}
      options={({ route }) => ({ 
        title: route.params.playlist.name,
        headerShown: true,
      })}
    />
  </Stack.Navigator>
);

export default function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clean expired cache on app start
  useEffect(() => {
    const cleanupCache = async () => {
      try {
        await CacheManager.clearExpired();
        console.log('🧹 Cache cleanup completed');
      } catch (error) {
        console.error('Cache cleanup error:', error);
      }
    };

    cleanupCache();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PlayerProvider>
        <SafeAreaProvider>
          <NavigationContainer>
          <View style={styles.container}>
            <Stack.Navigator 
              screenOptions={{ 
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#000',
                  zIndex: 2,
                  elevation: 2
                }
              }}
            >
              <Stack.Screen 
                name="MainTabs" 
              >
                {() => <TabNavigator isFullscreen={isFullscreen} />}
              </Stack.Screen>
              <Stack.Screen 
                name="Profile" 
                component={ProfileScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  headerStyle: {
                    backgroundColor: '#000',
                  },
                  headerTintColor: '#fff',
                  headerTitle: 'Profile',
                  presentation: 'modal',
                  animation: 'slide_from_right',
                  contentStyle: {
                    backgroundColor: '#000'
                  },
                  headerLeft: () => (
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                      <Ionicons name="chevron-down" size={24} color="#fff" />
                    </TouchableOpacity>
                  ),
                })}
              />
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={({ navigation, route }) => ({
                  headerShown: route?.params?.initialMode !== 'signup',
                  headerStyle: {
                    backgroundColor: '#000',
                  },
                  headerTintColor: '#fff',
                  headerTitle: '',
                  presentation: 'modal',
                  animation: 'slide_from_right',
                  contentStyle: {
                    backgroundColor: '#000'
                  },
                  headerLeft: () => (
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                      <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                  ),
                })}
              />
            </Stack.Navigator>

            {/* Player layer */}
            <View style={[
              styles.playerContainer,
              isFullscreen && styles.playerFullscreen
            ]}>
              <PlayerBar onFullscreenChange={setIsFullscreen} />
            </View>
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
      </PlayerProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  playerFullscreen: {
    bottom: 0,
    top: 0,
    zIndex: 0,
  },
});
