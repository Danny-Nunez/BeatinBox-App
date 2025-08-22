import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const CacheManager = {
  // Store data with timestamp
  async set(key, data) {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_DURATION
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      console.log(`📦 Cached data for key: ${key}`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  // Get data if not expired
  async get(key) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        console.log(`🔍 No cache found for key: ${key}`);
        return null;
      }

      const cacheItem = JSON.parse(cached);
      const now = Date.now();

      // Check if cache has expired
      if (now > cacheItem.expiry) {
        console.log(`⏰ Cache expired for key: ${key}`);
        await AsyncStorage.removeItem(key);
        return null;
      }

      console.log(`✅ Cache hit for key: ${key}`);
      return cacheItem.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Clear specific cache
  async clear(key) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Cleared cache for key: ${key}`);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },

  // Clear all expired cache
  async clearExpired() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const now = Date.now();
      
      for (const key of keys) {
        if (key.startsWith('cache_')) {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const cacheItem = JSON.parse(cached);
            if (now > cacheItem.expiry) {
              await AsyncStorage.removeItem(key);
              console.log(`🧹 Removed expired cache: ${key}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Clear expired cache error:', error);
    }
  },

  // Get cache info
  async getInfo(key) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const now = Date.now();
      const timeLeft = cacheItem.expiry - now;
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

      return {
        exists: true,
        expired: now > cacheItem.expiry,
        hoursLeft: hoursLeft > 0 ? hoursLeft : 0,
        size: cached.length
      };
    } catch (error) {
      console.error('Cache info error:', error);
      return null;
    }
  }
};

// Helper function to create cache keys
export const createCacheKey = (endpoint, params = {}) => {
  const paramString = Object.keys(params).length > 0 
    ? JSON.stringify(params).replace(/[{}":,]/g, '') 
    : '';
  return `cache_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}_${paramString}`;
}; 