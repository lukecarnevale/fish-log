// services/rewardsService.ts
//
// Service for managing Quarterly Rewards data.
// Fetches from Supabase when available, falls back to local data.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RewardsConfig,
  RewardsDrawing,
  UserRewardsEntry,
  Prize,
  Quarter,
} from '../types/rewards';
import { supabase, isSupabaseConnected } from '../config/supabase';
import { FALLBACK_CONFIG, FALLBACK_DRAWING } from '../data/rewardsFallbackData';
import { getPendingDrawingId, getPendingSubmission } from './pendingSubmissionService';

// Storage keys
const STORAGE_KEYS = {
  config: '@rewards_config',
  currentDrawing: '@rewards_current_drawing',
  userEntry: '@rewards_user_entry',
  lastFetched: '@rewards_last_fetched',
  supabaseAvailable: '@supabase_available',
  lastSeenDrawingId: '@rewards_last_seen_drawing_id',
} as const;

// Cache duration: 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

// Track Supabase availability (cached to avoid repeated checks)
let supabaseAvailableCache: boolean | null = null;
let lastAvailabilityCheck = 0;
const AVAILABILITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Cache Helpers
// =============================================================================

/**
 * Check if cached data is still valid.
 */
async function isCacheValid(): Promise<boolean> {
  try {
    const lastFetched = await AsyncStorage.getItem(STORAGE_KEYS.lastFetched);
    if (!lastFetched) return false;

    const timestamp = parseInt(lastFetched, 10);
    return Date.now() - timestamp < CACHE_DURATION_MS;
  } catch {
    return false;
  }
}

/**
 * Get cached rewards config from local storage.
 */
async function getCachedConfig(): Promise<RewardsConfig | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.config);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Get cached current drawing from local storage.
 */
async function getCachedDrawing(): Promise<RewardsDrawing | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.currentDrawing);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Get cached user entry from local storage.
 */
async function getCachedUserEntry(): Promise<UserRewardsEntry | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.userEntry);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Save rewards data to local cache.
 */
async function saveToCache(
  config: RewardsConfig,
  drawing: RewardsDrawing | null
): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.config, JSON.stringify(config)],
      [STORAGE_KEYS.currentDrawing, drawing ? JSON.stringify(drawing) : ''],
      [STORAGE_KEYS.lastFetched, Date.now().toString()],
    ]);
  } catch (error) {
    console.error('Failed to save rewards cache:', error);
  }
}

/**
 * Save user entry to local storage.
 */
async function saveUserEntry(entry: UserRewardsEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.userEntry, JSON.stringify(entry));
  } catch (error) {
    console.error('Failed to save user entry:', error);
  }
}

// =============================================================================
// Supabase Integration
// =============================================================================

/**
 * Check if Supabase is available (with caching to avoid excessive checks).
 */
async function isSupabaseAvailable(): Promise<boolean> {
  const now = Date.now();

  // Use cached result if recent
  if (supabaseAvailableCache !== null && now - lastAvailabilityCheck < AVAILABILITY_CHECK_INTERVAL) {
    return supabaseAvailableCache;
  }

  // Check connectivity
  try {
    supabaseAvailableCache = await isSupabaseConnected();
    lastAvailabilityCheck = now;
    return supabaseAvailableCache;
  } catch {
    supabaseAvailableCache = false;
    lastAvailabilityCheck = now;
    return false;
  }
}

/**
 * Transform Supabase rewards_config row to RewardsConfig type.
 */
