// hooks/useInitializeData.ts
//
// Hook for initializing core Redux data on app startup.
// Fetches user profile, license, and fish reports in parallel.
//

import { useEffect } from 'react';
import { store } from '../store';
import { fetchUserProfile } from '../store/slices/userSlice';
import { fetchLicense } from '../store/slices/licenseSlice';
import { fetchFishReports } from '../store/slices/fishReportsSlice';

/**
 * Hook for loading initial data from Redux store on app startup.
 *
 * Fetches in parallel:
 * - User profile
 * - License information
 * - Fish reports
 *
 * Runs once on mount (empty dependency array).
 */
export function useInitializeData() {
  useEffect(() => {
    // Load all initial data in parallel
    Promise.all([
      store.dispatch(fetchUserProfile()),
      store.dispatch(fetchLicense()),
      store.dispatch(fetchFishReports()),
    ]).catch(error => {
      console.error('Error loading initial data:', error);
    });
  }, []);
}
