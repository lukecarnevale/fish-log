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
  fetchTopAnglers,
  enrichCatchesWithLikes,
  fetchAnglerProfile,
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

    it('returns like counts and user like status for catch IDs', async () => {
      const likesData = [
        { catch_id: 'c-1', user_id: 'user-1' },
        { catch_id: 'c-1', user_id: 'user-2' },
        { catch_id: 'c-2', user_id: 'user-3' },
      ];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: likesData, error: null }),
      }));

      const likes = await fetchLikesForCatches(['c-1', 'c-2', 'c-3'], 'user-1');
      expect(likes.get('c-1')).toEqual({ count: 2, isLiked: true });
      expect(likes.get('c-2')).toEqual({ count: 1, isLiked: false });
      expect(likes.get('c-3')).toEqual({ count: 0, isLiked: false });
    });

    it('returns empty map when Supabase query errors', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      }));

      const likes = await fetchLikesForCatches(['c-1']);
      expect(likes.size).toBe(0);
    });

    it('handles isLiked correctly when no currentUserId provided', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ catch_id: 'c-1', user_id: 'user-1' }],
          error: null,
        }),
      }));

      const likes = await fetchLikesForCatches(['c-1']);
      expect(likes.get('c-1')).toEqual({ count: 1, isLiked: false });
    });

    it('returns empty map when fetch throws an exception', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockRejectedValue(new Error('Network error')),
      }));

      const likes = await fetchLikesForCatches(['c-1']);
      expect(likes.size).toBe(0);
    });
  });

  // ============================================================
  // fetchRecentCatches – pagination
  // ============================================================
  describe('fetchRecentCatches – pagination', () => {
    const makeRow = (id: string) => ({
      report_id: id,
      user_id: 'user-1',
      first_name: 'Jane',
      last_name: 'Doe',
      harvest_date: '2026-01-15',
      area_label: 'Pamlico Sound',
      photo_url: null,
      profile_image_url: null,
      red_drum_count: 2,
      flounder_count: 0,
      spotted_seatrout_count: 0,
      weakfish_count: 0,
      striped_bass_count: 0,
      created_at: '2026-01-15T12:00:00Z',
      fish_entries_json: [{ species: 'Red Drum', count: 2 }],
      like_count: 0,
    });

    it('sets hasMore=true when more rows than limit are returned', async () => {
      // range(0, 3) returns 4 rows (inclusive), which is > limit=3
      const rows = [makeRow('r-1'), makeRow('r-2'), makeRow('r-3'), makeRow('r-4')];
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: rows, error: null }),
      }));

      const result = await fetchRecentCatches({ limit: 3, offset: 0 });
      expect(result.hasMore).toBe(true);
      expect(result.entries).toHaveLength(3);
      expect(result.nextOffset).toBe(3);
    });

    it('sets hasMore=false when fewer rows than limit are returned', async () => {
      const rows = [makeRow('r-1'), makeRow('r-2')];
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: rows, error: null }),
      }));

      const result = await fetchRecentCatches({ limit: 5, offset: 0 });
      expect(result.hasMore).toBe(false);
      expect(result.entries).toHaveLength(2);
      expect(result.nextOffset).toBe(2);
    });

    it('skips cache for paginated requests (offset > 0)', async () => {
      // Populate cache
      const cachedEntries = [{ id: 'cached', species: 'Red Drum' }];
      await AsyncStorage.setItem('@catch_feed_cache', JSON.stringify(cachedEntries));
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', Date.now().toString());

      const rows = [makeRow('r-page2')];
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: rows, error: null }),
      }));

      const result = await fetchRecentCatches({ offset: 12, limit: 12 });
      expect(result.entries[0].id).toBe('r-page2');
    });

    it('does not cache paginated requests (offset > 0)', async () => {
      const rows = [makeRow('r-1')];
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: rows, error: null }),
      }));

      await fetchRecentCatches({ offset: 12, limit: 12 });

      // Cache should not have been set
      const cached = await AsyncStorage.getItem('@catch_feed_cache');
      expect(cached).toBeNull();
    });

    it('returns empty entries when Supabase returns empty data for paginated request', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const result = await fetchRecentCatches({ offset: 100, limit: 12 });
      expect(result.entries).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('returns empty entries on error for paginated requests (no cache fallback)', async () => {
      // Populate cache to prove it is NOT used for offset > 0 errors
      const cachedEntries = [{ id: 'cached', species: 'Red Drum' }];
      await AsyncStorage.setItem('@catch_feed_cache', JSON.stringify(cachedEntries));
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', Date.now().toString());

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      }));

      const result = await fetchRecentCatches({ offset: 12 });
      expect(result.entries).toEqual([]);
      expect(result.nextOffset).toBe(12);
    });
  });

  // ============================================================
  // fetchRecentCatches – cache expiry
  // ============================================================
  describe('fetchRecentCatches – cache expiry', () => {
    it('uses fresh cache for initial load', async () => {
      const cachedEntries = [{ id: 'cached-fresh', species: 'Flounder' }];
      await AsyncStorage.setItem('@catch_feed_cache', JSON.stringify(cachedEntries));
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', Date.now().toString());

      const result = await fetchRecentCatches();
      expect(result.entries[0].id).toBe('cached-fresh');
    });

    it('ignores expired cache and fetches from Supabase', async () => {
      const cachedEntries = [{ id: 'cached-expired', species: 'Flounder' }];
      await AsyncStorage.setItem('@catch_feed_cache', JSON.stringify(cachedEntries));
      // Set timestamp to 6 minutes ago (cache duration is 5 minutes)
      const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', sixMinutesAgo.toString());

      const freshRow = {
        report_id: 'r-fresh',
        user_id: 'u-1',
        first_name: 'Fresh',
        last_name: null,
        harvest_date: '2026-02-01',
        area_label: null,
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-02-01T00:00:00Z',
        fish_entries_json: [{ species: 'Red Drum', count: 1 }],
        like_count: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [freshRow], error: null }),
      }));

      const result = await fetchRecentCatches();
      expect(result.entries[0].id).toBe('r-fresh');
    });

    it('forceRefresh bypasses cache', async () => {
      const cachedEntries = [{ id: 'cached', species: 'Flounder' }];
      await AsyncStorage.setItem('@catch_feed_cache', JSON.stringify(cachedEntries));
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', Date.now().toString());

      const freshRow = {
        report_id: 'r-forced',
        user_id: 'u-1',
        first_name: 'Forced',
        last_name: null,
        harvest_date: '2026-02-01',
        area_label: null,
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-02-01T00:00:00Z',
        fish_entries_json: [{ species: 'Red Drum', count: 1 }],
        like_count: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [freshRow], error: null }),
      }));

      const result = await fetchRecentCatches({ forceRefresh: true });
      expect(result.entries[0].id).toBe('r-forced');
    });
  });

  // ============================================================
  // fetchRecentCatches – species parsing
  // ============================================================
  describe('fetchRecentCatches – species parsing', () => {
    it('parses fish_entries_json when it is an array', async () => {
      const row = {
        report_id: 'r-arr',
        user_id: 'u-1',
        first_name: 'Array',
        last_name: 'Test',
        harvest_date: '2026-01-01',
        area_label: null,
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-01-01T00:00:00Z',
        fish_entries_json: [
          { species: 'Red Drum', count: 3, lengths: ['20', '22'], tag_number: 'T1' },
          { species: 'Flounder', count: 1 },
        ],
        like_count: 5,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [row], error: null }),
      }));

      const result = await fetchRecentCatches();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].speciesList).toHaveLength(2);
      expect(result.entries[0].speciesList[0].lengths).toEqual(['20', '22']);
      expect(result.entries[0].speciesList[0].tagNumber).toBe('T1');
      expect(result.entries[0].totalFish).toBe(4);
      expect(result.entries[0].species).toBe('Red Drum'); // primary = highest count
    });

    it('falls back to aggregate count columns when fish_entries_json is null', async () => {
      const row = {
        report_id: 'r-agg',
        user_id: 'u-1',
        first_name: 'Aggregate',
        last_name: null,
        harvest_date: '2026-01-01',
        area_label: 'Sounds',
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-01-01T00:00:00Z',
        fish_entries_json: null,
        red_drum_count: 0,
        flounder_count: 2,
        spotted_seatrout_count: 1,
        weakfish_count: 0,
        striped_bass_count: 0,
        like_count: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [row], error: null }),
      }));

      const result = await fetchRecentCatches();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].speciesList).toEqual([
        { species: 'Southern Flounder', count: 2 },
        { species: 'Spotted Seatrout', count: 1 },
      ]);
      expect(result.entries[0].species).toBe('Southern Flounder');
      expect(result.entries[0].totalFish).toBe(3);
    });

    it('skips rows with no fish in any column', async () => {
      const row = {
        report_id: 'r-empty',
        user_id: 'u-1',
        first_name: 'Empty',
        last_name: null,
        harvest_date: '2026-01-01',
        area_label: null,
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-01-01T00:00:00Z',
        fish_entries_json: null,
        red_drum_count: 0,
        flounder_count: 0,
        spotted_seatrout_count: 0,
        weakfish_count: 0,
        striped_bass_count: 0,
        like_count: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [row], error: null }),
      }));

      const result = await fetchRecentCatches();
      expect(result.entries).toHaveLength(0);
    });

    it('handles malformed JSON string in fish_entries_json gracefully', async () => {
      const row = {
        report_id: 'r-bad-json',
        user_id: 'u-1',
        first_name: 'Bad',
        last_name: null,
        harvest_date: '2026-01-01',
        area_label: null,
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-01-01T00:00:00Z',
        fish_entries_json: '{invalid json!!}',
        red_drum_count: 1,
        flounder_count: 0,
        spotted_seatrout_count: 0,
        weakfish_count: 0,
        striped_bass_count: 0,
        like_count: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [row], error: null }),
      }));

      const result = await fetchRecentCatches();
      // Falls back to aggregate counts
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].speciesList).toEqual([
        { species: 'Red Drum', count: 1 },
      ]);
    });

    it('parses valid JSON string in fish_entries_json', async () => {
      const row = {
        report_id: 'r-json-str',
        user_id: 'u-1',
        first_name: 'Json',
        last_name: 'String',
        harvest_date: '2026-01-01',
        area_label: null,
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-01-01T00:00:00Z',
        fish_entries_json: JSON.stringify([
          { species: 'Weakfish', count: 2, lengths: null, tag_number: null },
        ]),
        like_count: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [row], error: null }),
      }));

      const result = await fetchRecentCatches();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].species).toBe('Weakfish');
    });

    it('builds correct anglerName with first and last name', async () => {
      const row = {
        report_id: 'r-name',
        user_id: 'u-1',
        first_name: 'John',
        last_name: 'Smith',
        harvest_date: '2026-01-01',
        area_label: null,
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-01-01T00:00:00Z',
        fish_entries_json: [{ species: 'Red Drum', count: 1 }],
        like_count: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [row], error: null }),
      }));

      const result = await fetchRecentCatches();
      expect(result.entries[0].anglerName).toBe('John S.');
    });

    it('uses Anonymous when first_name is missing', async () => {
      const row = {
        report_id: 'r-anon',
        user_id: 'u-1',
        first_name: null,
        last_name: null,
        harvest_date: null,
        area_label: null,
        photo_url: null,
        profile_image_url: null,
        created_at: '2026-01-01T00:00:00Z',
        fish_entries_json: [{ species: 'Red Drum', count: 1 }],
        like_count: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [row], error: null }),
      }));

      const result = await fetchRecentCatches();
      expect(result.entries[0].anglerName).toBe('Anonymous');
    });
  });

  // ============================================================
  // fetchRecentCatches – error with cache fallback
  // ============================================================
  describe('fetchRecentCatches – error fallback', () => {
    it('falls back to cache on Supabase error for initial load', async () => {
      const cachedEntries = [{ id: 'fallback', species: 'Red Drum' }];
      await AsyncStorage.setItem('@catch_feed_cache', JSON.stringify(cachedEntries));
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', Date.now().toString());

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
      }));

      const result = await fetchRecentCatches({ forceRefresh: true });
      expect(result.entries[0].id).toBe('fallback');
      expect(result.hasMore).toBe(false);
    });

    it('returns hasMore=false when offline with cached data', async () => {
      const cachedEntries = [{ id: 'offline', species: 'Red Drum' }];
      await AsyncStorage.setItem('@catch_feed_cache', JSON.stringify(cachedEntries));
      await AsyncStorage.setItem('@catch_feed_cache_timestamp', Date.now().toString());

      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await fetchRecentCatches();
      expect(result.hasMore).toBe(false);
    });
  });

  // ============================================================
  // likeCatch – error paths
  // ============================================================
  describe('likeCatch – error paths', () => {
    it('returns null on non-duplicate insert error', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockResolvedValue({ error: { code: '42000', message: 'Server error' } }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: null, error: null }),
      }));

      const count = await likeCatch('catch-1', 'user-1');
      expect(count).toBeNull();
    });

    it('returns null when count query fails after insert', async () => {
      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { insert: jest.fn().mockResolvedValue({ error: null }) };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: null, error: { message: 'count fail' } }),
        };
      });

      const count = await likeCatch('catch-1', 'user-1');
      expect(count).toBeNull();
    });

    it('returns null when an exception is thrown', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockRejectedValue(new Error('Network failure')),
      }));

      const count = await likeCatch('catch-1', 'user-1');
      expect(count).toBeNull();
    });
  });

  // ============================================================
  // unlikeCatch – error paths
  // ============================================================
  describe('unlikeCatch – error paths', () => {
    it('returns null when delete errors', async () => {
      // Chain: .delete().eq(catch_id).eq(user_id)
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'delete failed' } }),
          }),
        }),
      }));

      const count = await unlikeCatch('catch-1', 'user-1');
      expect(count).toBeNull();
    });

    it('returns null when an exception is thrown', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      }));

      const count = await unlikeCatch('catch-1', 'user-1');
      expect(count).toBeNull();
    });
  });

  // ============================================================
  // fetchTopAnglers
  // ============================================================
  describe('fetchTopAnglers', () => {
    it('returns empty array when offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const anglers = await fetchTopAnglers();
      expect(anglers).toEqual([]);
    });

    it('returns top anglers from leaderboard RPC', async () => {
      const leaderboardData = [
        {
          user_id: 'u-1',
          first_name: 'Top',
          last_name: 'Fisher',
          profile_image_url: 'https://example.com/pic.jpg',
          total_fish: 25,
          distinct_species: 3,
        },
        {
          user_id: 'u-2',
          first_name: 'Species',
          last_name: 'King',
          profile_image_url: null,
          total_fish: 10,
          distinct_species: 5,
        },
      ];

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: leaderboardData,
        error: null,
      });

      const anglers = await fetchTopAnglers();
      expect(anglers).toHaveLength(2);
      expect(anglers[0].type).toBe('catches');
      expect(anglers[0].displayName).toBe('Top F.');
      expect(anglers[0].value).toBe(25);
      expect(anglers[1].type).toBe('species');
      expect(anglers[1].displayName).toBe('Species K.');
      expect(anglers[1].value).toBe(5);
    });

    it('returns empty array when RPC errors', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      const anglers = await fetchTopAnglers();
      expect(anglers).toEqual([]);
    });

    it('returns empty array when leaderboard data is empty', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const anglers = await fetchTopAnglers();
      expect(anglers).toEqual([]);
    });

    it('returns empty array when fetchTopAnglers throws', async () => {
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('crash'));

      const anglers = await fetchTopAnglers();
      expect(anglers).toEqual([]);
    });

    it('uses singular "catch" label for value of 1', async () => {
      const leaderboardData = [
        {
          user_id: 'u-1',
          first_name: 'Solo',
          last_name: null,
          profile_image_url: null,
          total_fish: 1,
          distinct_species: 0,
        },
      ];

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: leaderboardData,
        error: null,
      });

      const anglers = await fetchTopAnglers();
      expect(anglers).toHaveLength(1);
      expect(anglers[0].label).toBe('catch');
    });
  });

  // ============================================================
  // enrichCatchesWithLikes
  // ============================================================
  describe('enrichCatchesWithLikes', () => {
    it('returns entries unchanged when array is empty', async () => {
      const result = await enrichCatchesWithLikes([]);
      expect(result).toEqual([]);
    });

    it('enriches entries with like count and isLiked status', async () => {
      const entries = [
        { id: 'c-1', userId: 'u-1', anglerName: 'Test', species: 'Red Drum', speciesList: [], totalFish: 1, catchDate: '', createdAt: '', likeCount: 0, isLikedByCurrentUser: false },
        { id: 'c-2', userId: 'u-2', anglerName: 'Test2', species: 'Flounder', speciesList: [], totalFish: 1, catchDate: '', createdAt: '', likeCount: 0, isLikedByCurrentUser: false },
      ] as any;

      const likesData = [
        { catch_id: 'c-1', user_id: 'current-user' },
        { catch_id: 'c-1', user_id: 'other-user' },
        { catch_id: 'c-2', user_id: 'other-user' },
      ];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: likesData, error: null }),
      }));

      const result = await enrichCatchesWithLikes(entries, 'current-user');
      expect(result[0].likeCount).toBe(2);
      expect(result[0].isLikedByCurrentUser).toBe(true);
      expect(result[1].likeCount).toBe(1);
      expect(result[1].isLikedByCurrentUser).toBe(false);
    });
  });

  // ============================================================
  // fetchAnglerProfile
  // ============================================================
  describe('fetchAnglerProfile', () => {
    it('returns null when offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const profile = await fetchAnglerProfile('user-1');
      expect(profile).toBeNull();
    });

    it('returns null when Supabase throws', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      }));

      const profile = await fetchAnglerProfile('user-1');
      expect(profile).toBeNull();
    });
  });
});
