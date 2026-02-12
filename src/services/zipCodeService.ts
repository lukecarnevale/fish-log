/**
 * ZIP Code Lookup Service
 *
 * Provides ZIP code validation and city/state lookup using the Zippopotam.us API.
 * Includes caching for offline support and graceful degradation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export interface ZipCodeResult {
  city: string;
  state: string;
  stateAbbr: string;
}

interface ZippopotamResponse {
  'post code': string;
  country: string;
  'country abbreviation': string;
  places: Array<{
    'place name': string;
    longitude: string;
    state: string;
    'state abbreviation': string;
    latitude: string;
  }>;
}

// ============================================
// CONSTANTS
// ============================================

const API_BASE_URL = 'https://api.zippopotam.us/us';
const CACHE_KEY_PREFIX = '@zip_cache_';
const FETCH_TIMEOUT_MS = 5000; // 5 second timeout

// ============================================
// CACHE FUNCTIONS
// ============================================

/**
 * Get cached ZIP code data from AsyncStorage.
 */
export async function getCachedZipCode(zipCode: string): Promise<ZipCodeResult | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${zipCode}`);
    if (cached) {
      return JSON.parse(cached) as ZipCodeResult;
    }
    return null;
  } catch (error) {
    console.warn('Failed to read ZIP cache:', error);
    return null;
  }
}

/**
 * Cache ZIP code data to AsyncStorage.
 */
async function cacheZipCode(zipCode: string, data: ZipCodeResult): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${zipCode}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache ZIP code:', error);
  }
}

// ============================================
// API FUNCTIONS
// ============================================

interface FetchResult {
  data: ZipCodeResult | null;
  notFound: boolean;
  networkError: boolean;
}

/**
 * Fetch ZIP code data from Zippopotam.us API with timeout.
 * Distinguishes between invalid ZIP (404) and network errors.
 */
async function fetchZipCodeFromAPI(zipCode: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/${zipCode}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 404 = invalid ZIP code (not a network error)
    if (response.status === 404) {
      return { data: null, notFound: true, networkError: false };
    }

    if (!response.ok) {
      return { data: null, notFound: false, networkError: true };
    }

    const data: ZippopotamResponse = await response.json();

    if (!data.places || data.places.length === 0) {
      return { data: null, notFound: true, networkError: false };
    }

    const place = data.places[0];
    return {
      data: {
        city: place['place name'],
        state: place.state,
        stateAbbr: place['state abbreviation'],
      },
      notFound: false,
      networkError: false,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    // Don't log aborted requests (expected on timeout or unmount)
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn('ZIP code API fetch failed:', error.message);
    }
    return { data: null, notFound: false, networkError: true };
  }
}

// ============================================
// MAIN LOOKUP FUNCTION
// ============================================

export interface LookupResult {
  data: ZipCodeResult | null;
  source: 'api' | 'cache' | 'none';
  notFound: boolean; // true if API returned 404 (invalid ZIP)
}

/**
 * Look up ZIP code with cache-first strategy.
 *
 * Strategy:
 * 1. Check cache first for instant response
 * 2. Fetch from API
 * 3. Update cache on successful API response
 * 4. Return cached data if network error
 * 5. Return notFound if API confirms invalid ZIP
 *
 * @param zipCode - 5-digit ZIP code
 * @returns Lookup result with data, source, and notFound flag
 */
export async function lookupZipCode(zipCode: string): Promise<LookupResult> {
  // Validate input format
  if (!/^\d{5}$/.test(zipCode)) {
    return { data: null, source: 'none', notFound: false };
  }

  // Check cache first
  const cached = await getCachedZipCode(zipCode);

  // Try API
  const apiResult = await fetchZipCodeFromAPI(zipCode);

  if (apiResult.data) {
    // API success - cache and return
    await cacheZipCode(zipCode, apiResult.data);
    return { data: apiResult.data, source: 'api', notFound: false };
  }

  if (apiResult.notFound) {
    // API confirmed ZIP is invalid (404)
    return { data: null, source: 'none', notFound: true };
  }

  // Network error - return cached data if available
  if (cached) {
    return { data: cached, source: 'cache', notFound: false };
  }

  // No cache and network error - silent fail
  return { data: null, source: 'none', notFound: false };
}

export default {
  lookupZipCode,
  getCachedZipCode,
};
