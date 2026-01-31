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
  SpeciesCatch,
  TopAngler,
  transformToCatchFeedEntry,
} from '../types/catchFeed';

// Storage keys for caching
const STORAGE_KEYS = {
  feedCache: '@catch_feed_cache',
  feedCacheTimestamp: '@catch_feed_cache_timestamp',
} as const;

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

// Default page size for pagination (similar to Instagram ~10-15 posts per load)
const DEFAULT_PAGE_SIZE = 12;

/** Pagination result type */
export interface PaginatedCatchFeed {
  entries: CatchFeedEntry[];
  hasMore: boolean;
  nextOffset: number;
}

// =============================================================================
// Supabase Queries
// =============================================================================

/**
 * Fetch recent catches from rewards-enrolled users with pagination.
 * Joins harvest_reports with users where rewards_opted_in_at is not null.
 * Also fetches fish_entries to get individual fish lengths.
 */
async function fetchCatchesFromSupabase(
  limit: number = DEFAULT_PAGE_SIZE,
  offset: number = 0
): Promise<{ entries: CatchFeedEntry[]; hasMore: boolean }> {
  // Query harvest_reports joined with users who have opted into rewards
  // Also fetch fish_entries to get lengths
  // Request one extra to determine if there are more results
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
      ),
      fish_entries (
        species,
        count,
        lengths,
        tag_number
      )
    `)
    .not('users.rewards_opted_in_at', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit); // Fetch limit + 1 to check for more

  if (error) {
    throw new Error(`Failed to fetch catch feed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { entries: [], hasMore: false };
  }

  // Check if there are more results (we fetched limit + 1)
  const hasMore = data.length > limit;
  const resultsToProcess = hasMore ? data.slice(0, limit) : data;

  // Transform to CatchFeedEntry - create ONE entry per report with all species
  const entries: CatchFeedEntry[] = [];

  for (const report of resultsToProcess) {
    // Type assertion for nested join data - Supabase returns single object for !inner joins
    const user = (report.users as unknown) as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      profile_image_url: string | null;
      rewards_opted_in_at: string | null;
    };

    // Fish entries from the separate table (includes lengths)
    const fishEntries = (report.fish_entries as unknown) as Array<{
      species: string;
      count: number;
      lengths: string[] | null;
      tag_number: string | null;
    }> | null;

    // Skip if user data is missing
    if (!user || !user.id) continue;

    const firstName = user.first_name || 'Anonymous';
    const lastInitial = user.last_name ? `${user.last_name.charAt(0)}.` : '';
    const anglerName = `${firstName} ${lastInitial}`.trim();

    let speciesList: SpeciesCatch[];

    // Prefer fish_entries if available (has lengths), otherwise fall back to counts
    if (fishEntries && fishEntries.length > 0) {
      speciesList = fishEntries.map(fe => ({
        species: fe.species,
        count: fe.count,
        lengths: fe.lengths || undefined,
        tagNumber: fe.tag_number || undefined,
      }));
    } else {
      // Fallback: collect all species with count > 0 from aggregate counts
      const allSpecies = [
        { species: 'Red Drum', count: report.red_drum_count },
        { species: 'Southern Flounder', count: report.flounder_count },
        { species: 'Spotted Seatrout', count: report.spotted_seatrout_count },
        { species: 'Weakfish', count: report.weakfish_count },
        { species: 'Striped Bass', count: report.striped_bass_count },
      ];

      speciesList = allSpecies
        .filter(s => s.count && s.count > 0)
        .map(s => ({ species: s.species, count: s.count as number }));
    }

    // Skip reports with no fish (shouldn't happen, but just in case)
    if (speciesList.length === 0) continue;

    // Calculate total fish count
    const totalFish = speciesList.reduce((sum, s) => sum + s.count, 0);

    // Primary species is the one with the highest count (for theming)
    const primarySpecies = speciesList.reduce((max, s) =>
      s.count > max.count ? s : max, speciesList[0]);

    entries.push({
      id: report.id,
      userId: user.id,
      anglerName,
      anglerProfileImage: user.profile_image_url || undefined,
      species: primarySpecies.species,
      speciesList,
      totalFish,
      photoUrl: report.photo_url || undefined,
      catchDate: report.harvest_date || report.created_at,
      location: report.area_label || undefined,
      createdAt: report.created_at,
      likeCount: 0,
      isLikedByCurrentUser: false,
    });
  }

  return { entries, hasMore };
}

/**
 * Fetch a specific angler's profile and their catches.
 */
