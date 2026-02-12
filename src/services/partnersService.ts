// services/partnersService.ts
//
// Service for fetching partner data from Supabase.
// Uses a 3-tier caching strategy (memory → AsyncStorage → network)
// with a static fallback to ensure the footer always renders.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Partner, transformPartner } from '../types/partner';
import { supabase } from '../config/supabase';
import { SPONSORS } from '../constants/sponsorsData';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = '@partners_data';
const STORAGE_TIMESTAMP_KEY = '@partners_last_fetched';

/** Cache duration: 24 hours (partners change infrequently). */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// =============================================================================
// In-Memory Cache
// =============================================================================

let memoryCache: Partner[] | null = null;
let memoryCacheTimestamp = 0;
let memoryCacheIsAuthoritative = false;

// =============================================================================
// Static Fallback
// =============================================================================

/**
 * Convert the existing static SPONSORS array into Partner objects.
 * Ensures the footer always has data to render, even on first launch offline.
 */
function getStaticFallback(): Partner[] {
  return SPONSORS.map((s, index) => ({
    id: s.id,
    name: s.name,
    iconUrl: s.icon,
    websiteUrl: s.website,
    displayOrder: index + 1,
    isActive: true,
  }));
}

// =============================================================================
// AsyncStorage Helpers
// =============================================================================

async function getCachedPartners(): Promise<Partner[] | null> {
  try {
    const [dataStr, tsStr] = await AsyncStorage.multiGet([
      STORAGE_KEY,
      STORAGE_TIMESTAMP_KEY,
    ]);

    const data = dataStr[1];
    const timestamp = tsStr[1];

    if (!data || !timestamp) return null;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > CACHE_DURATION_MS) return null;

    return JSON.parse(data) as Partner[];
  } catch {
    return null;
  }
}

async function savePartnersToCache(partners: Partner[]): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEY, JSON.stringify(partners)],
      [STORAGE_TIMESTAMP_KEY, Date.now().toString()],
    ]);
  } catch (error) {
    console.error('Failed to cache partners:', error);
  }
}

// =============================================================================
// Supabase Fetch
// =============================================================================

async function fetchPartnersFromSupabase(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch partners: ${error.message}`);
  }

  return (data || []).map(transformPartner);
}

// =============================================================================
// Public API
// =============================================================================

export interface PartnersResult {
  partners: Partner[];
  source: 'memory' | 'cache' | 'network' | 'fallback';
  /** True when the authoritative source (Supabase) was reachable. */
  isAuthoritative: boolean;
}

/**
 * Fetch partners using a 3-tier caching strategy:
 *
 *   1. In-memory cache (instant)
 *   2. AsyncStorage cache (fast, survives restarts)
 *   3. Supabase network request (authoritative)
 *   4. Static fallback (always available)
 *
 * The function returns whichever tier resolves first with valid data,
 * then silently refreshes from Supabase in the background.
 */
export async function fetchPartners(): Promise<PartnersResult> {
  // Tier 1: In-memory cache
  if (memoryCache !== null && Date.now() - memoryCacheTimestamp < CACHE_DURATION_MS) {
    return { partners: memoryCache, source: 'memory', isAuthoritative: memoryCacheIsAuthoritative };
  }

  // Tier 2: AsyncStorage cache (may include a cached empty array from Supabase)
  const cached = await getCachedPartners();
  if (cached !== null) {
    // Populate memory cache
    memoryCache = cached;
    memoryCacheTimestamp = Date.now();
    memoryCacheIsAuthoritative = true; // cached data originally came from Supabase

    // Kick off a background refresh (fire-and-forget)
    refreshPartnersInBackground();

    return { partners: cached, source: 'cache', isAuthoritative: true };
  }

  // Tier 3: Network fetch
  try {
    const partners = await fetchPartnersFromSupabase();
    // Always accept the Supabase result — even an empty array is valid
    // (it means there are intentionally no active partnerships).
    memoryCache = partners;
    memoryCacheTimestamp = Date.now();
    memoryCacheIsAuthoritative = true;
    await savePartnersToCache(partners);
    return { partners, source: 'network', isAuthoritative: true };
  } catch (error) {
    console.warn('⚠️ Supabase partners fetch failed:', error);
  }

  // Tier 4: Static fallback (only when Supabase is unreachable)
  const fallback = getStaticFallback();
  memoryCache = fallback;
  memoryCacheTimestamp = Date.now();
  memoryCacheIsAuthoritative = false;
  return { partners: fallback, source: 'fallback', isAuthoritative: false };
}

/**
 * Silently refresh partners data from Supabase.
 * Updates memory + persistent cache without blocking the caller.
 */
async function refreshPartnersInBackground(): Promise<void> {
  try {
    const partners = await fetchPartnersFromSupabase();
    // Always accept the Supabase result (even empty) so stale partner
    // data gets cleared when partnerships end.
    memoryCache = partners;
    memoryCacheTimestamp = Date.now();
    memoryCacheIsAuthoritative = true;
    await savePartnersToCache(partners);
  } catch {
    // Silent failure — cached data is still valid
  }
}

/**
 * Force-refresh partners (bypasses all caches).
 */
export async function refreshPartners(): Promise<PartnersResult> {
  memoryCache = null;
  memoryCacheTimestamp = 0;
  memoryCacheIsAuthoritative = false;

  try {
    await AsyncStorage.multiRemove([STORAGE_KEY, STORAGE_TIMESTAMP_KEY]);
  } catch {
    // Non-critical
  }

  return fetchPartners();
}

/**
 * Clear all cached partner data.
 */
export async function clearPartnersCache(): Promise<void> {
  memoryCache = null;
  memoryCacheTimestamp = 0;
  memoryCacheIsAuthoritative = false;

  try {
    await AsyncStorage.multiRemove([STORAGE_KEY, STORAGE_TIMESTAMP_KEY]);
  } catch (error) {
    console.error('Failed to clear partners cache:', error);
  }
}
