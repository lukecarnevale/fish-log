// contexts/BulletinContext.tsx
//
// React Context for managing app bulletin notifications.
// Uses a hybrid approach: urgent closures/advisories get an auto-show modal,
// while everything else surfaces as a non-blocking card on the HomeScreen.

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
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
const READ_BULLETINS_KEY = 'read_bulletin_ids';

/**
 * Determines whether a bulletin is "critical" and should auto-show as a modal.
 * Only urgent closures and advisories qualify — these have legal/safety implications.
 */
function isCriticalBulletin(b: Bulletin): boolean {
  return (
    b.priority === 'urgent' &&
    (b.bulletinType === 'closure' || b.bulletinType === 'advisory')
  );
}

// =============================================================================
// Context Types
// =============================================================================

interface BulletinContextValue {
  /** Whether a bulletin modal is currently showing (critical auto-show or detail view). */
  isShowingBulletin: boolean;

  /** Number of critical bulletins remaining in the auto-show queue. */
  criticalBulletinCount: number;

  /** All active bulletins from the server (never filtered by dismissals). For the Bulletins page. */
  fetchedBulletins: Bulletin[];

  /** Active, undismissed bulletins (critical + non-critical). For badge counts, drawer, and card. */
  allBulletins: Bulletin[];

  /** Non-critical bulletins for the HomeScreen card. */
  cardBulletins: Bulletin[];

  /** The bulletin currently being viewed in the detail modal (tapped from card). */
  selectedBulletin: Bulletin | null;

  /** Open the detail modal for a specific bulletin. Pass allowDismiss=false to hide "Don't show again". */
  showBulletinDetail: (bulletin: Bulletin, allowDismiss?: boolean) => void;

  /** Dismiss all card bulletins for this session. */
  dismissAllCardBulletins: () => void;

  /** Permanently dismiss a bulletin (won't show again across sessions). */
  permanentlyDismissBulletin: (id: string) => void;

  /** Manually refresh bulletins from the server. */
  refreshBulletins: () => void;

  /** Check if a bulletin has been read/opened by the user. */
  isBulletinRead: (id: string) => boolean;

  /** Number of unread bulletins (across allBulletins). */
  unreadCount: number;
}

