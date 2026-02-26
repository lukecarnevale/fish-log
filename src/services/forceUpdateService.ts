// services/forceUpdateService.ts
//
// Fetches app version configuration from Supabase and determines whether
// the running app version meets the minimum required version.

import { supabase, isSupabaseConnected } from '../config/supabase';

// =============================================================================
// Types
// =============================================================================

export interface AppVersionConfig {
  minimumVersion: string;
  latestVersion: string;
  updateMessage: string;
  forceUpdateMessage: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
}

// =============================================================================
// Version Comparison
// =============================================================================

/**
 * Compare two semver version strings (e.g. "1.2.3").
 * Returns:
 *  -1 if a < b
 *   0 if a === b
 *   1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

/**
 * Returns true if `currentVersion` is below `minimumVersion`.
 */
export function isUpdateRequired(
  currentVersion: string,
  minimumVersion: string,
): boolean {
  return compareVersions(currentVersion, minimumVersion) < 0;
}

// =============================================================================
// Supabase Fetch
// =============================================================================

/**
 * Fetch the app version configuration from the `app_config` table.
 * Returns null if offline or on error (the app should proceed normally).
 */
export async function fetchAppVersionConfig(): Promise<AppVersionConfig | null> {
  try {
    const connected = await isSupabaseConnected();
    if (!connected) {
      return null;
    }

    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('[forceUpdate] Failed to fetch app config:', error?.message);
      return null;
    }

    return {
      minimumVersion: data.minimum_version,
      latestVersion: data.latest_version,
      updateMessage: data.update_message,
      forceUpdateMessage: data.force_update_message,
      iosStoreUrl: data.ios_store_url,
      androidStoreUrl: data.android_store_url,
    };
  } catch (error) {
    console.warn('[forceUpdate] Error fetching app config:', error);
    return null;
  }
}
