// services/catchFeedService.ts
//
// Service for fetching catch feed data from Supabase.
// Only shows catches from users who have opted into the rewards program.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConnected } from '../config/supabase';
import {
  CatchFeedEntry,
  AnglerProfile,
  transformToCatchFeedEntry,
} from '../types/catchFeed';

// Storage keys for caching
const STORAGE_KEYS = {
  feedCache: '@catch_feed_cache',
  feedCacheTimestamp: '@catch_feed_cache_timestamp',
} as const;

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

// =============================================================================
// Supabase Queries
// =============================================================================

/**
 * Fetch recent catches from rewards-enrolled users.
 * Joins harvest_reports with users where rewards_opted_in_at is not null.
 */
async function fetchCatchesFromSupabase(limit: number = 50): Promise<CatchFeedEntry[]> {
  // Query harvest_reports joined with users who have opted into rewards
  // Using a raw query since we need to join tables
  const { data, error } = await supabase
    .from('harvest_reports')
    .select(`
      id,
      user_id,
      photo_url,
      area_label,
      harvest_date,
      created_at,
      red_drum_count,
      flounder_count,
      spotted_seatrout_count,
      weakfish_count,
      striped_bass_count,
      users!inner (
        id,
        first_name,
        last_name,
        profile_image_url,
        rewards_opted_in_at
      )
    `)
    .not('users.rewards_opted_in_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch catch feed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform to CatchFeedEntry - create one entry per species caught
  const entries: CatchFeedEntry[] = [];

  for (const report of data) {
    // Type assertion for nested join data - Supabase returns single object for !inner joins
    const user = (report.users as unknown) as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      profile_image_url: string | null;
      rewards_opted_in_at: string | null;
    };

    // Skip if user data is missing
    if (!user || !user.id) continue;

    const firstName = user.first_name || 'Anonymous';
    const lastInitial = user.last_name ? `${user.last_name.charAt(0)}.` : '';
    const anglerName = `${firstName} ${lastInitial}`.trim();

    // Create entries for each species with count > 0
    const speciesCounts = [
      { species: 'Red Drum', count: report.red_drum_count },
      { species: 'Southern Flounder', count: report.flounder_count },
      { species: 'Spotted Seatrout', count: report.spotted_seatrout_count },
      { species: 'Weakfish', count: report.weakfish_count },
      { species: 'Striped Bass', count: report.striped_bass_count },
    ];

    for (const { species, count } of speciesCounts) {
      if (count && count > 0) {
        entries.push({
          id: `${report.id}-${species}`,
          userId: user.id,
          anglerName,
          anglerProfileImage: user.profile_image_url || undefined,
          species,
          photoUrl: report.photo_url || undefined,
          catchDate: report.harvest_date || report.created_at,
          location: report.area_label || undefined,
          createdAt: report.created_at,
        });
      }
    }
  }

  return entries;
}

/**
 * Fetch a specific angler's profile and their catches.
 */
