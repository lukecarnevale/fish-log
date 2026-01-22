// hooks/useOfflineStatus.ts
//
// Hook for monitoring network connectivity and auto-syncing queued reports.
// Uses @react-native-community/netinfo to detect connectivity changes.
//

import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getQueueCount, syncQueuedReports, SyncResult } from '../services/offlineQueue';

/**
 * Offline status information returned by the hook.
 */
export interface OfflineStatus {
  /** Whether the device is connected to a network */
  isConnected: boolean;
  /** Whether internet is reachable (has actual connectivity) */
  isInternetReachable: boolean | null;
  /** Combined status: true if connected AND internet is reachable */
  isOnline: boolean;
  /** Number of reports waiting in the queue */
  pendingCount: number;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Result from the last sync attempt */
  lastSyncResult: SyncResult | null;
  /** Manually trigger a sync */
  triggerSync: () => Promise<SyncResult | null>;
  /** Refresh the pending count */
  refreshPendingCount: () => Promise<void>;
}

/**
 * Options for the useOfflineStatus hook.
 */
export interface UseOfflineStatusOptions {
  /** Enable auto-sync when coming back online (default: true) */
  autoSync?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: (result: SyncResult) => void;
  /** Callback when connectivity changes */
  onConnectivityChange?: (isOnline: boolean) => void;
}

/**
 * Hook for monitoring network connectivity and managing offline queue sync.
 *
 * Features:
 * - Tracks network connectivity status
 * - Auto-syncs queued reports when coming back online
 * - Provides manual sync trigger
 * - Tracks pending queue count
 * - Prevents duplicate sync operations
 *
 * @param options - Configuration options
 * @returns Offline status information and controls
 *
 * @example
 * ```typescript
 * const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineStatus({
 *   autoSync: true,
 *   onSyncComplete: (result) => {
 *     console.log(`Synced ${result.synced} reports`);
 *   },
 * });
 *
 * // Show offline banner
 * if (!isOnline) {
 *   return <Banner message="You're offline" />;
 * }
 *
 * // Show pending badge
 * if (pendingCount > 0) {
 *   return <Badge count={pendingCount} />;
 * }
 * ```
 */
export function useOfflineStatus(options: UseOfflineStatusOptions = {}): OfflineStatus {
  const {
    autoSync = true,
    onSyncComplete,
    onConnectivityChange,
  } = options;

  // Network state
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  // Queue state
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Track previous online state to detect transitions
  const wasOnlineRef = useRef<boolean | null>(null);

  // Sync lock to prevent duplicate operations
  const syncLockRef = useRef<boolean>(false);

  // Track pending timeout for cleanup
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  // Derived state
  const isOnline = isConnected && isInternetReachable !== false;

  /**
   * Refresh the pending count from AsyncStorage.
   */
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      if (isMountedRef.current) {
        setPendingCount(count);
      }
    } catch (error) {
      console.error('Failed to get queue count:', error);
    }
  }, []);

  /**
   * Trigger a manual sync of queued reports.
   * Returns null if a sync is already in progress or there are no reports.
   */
  const triggerSync = useCallback(async (): Promise<SyncResult | null> => {
    // Prevent duplicate syncs
    if (syncLockRef.current) {
      console.log('⏳ Sync already in progress, skipping...');
      return null;
    }

    // Check if there's anything to sync
    const count = await getQueueCount();
    if (count === 0) {
      console.log('📭 No reports to sync');
      return null;
    }

    try {
      syncLockRef.current = true;
      if (isMountedRef.current) {
        setIsSyncing(true);
      }

      console.log('🔄 Starting sync...');
      const result = await syncQueuedReports();

      if (isMountedRef.current) {
        setLastSyncResult(result);
        await refreshPendingCount();
      }

      if (onSyncComplete && isMountedRef.current) {
        onSyncComplete(result);
      }

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return null;
    } finally {
      syncLockRef.current = false;
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [onSyncComplete, refreshPendingCount]);

  /**
   * Handle network state changes.
   */
  const handleConnectivityChange = useCallback(async (state: NetInfoState) => {
    // Don't process if unmounted
    if (!isMountedRef.current) return;

    const connected = state.isConnected ?? false;
    const reachable = state.isInternetReachable;

    setIsConnected(connected);
    setIsInternetReachable(reachable);

    const nowOnline = connected && reachable !== false;
    const wasOnline = wasOnlineRef.current;

    // Notify callback of connectivity change
    if (onConnectivityChange && wasOnline !== null && wasOnline !== nowOnline) {
      onConnectivityChange(nowOnline);
    }

    // Check for offline → online transition
    if (autoSync && wasOnline === false && nowOnline === true) {
      console.log('📶 Back online! Checking for queued reports...');

      // Clear any existing pending timeout
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }

      // Small delay to ensure network is stable
      pendingTimeoutRef.current = setTimeout(async () => {
        // Double-check we're still mounted
        if (!isMountedRef.current) return;

        const count = await getQueueCount();
        if (count > 0 && isMountedRef.current) {
          console.log(`📤 Found ${count} queued reports, starting auto-sync...`);
          await triggerSync();
        }
        pendingTimeoutRef.current = null;
      }, 1000);
    }

    // Update previous state
    wasOnlineRef.current = nowOnline;
  }, [autoSync, onConnectivityChange, triggerSync]);

  /**
   * Initialize network listener on mount.
   */
  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;

    // Get initial state
    NetInfo.fetch()
      .then((state) => {
        if (!isMountedRef.current) return;

        const connected = state.isConnected ?? false;
        const reachable = state.isInternetReachable;

        setIsConnected(connected);
        setIsInternetReachable(reachable);

        const nowOnline = connected && reachable !== false;
        wasOnlineRef.current = nowOnline;

        console.log(`📶 Initial network state: ${nowOnline ? 'online' : 'offline'}`);
      })
      .catch((error) => {
        console.error('Failed to get initial network state:', error);
      });

    // Load initial pending count
    refreshPendingCount();

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [handleConnectivityChange, refreshPendingCount]);

  return {
    isConnected,
    isInternetReachable,
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    triggerSync,
    refreshPendingCount,
  };
}

