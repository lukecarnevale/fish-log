// services/communityStatsService.ts
//
// Service for fetching community-wide statistics and enhanced leaderboards.
// Provides aggregate fish counts, per-species breakdowns, and time-period
// leaderboards (weekly/monthly/all-time) with species and region filtering.
//
// Follows the same offline-first, cache-then-network pattern as catchFeedService.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConnected } from '../config/supabase';
import {
  CommunityStat,
  CommunityStatsSnapshot,
  LeaderboardEntry,
  LeaderboardPeriod,
  CommunityStatsBySpeciesRow,
  CommunityStatsOverallRow,
  LeaderboardEnhancedRow,
  transformCommunityStatBySpecies,
  transformCommunityStatOverall,
  transformLeaderboardEntry,
} from '../types/communityStats';

// =============================================================================
// Constants
// =============================================================================

/** AsyncStorage keys for caching */
const STORAGE_KEYS = {
  communityStats: '@community_stats_cache',
  communityStatsTimestamp: '@community_stats_cache_timestamp',
  leaderboard: (period: LeaderboardPeriod) => `@leaderboard_${period}_cache`,
  leaderboardTimestamp: (period: LeaderboardPeriod) => `@leaderboard_${period}_cache_timestamp`,
} as const;

/** Cache durations */
const CACHE_DURATION = {
  /** Community stats cached for 1 hour */
  communityStats: 60 * 60 * 1000,
  /** Leaderboards cached for 15 minutes */
  leaderboard: 15 * 60 * 1000,
} as const;

/** Default leaderboard page size */
const DEFAULT_LEADERBOARD_LIMIT = 10;

// =============================================================================
// Supabase Queries
// =============================================================================

/**
 * Fetch overall community stats from Supabase RPC.
 */
async function fetchOverallStatsFromSupabase(
  year?: number
): Promise<CommunityStat> {
  const { data, error } = await supabase.rpc('get_community_stats_overall', {
    p_year: year ?? new Date().getFullYear(),
  });

  if (error) {
    throw new Error(`Failed to fetch overall community stats: ${error.message}`);
  }

  // RPC returns a single-row result set
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      species: null,
      totalFishCount: 0,
      totalReports: 0,
      uniqueAnglers: 0,
      avgFishPerReport: 0,
    };
  }

  return transformCommunityStatOverall(row as CommunityStatsOverallRow);
}

/**
 * Fetch per-species community stats from Supabase RPC.
 */
async function fetchSpeciesStatsFromSupabase(
  year?: number
): Promise<Record<string, CommunityStat>> {
  const { data, error } = await supabase.rpc('get_community_stats_by_species', {
    p_year: year ?? new Date().getFullYear(),
  });

  if (error) {
    throw new Error(`Failed to fetch species stats: ${error.message}`);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return {};
  }

  const speciesStats: Record<string, CommunityStat> = {};
  for (const row of data as CommunityStatsBySpeciesRow[]) {
    const stat = transformCommunityStatBySpecies(row);
    speciesStats[stat.species!] = stat;
  }

  return speciesStats;
}

/**
 * Fetch enhanced leaderboard from Supabase RPC.
 */
async function fetchLeaderboardFromSupabase(
  period: LeaderboardPeriod,
  limit: number = DEFAULT_LEADERBOARD_LIMIT,
  species?: string,
  region?: string
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard_enhanced', {
    p_period_type: period,
    p_species: species ?? null,
    p_limit: limit,
    p_region: region ?? null,
  });

  if (error) {
    throw new Error(`Failed to fetch ${period} leaderboard: ${error.message}`);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  return (data as LeaderboardEnhancedRow[]).map(transformLeaderboardEntry);
}

// =============================================================================
// Caching Helpers
// =============================================================================

/**
 * Check if a cache entry is still valid based on TTL.
 */
async function isCacheValid(timestampKey: string, ttlMs: number): Promise<boolean> {
  try {
    const timestampStr = await AsyncStorage.getItem(timestampKey);
    if (!timestampStr) return false;

    const timestamp = parseInt(timestampStr, 10);
    return Date.now() - timestamp < ttlMs;
  } catch {
    return false;
  }
}