function transformConfig(row: Record<string, unknown>): RewardsConfig {
  return {
    isEnabled: row.is_enabled as boolean,
    currentDrawingId: row.current_drawing_id as string | null,
    legalDisclaimer: row.legal_disclaimer as string,
    noPurchaseNecessaryText: row.no_purchase_necessary_text as string,
    alternativeEntryText: row.alternative_entry_text as string,
    winnerContactEmail: row.winner_contact_email as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Transform Supabase prize row to Prize type.
 */
function transformPrize(row: Record<string, unknown>): Prize {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    imageUrl: row.image_url as string | undefined,
    value: row.value as string,
    category: row.category as Prize['category'],
    sponsor: row.sponsor as string | undefined,
    sortOrder: row.sort_order as number | undefined,
    isActive: row.is_active as boolean | undefined,
  };
}

/**
 * Transform Supabase rewards_drawings row to RewardsDrawing type.
 */
function transformDrawing(
  row: Record<string, unknown>,
  prizes: Prize[]
): RewardsDrawing {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    eligibilityRequirements: row.eligibility_requirements as string[],
    prizes,
    quarter: row.quarter as Quarter,
    year: row.year as number,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    drawingDate: row.drawing_date as string,
    isActive: row.is_active as boolean,
    alternativeEntryUrl: row.alternative_entry_url as string | undefined,
    rulesUrl: row.rules_url as string | undefined,
    contactEmail: row.contact_email as string | undefined,
  };
}

/**
 * Transform Supabase user_rewards_entries row to UserRewardsEntry type.
 */
function transformUserEntry(row: Record<string, unknown>): UserRewardsEntry {
  return {
    userId: row.user_id as string,
    drawingId: row.drawing_id as string,
    isEntered: row.is_entered as boolean,
    entryMethod: row.entry_method as 'app' | 'web' | 'email' | undefined,
    enteredAt: row.entered_at as string | undefined,
    associatedReportIds: row.associated_report_ids as string[] | undefined,
  };
}

/**
 * Fetch rewards config from Supabase.
 */
async function fetchConfigFromSupabase(): Promise<RewardsConfig> {
  const { data, error } = await supabase
    .from('rewards_config')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    throw new Error(`Failed to fetch config: ${error.message}`);
  }

  return transformConfig(data);
}

/**
 * Fetch current active drawing from Supabase with its prizes.
 */
async function fetchCurrentDrawingFromSupabase(): Promise<RewardsDrawing | null> {
  // First, get the active drawing
  const { data: drawingData, error: drawingError } = await supabase
    .from('rewards_drawings')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (drawingError) {
    // PGRST116 means no rows found - that's okay, just no active drawing
    if (drawingError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch drawing: ${drawingError.message}`);
  }

  if (!drawingData) {
    return null;
  }

  // Get prizes for this drawing
  const { data: drawingPrizes, error: prizesError } = await supabase
    .from('drawing_prizes')
    .select(`
      prize_id,
      prizes (*)
    `)
    .eq('drawing_id', drawingData.id);

  if (prizesError) {
    console.warn('Failed to fetch drawing prizes:', prizesError.message);
  }

  // Transform prizes
  const prizes: Prize[] = (drawingPrizes || [])
    .map((dp: Record<string, unknown>) => {
      const prizeData = dp.prizes as Record<string, unknown>;
      return prizeData ? transformPrize(prizeData) : null;
    })
    .filter((p): p is Prize => p !== null)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return transformDrawing(drawingData, prizes);
}

/**
 * Fetch user's entry for a drawing from Supabase.
 */
async function fetchUserEntryFromSupabase(
  userId: string,
  drawingId: string
): Promise<UserRewardsEntry | null> {
  const { data, error } = await supabase
    .from('user_rewards_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('drawing_id', drawingId)
    .limit(1)
    .single();

  if (error) {
    // PGRST116 means no rows found
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch user entry: ${error.message}`);
  }

  return data ? transformUserEntry(data) : null;
}

/**
 * Create or update user's entry in Supabase.
 */
