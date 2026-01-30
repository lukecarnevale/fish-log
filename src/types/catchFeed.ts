// types/catchFeed.ts
//
// Type definitions for the Catch Feed feature - a community catch-sharing feed
// where rewards-enrolled users can share their catches.
//

/**
 * Represents a species and count for a catch entry.
 */
export interface SpeciesCatch {
  species: string;
  count: number;
}

/**
 * Represents a single catch entry in the feed.
 * Now supports multiple species from a single submission.
 */
export interface CatchFeedEntry {
  id: string;
  userId: string;
  anglerName: string;           // First name + last initial (e.g., "John D.")
  anglerProfileImage?: string;
  species: string;              // Primary species (for backwards compatibility and theming)
  speciesList: SpeciesCatch[];  // All species caught in this submission
  totalFish: number;            // Total count of all fish
  photoUrl?: string;
  catchDate: string;            // ISO date string
  location?: string;            // General area (e.g., "Pamlico Sound")
  createdAt: string;            // When the report was submitted
}

/**
 * Represents an angler's profile with their catch statistics.
 */
export interface AnglerProfile {
  userId: string;
  displayName: string;          // First name + last initial
  profileImage?: string;
  totalCatches: number;
  speciesCaught: string[];      // Unique species list
  topSpecies?: string;          // Most frequently caught species
  recentCatches: CatchFeedEntry[];
  memberSince: string;          // rewardsOptedInAt timestamp
}

/**
 * Raw row from Supabase for catch feed entries.
 * Used for transforming database rows to CatchFeedEntry.
 */
export interface CatchFeedRow {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  species: string;
  length: string | null;
  photo_url: string | null;
  catch_date: string | null;
  location: string | null;
  created_at: string;
}

/**
 * Raw row from Supabase for angler profile data.
 */
export interface AnglerProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  rewards_opted_in_at: string | null;
  total_reports: number;
  total_fish: number;
}

/**
 * Transform a Supabase row to a CatchFeedEntry.
 * Note: This is a legacy function for single-species entries.
 * For multi-species entries, use the transformation in catchFeedService.
 */
export function transformToCatchFeedEntry(row: CatchFeedRow): CatchFeedEntry {
  const firstName = row.first_name || 'Anonymous';
  const lastInitial = row.last_name ? `${row.last_name.charAt(0)}.` : '';

  return {
    id: row.id,
    userId: row.user_id,
    anglerName: `${firstName} ${lastInitial}`.trim(),
    anglerProfileImage: row.profile_image_url || undefined,
    species: row.species,
    speciesList: [{ species: row.species, count: 1 }],
    totalFish: 1,
    photoUrl: row.photo_url || undefined,
    catchDate: row.catch_date || row.created_at,
    location: row.location || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Format a date string to a relative time (e.g., "2h ago", "3d ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format member since date for display.
 */
export function formatMemberSince(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Represents a top angler for the "This Week's Top Anglers" section.
 */
export interface TopAngler {
  type: 'catches' | 'species' | 'length';
  userId: string;
  displayName: string;
  profileImage?: string;
  value: number | string;  // Number for catches/species, string for length (e.g., "32 inches")
  label: string;           // Display label (e.g., "catches", "species", "longest")
}
