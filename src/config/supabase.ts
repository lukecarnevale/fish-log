// config/supabase.ts
//
// Supabase client configuration for Fish Log app.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from './env';

/** Whether Supabase credentials were provided at build time */
export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.error(
    'Supabase credentials missing! EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.',
    `URL present: ${Boolean(env.SUPABASE_URL)}, Key present: ${Boolean(env.SUPABASE_ANON_KEY)}`
  );
}

// Use a placeholder URL when credentials are missing to prevent createClient from crashing.
// All queries will fail gracefully instead of the app white-screening.
const safeUrl = env.SUPABASE_URL || 'https://placeholder.supabase.co';
const safeKey = env.SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Check if Supabase is properly configured and reachable */
export async function isSupabaseConnected(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rewards_config')
      .select('id')
      .limit(1)
      .single();

    // PGRST116 = no rows found, which is fine - table exists
    return !error || error.code === 'PGRST116';
  } catch {
    return false;
  }
}

export const supabaseConfig = {
  url: env.SUPABASE_URL,
};