async function upsertUserEntryToSupabase(
  entry: UserRewardsEntry
): Promise<UserRewardsEntry> {
  const { data, error } = await supabase
    .from('user_rewards_entries')
    .upsert({
      user_id: entry.userId,
      drawing_id: entry.drawingId,
      is_entered: entry.isEntered,
      entry_method: entry.entryMethod,
      entered_at: entry.enteredAt,
      associated_report_ids: entry.associatedReportIds,
    }, {
      onConflict: 'user_id,drawing_id',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save entry: ${error.message}`);
  }

  return transformUserEntry(data);
}

// =============================================================================
// Public API
// =============================================================================

export interface RewardsData {
  config: RewardsConfig;
  currentDrawing: RewardsDrawing | null;
  userEntry: UserRewardsEntry | null;
  fromCache: boolean;
}

/**
 * Fetch all rewards data.
 * Tries Supabase first, falls back to cache, then fallback data.
 */
export async function fetchRewardsData(userId?: string): Promise<RewardsData> {
  // Try Supabase first
  const supabaseAvailable = await isSupabaseAvailable();

  if (supabaseAvailable) {
    try {
      const config = await fetchConfigFromSupabase();
      const currentDrawing = await fetchCurrentDrawingFromSupabase();

      let userEntry: UserRewardsEntry | null = null;
      if (userId && currentDrawing) {
        userEntry = await fetchUserEntryFromSupabase(userId, currentDrawing.id);
      }

      // Cache the fetched data
      await saveToCache(config, currentDrawing);

      console.log('✅ Rewards data fetched from Supabase');
      return { config, currentDrawing, userEntry, fromCache: false };
    } catch (error) {
      console.warn('⚠️ Supabase fetch failed, falling back to cache:', error);
    }
  }

  // Try cache
  const cacheValid = await isCacheValid();
  if (cacheValid) {
    const config = await getCachedConfig();
    const currentDrawing = await getCachedDrawing();
    const userEntry = await getCachedUserEntry();

    if (config) {
      console.log('📦 Using cached rewards data');
      return { config, currentDrawing, userEntry, fromCache: true };
    }
  }

  // Fall back to local data
  console.log('📱 Using fallback rewards data');
  const config = FALLBACK_CONFIG;
  const currentDrawing = FALLBACK_DRAWING;
  const userEntry = await getCachedUserEntry();

  // Save fallback to cache for consistency
  await saveToCache(config, currentDrawing);

  return { config, currentDrawing, userEntry, fromCache: true };
}

/**
 * Fetch only the rewards config.
 */
export async function fetchRewardsConfig(): Promise<RewardsConfig> {
  const { config } = await fetchRewardsData();
  return config;
}

/**
 * Fetch the current active drawing.
 */
export async function fetchCurrentDrawing(): Promise<RewardsDrawing | null> {
  const { currentDrawing } = await fetchRewardsData();
  return currentDrawing;
}

/**
 * Enter the user into the current rewards drawing.
 * If an entry already exists, preserves existing data and appends the new report ID.
 */
export async function enterRewardsDrawing(
  userId: string,
  drawingId: string,
  reportId?: string
): Promise<UserRewardsEntry> {
  // Try Supabase first
  const supabaseAvailable = await isSupabaseAvailable();

  if (supabaseAvailable) {
    try {
      // Check if entry already exists
      const existingEntry = await fetchUserEntryFromSupabase(userId, drawingId);

      // Build the entry, preserving existing report IDs
      const existingReportIds = existingEntry?.associatedReportIds || [];
      const newReportIds = reportId && !existingReportIds.includes(reportId)
        ? [...existingReportIds, reportId]
        : existingReportIds;

      const entry: UserRewardsEntry = {
        userId,
        drawingId,
        isEntered: true,
        entryMethod: existingEntry?.entryMethod || 'app',
        enteredAt: existingEntry?.enteredAt || new Date().toISOString(),
        associatedReportIds: newReportIds,
      };

      const savedEntry = await upsertUserEntryToSupabase(entry);
      // Also save locally for offline access
      await saveUserEntry(savedEntry);
      return savedEntry;
    } catch (error) {
      console.warn('Failed to save entry to Supabase, saving locally:', error);
    }
  }

  // For local storage, also preserve existing report IDs
  const localEntry = await getCachedUserEntry();
  const existingReportIds = (localEntry?.drawingId === drawingId ? localEntry.associatedReportIds : null) || [];
  const newReportIds = reportId && !existingReportIds.includes(reportId)
    ? [...existingReportIds, reportId]
    : existingReportIds;

  const entry: UserRewardsEntry = {
    userId,
    drawingId,
    isEntered: true,
    entryMethod: localEntry?.entryMethod || 'app',
    enteredAt: localEntry?.enteredAt || new Date().toISOString(),
    associatedReportIds: newReportIds,
  };

  // Save locally
  await saveUserEntry(entry);
  return entry;
}

/**
 * Associate a report ID with the user's existing rewards entry.
 *
 * IMPORTANT: This only appends the report to an entry where the user has
 * already explicitly opted in (`is_entered = true`). It will NOT create a
 * new entry or auto-enter the user into the drawing — that must be done
 * via `enterRewardsDrawing()` through an explicit user action.
 *
 * Returns true if the report was associated, false otherwise.
 */
export async function addReportToRewardsEntry(
  userId: string,
  reportId: string
): Promise<boolean> {
  try {
    // Get the current active drawing
    const currentDrawing = await fetchCurrentDrawingFromSupabase().catch(() => null);
    if (!currentDrawing) {
      console.log('No active drawing, skipping report association');
      return false;
    }

    // Only associate the report if the user has already entered this drawing
    const existingEntry = await fetchUserEntryFromSupabase(userId, currentDrawing.id);
    if (!existingEntry || !existingEntry.isEntered) {
      return false;
    }

    // Append the report ID (avoid duplicates)
    const existingIds = existingEntry.associatedReportIds || [];
    if (existingIds.includes(reportId)) {
      return true; // Already associated
    }

    const updatedEntry: UserRewardsEntry = {
      ...existingEntry,
      associatedReportIds: [...existingIds, reportId],
    };

    await upsertUserEntryToSupabase(updatedEntry);
    console.log(`📎 Report ${reportId} associated with rewards entry`);
    return true;
  } catch (error) {
    console.warn('Failed to associate report with rewards entry:', error);
    return false;
  }
}

/**
 * Check if user is entered in a specific drawing.
 */
export async function isUserEntered(
  userId: string,
  drawingId: string
): Promise<boolean> {
  // Try Supabase first
  const supabaseAvailable = await isSupabaseAvailable();

  if (supabaseAvailable) {
    try {
      const entry = await fetchUserEntryFromSupabase(userId, drawingId);
      return entry?.isEntered ?? false;
    } catch {
      // Fall through to local check
    }
  }

  // Check local storage
  const entry = await getCachedUserEntry();
  return entry?.drawingId === drawingId && entry?.isEntered === true;
}

/**
 * Get the list of drawings the user has entered.
 * For backward compatibility with existing enteredRaffles storage.
 */
export async function getEnteredDrawingIds(): Promise<string[]> {
  try {
    // Check legacy storage first
    const legacyRaffles = await AsyncStorage.getItem('enteredRaffles');
    if (legacyRaffles) {
      return JSON.parse(legacyRaffles);
    }

    // Check new storage
    const entry = await getCachedUserEntry();
    return entry?.isEntered ? [entry.drawingId] : [];
  } catch {
    return [];
  }
}

/**
 * Record that user entered a drawing.
 * Maintains backward compatibility with legacy storage.
 */
export async function recordDrawingEntry(drawingId: string): Promise<void> {
  try {
    // Update legacy storage for backward compatibility
    const existing = await AsyncStorage.getItem('enteredRaffles');
    const raffles: string[] = existing ? JSON.parse(existing) : [];

    if (!raffles.includes(drawingId)) {
      raffles.push(drawingId);
      await AsyncStorage.setItem('enteredRaffles', JSON.stringify(raffles));
    }
  } catch (error) {
    console.error('Failed to record drawing entry:', error);
  }
}

/**
 * Get a pending user's drawing entry from their pending submission.
 * This is used to show "Already Entered" status for users who entered
 * the drawing before completing authentication (pending state).
 *
 * @param drawingId - The current drawing ID to check against
 * @returns UserRewardsEntry if pending user has entered this drawing, null otherwise
 */
export async function getPendingDrawingEntry(
  drawingId: string
): Promise<UserRewardsEntry | null> {
  try {
    // Check if there's a pending submission with a drawing entry
    const pendingDrawingId = await getPendingDrawingId();

    if (!pendingDrawingId || pendingDrawingId !== drawingId) {
      return null;
    }

    // Get the full pending submission for the timestamp
    const pendingSubmission = await getPendingSubmission();

    if (!pendingSubmission) {
      return null;
    }

    // Construct a UserRewardsEntry from the pending submission
    return {
      userId: 'pending',
      drawingId: drawingId,
      isEntered: true,
      entryMethod: 'app',
      enteredAt: pendingSubmission.createdAt,
      associatedReportIds: pendingSubmission.formData?.harvestReportId
        ? [pendingSubmission.formData.harvestReportId]
        : [],
    };
  } catch (error) {
    console.warn('Failed to get pending drawing entry:', error);
    return null;
  }
}

/**
 * Clear all cached rewards data.
 * Useful for logout or debugging.
 */
export async function clearRewardsCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.config,
      STORAGE_KEYS.currentDrawing,
      STORAGE_KEYS.userEntry,
      STORAGE_KEYS.lastFetched,
    ]);
    // Reset availability cache
    supabaseAvailableCache = null;
  } catch (error) {
    console.error('Failed to clear rewards cache:', error);
  }
}

/**
 * Force refresh rewards data from source (bypasses cache).
 */
export async function refreshRewardsData(userId?: string): Promise<RewardsData> {
  // Clear cache first
  await clearRewardsCache();
  // Fetch fresh data
  return fetchRewardsData(userId);
}

/**
 * Force a Supabase availability check (useful after network changes).
 */
export function resetSupabaseAvailabilityCache(): void {
  supabaseAvailableCache = null;
  lastAvailabilityCheck = 0;
}

// =============================================================================
// Quarter Change Detection
// =============================================================================

/**
 * Get the last seen drawing ID from storage.
 */
export async function getLastSeenDrawingId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.lastSeenDrawingId);
  } catch {
    return null;
  }
}

/**
 * Save the current drawing ID as the last seen.
 */
export async function setLastSeenDrawingId(drawingId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.lastSeenDrawingId, drawingId);
  } catch (error) {
    console.error('Failed to save last seen drawing ID:', error);
  }
}

/**
 * Check if a new quarter/drawing has started since the user last saw one.
 * Returns the new drawing if it changed, null otherwise.
 */
export async function checkForNewQuarter(): Promise<{
  isNewQuarter: boolean;
  previousDrawingId: string | null;
  currentDrawing: RewardsDrawing | null;
}> {
  const lastSeenId = await getLastSeenDrawingId();
  const { currentDrawing } = await fetchRewardsData();

  if (!currentDrawing) {
    return { isNewQuarter: false, previousDrawingId: lastSeenId, currentDrawing: null };
  }

  // If no previous drawing seen, this is first time - not a "new" quarter
  if (!lastSeenId) {
    await setLastSeenDrawingId(currentDrawing.id);
    return { isNewQuarter: false, previousDrawingId: null, currentDrawing };
  }

  // Check if drawing changed
  const isNewQuarter = lastSeenId !== currentDrawing.id;

  if (isNewQuarter) {
    // Update the last seen ID
    await setLastSeenDrawingId(currentDrawing.id);
  }

  return { isNewQuarter, previousDrawingId: lastSeenId, currentDrawing };
}