async function fetchAnglerProfileFromSupabase(userId: string): Promise<AnglerProfile | null> {
  // Fetch user info (note: total_fish is calculated from reports, not stored on user)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, first_name, last_name, profile_image_url, rewards_opted_in_at, total_reports, created_at')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    throw new Error(`Failed to fetch angler profile: ${userError?.message || 'User not found'}`);
  }

  // Fetch their reports with fish entries
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
      striped_bass_count,
      fish_entries (
        species,
        count,
        lengths,
        tag_number
      )
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
  const speciesCountsTotal: Record<string, number> = {};
  const recentCatches: CatchFeedEntry[] = [];

  for (const report of (reportsData || [])) {
    // Fish entries from the separate table (includes lengths)
    const fishEntries = (report.fish_entries as unknown) as Array<{
      species: string;
      count: number;
      lengths: string[] | null;
      tag_number: string | null;
    }> | null;

    let speciesList: SpeciesCatch[];

    // Prefer fish_entries if available (has lengths), otherwise fall back to counts
    if (fishEntries && fishEntries.length > 0) {
      speciesList = fishEntries.map(fe => ({
        species: fe.species,
        count: fe.count,
        lengths: fe.lengths || undefined,
        tagNumber: fe.tag_number || undefined,
      }));
    } else {
      // Fallback: collect all species with count > 0 from aggregate counts
      const speciesInReport = [
        { species: 'Red Drum', count: report.red_drum_count },
        { species: 'Southern Flounder', count: report.flounder_count },
        { species: 'Spotted Seatrout', count: report.spotted_seatrout_count },
        { species: 'Weakfish', count: report.weakfish_count },
        { species: 'Striped Bass', count: report.striped_bass_count },
      ];

      speciesList = speciesInReport
        .filter(s => s.count && s.count > 0)
        .map(s => ({ species: s.species, count: s.count as number }));
    }

    // Track species for profile stats
    for (const { species, count } of speciesList) {
      speciesSet.add(species);
      speciesCountsTotal[species] = (speciesCountsTotal[species] || 0) + count;
    }

    // Add to recent catches (one entry per report, limit to 6 reports)
    if (speciesList.length > 0 && recentCatches.length < 6) {
      const totalFish = speciesList.reduce((sum, s) => sum + s.count, 0);
      const primarySpecies = speciesList.reduce((max, s) =>
        s.count > max.count ? s : max, speciesList[0]);

      recentCatches.push({
        id: report.id,
        userId: userData.id,
        anglerName: displayName,
        anglerProfileImage: userData.profile_image_url || undefined,
        species: primarySpecies.species,
        speciesList,
        totalFish,
        photoUrl: report.photo_url || undefined,
        catchDate: report.harvest_date || report.created_at,
        location: report.area_label || undefined,
        createdAt: report.created_at,
        likeCount: 0,
        isLikedByCurrentUser: false,
      });
    }
  }

  // Find top species
  let topSpecies: string | undefined;
  let topCount = 0;
  for (const [species, count] of Object.entries(speciesCountsTotal)) {
    if (count > topCount) {
      topCount = count;
      topSpecies = species;
    }
  }

  // Calculate total fish from the accumulated species counts
  const totalFish = Object.values(speciesCountsTotal).reduce((sum, count) => sum + count, 0);

  return {
    userId: userData.id,
    displayName,
    profileImage: userData.profile_image_url || undefined,
    totalCatches: totalFish,
    speciesCaught: Array.from(speciesSet),
    topSpecies,
    recentCatches,
    memberSince: userData.rewards_opted_in_at || userData.created_at,
  };
}

// =============================================================================
// Top Anglers
// =============================================================================

/**
 * Fetch top anglers for "This Week's Top Anglers" section.
 * Returns top anglers for: most catches, most species, and longest fish.
 */
