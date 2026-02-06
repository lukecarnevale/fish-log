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
} from '../services/rewardsService';
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
    loadEnteredDrawings();
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
      setUserEntry(finalUserEntry);
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
      setUserEntry(data.userEntry);
      await loadEnteredDrawings();
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
        console.log('📱 App returned to foreground, refreshing rewards...');
        refresh();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  // Refresh rewards data when user signs in
  useEffect(() => {
    const authUnsubscribe = onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        console.log('🔄 RewardsContext - Refreshing after sign in...');
        // Delay to allow createRewardsMemberFromAuthUser to complete
        setTimeout(() => {
          refresh();
        }, 2000);
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
   */
  const isEnteredInCurrentDrawing = useCallback((): boolean => {
    if (!currentDrawing) return false;
    return (
      userEntry?.isEntered === true ||
      enteredDrawingIds.includes(currentDrawing.id)
    );
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
