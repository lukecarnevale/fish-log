// types/communityStats.ts
//
// Type definitions for the Community Stats Dashboard and Enhanced Leaderboards.
// Supports community-wide aggregate counters, time-period leaderboards
// (weekly/monthly/all-time), species-specific rankings, and seasonal trends.
//

/**
 * Supported leaderboard period types.
 * Used as the `leaderboard_type` column value and as filter keys in the UI.
 */
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';

/**
 * Aggregate community statistics for a given period and optional species filter.
 * Returned by the `get_community_stats_by_species` and `get_community_stats_overall` RPCs.
 */
export interface CommunityStat {
  /** The species name, or null for overall (all species combined) */
  species: string | null;
  /** Total number of individual fish reported */
  totalFishCount: number;
  /** Total number of harvest reports submitted */
  totalReports: number;
  /** Number of unique anglers who submitted reports */
  uniqueAnglers: number;
  /** Average fish per report (totalFishCount / totalReports) */
  avgFishPerReport: number;
}

/**
 * A single entry in the leaderboard rankings.
 * Returned by the `get_leaderboard_enhanced` RPC.
 */
export interface LeaderboardEntry {
  /** Position in the leaderboard (1-indexed) */
  rank: number;
  /** Supabase user ID */
  userId: string;
  /** First name (nullable for anonymous users) */
  firstName: string | null;
  /** Last name (nullable) */
  lastName: string | null;
  /** User's profile image URL */
  profileImageUrl: string | null;
  /** Total fish caught in the period */
  totalFish: number;
  /** Total reports submitted in the period */
  totalReports: number;
  /** Most-caught species in the period */
  primarySpecies: string | null;
}

/**
 * A single data point for seasonal trend charts.
 * Stores daily and cumulative counts for visualization.
 */
export interface SeasonalTrend {
  /** ISO date string (YYYY-MM-DD) */
  trendDate: string;
  /** Fish caught on this day */
  dailyFish: number;
  /** Reports submitted on this day */
  dailyReports: number;
  /** Cumulative fish count up to and including this day */
  cumulativeFish: number;
  /** Cumulative report count up to and including this day */
  cumulativeReports: number;
}

/**
 * Complete snapshot of community stats, leaderboards, and trends.
 * Used by the CommunityStatsHero and CommunityStatsScreen components.
 */
export interface CommunityStatsSnapshot {
  /** Aggregate stats across all species */
  overallStats: CommunityStat;
  /** Per-species stats keyed by species name (e.g., "Red Drum") */
  speciesStats: Record<string, CommunityStat>;
  /** Current weekly leaderboard (top 10) */
  weeklyLeaderboard: LeaderboardEntry[];
  /** Current monthly leaderboard (top 10) */
  monthlyLeaderboard: LeaderboardEntry[];
  /** All-time leaderboard (top 10) */
  alltimeLeaderboard: LeaderboardEntry[];
  /** Year this data is for */
  year: number;
  /** When this snapshot was last computed */
  computedAt: string;
}

// =============================================================================
// Raw Supabase Row Types (for transformer functions)
// =============================================================================

/**
 * Raw row from `get_community_stats_by_species` RPC.
 */
export interface CommunityStatsBySpeciesRow {
  species: string;
  total_fish_count: number;
  total_reports: number;
  unique_anglers: number;
}

/**
 * Raw row from `get_community_stats_overall` RPC.
 */
export interface CommunityStatsOverallRow {
  total_fish_count: number;
  total_reports: number;
  unique_anglers: number;
  avg_fish_per_report: number;
}

/**
 * Raw row from `get_leaderboard_enhanced` RPC.
 */
export interface LeaderboardEnhancedRow {
  rank: number;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  total_fish: number;
  total_reports: number;
  primary_species: string | null;
}

// =============================================================================
// Transformer Functions
// =============================================================================

/**
 * Transform a raw Supabase species stats row to a CommunityStat.
 */
export function transformCommunityStatBySpecies(
  row: CommunityStatsBySpeciesRow
): CommunityStat {
  return {
    species: row.species,
    totalFishCount: row.total_fish_count || 0,
    totalReports: row.total_reports || 0,
    uniqueAnglers: row.unique_anglers || 0,
    avgFishPerReport:
      row.total_reports > 0
        ? Math.round((row.total_fish_count / row.total_reports) * 100) / 100
        : 0,
  };
}

/**
 * Transform a raw Supabase overall stats row to a CommunityStat.
 */
export function transformCommunityStatOverall(
  row: CommunityStatsOverallRow
): CommunityStat {
  return {
    species: null,
    totalFishCount: row.total_fish_count || 0,
    totalReports: row.total_reports || 0,
    uniqueAnglers: row.unique_anglers || 0,
    avgFishPerReport: row.avg_fish_per_report || 0,
  };
}

/**
 * Transform a raw Supabase leaderboard row to a LeaderboardEntry.
 */
export function transformLeaderboardEntry(
  row: LeaderboardEnhancedRow
): LeaderboardEntry {
  return {
    rank: row.rank,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url,
    totalFish: row.total_fish || 0,
    totalReports: row.total_reports || 0,
    primarySpecies: row.primary_species,
  };
}
