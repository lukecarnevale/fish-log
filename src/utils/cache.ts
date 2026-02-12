/**
 * Cache Factory Utility
 *
 * Factory function for creating consistent AsyncStorage-backed caches with TTL support.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheOptions {
  ttlMs: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Create a cache instance for a given key with TTL support.
 *
 * @param key - AsyncStorage key for this cache
 * @param options - Cache configuration (ttlMs = time to live in milliseconds)
 * @returns Cache instance with get, set, and clear methods
 */
export function createCache<T>(key: string, options: CacheOptions) {
  return {
    /**
     * Get cached data if available and not expired.
     */
    async get(): Promise<T | null> {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.timestamp > options.ttlMs) return null;
        return entry.data;
      } catch {
        return null;
      }
    },

    /**
     * Save data to cache with current timestamp.
     */
    async set(data: T): Promise<void> {
      try {
        const entry: CacheEntry<T> = { data, timestamp: Date.now() };
        await AsyncStorage.setItem(key, JSON.stringify(entry));
      } catch (error) {
        console.error(`Cache write failed for ${key}:`, error);
      }
    },

    /**
     * Clear the cache.
     */
    async clear(): Promise<void> {
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // Silently fail on clear
      }
    },
  };
}