async function fetchTopAnglersFromSupabase(): Promise<TopAngler[]> {
  const topAnglers: TopAngler[] = [];

  // Calculate date 7 days ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoISO = oneWeekAgo.toISOString();

  // Query harvest_reports from the past week with user data and fish entries
  const { data: reportsData, error: reportsError } = await supabase
    .from('harvest_reports')
    .select(`
      id,
      user_id,
      created_at,
      fish_entries (
        species,
        count,
        lengths
      ),
      users!inner (
        id,
        first_name,
        last_name,
        profile_image_url,
        rewards_opted_in_at
      )
    `)
    .not('users.rewards_opted_in_at', 'is', null)
    .gte('created_at', oneWeekAgoISO)
    .order('created_at', { ascending: false });

  if (reportsError) {
    console.error('Failed to fetch reports for top anglers:', reportsError);
    return [];
  }

  if (!reportsData || reportsData.length === 0) {
    return [];
  }

  // Aggregate data per user
  interface UserStats {
    userId: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    totalFish: number;
    speciesSet: Set<string>;
    longestFish: number;
  }

  const userStatsMap = new Map<string, UserStats>();

  for (const report of reportsData) {
    const user = (report.users as unknown) as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      profile_image_url: string | null;
      rewards_opted_in_at: string | null;
    };

    if (!user || !user.id) continue;

    const fishEntries = (report.fish_entries as unknown) as Array<{
      species: string;
      count: number;
      lengths: string[] | null;
    }> | null;

    // Initialize user stats if not exists
    if (!userStatsMap.has(user.id)) {
      userStatsMap.set(user.id, {
        userId: user.id,
        firstName: user.first_name || 'Anonymous',
        lastName: user.last_name || '',
        profileImage: user.profile_image_url,
        totalFish: 0,
        speciesSet: new Set<string>(),
        longestFish: 0,
      });
    }

    const stats = userStatsMap.get(user.id)!;

    // Process fish entries
    if (fishEntries && fishEntries.length > 0) {
      for (const entry of fishEntries) {
        // Add to total fish count
        stats.totalFish += entry.count;

        // Track unique species
        if (entry.species) {
          stats.speciesSet.add(entry.species);
        }

        // Check for longest fish
        if (entry.lengths && entry.lengths.length > 0) {
          for (const lengthStr of entry.lengths) {
            // Parse length string (may be "32" or "32.5" or "32 inches")
            const length = parseFloat(lengthStr);
            if (!isNaN(length) && length > stats.longestFish) {
              stats.longestFish = length;
            }
          }
        }
      }
    }
  }

  // Convert to array for sorting
  const userStatsArray = Array.from(userStatsMap.values());

  // Helper to format display name
  const formatDisplayName = (firstName: string, lastName: string): string => {
    const lastInitial = lastName ? `${lastName.charAt(0)}.` : '';
    return `${firstName} ${lastInitial}`.trim();
  };

  // Find top angler by catches
  const topByCatches = userStatsArray.reduce((max, stats) =>
    stats.totalFish > max.totalFish ? stats : max, userStatsArray[0]);

  if (topByCatches && topByCatches.totalFish > 0) {
    topAnglers.push({
      type: 'catches',
      userId: topByCatches.userId,
      displayName: formatDisplayName(topByCatches.firstName, topByCatches.lastName),
      profileImage: topByCatches.profileImage || undefined,
      value: topByCatches.totalFish,
      label: topByCatches.totalFish === 1 ? 'catch' : 'catches',
    });
  }

  // Find top angler by species variety
  const topBySpecies = userStatsArray.reduce((max, stats) =>
    stats.speciesSet.size > max.speciesSet.size ? stats : max, userStatsArray[0]);

  if (topBySpecies && topBySpecies.speciesSet.size > 0) {
    topAnglers.push({
      type: 'species',
      userId: topBySpecies.userId,
      displayName: formatDisplayName(topBySpecies.firstName, topBySpecies.lastName),
      profileImage: topBySpecies.profileImage || undefined,
      value: topBySpecies.speciesSet.size,
      label: topBySpecies.speciesSet.size === 1 ? 'species' : 'species',
    });
  }

  // Find top angler by longest fish
  const topByLength = userStatsArray.reduce((max, stats) =>
    stats.longestFish > max.longestFish ? stats : max, userStatsArray[0]);

  if (topByLength && topByLength.longestFish > 0) {
    topAnglers.push({
      type: 'length',
      userId: topByLength.userId,
      displayName: formatDisplayName(topByLength.firstName, topByLength.lastName),
      profileImage: topByLength.profileImage || undefined,
      value: `${topByLength.longestFish}"`,
      label: 'longest',
    });
  }

  return topAnglers;
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
 * Fetch recent catches for the feed with pagination support.
 * Returns cached data if available and fresh for the initial load.
 */
