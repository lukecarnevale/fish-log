// contexts/AchievementContext.tsx
//
// React Context for managing achievement notifications.
// Handles a queue of achievements to display one at a time.
//

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import AchievementModal, { AchievementData } from '../components/AchievementModal';

// =============================================================================
// Context Types
// =============================================================================

interface AchievementContextValue {
  /**
   * Add achievements to the notification queue.
   * They will be displayed one at a time.
   */
  showAchievements: (achievements: AchievementData[]) => void;

  /**
   * Add a single achievement to the queue.
   */
  showAchievement: (achievement: AchievementData) => void;

  /**
   * Queue achievements to be shown later (e.g., after navigating to HomeScreen).
   * Call flushPendingAchievements to display them.
   */
  queueAchievementsForLater: (achievements: AchievementData[]) => void;

  /**
   * Show any achievements that were queued for later display.
   * Typically called when HomeScreen receives focus.
   */
  flushPendingAchievements: () => void;

  /**
   * Check if there are achievements being displayed.
   */
  isShowingAchievement: boolean;

  /**
   * Number of achievements in the queue (including current).
   */
  queueLength: number;

  /**
   * Number of achievements waiting to be shown (queued for later).
   */
  pendingCount: number;
}

const defaultContextValue: AchievementContextValue = {
  showAchievements: () => {},
  showAchievement: () => {},
  queueAchievementsForLater: () => {},
  flushPendingAchievements: () => {},
  isShowingAchievement: false,
  queueLength: 0,
  pendingCount: 0,
};

// =============================================================================
// Context Creation
// =============================================================================

const AchievementContext = createContext<AchievementContextValue>(defaultContextValue);

// =============================================================================
// Provider Component
// =============================================================================

interface AchievementProviderProps {
  children: ReactNode;
}

export function AchievementProvider({ children }: AchievementProviderProps): React.ReactElement {
  // Queue of achievements to display
  const [queue, setQueue] = useState<AchievementData[]>([]);

  // Pending achievements to be shown later (after navigation)
  const [pending, setPending] = useState<AchievementData[]>([]);

  // Current achievement being displayed (null if none)
  const currentAchievement = queue.length > 0 ? queue[0] : null;
  const isShowingAchievement = currentAchievement !== null;

  /**
   * Add multiple achievements to the queue.
   */
  const showAchievements = useCallback((achievements: AchievementData[]) => {
    if (achievements.length === 0) return;
    console.log('🏆 Queueing achievements for display:', achievements.map(a => a.name).join(', '));
    setQueue((prev) => [...prev, ...achievements]);
  }, []);

  /**
   * Add a single achievement to the queue.
   */
  const showAchievement = useCallback((achievement: AchievementData) => {
    showAchievements([achievement]);
  }, [showAchievements]);

  /**
   * Queue achievements to be shown later (e.g., after navigating to HomeScreen).
   */
  const queueAchievementsForLater = useCallback((achievements: AchievementData[]) => {
    if (achievements.length === 0) return;
    console.log('🏆 Queueing achievements for later:', achievements.map(a => a.name).join(', '));
    setPending((prev) => [...prev, ...achievements]);
  }, []);

  /**
   * Show any achievements that were queued for later display.
   */
  const flushPendingAchievements = useCallback(() => {
    if (pending.length === 0) return;
    console.log('🏆 Flushing pending achievements:', pending.map(a => a.name).join(', '));
    setQueue((prev) => [...prev, ...pending]);
    setPending([]);
  }, [pending]);

  /**
   * Handle closing the current achievement modal.
   * Removes the current achievement and shows the next one (if any).
   */
  const handleClose = useCallback(() => {
    setQueue((prev) => prev.slice(1)); // Remove first item
  }, []);

  // Context value
  const contextValue: AchievementContextValue = {
    showAchievements,
    showAchievement,
    queueAchievementsForLater,
    flushPendingAchievements,
    isShowingAchievement,
    queueLength: queue.length,
    pendingCount: pending.length,
  };

  return (
    <AchievementContext.Provider value={contextValue}>
      {children}

      {/* Achievement Modal - always rendered, controlled by queue */}
      <AchievementModal
        visible={isShowingAchievement}
        achievement={currentAchievement}
        onClose={handleClose}
      />
    </AchievementContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access achievement notification context.
 * Must be used within an AchievementProvider.
 */
export function useAchievements(): AchievementContextValue {
  const context = useContext(AchievementContext);

  if (context === undefined) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }

  return context;
}

// =============================================================================
// Exports
// =============================================================================

export { AchievementContext };
export type { AchievementContextValue, AchievementProviderProps };
