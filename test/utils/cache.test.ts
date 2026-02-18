import { createCache } from '../../src/utils/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('createCache', () => {
  const cache = createCache<string>('@test_cache', { ttlMs: 60000 });

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('set and get', () => {
    it('stores and retrieves data', async () => {
      await cache.set('hello');
      const result = await cache.get();
      expect(result).toBe('hello');
    });

    it('stores complex objects', async () => {
      const objCache = createCache<{ items: number[] }>('@obj_cache', { ttlMs: 60000 });
      await objCache.set({ items: [1, 2, 3] });
      const result = await objCache.get();
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('returns data within TTL', async () => {
      await cache.set('fresh');
      jest.advanceTimersByTime(30000); // Half of TTL
      const result = await cache.get();
      expect(result).toBe('fresh');
    });

    it('returns null after TTL expires', async () => {
      await cache.set('stale');
      jest.advanceTimersByTime(61000); // Past TTL
      const result = await cache.get();
      expect(result).toBeNull();
    });

    it('returns null at exact TTL boundary', async () => {
      await cache.set('boundary');
      jest.advanceTimersByTime(60001); // Just past TTL
      const result = await cache.get();
      expect(result).toBeNull();
    });
  });

  describe('get with no data', () => {
    it('returns null when no data stored', async () => {
      const result = await cache.get();
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes cached data', async () => {
      await cache.set('to-clear');
      await cache.clear();
      const result = await cache.get();
      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('returns null on corrupt JSON', async () => {
      await AsyncStorage.setItem('@test_cache', 'not-json');
      const result = await cache.get();
      expect(result).toBeNull();
    });
  });
});
