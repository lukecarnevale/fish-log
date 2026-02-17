// contexts/RewardsContext.tsx
//
// React Context for centralized Quarterly Rewards state management.
// Provides rewards data and actions to all components via useRewards hook.
//

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  RewardsConfig,
  RewardsDrawing,
  UserRewardsEntry,
  RewardsState,
  RewardsCalculated,
} from '../types/rewards';
import {
  fetchRewardsData,
  enterRewardsDrawing,
  recordDrawingEntry,
  getEnteredDrawingIds,
  refreshRewardsData,
  checkForNewQuarter,
  setLastSeenDrawingId,
  getPendingDrawingEntry,
  getRewardsStatusByDevice,
} from '../services/rewardsService';
import { getDeviceId } from '../utils/deviceId';
import { updatePendingDrawingEntry } from '../services/pendingSubmissionService';
import { FALLBACK_CONFIG, FALLBACK_DRAWING } from '../data/rewardsFallbackData';
import { getCurrentUserState } from '../services/anonymousUserService';
import { getRewardsMemberForAnonymousUser } from '../services/rewardsConversionService';
import { onAuthStateChange } from '../services/authService';
import {
  calculateDaysRemaining,
  calculatePeriodProgress,
  isWithinPeriod,
  formatDate,
  calculateDerivedValues,
} from '../utils/rewards';

// =============================================================================
// Context Types
// =============================================================================

interface RewardsContextValue {
  // State
  config: RewardsConfig | null;
  currentDrawing: RewardsDrawing | null;
  userEntry: UserRewardsEntry | null;
  isLoading: boolean;
  error: string | null;

  // Calculated values
  calculated: RewardsCalculated;

  // Quarter change detection
  isNewQuarter: boolean;
  acknowledgeNewQuarter: () => void;

  // Actions
  refresh: () => Promise<void>;
  enterDrawing: (reportId?: string) => Promise<boolean>;
  isEnteredInCurrentDrawing: () => boolean;

  // Legacy compatibility
  hasEnteredCurrentRaffle: boolean;
}

// =============================================================================
// Default Values
// =============================================================================

const defaultCalculated: RewardsCalculated = {
  daysRemaining: 0,
  isEligible: false,
  isPeriodActive: false,
  formattedDrawingDate: '',
  quarterDisplay: '',
  periodProgress: 0,
};

const defaultContextValue: RewardsContextValue = {
  config: null,
  currentDrawing: null,
  userEntry: null,
  isLoading: true,
  error: null,
  calculated: defaultCalculated,
  isNewQuarter: false,
  acknowledgeNewQuarter: () => {},
  refresh: async () => {},
  enterDrawing: async () => false,
  isEnteredInCurrentDrawing: () => false,
  hasEnteredCurrentRaffle: false,
};

// =============================================================================
// Context Creation
// =============================================================================

const RewardsContext = createContext<RewardsContextValue>(defaultContextValue);


// =============================================================================
// Provider Component
// =============================================================================

interface RewardsProviderProps {
  children: ReactNode;
  userId?: string;
}

