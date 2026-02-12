// contexts/BulletinContext.tsx
//
// React Context for managing app bulletin notifications.
// Fetches active bulletins on app start, filters dismissed ones,
// and displays them one at a time without interfering with other modals.

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BulletinModal from '../components/BulletinModal';
import { fetchActiveBulletins } from '../services/bulletinService';
import { useAchievements } from './AchievementContext';
import type { Bulletin } from '../types/bulletin';

// =============================================================================
// Constants
// =============================================================================

const DISMISSED_BULLETINS_KEY = 'dismissed_bulletin_ids';

// =============================================================================
// Context Types
// =============================================================================

interface BulletinContextValue {
  /** Whether a bulletin modal is currently showing. */
  isShowingBulletin: boolean;

  /** Number of bulletins remaining in the queue. */
  bulletinCount: number;

  /** Manually refresh bulletins from the server. */
  refreshBulletins: () => void;
}

const defaultContextValue: BulletinContextValue = {
  isShowingBulletin: false,
  bulletinCount: 0,
  refreshBulletins: () => {},
};

// =============================================================================
// Context Creation
// =============================================================================

const BulletinContext = createContext<BulletinContextValue>(defaultContextValue);

// =============================================================================
// Provider Component
// =============================================================================

interface BulletinProviderProps {
  children: ReactNode;
}

export function BulletinProvider({ children }: BulletinProviderProps): React.ReactElement {
  const { isShowingAchievement } = useAchievements();

  // Queue of bulletins to display
  const [queue, setQueue] = useState<Bulletin[]>([]);
  // Track whether we've fetched bulletins this session
  const hasFetched = useRef(false);

  const currentBulletin = queue.length > 0 ? queue[0] : null;

  // Only show a bulletin when there's one in queue AND no achievement is showing
  const shouldShow = currentBulletin !== null && !isShowingAchievement;

  // =========================================================================
  // Dismissed bulletin management
  // =========================================================================

  /**
   * Load the set of permanently dismissed bulletin IDs from AsyncStorage.
   */
  const getDismissedIds = useCallback(async (): Promise<Set<string>> => {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_BULLETINS_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        return new Set(ids);
      }
    } catch (error) {
      console.warn('Failed to load dismissed bulletins:', error);
    }
    return new Set();
  }, []);

  /**
   * Persist a bulletin ID as permanently dismissed.
   */
  const addDismissedId = useCallback(async (bulletinId: string) => {
    try {
      const dismissed = await getDismissedIds();
      dismissed.add(bulletinId);
      await AsyncStorage.setItem(
        DISMISSED_BULLETINS_KEY,
        JSON.stringify([...dismissed])
      );
    } catch (error) {
      console.warn('Failed to save dismissed bulletin:', error);
    }
  }, [getDismissedIds]);

  // =========================================================================
  // Fetch and filter bulletins
  // =========================================================================

  const loadBulletins = useCallback(async () => {
    try {
      const [bulletins, dismissedIds] = await Promise.all([
        fetchActiveBulletins(),
        getDismissedIds(),
      ]);

      // Filter out permanently dismissed bulletins
      const undismissed = bulletins.filter((b) => !dismissedIds.has(b.id));

      if (undismissed.length > 0) {
        console.log(
          `📋 Showing ${undismissed.length} bulletin(s):`,
          undismissed.map((b) => b.title).join(', ')
        );
      }

      setQueue(undismissed);
    } catch (error) {
      console.warn('Failed to load bulletins:', error);
    }
  }, [getDismissedIds]);

  // Fetch bulletins once on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      loadBulletins();
    }
  }, [loadBulletins]);

  // =========================================================================
  // Modal handlers
  // =========================================================================

  /**
   * "Got it" — dismiss the current bulletin for this session only.
   */
  const handleClose = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  /**
   * "Don't show again" — dismiss permanently and remove from queue.
   */
  const handleDismiss = useCallback(
    (bulletinId: string) => {
      addDismissedId(bulletinId);
      setQueue((prev) => prev.slice(1));
    },
    [addDismissedId]
  );

  /**
   * Manual refresh (e.g., pull-to-refresh or after returning from background).
   */
  const refreshBulletins = useCallback(() => {
    hasFetched.current = false;
    loadBulletins();
  }, [loadBulletins]);

  // =========================================================================
  // Context value
  // =========================================================================

  const contextValue: BulletinContextValue = {
    isShowingBulletin: shouldShow,
    bulletinCount: queue.length,
    refreshBulletins,
  };

  return (
    <BulletinContext.Provider value={contextValue}>
      {children}

      {/* Bulletin Modal — rendered at provider level, controlled by queue */}
      <BulletinModal
        visible={shouldShow}
        bulletin={currentBulletin}
        onClose={handleClose}
        onDismiss={handleDismiss}
      />
    </BulletinContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access bulletin context.
 * Must be used within a BulletinProvider.
 */
export function useBulletins(): BulletinContextValue {
  const context = useContext(BulletinContext);

  if (context === undefined) {
    throw new Error('useBulletins must be used within a BulletinProvider');
  }

  return context;
}

// =============================================================================
// Exports
// =============================================================================

export { BulletinContext };
export type { BulletinContextValue, BulletinProviderProps };
