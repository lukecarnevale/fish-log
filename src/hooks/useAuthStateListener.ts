// hooks/useAuthStateListener.ts
//
// Hook for listening to auth state changes and syncing user data.
// Handles session restore, sign in, and sign out events.
//

import { useEffect } from 'react';
import { store } from '../store';
import { fetchUserProfile } from '../store/slices/userSlice';
import {
  onAuthStateChange,
} from '../services/authService';
import {
  createRewardsMemberFromAuthUser,
} from '../services/rewardsConversionService';

/**
 * Hook for listening to auth state changes and syncing user data.
 *
 * Features:
 * - Listens for SIGNED_IN events and syncs user data from Supabase
 * - Listens for SIGNED_OUT events
 * - Refreshes user profile in Redux when signed in
 * - Logs auth state transitions
 * - Cleans up listener on unmount
 */
export function useAuthStateListener() {
  useEffect(() => {
    // Listen for auth state changes (handles session restore, sign out, etc.)
    const unsubscribeAuth = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('🔐 Auth state: SIGNED_IN');
        // User signed in - sync user data from Supabase and refresh
        try {
          const memberResult = await createRewardsMemberFromAuthUser();
          if (memberResult.success) {
            console.log('✅ User data synced from Supabase:', memberResult.user?.email);
          }
        } catch (error) {
          console.warn('⚠️ Failed to sync user data on sign in:', error);
        }
        store.dispatch(fetchUserProfile());
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 Auth state: SIGNED_OUT');
        // User signed out - could clear user data here if needed
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribeAuth();
    };
  }, []);
}
