// hooks/useAnonymousUserInitialization.ts
//
// Hook for initializing anonymous user on app startup.
// Creates anonymous user in Supabase if needed.
//

import { useEffect } from 'react';
import {
  getOrCreateAnonymousUser,
} from '../services/anonymousUserService';

/**
 * Hook for initializing anonymous user on app startup.
 *
 * Features:
 * - Creates anonymous user in Supabase if not already exists
 * - Runs once on mount (empty dependency array)
 * - Logs success/failure to console
 */
export function useAnonymousUserInitialization() {
  useEffect(() => {
    // Initialize anonymous user on app startup (creates in Supabase if needed)
    getOrCreateAnonymousUser()
      .then(() => console.log('✅ Anonymous user initialized'))
      .catch((error) => console.warn('⚠️ Failed to initialize anonymous user:', error));
  }, []);
}