export async function fetchRecentCatches(
  options: { forceRefresh?: boolean; limit?: number; offset?: number } = {}
): Promise<PaginatedCatchFeed> {
  const { forceRefresh = false, limit = DEFAULT_PAGE_SIZE, offset = 0 } = options;

  // Only use cache for initial load (offset = 0)
  if (!forceRefresh && offset === 0) {
    const cached = await getCachedFeed();
    if (cached) {
      console.log('📦 Using cached catch feed');
      // For cached data, assume there's more if we have a full page
      return {
        entries: cached,
        hasMore: cached.length >= limit,
        nextOffset: cached.length,
      };
    }
  }

  // Check Supabase connection
  const connected = await isSupabaseConnected();
  if (!connected) {
    // Return cached data even if expired when offline (only for initial load)
    if (offset === 0) {
      const cached = await getCachedFeed();
      if (cached) {
        console.log('📱 Offline - using cached catch feed');
        return {
          entries: cached,
          hasMore: false, // Can't load more offline
          nextOffset: cached.length,
        };
      }
    }
    console.log('📱 Offline - no cached data');
    return { entries: [], hasMore: false, nextOffset: 0 };
  }

  try {
    const { entries, hasMore } = await fetchCatchesFromSupabase(limit, offset);

    // Only cache the initial page
    if (offset === 0) {
      await saveFeedToCache(entries);
    }

    console.log(`✅ Fetched ${entries.length} catches (offset: ${offset}, hasMore: ${hasMore})`);
    return {
      entries,
      hasMore,
      nextOffset: offset + entries.length,
    };
  } catch (error) {
    console.error('Failed to fetch catch feed:', error);

    // Try to return cached data on error (only for initial load)
    if (offset === 0) {
      const cached = await getCachedFeed();
      if (cached) {
        console.log('⚠️ Error fetching - using cached feed');
        return {
          entries: cached,
          hasMore: false,
          nextOffset: cached.length,
        };
      }
    }

    return { entries: [], hasMore: false, nextOffset: offset };
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
 * Fetch top anglers for "This Week's Top Anglers" section.
 * Returns top anglers for: most catches, most species, and longest fish.
 */
export async function fetchTopAnglers(): Promise<TopAngler[]> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    console.log('📱 Offline - cannot fetch top anglers');
    return [];
  }

  try {
    return await fetchTopAnglersFromSupabase();
  } catch (error) {
    console.error('Failed to fetch top anglers:', error);
    return [];
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

// =============================================================================
// Like Functionality
// =============================================================================

/**
 * Fetch like counts and user's like status for a list of catch IDs.
 */
export async function fetchLikesForCatches(
  catchIds: string[],
  currentUserId?: string
): Promise<Map<string, { count: number; isLiked: boolean }>> {
  const likesMap = new Map<string, { count: number; isLiked: boolean }>();

  if (catchIds.length === 0) {
    return likesMap;
  }

  try {
    // Fetch all likes for these catches
    const { data: likesData, error } = await supabase
      .from('catch_likes')
      .select('catch_id, user_id')
      .in('catch_id', catchIds);

    if (error) {
      console.warn('Failed to fetch likes:', error);
      return likesMap;
    }

    // Count likes per catch and check if current user liked
    for (const catchId of catchIds) {
      const catchLikes = (likesData || []).filter(l => l.catch_id === catchId);
      const isLiked = currentUserId
        ? catchLikes.some(l => l.user_id === currentUserId)
        : false;

      likesMap.set(catchId, {
        count: catchLikes.length,
        isLiked,
      });
    }
  } catch (error) {
    console.warn('Error fetching likes:', error);
  }

  return likesMap;
}

/**
 * Like a catch.
 * Returns the new like count on success, or null on failure.
 */
export async function likeCatch(catchId: string, userId: string): Promise<number | null> {
  try {
    // Insert the like (will fail if already exists due to unique constraint)
    const { error: insertError } = await supabase
      .from('catch_likes')
      .insert({ catch_id: catchId, user_id: userId });

    if (insertError) {
      // If it's a duplicate, that's fine - user already liked
      if (insertError.code === '23505') {
        console.log('User already liked this catch');
      } else {
        console.error('Failed to like catch:', insertError);
        return null;
      }
    }

    // Get the updated count
    const { count, error: countError } = await supabase
      .from('catch_likes')
      .select('*', { count: 'exact', head: true })
      .eq('catch_id', catchId);

    if (countError) {
      console.warn('Failed to get like count:', countError);
      return null;
    }

    return count || 0;
  } catch (error) {
    console.error('Error liking catch:', error);
    return null;
  }
}

/**
 * Unlike a catch.
 * Returns the new like count on success, or null on failure.
 */
export async function unlikeCatch(catchId: string, userId: string): Promise<number | null> {
  try {
    // Delete the like
    const { error: deleteError } = await supabase
      .from('catch_likes')
      .delete()
      .eq('catch_id', catchId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Failed to unlike catch:', deleteError);
      return null;
    }

    // Get the updated count
    const { count, error: countError } = await supabase
      .from('catch_likes')
      .select('*', { count: 'exact', head: true })
      .eq('catch_id', catchId);

    if (countError) {
      console.warn('Failed to get like count:', countError);
      return null;
    }

    return count || 0;
  } catch (error) {
    console.error('Error unliking catch:', error);
    return null;
  }
}

/**
 * Enrich catch feed entries with like data.
 */
export async function enrichCatchesWithLikes(
  entries: CatchFeedEntry[],
  currentUserId?: string
): Promise<CatchFeedEntry[]> {
  if (entries.length === 0) return entries;

  const catchIds = entries.map(e => e.id);
  const likesMap = await fetchLikesForCatches(catchIds, currentUserId);

  return entries.map(entry => {
    const likeData = likesMap.get(entry.id);
    return {
      ...entry,
      likeCount: likeData?.count || 0,
      isLikedByCurrentUser: likeData?.isLiked || false,
    };
  });
}