export function RewardsProvider({ children, userId }: RewardsProviderProps): React.ReactElement {
  // State
  const [config, setConfig] = useState<RewardsConfig | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<RewardsDrawing | null>(null);
  const [userEntry, setUserEntry] = useState<UserRewardsEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enteredDrawingIds, setEnteredDrawingIds] = useState<string[]>([]);
  const [isNewQuarter, setIsNewQuarter] = useState(false);

  // Track app state for foreground refresh
  const appState = useRef(AppState.currentState);

  // Load rewards data on mount
  useEffect(() => {
    loadRewardsData();
    // Legacy drawing IDs are loaded inside loadRewardsData via the
    // authenticated-user check — no need to load them unconditionally here.

    // Sync any locally-saved reports on startup.
    // The AppState listener only covers background→active transitions,
    // so a fresh app launch would miss the sync without this.
    import('../services/reportsService').then(({ syncPendingReports, retryFailedWebhooks }) => {
      syncPendingReports()
        .then(({ synced, failed }) => {
          if (synced > 0 || failed > 0) {
            console.log(`📊 Startup sync: ${synced} synced, ${failed} failed`);
          }
        })
        .catch((err: unknown) => {
          console.warn('⚠️ Startup sync error:', err);
        });

      retryFailedWebhooks().catch((err: unknown) => {
        console.warn('⚠️ Startup webhook retry error:', err);
      });
    });
  }, [userId]);

  /**
   * Check for new quarter when drawing changes.
   */
  useEffect(() => {
    if (currentDrawing) {
      checkForNewQuarter().then(({ isNewQuarter: isNew }) => {
        if (isNew) {
          console.log('🎉 New quarterly drawing detected!');
          setIsNewQuarter(true);
        }
      });
    }
  }, [currentDrawing?.id]);

  /**
   * Acknowledge the new quarter (dismiss the notification).
   */
  const acknowledgeNewQuarter = useCallback(() => {
    setIsNewQuarter(false);
    if (currentDrawing) {
      setLastSeenDrawingId(currentDrawing.id);
    }
  }, [currentDrawing]);

  /**
   * Load rewards data from service.
   * Dynamically determines the user ID from rewards member if not provided.
   */
  const loadRewardsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine effective user ID - try to get rewards member if no userId prop
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        try {
          const rewardsMember = await getRewardsMemberForAnonymousUser();
          if (rewardsMember) {
            effectiveUserId = rewardsMember.id;
            console.log('🔍 RewardsContext - Found rewards member for loading:', effectiveUserId);
          }
        } catch (err) {
          console.warn('Could not get rewards member during load:', err);
        }
      }

      const data = await fetchRewardsData(effectiveUserId);
      setConfig(data.config);
      setCurrentDrawing(data.currentDrawing);

      // If no user entry from Supabase and user is not authenticated,
      // check for a pending drawing entry (user entered before completing auth)
      let finalUserEntry = data.userEntry;
      if (!data.userEntry && !effectiveUserId && data.currentDrawing) {
        try {
          const pendingEntry = await getPendingDrawingEntry(data.currentDrawing.id);
          if (pendingEntry) {
            console.log('🎫 Found pending drawing entry for unauthenticated user');
            finalUserEntry = pendingEntry;
          }
        } catch (err) {
          console.warn('Could not check pending drawing entry:', err);
        }
      }

      // If still no entry, try device-based lookup via SECURITY DEFINER RPC.
      // This handles the post-logout case where RLS blocks normal queries.
      if (!finalUserEntry && !effectiveUserId && data.currentDrawing) {
        try {
          const deviceId = await getDeviceId();
          const deviceEntry = await getRewardsStatusByDevice(deviceId);
          if (deviceEntry) {
            console.log('📱 Found rewards entry via device ID lookup');
            finalUserEntry = deviceEntry;
          }
        } catch (err) {
          console.warn('Could not check device rewards status:', err);
        }
      }
      setUserEntry(finalUserEntry);

      // For authenticated users the Supabase userEntry is the source of truth;
      // clear stale legacy IDs so they can't override it.
      if (effectiveUserId) {
        setEnteredDrawingIds([]);
      } else {
        await loadEnteredDrawings();
      }
    } catch (err) {
      console.error('Failed to load rewards data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rewards');

      // Use fallback data on error
      setConfig(FALLBACK_CONFIG);
      setCurrentDrawing(FALLBACK_DRAWING);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Load entered drawing IDs (for backward compatibility).
   */
  const loadEnteredDrawings = useCallback(async () => {
    try {
      const ids = await getEnteredDrawingIds();
      setEnteredDrawingIds(ids);
    } catch {
      setEnteredDrawingIds([]);
    }
  }, []);

  /**
   * Refresh rewards data.
   * Dynamically determines the user ID from rewards member if not provided.
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // Determine effective user ID - try to get rewards member if no userId prop
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        try {
          const rewardsMember = await getRewardsMemberForAnonymousUser();
          if (rewardsMember) {
            effectiveUserId = rewardsMember.id;
            console.log('🔄 RewardsContext - Found rewards member for refresh:', effectiveUserId);
          }
        } catch (err) {
          console.warn('Could not get rewards member during refresh:', err);
        }
      }

      const data = await refreshRewardsData(effectiveUserId);
      setConfig(data.config);
      setCurrentDrawing(data.currentDrawing);

      // If no entry and no effective user ID, try device-based lookup via
      // SECURITY DEFINER RPC (handles post-logout case where RLS blocks queries)
      let finalUserEntry = data.userEntry;
      if (!data.userEntry && !effectiveUserId && data.currentDrawing) {
        try {
          const deviceId = await getDeviceId();
          const deviceEntry = await getRewardsStatusByDevice(deviceId);
          if (deviceEntry) {
            console.log('📱 Found rewards entry via device ID lookup (refresh)');
            finalUserEntry = deviceEntry;
          }
        } catch (err) {
          console.warn('Could not check device rewards status during refresh:', err);
        }
      }
      setUserEntry(finalUserEntry);

      // For authenticated users, the Supabase userEntry is the source of truth —
      // clear stale legacy IDs so they can't override it.
      if (effectiveUserId) {
        setEnteredDrawingIds([]);
      } else {
        await loadEnteredDrawings();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadEnteredDrawings]);

  // Refresh rewards data when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App coming to foreground from background/inactive
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App returned to foreground, refreshing rewards & syncing pending reports...');
        refresh();

        // Sync any locally-saved reports that haven't been pushed to Supabase yet.
        // This covers the case where a report was saved locally because the auth
        // session was expired or Supabase was unreachable at submission time.
        import('../services/reportsService').then(({ syncPendingReports, retryFailedWebhooks }) => {
          syncPendingReports()
            .then(({ synced, failed }) => {
              if (synced > 0 || failed > 0) {
                console.log(`📊 Foreground sync: ${synced} synced, ${failed} failed`);
              }
            })
            .catch((err: unknown) => {
              console.warn('⚠️ Foreground sync error:', err);
            });

          // Also retry any failed webhook deliveries (text/email confirmations)
          retryFailedWebhooks().catch((err: unknown) => {
            console.warn('⚠️ Webhook retry error:', err);
          });
        });
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  // Refresh rewards data when user signs in or out
  useEffect(() => {
    const authUnsubscribe = onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        console.log('🔄 RewardsContext - Refreshing after sign in...');
        // Delay to allow createRewardsMemberFromAuthUser to complete
        setTimeout(() => {
          refresh();
        }, 2000);
      } else if (event === 'SIGNED_OUT') {
        console.log('🔄 RewardsContext - Refreshing after sign out...');
        // Short delay to let session fully clear, then refresh
        // with device-based fallback to preserve rewards status
        setTimeout(() => {
          refresh();
        }, 500);
      }
    });

    return () => {
      authUnsubscribe?.();
    };
  }, [refresh]);

  /**
   * Enter the current drawing.
   * Automatically determines user ID from rewards member or uses local entry.
   */
  const enterDrawing = useCallback(
    async (reportId?: string): Promise<boolean> => {
      if (!currentDrawing) {
        return false;
      }

      // First, try to get the current user state
      let effectiveUserId = userId;

      if (!effectiveUserId) {
        // Try to get rewards member ID
        try {
          const rewardsMember = await getRewardsMemberForAnonymousUser();
          if (rewardsMember) {
            effectiveUserId = rewardsMember.id;
          }
        } catch (err) {
          console.warn('Could not get rewards member:', err);
        }
      }

      if (!effectiveUserId) {
        // No rewards member - record locally for anonymous/pending user
        await recordDrawingEntry(currentDrawing.id);

        // Also save to pending submission for migration after auth
        try {
          await updatePendingDrawingEntry(currentDrawing.id);
        } catch (err) {
          console.warn('Could not save pending drawing entry:', err);
        }

        setEnteredDrawingIds((prev) => [...prev, currentDrawing.id]);
        setUserEntry({
          userId: 'local',
          drawingId: currentDrawing.id,
          isEntered: true,
          entryMethod: 'app',
          enteredAt: new Date().toISOString(),
          associatedReportIds: reportId ? [reportId] : [],
        });
        return true;
      }

      try {
        const entry = await enterRewardsDrawing(effectiveUserId, currentDrawing.id, reportId);
        setUserEntry(entry);
        await recordDrawingEntry(currentDrawing.id);
        setEnteredDrawingIds((prev) => [...prev, currentDrawing.id]);
        return true;
      } catch (err) {
        console.error('Failed to enter drawing:', err);
        return false;
      }
    },
    [currentDrawing, userId]
  );

  /**
   * Check if user is entered in current drawing.
   *
   * Uses userEntry (from Supabase or pending state) as the primary source.
   * Legacy enteredDrawingIds are only consulted for unauthenticated/local
   * users to avoid stale data from a previous session showing "entered"
   * for a new user.
   */
  const isEnteredInCurrentDrawing = useCallback((): boolean => {
    if (!currentDrawing) return false;

    // Primary check: Supabase-backed or pending entry
    if (userEntry?.isEntered === true) return true;

    // Fallback: legacy local IDs — only trust for non-authenticated (local) entries
    if (userEntry?.userId === 'local' || userEntry?.userId === 'pending') {
      return enteredDrawingIds.includes(currentDrawing.id);
    }

    return false;
  }, [currentDrawing, userEntry, enteredDrawingIds]);

  // Calculate derived values
  const calculated = useMemo(
    () => calculateDerivedValues(currentDrawing, userEntry),
    [currentDrawing, userEntry]
  );

  // Legacy compatibility
  const hasEnteredCurrentRaffle = isEnteredInCurrentDrawing();

  // Context value
  const contextValue = useMemo<RewardsContextValue>(
    () => ({
      config,
      currentDrawing,
      userEntry,
      isLoading,
      error,
      calculated,
      isNewQuarter,
      acknowledgeNewQuarter,
      refresh,
      enterDrawing,
      isEnteredInCurrentDrawing,
      hasEnteredCurrentRaffle,
    }),
    [
      config,
      currentDrawing,
      userEntry,
      isLoading,
      error,
      calculated,
      isNewQuarter,
      acknowledgeNewQuarter,
      refresh,
      enterDrawing,
      isEnteredInCurrentDrawing,
      hasEnteredCurrentRaffle,
    ]
  );

  return (
    <RewardsContext.Provider value={contextValue}>
      {children}
    </RewardsContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access rewards context.
 * Must be used within a RewardsProvider.
 */
export function useRewards(): RewardsContextValue {
  const context = useContext(RewardsContext);

  if (context === undefined) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }

  return context;
}

// =============================================================================
// Exports
// =============================================================================

export { RewardsContext };
export type { RewardsContextValue, RewardsProviderProps };
