/**
 * partnersService.test.ts - Partners/sponsors data service
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

import {
  fetchPartners,
  refreshPartners,
  clearPartnersCache,
} from '../../src/services/partnersService';

describe('partnersService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    await clearPartnersCache();
  });

  // ============================================================
  // fetchPartners
  // ============================================================
  describe('fetchPartners', () => {
    it('returns fallback data when Supabase fails and no cache', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
      }));

      const result = await fetchPartners();
      expect(result.source).toBe('fallback');
      expect(result.partners.length).toBeGreaterThan(0);
      expect(result.isAuthoritative).toBe(false);
    });

    it('returns network data when Supabase succeeds', async () => {
      const partnerRows = [
        {
          id: 'p-1',
          name: 'Test Partner',
          logo_url: 'https://example.com/logo.png',
          website_url: 'https://example.com',
          description: 'A test partner',
          is_active: true,
          display_order: 1,
          tier: 'gold',
          created_at: '2026-01-01',
        },
      ];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: partnerRows, error: null }),
      }));

      const result = await fetchPartners();
      expect(result.source).toBe('network');
      expect(result.partners).toHaveLength(1);
      expect(result.isAuthoritative).toBe(true);
    });

    it('returns from memory cache on second call', async () => {
      const partnerRows = [{
        id: 'p-1',
        name: 'Cached Partner',
        is_active: true,
        display_order: 1,
        created_at: '2026-01-01',
      }];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: partnerRows, error: null }),
      }));

      await fetchPartners(); // First call populates memory cache
      const result = await fetchPartners(); // Second call should use memory
      expect(result.source).toBe('memory');
    });
  });

  // ============================================================
  // refreshPartners
  // ============================================================
  describe('refreshPartners', () => {
    it('clears caches and fetches fresh data', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const result = await refreshPartners();
      // After clearing, should not be 'memory' source
      expect(result.source).not.toBe('memory');
    });
  });

  // ============================================================
  // clearPartnersCache
  // ============================================================
  describe('clearPartnersCache', () => {
    it('removes partners data from AsyncStorage', async () => {
      await AsyncStorage.setItem('@partners_data', JSON.stringify([{ id: 'p-1' }]));
      await AsyncStorage.setItem('@partners_last_fetched', Date.now().toString());
      await clearPartnersCache();
      expect(await AsyncStorage.getItem('@partners_data')).toBeNull();
      expect(await AsyncStorage.getItem('@partners_last_fetched')).toBeNull();
    });
  });
});
