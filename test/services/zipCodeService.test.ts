/**
 * zipCodeService.test.ts - Zip code lookup and caching
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { lookupZipCode, getCachedZipCode } from '../../src/services/zipCodeService';

// Mock fetch globally
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('zipCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // ============================================================
  // lookupZipCode
  // ============================================================
  describe('lookupZipCode', () => {
    it('rejects invalid zip codes (too short)', async () => {
      const result = await lookupZipCode('1234');
      expect(result.data).toBeNull();
      expect(result.source).toBe('none');
    });

    it('rejects invalid zip codes (too long)', async () => {
      const result = await lookupZipCode('123456');
      expect(result.data).toBeNull();
      expect(result.source).toBe('none');
    });

    it('rejects non-numeric zip codes', async () => {
      const result = await lookupZipCode('abcde');
      expect(result.data).toBeNull();
      expect(result.source).toBe('none');
    });

    it('returns cached result as fallback when API fails', async () => {
      const cached = { city: 'Raleigh', state: 'NC', country: 'US' };
      await AsyncStorage.setItem('@zip_cache_27601', JSON.stringify(cached));

      // lookupZipCode always calls API; cache is used as fallback on network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await lookupZipCode('27601');
      expect(result.data).not.toBeNull();
      expect(result.data?.city).toBe('Raleigh');
      expect(result.source).toBe('cache');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('fetches from API and caches on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          'post code': '27601',
          country: 'United States',
          places: [{ 'place name': 'Raleigh', state: 'North Carolina', 'state abbreviation': 'NC' }],
        }),
      });

      const result = await lookupZipCode('27601');
      expect(result.data).not.toBeNull();
      expect(result.data?.city).toBe('Raleigh');
      expect(result.source).toBe('api');
      expect(mockFetch).toHaveBeenCalled();

      // Verify it was cached
      const cached = await AsyncStorage.getItem('@zip_cache_27601');
      expect(cached).not.toBeNull();
    });

    it('returns notFound for 404 responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await lookupZipCode('00000');
      expect(result.notFound).toBe(true);
    });

    it('handles network error with cache fallback', async () => {
      const cached = { city: 'Raleigh', state: 'NC', country: 'US' };
      await AsyncStorage.setItem('@zip_cache_27601', JSON.stringify(cached));

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await lookupZipCode('27601');
      expect(result.data).not.toBeNull();
      expect(result.data?.city).toBe('Raleigh');
      expect(result.source).toBe('cache');
    });

    it('returns error when no cache available on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await lookupZipCode('99999');
      expect(result.data).toBeNull();
    });
  });

  // ============================================================
  // getCachedZipCode
  // ============================================================
  describe('getCachedZipCode', () => {
    it('returns null when no cache exists', async () => {
      const result = await getCachedZipCode('12345');
      expect(result).toBeNull();
    });

    it('returns cached data when it exists', async () => {
      const cached = { city: 'TestCity', state: 'TC', country: 'US' };
      await AsyncStorage.setItem('@zip_cache_12345', JSON.stringify(cached));

      const result = await getCachedZipCode('12345');
      expect(result).not.toBeNull();
      expect(result?.city).toBe('TestCity');
    });
  });
});
