import persistedStorage from '../../../src/utils/storage/persistedStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

describe('PersistedStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('setItem / getItem', () => {
    it('stores and retrieves data', async () => {
      await persistedStorage.setItem('key1', { name: 'test' });
      const result = await persistedStorage.getItem<{ name: string }>('key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('returns null for non-existent key', async () => {
      const result = await persistedStorage.getItem('missing');
      expect(result).toBeNull();
    });

    it('stores primitive values', async () => {
      await persistedStorage.setItem('str', 'hello');
      expect(await persistedStorage.getItem<string>('str')).toBe('hello');

      await persistedStorage.setItem('num', 42);
      expect(await persistedStorage.getItem<number>('num')).toBe(42);
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('returns cached value within TTL', async () => {
      await persistedStorage.setItem('ttl-key', 'fresh', { ttl: 60000 });
      jest.advanceTimersByTime(30000);
      const result = await persistedStorage.getItem<string>('ttl-key');
      expect(result).toBe('fresh');
    });

    it('returns null after TTL expires', async () => {
      await persistedStorage.setItem('ttl-key', 'stale', { ttl: 60000 });
      jest.advanceTimersByTime(61000);
      const result = await persistedStorage.getItem<string>('ttl-key');
      expect(result).toBeNull();
    });

    it('removes expired item from storage', async () => {
      await persistedStorage.setItem('ttl-key', 'data', { ttl: 1000 });
      jest.advanceTimersByTime(2000);
      await persistedStorage.getItem('ttl-key');
      const raw = await AsyncStorage.getItem('ttl-key');
      expect(raw).toBeNull();
    });

    it('data without TTL never expires', async () => {
      await persistedStorage.setItem('no-ttl', 'forever');
      jest.advanceTimersByTime(999999999);
      const result = await persistedStorage.getItem<string>('no-ttl');
      expect(result).toBe('forever');
    });
  });

  describe('getWithBackup', () => {
    const fetchFn = jest.fn(() => Promise.resolve('network-data'));

    beforeEach(() => {
      fetchFn.mockClear();
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });
    });

    it('returns cached data when available', async () => {
      await persistedStorage.setItem('backup-key', 'cached');
      const result = await persistedStorage.getWithBackup('backup-key', fetchFn);
      expect(result).toBe('cached');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('fetches and caches when no cache exists', async () => {
      const result = await persistedStorage.getWithBackup('new-key', fetchFn);
      expect(result).toBe('network-data');
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Verify it was cached
      const cached = await persistedStorage.getItem<string>('new-key');
      expect(cached).toBe('network-data');
    });

    it('force refresh fetches even when cache exists', async () => {
      await persistedStorage.setItem('backup-key', 'old');
      const result = await persistedStorage.getWithBackup('backup-key', fetchFn, {
        forceRefresh: true,
      });
      expect(result).toBe('network-data');
      expect(fetchFn).toHaveBeenCalled();
    });

    it('returns cache when offline and forceRefresh + onlyFetchWhenOnline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });
      await persistedStorage.setItem('backup-key', 'offline-cache');
      const result = await persistedStorage.getWithBackup('backup-key', fetchFn, {
        forceRefresh: true,
        onlyFetchWhenOnline: true,
      });
      expect(result).toBe('offline-cache');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('returns null when offline, no cache, and onlyFetchWhenOnline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });
      const result = await persistedStorage.getWithBackup('missing', fetchFn, {
        onlyFetchWhenOnline: true,
      });
      expect(result).toBeNull();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('returns null when fetchFn throws', async () => {
      const failFn = jest.fn(() => Promise.reject(new Error('fail')));
      const result = await persistedStorage.getWithBackup('key', failFn);
      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('removes an item', async () => {
      await persistedStorage.setItem('rm-key', 'data');
      await persistedStorage.removeItem('rm-key');
      const result = await persistedStorage.getItem('rm-key');
      expect(result).toBeNull();
    });
  });

  describe('getKeysByPrefix', () => {
    it('returns keys matching prefix', async () => {
      await AsyncStorage.setItem('@app_one', '1');
      await AsyncStorage.setItem('@app_two', '2');
      await AsyncStorage.setItem('@other_key', '3');
      const keys = await persistedStorage.getKeysByPrefix('@app_');
      expect(keys).toContain('@app_one');
      expect(keys).toContain('@app_two');
      expect(keys).not.toContain('@other_key');
    });
  });

  describe('multiGet', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('returns values for multiple keys', async () => {
      await persistedStorage.setItem('k1', 'v1');
      await persistedStorage.setItem('k2', 'v2');
      const result = await persistedStorage.multiGet<string>(['k1', 'k2']);
      expect(result.get('k1')).toBe('v1');
      expect(result.get('k2')).toBe('v2');
    });

    it('returns null for missing keys', async () => {
      const result = await persistedStorage.multiGet<string>(['missing']);
      expect(result.get('missing')).toBeNull();
    });

    it('filters out expired items', async () => {
      await persistedStorage.setItem('exp', 'data', { ttl: 1000 });
      jest.advanceTimersByTime(2000);
      const result = await persistedStorage.multiGet<string>(['exp']);
      expect(result.get('exp')).toBeNull();
    });

    it('returns empty map for empty keys array', async () => {
      const result = await persistedStorage.multiGet<string>([]);
      expect(result.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('clears all storage when no prefix', async () => {
      await AsyncStorage.setItem('k1', 'v1');
      await AsyncStorage.setItem('k2', 'v2');
      await persistedStorage.clear();
      const keys = await AsyncStorage.getAllKeys();
      expect(keys).toHaveLength(0);
    });

    it('clears only keys matching prefix', async () => {
      await AsyncStorage.setItem('@prefix_one', '1');
      await AsyncStorage.setItem('@prefix_two', '2');
      await AsyncStorage.setItem('@other', '3');
      await persistedStorage.clear('@prefix_');
      const remaining = await AsyncStorage.getAllKeys();
      expect(remaining).toContain('@other');
      expect(remaining).not.toContain('@prefix_one');
    });
  });
});
