// config/supabase.ts
//
// Supabase client configuration for Fish Log app.

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
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
