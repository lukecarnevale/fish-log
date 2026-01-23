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
  ReactNode,
} from 'react';
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
} from '../services/rewardsService';
import { FALLBACK_CONFIG, FALLBACK_DRAWING } from '../data/rewardsFallbackData';

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
// Helper Functions
// =============================================================================

/**
 * Calculate days remaining until a date.
 */
function calculateDaysRemaining(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate progress percentage through a period.
 */
function calculatePeriodProgress(startDate: string, endDate: string): number {
  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();

  if (totalDuration <= 0) return 100;
  return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
}

/**
 * Check if current date is within a period.
 */
function isWithinPeriod(startDate: string, endDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return today >= start && today <= end;
}

/**
 * Format a date for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate all derived values from rewards state.
 */
function calculateDerivedValues(
  drawing: RewardsDrawing | null,
  userEntry: UserRewardsEntry | null
): RewardsCalculated {
  if (!drawing) {
    return defaultCalculated;
  }

  return {
    daysRemaining: calculateDaysRemaining(drawing.drawingDate),
    isEligible: userEntry?.isEntered ?? false,
    isPeriodActive: isWithinPeriod(drawing.startDate, drawing.endDate),
    formattedDrawingDate: formatDate(drawing.drawingDate),
    quarterDisplay: `Q${drawing.quarter} ${drawing.year}`,
    periodProgress: calculatePeriodProgress(drawing.startDate, drawing.endDate),
  };
}

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

  // Load rewards data on mount
  useEffect(() => {
    loadRewardsData();
    loadEnteredDrawings();
  }, [userId]);

  /**
   * Load rewards data from service.
   */
  const loadRewardsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchRewardsData(userId);
      setConfig(data.config);
      setCurrentDrawing(data.currentDrawing);
      setUserEntry(data.userEntry);
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
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await refreshRewardsData(userId);
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

  /**
   * Enter the current drawing.
   */
  const enterDrawing = useCallback(
    async (reportId?: string): Promise<boolean> => {
      if (!currentDrawing || !userId) {
        // If no userId, just record locally
        if (currentDrawing) {
          await recordDrawingEntry(currentDrawing.id);
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
        return false;
      }

      try {
        const entry = await enterRewardsDrawing(userId, currentDrawing.id, reportId);
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
