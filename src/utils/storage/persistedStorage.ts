import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

/**
 * PersistedStorage provides advanced caching capabilities with:
 * - TTL (time-to-live) cache expiration
 * - Network state aware operations
 * - Batch operations
 */
class PersistedStorage {
  private async isNetworkAvailable(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  }

  /**
   * Set data with optional expiration time
   */
  async setItem<T>(
    key: string, 
    value: T, 
    options?: { 
      ttl?: number; // Time to live in milliseconds
    }
  ): Promise<void> {
    const storageItem: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
    };
    
    try {
      await AsyncStorage.setItem(key, JSON.stringify(storageItem));
    } catch (error) {
      console.error('Error storing data:', error);
      throw error;
    }
  }

  /**
   * Get data with expiration check
   * Returns null if data is expired
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      
      if (!data) return null;
      
      const storageItem: StorageItem<T> = JSON.parse(data);
      
      // Check if data is expired
      if (storageItem.expiresAt && storageItem.expiresAt < Date.now()) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      
      return storageItem.value;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }

  /**
   * Get data if it exists and not expired, otherwise fetch and store
   */
  async getWithBackup<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: {
      ttl?: number;
      forceRefresh?: boolean;
      onlyFetchWhenOnline?: boolean;
    }
  ): Promise<T | null> {
    try {
      // First check if we should force refresh
      if (options?.forceRefresh) {
        // Check network if needed
        if (options.onlyFetchWhenOnline) {
          const isOnline = await this.isNetworkAvailable();
          if (!isOnline) {
            const cachedData = await this.getItem<T>(key);
            return cachedData;
          }
        }
        
        // Fetch fresh data
        const data = await fetchFn();
        await this.setItem(key, data, { ttl: options?.ttl });
        return data;
      }

      // Check for cached data
      const cachedData = await this.getItem<T>(key);

      // Return cache if it exists
      if (cachedData !== null) {
        return cachedData;
      }

      // No cache, check network if needed
      if (options?.onlyFetchWhenOnline) {
        const isOnline = await this.isNetworkAvailable();
        if (!isOnline) return null;
      }

      // Fetch and store fresh data
      const data = await fetchFn();
      await this.setItem(key, data, { ttl: options?.ttl });
      return data;
    } catch (error) {
      console.error('Error in getWithBackup:', error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async getKeysByPrefix(prefix: string): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(key => key.startsWith(prefix));
    } catch (error) {
      console.error('Error getting keys by prefix:', error);
      return [];
    }
  }

  /**
   * Batch get multiple items
   */
  async multiGet<T>(keys: string[]): Promise<Map<string, T | null>> {
    try {
      const result = new Map<string, T | null>();
      
      if (keys.length === 0) return result;
      
      const pairs = await AsyncStorage.multiGet(keys);
      
      for (const [key, value] of pairs) {
        if (value === null) {
          result.set(key, null);
          continue;
        }
        
        try {
          const storageItem: StorageItem<T> = JSON.parse(value);
          
          // Check if data is expired
          if (storageItem.expiresAt && storageItem.expiresAt < Date.now()) {
            result.set(key, null);
            // Remove expired item in background
            AsyncStorage.removeItem(key).catch(() => {});
          } else {
            result.set(key, storageItem.value);
          }
        } catch {
          // Handle non-conforming items
          result.set(key, null);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error in batch get:', error);
      return new Map();
    }
  }

  /**
   * Clear all app storage or by prefix 
   */
  async clear(prefix?: string): Promise<void> {
    try {
      if (prefix) {
        const keys = await this.getKeysByPrefix(prefix);
        if (keys.length > 0) {
          await AsyncStorage.multiRemove(keys);
        }
      } else {
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

export default new PersistedStorage();