/**
 * Standalone function to start a global connectivity listener.
 *
 * Use this in App.tsx to start listening immediately on app launch,
 * independent of any component lifecycle.
 *
 * @param onSync - Optional callback when sync completes
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * // In App.tsx
 * useEffect(() => {
 *   const unsubscribe = startConnectivityListener((result) => {
 *     console.log(`Auto-synced ${result.synced} reports`);
 *   });
 *   return unsubscribe;
 * }, []);
 * ```
 */
export function startConnectivityListener(
  onSync?: (result: SyncResult) => void
): () => void {
  let wasOnline: boolean | null = null;
  let syncLock = false;
  let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
  let isUnsubscribed = false;

  const listener = NetInfo.addEventListener(async (state) => {
    // Don't process if already unsubscribed
    if (isUnsubscribed) return;

    const nowOnline = state.isConnected && state.isInternetReachable !== false;

    // Check for offline → online transition
    if (wasOnline === false && nowOnline === true) {
      console.log('📶 [Global] Back online! Checking for queued reports...');

      // Prevent duplicate syncs
      if (syncLock) {
        console.log('⏳ [Global] Sync already in progress, skipping...');
        wasOnline = nowOnline;
        return;
      }

      // Clear any existing pending timeout
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
      }

      // Small delay to ensure network is stable
      pendingTimeout = setTimeout(async () => {
        // Double-check we haven't been unsubscribed during the delay
        if (isUnsubscribed) return;

        const count = await getQueueCount();
        if (count > 0 && !syncLock && !isUnsubscribed) {
          syncLock = true;
          console.log(`📤 [Global] Found ${count} queued reports, starting auto-sync...`);

          try {
            const result = await syncQueuedReports();
            console.log(`📊 [Global] Auto-sync complete: ${result.synced} synced, ${result.failed} failed`);

            if (onSync && !isUnsubscribed) {
              onSync(result);
            }
          } catch (error) {
            console.error('[Global] Auto-sync failed:', error);
          } finally {
            syncLock = false;
          }
        }
        pendingTimeout = null;
      }, 1000);
    }

    wasOnline = nowOnline;
  });

  // Get initial state
  NetInfo.fetch()
    .then((state) => {
      if (isUnsubscribed) return;
      wasOnline = state.isConnected && state.isInternetReachable !== false;
      console.log(`📶 [Global] Initial network state: ${wasOnline ? 'online' : 'offline'}`);
    })
    .catch((error) => {
      console.error('[Global] Failed to get initial network state:', error);
    });

  // Return cleanup function
  return () => {
    isUnsubscribed = true;
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    listener();
  };
}

export default useOfflineStatus;
