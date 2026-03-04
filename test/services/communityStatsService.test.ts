/**
 * communityStatsService.test.ts - Community stats dashboard & enhanced leaderboards
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';
import { makeCommunityStat, makeLeaderboardEntry, makeCommunityStatsSnapshot } from '../factories';

import {
  getCommunityStats,
  getLeaderboard,
  getCommunityStatForSpecies,
  clearCommunityStatsCache,
  formatLeaderboardDisplayName,
  formatStatCount,
} from '../../src/services/communityStatsService';

describe('communityStatsService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    await clearCommunityStatsCache();
  });

  // ============================================================
  // getCommunityStats
  // ============================================================
  describe('getCommunityStats', () => {
    const mockOverallRow = {
      total_fish_count: 5000,
      total_reports: 1200,
      unique_anglers: 300,
      avg_fish_per_report: 4.17,
    };

    const mockSpeciesRows = [
      { species: 'Red Drum', total_fish_count: 2000, total_reports: 600, unique_anglers: 200 },
      { species: 'Southern Flounder', total_fish_count: 1500, total_reports: 400, unique_anglers: 150 },
    ];

    const mockLeaderboardRows = [
      {
        rank: 1,
        user_id: 'user-1',
        first_name: 'John',
        last_name: 'Doe',
        profile_image_url: null,
        total_fish: 42,
        total_reports: 15,
        primary_species: 'Red Drum',
      },
    ];

    function setupRpcMock() {
      (mockSupabase as any).rpc = jest.fn().mockImplementation((fnName: string) => {
        if (fnName === 'get_community_stats_overall') {
          return Promise.resolve({ data: [mockOverallRow], error: null });
        }
        if (fnName === 'get_community_stats_by_species') {
          return Promise.resolve({ data: mockSpeciesRows, error: null });
        }
        if (fnName === 'get_leaderboard_enhanced') {
          return Promise.resolve({ data: mockLeaderboardRows, error: null });
        }
        return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } });
      });
    }

    it('fetches full snapshot from Supabase when connected', async () => {
      setupRpcMock();

      const result = await getCommunityStats();

      expect(result).not.toBeNull();
      expect(result!.overallStats.totalFishCount).toBe(5000);
      expect(result!.overallStats.totalReports).toBe(1200);
      expect(result!.overallStats.uniqueAnglers).toBe(300);
      expect(Object.keys(result!.speciesStats)).toHaveLength(2);
      expect(result!.speciesStats['Red Drum'].totalFishCount).toBe(2000);
      expect(result!.weeklyLeaderboard).toHaveLength(1);
      expect(result!.monthlyLeaderboard).toHaveLength(1);
      expect(result!.alltimeLeaderboard).toHaveLength(1);
      expect(result!.year).toBe(new Date().getFullYear());
    });

    it('caches results and returns cached data on subsequent calls', async () => {
      setupRpcMock();

      // First call — fetches from Supabase
      const first = await getCommunityStats();
      expect((mockSupabase as any).rpc).toHaveBeenCalled();

      // Reset mock call counts
      (mockSupabase as any).rpc.mockClear();

      // Second call — should use cache
      const second = await getCommunityStats();
      expect((mockSupabase as any).rpc).not.toHaveBeenCalled();
      expect(second!.overallStats.totalFishCount).toBe(first!.overallStats.totalFishCount);
    });

    it('bypasses cache when forceRefresh is true', async () => {
      setupRpcMock();

      // Pre-populate cache
      await getCommunityStats();
      (mockSupabase as any).rpc.mockClear();

      // Force refresh — should call Supabase again
      await getCommunityStats({ forceRefresh: true });
      expect((mockSupabase as any).rpc).toHaveBeenCalled();
    });

    it('returns null when offline with no cache', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await getCommunityStats();
      expect(result).toBeNull();
    });

    it('returns stale cache when offline', async () => {
      // Pre-populate cache
      const snapshot = makeCommunityStatsSnapshot();
      await AsyncStorage.setItem('@community_stats_cache', JSON.stringify(snapshot));
      // No timestamp (expired cache) — should still return when offline
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await getCommunityStats();
      expect(result).not.toBeNull();
      expect(result!.overallStats.totalFishCount).toBe(snapshot.overallStats.totalFishCount);
    });

    it('returns stale cache when Supabase RPC fails', async () => {
      // Pre-populate cache
      const snapshot = makeCommunityStatsSnapshot();
      await AsyncStorage.setItem('@community_stats_cache', JSON.stringify(snapshot));

      // Make RPC fail
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await getCommunityStats({ forceRefresh: true });
      expect(result).not.toBeNull();
      expect(result!.overallStats.totalFishCount).toBe(snapshot.overallStats.totalFishCount);
    });

    it('handles empty species data gracefully', async () => {
      (mockSupabase as any).rpc = jest.fn().mockImplementation((fnName: string) => {
        if (fnName === 'get_community_stats_overall') {
          return Promise.resolve({ data: [mockOverallRow], error: null });
        }
        if (fnName === 'get_community_stats_by_species') {
          return Promise.resolve({ data: [], error: null });
        }
        if (fnName === 'get_leaderboard_enhanced') {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await getCommunityStats();
      expect(result).not.toBeNull();
      expect(Object.keys(result!.speciesStats)).toHaveLength(0);
      expect(result!.weeklyLeaderboard).toHaveLength(0);
    });

    it('handles null overall stats row', async () => {
      (mockSupabase as any).rpc = jest.fn().mockImplementation((fnName: string) => {
        if (fnName === 'get_community_stats_overall') {
          return Promise.resolve({ data: [], error: null });
        }
        if (fnName === 'get_community_stats_by_species') {
          return Promise.resolve({ data: [], error: null });
        }
        if (fnName === 'get_leaderboard_enhanced') {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await getCommunityStats();
      expect(result).not.toBeNull();
      expect(result!.overallStats.totalFishCount).toBe(0);
    });
  });

  // ============================================================
  // getLeaderboard
  // ============================================================
  describe('getLeaderboard', () => {
    const mockRows = [
      {
        rank: 1,
        user_id: 'user-1',
        first_name: 'Alice',
        last_name: 'Smith',
        profile_image_url: 'https://example.com/alice.jpg',
        total_fish: 50,
        total_reports: 20,
        primary_species: 'Red Drum',
      },
      {
        rank: 2,
        user_id: 'user-2',
        first_name: 'Bob',
        last_name: null,
        profile_image_url: null,
        total_fish: 35,
        total_reports: 12,
        primary_species: 'Spotted Seatrout',
      },
    ];

    it('fetches weekly leaderboard from RPC', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockRows,
        error: null,
      });

      const result = await getLeaderboard('weekly');

      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].firstName).toBe('Alice');
      expect(result[0].totalFish).toBe(50);
      expect(result[1].lastName).toBeNull();

      expect((mockSupabase as any).rpc).toHaveBeenCalledWith('get_leaderboard_enhanced', {
        p_period_type: 'weekly',
        p_species: null,
        p_limit: 10,
        p_region: null,
      });
    });

    it('passes species and region filters to RPC', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockRows.slice(0, 1),
        error: null,
      });

      await getLeaderboard('monthly', {
        species: 'Red Drum',
        region: 'NC-001',
        limit: 5,
      });

      expect((mockSupabase as any).rpc).toHaveBeenCalledWith('get_leaderboard_enhanced', {
        p_period_type: 'monthly',
        p_species: 'Red Drum',
        p_limit: 5,
        p_region: 'NC-001',
      });
    });

    it('caches unfiltered leaderboard results', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockRows,
        error: null,
      });

      // First call
      await getLeaderboard('weekly');
      (mockSupabase as any).rpc.mockClear();

      // Second call — should use cache
      const cached = await getLeaderboard('weekly');
      expect((mockSupabase as any).rpc).not.toHaveBeenCalled();
      expect(cached).toHaveLength(2);
    });

    it('does NOT cache filtered leaderboard results', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockRows.slice(0, 1),
        error: null,
      });

      // First call with species filter
      await getLeaderboard('weekly', { species: 'Red Drum' });
      (mockSupabase as any).rpc.mockClear();

      // Second call with same filter — should NOT use cache
      await getLeaderboard('weekly', { species: 'Red Drum' });
      expect((mockSupabase as any).rpc).toHaveBeenCalled();
    });

    it('returns empty array when offline with no cache', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await getLeaderboard('weekly');
      expect(result).toEqual([]);
    });

    it('returns stale cache when offline', async () => {
      const cached = [makeLeaderboardEntry({ rank: 1, totalFish: 99 })];
      await AsyncStorage.setItem('@leaderboard_weekly_cache', JSON.stringify(cached));

      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await getLeaderboard('weekly');
      expect(result).toHaveLength(1);
      expect(result[0].totalFish).toBe(99);
    });

    it('returns empty array when RPC fails and no cache', async () => {
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await getLeaderboard('monthly');
      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // getCommunityStatForSpecies
  // ============================================================
  describe('getCommunityStatForSpecies', () => {
    it('returns species stat from snapshot', async () => {
      // Pre-populate cache with a snapshot
      const snapshot = makeCommunityStatsSnapshot();
      await AsyncStorage.setItem('@community_stats_cache', JSON.stringify(snapshot));
      await AsyncStorage.setItem('@community_stats_cache_timestamp', Date.now().toString());

      const stat = await getCommunityStatForSpecies('Red Drum');
      expect(stat).not.toBeNull();
      expect(stat!.species).toBe('Red Drum');
      expect(stat!.totalFishCount).toBe(500);
    });

    it('returns null for unknown species', async () => {
      const snapshot = makeCommunityStatsSnapshot();
      await AsyncStorage.setItem('@community_stats_cache', JSON.stringify(snapshot));
      await AsyncStorage.setItem('@community_stats_cache_timestamp', Date.now().toString());

      const stat = await getCommunityStatForSpecies('Bluefin Tuna');
      expect(stat).toBeNull();
    });

    it('returns null when no snapshot available', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const stat = await getCommunityStatForSpecies('Red Drum');
      expect(stat).toBeNull();
    });
  });

  // ============================================================
  // clearCommunityStatsCache
  // ============================================================
  describe('clearCommunityStatsCache', () => {
    it('removes all community stats cache keys', async () => {
      await AsyncStorage.setItem('@community_stats_cache', 'data');
      await AsyncStorage.setItem('@community_stats_cache_timestamp', '123');
      await AsyncStorage.setItem('@leaderboard_weekly_cache', 'data');
      await AsyncStorage.setItem('@leaderboard_weekly_cache_timestamp', '123');

      await clearCommunityStatsCache();

      expect(await AsyncStorage.getItem('@community_stats_cache')).toBeNull();
      expect(await AsyncStorage.getItem('@community_stats_cache_timestamp')).toBeNull();
      expect(await AsyncStorage.getItem('@leaderboard_weekly_cache')).toBeNull();
    });
  });

  // ============================================================
  // Utility functions
  // ============================================================
  describe('formatLeaderboardDisplayName', () => {
    it('formats full name with last initial', () => {
      const entry = makeLeaderboardEntry({ firstName: 'John', lastName: 'Doe' });
      expect(formatLeaderboardDisplayName(entry)).toBe('John D.');
    });

    it('handles null last name', () => {
      const entry = makeLeaderboardEntry({ firstName: 'Alice', lastName: null });
      expect(formatLeaderboardDisplayName(entry)).toBe('Alice');
    });

    it('handles null first name', () => {
      const entry = makeLeaderboardEntry({ firstName: null, lastName: 'Smith' });
      expect(formatLeaderboardDisplayName(entry)).toBe('Anonymous S.');
    });

    it('handles both null', () => {
      const entry = makeLeaderboardEntry({ firstName: null, lastName: null });
      expect(formatLeaderboardDisplayName(entry)).toBe('Anonymous');
    });
  });

  describe('formatStatCount', () => {
    it('formats small numbers with commas', () => {
      expect(formatStatCount(0)).toBe('0');
      expect(formatStatCount(999)).toBe('999');
    });

    it('formats thousands with K suffix', () => {
      expect(formatStatCount(1000)).toBe('1.0K');
      expect(formatStatCount(1234)).toBe('1.2K');
      expect(formatStatCount(9999)).toBe('10.0K');
    });

    it('formats large thousands with K suffix', () => {
      expect(formatStatCount(10000)).toBe('10K');
      expect(formatStatCount(50000)).toBe('50K');
      expect(formatStatCount(999999)).toBe('1000K');
    });

    it('formats millions with M suffix', () => {
      expect(formatStatCount(1000000)).toBe('1.0M');
      expect(formatStatCount(2500000)).toBe('2.5M');
    });
  });
});