const defaultContextValue: BulletinContextValue = {
  isShowingBulletin: false,
  criticalBulletinCount: 0,
  fetchedBulletins: [],
  allBulletins: [],
  cardBulletins: [],
  selectedBulletin: null,
  showBulletinDetail: () => {},
  dismissAllCardBulletins: () => {},
  permanentlyDismissBulletin: () => {},
  refreshBulletins: () => {},
  isBulletinRead: () => false,
  unreadCount: 0,
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

  // All active bulletins from the server (never filtered — for the Bulletins page)
  const [fetchedBulletins, setFetchedBulletins] = useState<Bulletin[]>([]);
  // Active, undismissed bulletins (for badge counts, drawer, card)
  const [allBulletins, setAllBulletins] = useState<Bulletin[]>([]);
  // Critical bulletins auto-shown as modals (at most 1 at a time)
  const [criticalQueue, setCriticalQueue] = useState<Bulletin[]>([]);
  // Non-critical bulletins shown as a card on the HomeScreen
  const [cardBulletins, setCardBulletins] = useState<Bulletin[]>([]);
  // Bulletin selected from the card for detail view
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null);
  // Whether the detail modal should show the "Don't show again" option
  const [detailAllowDismiss, setDetailAllowDismiss] = useState(true);
  // Track whether we've fetched bulletins this session
  const hasFetched = useRef(false);
  // In-memory source of truth for dismissed IDs — eliminates read-modify-write races
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  // In-memory source of truth for read/seen bulletin IDs
  const readIdsRef = useRef<Set<string>>(new Set());
  // Trigger re-renders when read set changes (ref mutations don't cause re-renders)
  const [readIdsVersion, setReadIdsVersion] = useState(0);

  const currentCritical = criticalQueue.length > 0 ? criticalQueue[0] : null;

  // Show the critical modal OR the detail modal, but not while achievements are showing
  const isShowingCritical = currentCritical !== null && !isShowingAchievement;
  const isShowingDetail = selectedBulletin !== null && !isShowingAchievement && !isShowingCritical;
  const isShowingBulletin = isShowingCritical || isShowingDetail;

  // The bulletin currently visible in the modal (critical takes priority)
  const visibleBulletin = isShowingCritical ? currentCritical : isShowingDetail ? selectedBulletin : null;

  // =========================================================================
  // Dismissed bulletin management
  // =========================================================================

  /** Load dismissed IDs from AsyncStorage into the in-memory ref. */
  const loadDismissedIds = useCallback(async (): Promise<Set<string>> => {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_BULLETINS_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        dismissedIdsRef.current = new Set(ids);
      }
    } catch (error) {
      console.warn('Failed to load dismissed bulletins:', error);
    }
    return dismissedIdsRef.current;
  }, []);

  /** Add a dismissed ID to the in-memory set and persist. Race-safe because the
   *  ref is mutated synchronously — concurrent calls always see the latest state. */
  const addDismissedId = useCallback((bulletinId: string) => {
    dismissedIdsRef.current.add(bulletinId);
    AsyncStorage.setItem(
      DISMISSED_BULLETINS_KEY,
      JSON.stringify([...dismissedIdsRef.current])
    ).catch((error) => {
      console.warn('Failed to save dismissed bulletin:', error);
    });
  }, []);

  // =========================================================================
  // Read/seen bulletin management
  // =========================================================================

  /** Load read IDs from AsyncStorage into the in-memory ref. */
  const loadReadIds = useCallback(async (): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(READ_BULLETINS_KEY);
      if (raw) {
        readIdsRef.current = new Set(JSON.parse(raw) as string[]);
        setReadIdsVersion((v) => v + 1);
      }
    } catch (error) {
      console.warn('Failed to load read bulletins:', error);
    }
  }, []);

  /** Mark a bulletin as read. Race-safe via synchronous ref mutation. */
  const markBulletinRead = useCallback((bulletinId: string) => {
    if (readIdsRef.current.has(bulletinId)) return;
    readIdsRef.current.add(bulletinId);
    setReadIdsVersion((v) => v + 1);
    AsyncStorage.setItem(
      READ_BULLETINS_KEY,
      JSON.stringify([...readIdsRef.current])
    ).catch((error) => {
      console.warn('Failed to save read bulletin:', error);
    });
  }, []);

  /** Check if a bulletin has been read. */
  const isBulletinRead = useCallback((id: string): boolean => {
    return readIdsRef.current.has(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readIdsVersion]);

  // Mark critical bulletins as read when they auto-show
  useEffect(() => {
    if (currentCritical) markBulletinRead(currentCritical.id);
  }, [currentCritical, markBulletinRead]);

  // =========================================================================
  // Fetch and split bulletins into critical vs. card
  // =========================================================================

  const loadBulletins = useCallback(async () => {
    try {
      const [bulletins, dismissedIds] = await Promise.all([
        fetchActiveBulletins(),
        loadDismissedIds(),
        loadReadIds(),
      ]);

      // Store the full server list (never filtered — for the Bulletins page)
      setFetchedBulletins(bulletins);

      const undismissed = bulletins.filter((b) => !dismissedIds.has(b.id));

      // Split into critical (auto-modal) and card (non-blocking) buckets
      const critical: Bulletin[] = [];
      const card: Bulletin[] = [];

      for (const b of undismissed) {
        if (isCriticalBulletin(b)) {
          critical.push(b);
        } else {
          card.push(b);
        }
      }

      if (critical.length > 0) {
        console.log(
          `🚨 ${critical.length} critical bulletin(s) will auto-show:`,
          critical.map((b) => b.title).join(', ')
        );
      }
      if (card.length > 0) {
        console.log(
          `📋 ${card.length} bulletin(s) on HomeScreen card:`,
          card.map((b) => b.title).join(', ')
        );
      }

      setAllBulletins(undismissed);
      setCriticalQueue(critical);
      setCardBulletins(card);
    } catch (error) {
      console.warn('Failed to load bulletins:', error);
    }
  }, [loadDismissedIds, loadReadIds]);

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
   * Close the current modal — handles both critical auto-show and detail view.
   */
  const handleClose = useCallback(() => {
    if (isShowingCritical) {
      // Advance the critical queue
      setCriticalQueue((prev) => prev.slice(1));
    } else {
      // Close the detail view
      setSelectedBulletin(null);
    }
  }, [isShowingCritical]);

  /**
   * "Don't show again" — permanently dismiss the currently visible bulletin.
   */
  const handlePermanentDismiss = useCallback(
    (bulletinId: string) => {
      addDismissedId(bulletinId);
      // Remove from the all-bulletins list (affects badge counts and drawer display)
      setAllBulletins((prev) => prev.filter((b) => b.id !== bulletinId));
      if (isShowingCritical) {
        setCriticalQueue((prev) => prev.slice(1));
      } else {
        setSelectedBulletin(null);
        // Also remove from card list
        setCardBulletins((prev) => prev.filter((b) => b.id !== bulletinId));
      }
    },
    [addDismissedId, isShowingCritical]
  );

  // =========================================================================
  // Card handlers (exposed via context)
  // =========================================================================

  const showBulletinDetail = useCallback((bulletin: Bulletin, allowDismiss = true) => {
    setDetailAllowDismiss(allowDismiss);
    setSelectedBulletin(bulletin);
    markBulletinRead(bulletin.id);
  }, [markBulletinRead]);

  const dismissAllCardBulletins = useCallback(() => {
    setCardBulletins([]);
  }, []);

  const permanentlyDismissBulletin = useCallback(
    (id: string) => {
      addDismissedId(id);
      setAllBulletins((prev) => prev.filter((b) => b.id !== id));
      setCardBulletins((prev) => prev.filter((b) => b.id !== id));
    },
    [addDismissedId]
  );

  const refreshBulletins = useCallback(() => {
    hasFetched.current = false;
    loadBulletins();
  }, [loadBulletins]);

  // =========================================================================
  // Context value
  // =========================================================================

  const unreadCount = useMemo(
    () => allBulletins.filter((b) => !readIdsRef.current.has(b.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allBulletins, readIdsVersion]
  );

  const contextValue: BulletinContextValue = useMemo(() => ({
    isShowingBulletin,
    criticalBulletinCount: criticalQueue.length,
    fetchedBulletins,
    allBulletins,
    cardBulletins,
    selectedBulletin,
    showBulletinDetail,
    dismissAllCardBulletins,
    permanentlyDismissBulletin,
    refreshBulletins,
    isBulletinRead,
    unreadCount,
  }), [
    isShowingBulletin,
    criticalQueue.length,
    fetchedBulletins,
    allBulletins,
    cardBulletins,
    selectedBulletin,
    showBulletinDetail,
    dismissAllCardBulletins,
    permanentlyDismissBulletin,
    refreshBulletins,
    isBulletinRead,
    unreadCount,
  ]);

  return (
    <BulletinContext.Provider value={contextValue}>
      {children}

      {/* Bulletin Modal — shows critical auto-show OR detail view from card tap */}
      <BulletinModal
        visible={isShowingBulletin}
        bulletin={visibleBulletin}
        onClose={handleClose}
        onDismiss={
          // Critical auto-show modals always allow permanent dismiss.
          // Detail view respects the flag set by the caller of showBulletinDetail.
          isShowingCritical || detailAllowDismiss ? handlePermanentDismiss : undefined
        }
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
  return useContext(BulletinContext);
}

// =============================================================================
// Exports
// =============================================================================

export { BulletinContext, isCriticalBulletin };
export type { BulletinContextValue, BulletinProviderProps };
