// services/featureFlagService.ts
//
// Runtime feature flags backed by a Supabase `feature_flags` table.
// Falls back to hardcoded defaults when offline or on error —
// new features default to OFF so they stay hidden if the table is unreachable.

import { supabase, isSupabaseConnected } from '../config/supabase';

// =============================================================================
// Types
// =============================================================================

export type FeatureFlagKey = 'promotions_hub' | 'catch_logging' | 'dark_mode';

export interface FeatureFlag {
  key: FeatureFlagKey;
  enabled: boolean;
}

// =============================================================================
// Defaults — used when Supabase is unreachable
// =============================================================================

const FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  promotions_hub: false,
  catch_logging: false,
  dark_mode: false,
};

// =============================================================================
// In-memory cache
// =============================================================================

let flagCache: Record<string, boolean> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return flagCache !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

/** Clear the in-memory cache (useful for testing or forced refresh). */
export function clearFlagCache(): void {
  flagCache = null;
  cacheTimestamp = 0;
}

// =============================================================================
// Core API
// =============================================================================

/**
 * Fetch all feature flags from Supabase and cache them in memory.
 * Returns cached values if still fresh, or defaults if offline.
 */
export async function fetchFeatureFlags(): Promise<Record<string, boolean>> {
  if (isCacheValid()) {
    return flagCache!;
  }

  const connected = await isSupabaseConnected();
  if (!connected) {
    console.log('🚩 Offline — using default feature flags');
    return { ...FLAG_DEFAULTS };
  }

  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('key, enabled');

    if (error) {
      console.warn('Failed to fetch feature flags:', error.message);
      return { ...FLAG_DEFAULTS };
    }

    const flags: Record<string, boolean> = { ...FLAG_DEFAULTS };
    if (data) {
      for (const row of data) {
        flags[row.key] = row.enabled;
      }
    }

    flagCache = flags;
    cacheTimestamp = Date.now();
    console.log('🚩 Feature flags loaded:', flags);
    return flags;
  } catch (error) {
    console.warn('Failed to fetch feature flags:', error);
    return { ...FLAG_DEFAULTS };
  }
}

/**
 * Check if a specific feature flag is enabled.
 * Returns the default value (false for new features) when offline.
 */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const flags = await fetchFeatureFlags();
  return flags[key] ?? FLAG_DEFAULTS[key] ?? false;
}
