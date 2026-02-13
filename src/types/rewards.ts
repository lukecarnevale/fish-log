// types/rewards.ts
//
// Type definitions for the Quarterly Rewards system.
// Designed to match Supabase table schema for easy integration.
//

/**
 * Prize category for filtering and display purposes.
 */
export type PrizeCategory = 'license' | 'gear' | 'apparel' | 'experience' | 'other';

/**
 * Individual prize that can be won in a rewards drawing.
 * Maps to Supabase `prizes` table.
 */
export interface Prize {
  /** Unique identifier (UUID in Supabase) */
  id: string;
  /** Display name of the prize */
  name: string;
  /** Detailed description */
  description: string;
  /** URL to prize image (optional) */
  imageUrl?: string;
  /** Display value (e.g., "$45.00") */
  value: string;
  /** Category for filtering/display */
  category: PrizeCategory;
  /** Sponsor name (optional) */
  sponsor?: string;
  /** Sort order for display */
  sortOrder?: number;
  /** Whether this prize is currently available */
  isActive?: boolean;
}

/**
 * Quarter identifier (1-4).
 */
export type Quarter = 1 | 2 | 3 | 4;

/**
 * Rewards program period (quarterly drawing).
 * Maps to Supabase `rewards_drawings` table.
 */
export interface RewardsDrawing {
  /** Unique identifier (UUID in Supabase) */
  id: string;
  /** Display name (e.g., "Q1 2026 Rewards") */
  name: string;
  /** Program description with legal disclaimer */
  description: string;
  /** List of eligibility requirements */
  eligibilityRequirements: string[];
  /** Prizes available in this drawing */
  prizes: Prize[];
  /** Quarter number (1-4) */
  quarter: Quarter;
  /** Year of the drawing */
  year: number;
  /** Start date (ISO string: YYYY-MM-DD) */
  startDate: string;
  /** End date (ISO string: YYYY-MM-DD) */
  endDate: string;
  /** Drawing date (ISO string: YYYY-MM-DD) */
  drawingDate: string;
  /** Whether this drawing is currently active */
  isActive: boolean;
  /** Alternative entry URL for legal compliance */
  alternativeEntryUrl?: string;
  /** Official rules URL */
  rulesUrl?: string;
  /** Contact email for the rewards program */
  contactEmail?: string;
}

/**
 * User's entry status for a specific drawing.
 * Maps to Supabase `user_rewards_entries` table.
 */
export interface UserRewardsEntry {
  /** User ID (from auth) */
  userId: string;
  /** Drawing ID */
  drawingId: string;
  /** Whether the user is entered in this drawing */
  isEntered: boolean;
  /** Entry method ('app' | 'web' | 'email') */
  entryMethod?: 'app' | 'web' | 'email';
  /** Date of entry (ISO string) */
  enteredAt?: string;
  /** Associated harvest report IDs (for tracking, not multiple entries) */
  associatedReportIds?: string[];
}

/**
 * Rewards program configuration.
 * Maps to Supabase `rewards_config` table (singleton row).
 */
export interface RewardsConfig {
  /** Whether the rewards program is enabled globally */
  isEnabled: boolean;
  /** Current active drawing ID */
  currentDrawingId: string | null;
  /** Legal disclaimer text */
  legalDisclaimer: string;
  /** "No purchase necessary" text */
  noPurchaseNecessaryText: string;
  /** Alternative entry method description */
  alternativeEntryText: string;
  /** Contact email for winners */
  winnerContactEmail: string;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Combined rewards state for the app.
 * Used by RewardsContext for centralized state management.
 */
export interface RewardsState {
  /** Global rewards configuration */
  config: RewardsConfig | null;
  /** Current active drawing (null if none active) */
  currentDrawing: RewardsDrawing | null;
  /** User's entry status for the current drawing */
  userEntry: UserRewardsEntry | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Last fetch timestamp */
  lastFetched: number | null;
}

/**
 * Calculated values derived from rewards state.
 * Provided by useRewards hook for convenience.
 */
export interface RewardsCalculated {
  /** Days remaining until drawing */
  daysRemaining: number;
  /** Whether the user is eligible (has entry) */
  isEligible: boolean;
  /** Whether the current period is active (between start and end dates) */
  isPeriodActive: boolean;
  /** Formatted drawing date for display */
  formattedDrawingDate: string;
  /** Quarter display string (e.g., "Q1 2026") */
  quarterDisplay: string;
  /** Progress percentage through the current period (0-100) */
  periodProgress: number;
}

// Re-export legacy types for backward compatibility
export type { Prize as LegacyPrize };
export type PrizeDrawing = RewardsDrawing;
export type UserPrizeEntry = UserRewardsEntry;
