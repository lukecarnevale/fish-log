// hooks/useConnectivityMonitoring.ts
//
// Hook for monitoring network connectivity and auto-syncing queued reports.
// Listens to connectivity changes and syncs reports when device comes back online.
//

import { useEffect } from 'react';
import { startConnectivityListener } from './useOfflineStatus';

/**
 * Hook for monitoring network connectivity and auto-syncing queued reports.
 *
 * Features:
 * - Starts connectivity listener on mount
 * - Automatically syncs queued reports when device comes back online
 * - Logs sync results (synced, failed, expired reports)
 * - Cleans up listener on unmount
 */
export function useConnectivityMonitoring() {
  useEffect(() => {
    // Start connectivity listener for auto-syncing queued harvest reports
    // When the device comes back online, this will automatically sync any
    // reports that were queued while offline
    const unsubscribeConnectivity = startConnectivityListener((result) => {
      if (result.synced > 0) {
        console.log(`🎉 Auto-synced ${result.synced} queued harvest report(s)`);
      }
      if (result.failed > 0) {
        console.log(`⚠️ ${result.failed} report(s) failed to sync, will retry later`);
      }
      if (result.expired > 0) {
        console.log(`❌ ${result.expired} report(s) expired after max retries`);
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribeConnectivity();
    };
  }, []);
}