/**
 * Get cached data if still valid.
 */
async function getCachedData<T>(
  dataKey: string,
  timestampKey: string,
  ttlMs: number
): Promise<T | null> {
  try {
    const isValid = await isCacheValid(timestampKey, ttlMs);
    if (!isValid) return null;

    const cached = await AsyncStorage.getItem(dataKey);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Save data to cache with timestamp.
 */
async function saveToCache<T>(
  dataKey: string,
  timestampKey: string,
  data: T
): Promise<void> {
  try {
    await AsyncStorage.setItem(dataKey, JSON.stringify(data));
    await AsyncStorage.setItem(timestampKey, Date.now().toString());
  } catch (error) {
    console.warn('Failed to cache community stats data:', error);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetch the full community stats snapshot (overall + per-species + leaderboards).
 * Uses a 1-hour cache for the aggregate data.
 *
 * @param options.forceRefresh - Skip cache and fetch fresh data
 * @returns Complete community stats snapshot, or null if offline and no cache
 */
export async function getCommunityStats(
  options: { forceRefresh?: boolean } = {}
): Promise<CommunityStatsSnapshot | null> {
  const { forceRefresh = false } = options;

  // Check cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = await getCachedData<CommunityStatsSnapshot>(
      STORAGE_KEYS.communityStats,
      STORAGE_KEYS.communityStatsTimestamp,
      CACHE_DURATION.communityStats
    );
    if (cached) {
      console.log('📦 Using cached community stats');
      return cached;
    }
  }

  // Check connectivity
  const connected = await isSupabaseConnected();
  if (!connected) {
    // Return stale cache if available when offline
    try {
      const stale = await AsyncStorage.getItem(STORAGE_KEYS.communityStats);
      if (stale) {
        console.log('📱 Offline - using stale community stats cache');
        return JSON.parse(stale) as CommunityStatsSnapshot;
      }
    } catch {
      // Ignore cache errors
    }
    console.log('📱 Offline - no cached community stats');
    return null;
  }

  try {
    const currentYear = new Date().getFullYear();

    // Fetch all data in parallel for best performance
    const [overallStats, speciesStats, weeklyLeaderboard, monthlyLeaderboard, alltimeLeaderboard] =
      await Promise.all([
        fetchOverallStatsFromSupabase(currentYear),
        fetchSpeciesStatsFromSupabase(currentYear),
        fetchLeaderboardFromSupabase('weekly'),
        fetchLeaderboardFromSupabase('monthly'),
        fetchLeaderboardFromSupabase('alltime'),
      ]);

    const snapshot: CommunityStatsSnapshot = {
      overallStats,
      speciesStats,
      weeklyLeaderboard,
      monthlyLeaderboard,
      alltimeLeaderboard,
      year: currentYear,
      computedAt: new Date().toISOString(),
    };

    // Cache the snapshot
    await saveToCache(
      STORAGE_KEYS.communityStats,
      STORAGE_KEYS.communityStatsTimestamp,
      snapshot
    );

    console.log(
      `✅ Fetched community stats: ${overallStats.totalFishCount} total fish, ` +
      `${Object.keys(speciesStats).length} species, ` +
      `${overallStats.uniqueAnglers} anglers`
    );

    return snapshot;
  } catch (error) {
    console.error('Failed to fetch community stats:', error);

    // Fall back to stale cache on error
    try {
      const stale = await AsyncStorage.getItem(STORAGE_KEYS.communityStats);
      if (stale) {
        console.log('⚠️ Error fetching - using stale community stats');
        return JSON.parse(stale) as CommunityStatsSnapshot;
      }
    } catch {
      // Ignore cache errors
    }

    return null;
  }
}

/**
 * Fetch a leaderboard for a specific period, with optional species/region filter.
 * Uses a 15-minute cache per period type.
 *
 * @param period - 'weekly' | 'monthly' | 'alltime'
 * @param options.limit - Max entries to return (default 10)
 * @param options.species - Filter by species name
 * @param options.region - Filter by area code
 * @param options.forceRefresh - Skip cache
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  options: {
    limit?: number;
    species?: string;
    region?: string;
    forceRefresh?: boolean;
  } = {}
): Promise<LeaderboardEntry[]> {
  const { limit = DEFAULT_LEADERBOARD_LIMIT, species, region, forceRefresh = false } = options;

  // Only use cache for default queries (no species/region filter)
  const useCache = !species && !region;

  if (useCache && !forceRefresh) {
    const cached = await getCachedData<LeaderboardEntry[]>(
      STORAGE_KEYS.leaderboard(period),
      STORAGE_KEYS.leaderboardTimestamp(period),
      CACHE_DURATION.leaderboard
    );
    if (cached) {
      console.log(`📦 Using cached ${period} leaderboard`);
      return cached;
    }
  }

  const connected = await isSupabaseConnected();
  if (!connected) {
    // Return stale cache when offline (only for unfiltered queries)
    if (useCache) {
      try {
        const stale = await AsyncStorage.getItem(STORAGE_KEYS.leaderboard(period));
        if (stale) {
          console.log(`📱 Offline - using stale ${period} leaderboard`);
          return JSON.parse(stale) as LeaderboardEntry[];
        }
      } catch {
        // Ignore cache errors
      }
    }
    console.log(`📱 Offline - no cached ${period} leaderboard`);
    return [];
  }

  try {
    const entries = await fetchLeaderboardFromSupabase(period, limit, species, region);

    // Only cache unfiltered results
    if (useCache) {
      await saveToCache(
        STORAGE_KEYS.leaderboard(period),
        STORAGE_KEYS.leaderboardTimestamp(period),
        entries
      );
    }

    console.log(`✅ Fetched ${period} leaderboard: ${entries.length} entries`);
    return entries;
  } catch (error) {
    console.error(`Failed to fetch ${period} leaderboard:`, error);

    // Fall back to stale cache
    if (useCache) {
      try {
        const stale = await AsyncStorage.getItem(STORAGE_KEYS.leaderboard(period));
        if (stale) {
          console.log(`⚠️ Error fetching - using stale ${period} leaderboard`);
          return JSON.parse(stale) as LeaderboardEntry[];
        }
      } catch {
        // Ignore cache errors
      }
    }

    return [];
  }
}

/**
 * Get community stats for a single species.
 * Fetches the full snapshot and extracts the species data.
 */
export async function getCommunityStatForSpecies(
  species: string
): Promise<CommunityStat | null> {
  const snapshot = await getCommunityStats();
  if (!snapshot) return null;
  return snapshot.speciesStats[species] ?? null;
}

/**
 * Clear all community stats caches (for logout or forced refresh).
 */
export async function clearCommunityStatsCache(): Promise<void> {
  try {
    const keys = [
      STORAGE_KEYS.communityStats,
      STORAGE_KEYS.communityStatsTimestamp,
      STORAGE_KEYS.leaderboard('weekly'),
      STORAGE_KEYS.leaderboardTimestamp('weekly'),
      STORAGE_KEYS.leaderboard('monthly'),
      STORAGE_KEYS.leaderboardTimestamp('monthly'),
      STORAGE_KEYS.leaderboard('alltime'),
      STORAGE_KEYS.leaderboardTimestamp('alltime'),
    ];
    await AsyncStorage.multiRemove(keys);
    console.log('🧹 Cleared community stats cache');
  } catch (error) {
    console.warn('Failed to clear community stats cache:', error);
  }
}

/**
 * Format a leaderboard entry's display name (first name + last initial).
 * Follows the same convention as catchFeedService.
 */
export function formatLeaderboardDisplayName(entry: LeaderboardEntry): string {
  const firstName = entry.firstName || 'Anonymous';
  const lastInitial = entry.lastName ? `${entry.lastName.charAt(0)}.` : '';
  return `${firstName} ${lastInitial}`.trim();
}

/**
 * Format a large number with abbreviation (e.g., 1,234 → "1.2K", 50,000 → "50K").
 * Used by CommunityStatsHero for readable counters.
 */
export function formatStatCount(count: number): string {
  if (count < 1000) return count.toLocaleString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}K`;
  if (count < 1000000) return `${Math.round(count / 1000)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}
