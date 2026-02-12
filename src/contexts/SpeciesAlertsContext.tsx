// contexts/SpeciesAlertsContext.tsx
//
// Thin context for tracking which species alerts the user has "seen."
// Badge pulsing stops after the user taps a species with an active alert.
//
// All alert/badge data comes from EnhancedFishSpecies.harvestStatus
// (returned by the main species query). This context only manages
// the "seen" state, persisted in AsyncStorage.

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

// =============================================================================
// Constants
// =============================================================================

const SEEN_ALERTS_KEY = '@species_seen_alert_ids';

// =============================================================================
// Context Types
// =============================================================================

interface SpeciesAlertsContextValue {
  /** Mark a species' alerts as "seen" (stops badge pulsing). */
  markSpeciesAlertSeen: (speciesId: string) => Promise<void>;

  /** Mark multiple species alerts as "seen" in one batch. */
  markAllSpeciesAlertsSeen: (speciesIds: string[]) => Promise<void>;

  /** Check if a species' alerts have been seen. */
  hasSeenAlert: (speciesId: string) => boolean;
}

const defaultContextValue: SpeciesAlertsContextValue = {
  markSpeciesAlertSeen: async () => {},
  markAllSpeciesAlertsSeen: async () => {},
  hasSeenAlert: () => false,
};

// =============================================================================
// Context Creation
// =============================================================================

const SpeciesAlertsContext = createContext<SpeciesAlertsContextValue>(defaultContextValue);

// =============================================================================
// Provider Component
// =============================================================================

interface SpeciesAlertsProviderProps {
  children: ReactNode;
}

export function SpeciesAlertsProvider({
  children,
}: SpeciesAlertsProviderProps): React.ReactElement {
  const [seenAlertIds, setSeenAlertIds] = useState<Set<string>>(new Set());
  const hasLoaded = useRef(false);

  // Load "seen" IDs from AsyncStorage on mount
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    AsyncStorage.getItem(SEEN_ALERTS_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const ids: string[] = JSON.parse(raw);
            if (Array.isArray(ids)) {
              setSeenAlertIds(new Set(ids));
            }
          } catch {
            // Corrupted storage data — start fresh
          }
        }
      })
      .catch((error) => {
        console.warn('Failed to load seen species alerts:', error);
      });
  }, []);

  const markSpeciesAlertSeen = useCallback(
    async (speciesId: string) => {
      const newSeen = new Set(seenAlertIds);
      newSeen.add(speciesId);
      setSeenAlertIds(newSeen);

      try {
        await AsyncStorage.setItem(
          SEEN_ALERTS_KEY,
          JSON.stringify([...newSeen])
        );
      } catch (error) {
        console.warn('Failed to save seen species alert:', error);
      }
    },
    [seenAlertIds]
  );

  const markAllSpeciesAlertsSeen = useCallback(
    async (speciesIds: string[]) => {
      if (speciesIds.length === 0) return;
      const newSeen = new Set(seenAlertIds);
      speciesIds.forEach((id) => newSeen.add(id));
      setSeenAlertIds(newSeen);

      try {
        await AsyncStorage.setItem(
          SEEN_ALERTS_KEY,
          JSON.stringify([...newSeen])
        );
      } catch (error) {
        console.warn('Failed to save seen species alerts:', error);
      }
    },
    [seenAlertIds]
  );

  const hasSeenAlert = useCallback(
    (speciesId: string): boolean => {
      return seenAlertIds.has(speciesId);
    },
    [seenAlertIds]
  );

  const contextValue: SpeciesAlertsContextValue = {
    markSpeciesAlertSeen,
    markAllSpeciesAlertsSeen,
    hasSeenAlert,
  };

  return (
    <SpeciesAlertsContext.Provider value={contextValue}>
      {children}
    </SpeciesAlertsContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access species alert seen-tracking.
 * Must be used within a SpeciesAlertsProvider.
 */
export function useSpeciesAlerts(): SpeciesAlertsContextValue {
  const context = useContext(SpeciesAlertsContext);

  if (context === undefined) {
    throw new Error(
      'useSpeciesAlerts must be used within a SpeciesAlertsProvider'
    );
  }

  return context;
}

// =============================================================================
// Exports
// =============================================================================

export { SpeciesAlertsContext };
export type { SpeciesAlertsContextValue, SpeciesAlertsProviderProps };
