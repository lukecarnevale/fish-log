/**
 * catchFeedService.test.ts - Community catch feed
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

import {
  fetchRecentCatches,
  clearCatchFeedCache,
  likeCatch,
  unlikeCatch,
  fetchLikesForCatches,
} from '../../src/services/catchFeedService';

describe('catchFeedService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    await clearCatchFeedCache();
  });

  // ============================================================
  // fetchRecentCatches
  // ============================================================
  describe('fetchRecentCatches', () => {
    it('returns cached data when offline and cache exists', async () => {
      // Cache stores CatchFeedEntry[] directly, not a wrapper object
      const cachedEntries = [{ id: 'catch-1', species: 'Red Drum' }];
      await AsyncStorage.setItem('@catch_feed_cache', JSON.stringify(cachedEntries));
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', Date.now().toString());

      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await fetchRecentCatches();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe('catch-1');
    });

    it('returns empty feed when offline with no cache', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await fetchRecentCatches();
      expect(result.entries).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('fetches from Supabase when connected', async () => {
      const reportRows = [
        {
          id: 'r-1',
          user_id: 'user-1',
          first_name: 'Test',
          last_name: 'Angler',
          harvest_date: '2026-01-15',
          area_code: 'NC-001',
          area_label: 'Outer Banks',
          photo_url: 'https://example.com/photo.jpg',
          red_drum_count: 1,
          flounder_count: 0,
          spotted_seatrout_count: 0,
          weakfish_count: 0,
          striped_bass_count: 0,
          created_at: '2026-01-15T12:00:00Z',
          fish_entries_json: JSON.stringify([
            { species: 'Red Drum', count: 1, lengths: null, tag_number: null },
          ]),
        },
      ];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: reportRows, error: null }),
      }));

      const result = await fetchRecentCatches({ limit: 20 });
      expect(result.entries.length).toBeGreaterThan(0);
    });

    it('handles Supabase error gracefully', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
      }));

      const result = await fetchRecentCatches();
      expect(result.entries).toEqual([]);
    });
  });

  // ============================================================
  // clearCatchFeedCache
  // ============================================================
  describe('clearCatchFeedCache', () => {
    it('removes cache keys', async () => {
      await AsyncStorage.setItem('@catch_feed_cache', 'data');
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', 'ts');

      await clearCatchFeedCache();

      expect(await AsyncStorage.getItem('@catch_feed_cache')).toBeNull();
      expect(await AsyncStorage.getItem('@catch_feed_cache_timestamp')).toBeNull();
    });
  });

  // ============================================================
  // likeCatch / unlikeCatch
  // ============================================================
  describe('likeCatch', () => {
    it('inserts a like and returns new count', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'catch_likes') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
          };
        }
        return {};
      });

      const count = await likeCatch('catch-1', 'user-1');
      expect(count).toBe(5);
    });

    it('handles duplicate like gracefully (23505)', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockResolvedValue({ error: { code: '23505', message: 'Duplicate' } }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
      }));

      const count = await likeCatch('catch-1', 'user-1');
      // Should still return count despite duplicate
      expect(count).toBe(3);
    });
  });

  describe('unlikeCatch', () => {
    it('deletes a like and returns new count', async () => {
      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // delete chain
          return {
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            match: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        // count query
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
        };
      });

      const count = await unlikeCatch('catch-1', 'user-1');
      expect(count).toBe(2);
    });
  });

  // ============================================================
  // fetchLikesForCatches
  // ============================================================
  describe('fetchLikesForCatches', () => {
    it('returns empty map for empty catch IDs', async () => {
      const likes = await fetchLikesForCatches([]);
      expect(likes.size).toBe(0);
    });
  });
});