async function fetchAnglerProfileFromSupabase(userId: string): Promise<AnglerProfile | null> {
  // Fetch user info
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, first_name, last_name, profile_image_url, rewards_opted_in_at, total_reports, total_fish, created_at')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    throw new Error(`Failed to fetch angler profile: ${userError?.message || 'User not found'}`);
  }

  // Fetch their reports
  const { data: reportsData, error: reportsError } = await supabase
    .from('harvest_reports')
    .select(`
      id,
      photo_url,
      area_label,
      harvest_date,
      created_at,
      red_drum_count,
      flounder_count,
      spotted_seatrout_count,
      weakfish_count,
      striped_bass_count
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (reportsError) {
    console.warn('Failed to fetch angler reports:', reportsError);
  }

  const firstName = userData.first_name || 'Anonymous';
  const lastInitial = userData.last_name ? `${userData.last_name.charAt(0)}.` : '';
  const displayName = `${firstName} ${lastInitial}`.trim();

  // Collect all species from their reports
  const speciesSet = new Set<string>();
  const speciesCounts: Record<string, number> = {};
  const recentCatches: CatchFeedEntry[] = [];

  for (const report of (reportsData || [])) {
    const speciesInReport = [
      { species: 'Red Drum', count: report.red_drum_count },
      { species: 'Southern Flounder', count: report.flounder_count },
      { species: 'Spotted Seatrout', count: report.spotted_seatrout_count },
      { species: 'Weakfish', count: report.weakfish_count },
      { species: 'Striped Bass', count: report.striped_bass_count },
    ];

    for (const { species, count } of speciesInReport) {
      if (count && count > 0) {
        speciesSet.add(species);
        speciesCounts[species] = (speciesCounts[species] || 0) + count;

        // Add to recent catches (limit to first few)
        if (recentCatches.length < 6) {
          recentCatches.push({
            id: `${report.id}-${species}`,
            userId: userData.id,
            anglerName: displayName,
            anglerProfileImage: userData.profile_image_url || undefined,
            species,
            photoUrl: report.photo_url || undefined,
            catchDate: report.harvest_date || report.created_at,
            location: report.area_label || undefined,
            createdAt: report.created_at,
          });
        }
      }
    }
  }

  // Find top species
  let topSpecies: string | undefined;
  let topCount = 0;
  for (const [species, count] of Object.entries(speciesCounts)) {
    if (count > topCount) {
      topCount = count;
      topSpecies = species;
    }
  }

  return {
    userId: userData.id,
    displayName,
    profileImage: userData.profile_image_url || undefined,
    totalCatches: userData.total_fish || 0,
    speciesCaught: Array.from(speciesSet),
    topSpecies,
    recentCatches,
    memberSince: userData.rewards_opted_in_at || userData.created_at,
  };
}

// =============================================================================
// Caching Helpers
// =============================================================================

/**
 * Get cached feed if still valid.
 */
async function getCachedFeed(): Promise<CatchFeedEntry[] | null> {
  try {
    const timestampStr = await AsyncStorage.getItem(STORAGE_KEYS.feedCacheTimestamp);
    if (!timestampStr) return null;

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    if (now - timestamp > CACHE_DURATION_MS) {
      return null; // Cache expired
    }

    const cached = await AsyncStorage.getItem(STORAGE_KEYS.feedCache);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Save feed to cache.
 */
async function saveFeedToCache(entries: CatchFeedEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.feedCache, JSON.stringify(entries));
    await AsyncStorage.setItem(STORAGE_KEYS.feedCacheTimestamp, Date.now().toString());
  } catch (error) {
    console.warn('Failed to cache catch feed:', error);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetch recent catches for the feed.
 * Returns cached data if available and fresh, otherwise fetches from Supabase.
 */
export async function fetchRecentCatches(
  options: { forceRefresh?: boolean; limit?: number } = {}
): Promise<CatchFeedEntry[]> {
  const { forceRefresh = false, limit = 50 } = options;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedFeed();
    if (cached) {
      console.log('📦 Using cached catch feed');
      return cached;
    }
  }

  // Check Supabase connection
  const connected = await isSupabaseConnected();
  if (!connected) {
    // Return cached data even if expired when offline
    const cached = await getCachedFeed();
    if (cached) {
      console.log('📱 Offline - using cached catch feed');
      return cached;
    }
    console.log('📱 Offline - no cached data');
    return [];
  }

  try {
    const entries = await fetchCatchesFromSupabase(limit);
    await saveFeedToCache(entries);
    console.log(`✅ Fetched ${entries.length} catches for feed`);
    return entries;
  } catch (error) {
    console.error('Failed to fetch catch feed:', error);

    // Try to return cached data on error
    const cached = await getCachedFeed();
    if (cached) {
      console.log('⚠️ Error fetching - using cached feed');
      return cached;
    }

    return [];
  }
}

/**
 * Fetch an angler's profile.
 */
export async function fetchAnglerProfile(userId: string): Promise<AnglerProfile | null> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    console.log('📱 Offline - cannot fetch angler profile');
    return null;
  }

  try {
    return await fetchAnglerProfileFromSupabase(userId);
  } catch (error) {
    console.error('Failed to fetch angler profile:', error);
    return null;
  }
}

/**
 * Clear the catch feed cache.
 */
export async function clearCatchFeedCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.feedCache,
      STORAGE_KEYS.feedCacheTimestamp,
    ]);
  } catch (error) {
    console.warn('Failed to clear catch feed cache:', error);
  }
}
