// config/supabase.ts
//
// Supabase client configuration for Fish Log app.
// This client is used for all Supabase interactions including
// the Quarterly Rewards system and future features.
//

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase project configuration
const SUPABASE_URL = 'https://qygvvgbateuorpxntdbq.supabase.co';
const SUPABASE_ANON_KEY = '***REDACTED_SUPABASE_KEY***';

/**
 * Supabase client instance configured for React Native.
 * Uses AsyncStorage for session persistence.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native
  },
});

/**
 * Check if Supabase is properly configured and reachable.
 * Useful for determining whether to use Supabase or fallback data.
 */
export async function isSupabaseConnected(): Promise<boolean> {
  try {
    // Simple health check - try to query the rewards_config table
    const { error } = await supabase
      .from('rewards_config')
      .select('id')
      .limit(1)
      .single();

    // PGRST116 means no rows found, which is fine - table exists
    if (error && error.code !== 'PGRST116') {
      console.warn('Supabase connection check failed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Supabase not reachable:', err);
    return false;
  }
}

// Export configuration for reference
export const supabaseConfig = {
  url: SUPABASE_URL,
  // Note: anon key is safe to expose - it only has public access
};
