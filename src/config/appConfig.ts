// config/appConfig.ts
//
// Application configuration for DMF submission modes and feature flags.
// Controls whether the app submits to real DMF servers or runs in test mode.
//

/**
 * Application mode determines whether submissions go to real DMF servers
 * or are mocked for development/testing.
 */
export type AppMode = 'mock' | 'production';

/**
 * Main application configuration
 */
export const APP_CONFIG = {
  /**
   * Current application mode
   *
   * - 'mock': Submissions are logged to console, not sent to DMF (safe for development)
   * - 'production': Submissions are sent to real NC DMF ArcGIS servers
   *
   * IMPORTANT: Change to 'production' only when ready for real submissions
   */
  mode: 'mock' as AppMode,

  /**
   * Feature flags to enable/disable functionality
   */
  features: {
    /** Enable raffle entry functionality */
    raffleEnabled: true,

    /** Enable offline queue for submissions when no connectivity */
    offlineQueueEnabled: true,

    /** Enable photo capture for catch verification */
    photoCaptureEnabled: true,

    /** Show test mode indicator badge in UI */
    showTestModeBadge: true,
  },

  /**
   * API endpoints
   */
  endpoints: {
    /** NC DMF ArcGIS Feature Service for harvest reporting */
    dmfProduction: 'https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits',
  },

  /**
   * Storage keys for AsyncStorage
   */
  storageKeys: {
    harvestQueue: '@harvest_queue',
    harvestHistory: '@harvest_history',
    userProfile: 'userProfile',
    fishingLicense: 'fishingLicense',
    enteredRaffles: 'enteredRaffles',
    primaryHarvestArea: 'primaryHarvestArea',
    primaryFishingMethod: 'primaryFishingMethod',
  },

  /**
   * Limits and constraints
   */
  limits: {
    /** Maximum number of reports to keep in history */
    maxHistoryEntries: 100,

    /** Maximum queue retry attempts before giving up */
    maxRetryAttempts: 3,
  },
};

/**
 * Check if the app is running in React Native development mode
 */
export function isDevelopment(): boolean {
  return __DEV__;
}

/**
 * Check if the app is in test/mock mode (not submitting to real DMF)
 */
export function isTestMode(): boolean {
  return APP_CONFIG.mode === 'mock';
}

/**
 * Check if the app is in production mode (submitting to real DMF)
 */
export function isProductionMode(): boolean {
  return APP_CONFIG.mode === 'production';
}

/**
 * Switch application mode programmatically (internal use only).
 *
 * Use with caution - switching to production will send real data to DMF.
 * Prefer using `setAppModeWithWarning` for UI-driven mode changes.
 *
 * @param mode - The mode to switch to
 */
export function setAppMode(mode: AppMode): void {
  APP_CONFIG.mode = mode;
}

/**
 * Callback type for mode switch confirmation.
 */
export type ModeChangeCallback = (confirmed: boolean) => void;

/**
 * Switch application mode with a warning for production mode.
 *
 * When switching TO production mode, calls the `showWarning` callback
 * which should display a confirmation dialog. The mode is only changed
 * if the user confirms.
 *
 * @param mode - The mode to switch to
 * @param showWarning - Callback to show a confirmation dialog (receives callback for user response)
 * @returns Promise that resolves to true if mode was changed, false if cancelled
 *
 * @example
 * ```typescript
 * await setAppModeWithWarning('production', (onConfirm) => {
 *   Alert.alert(
 *     'Switch to Production Mode?',
 *     'This will send REAL data to NC DMF servers. Are you sure?',
 *     [
 *       { text: 'Cancel', onPress: () => onConfirm(false), style: 'cancel' },
 *       { text: 'Yes, Switch', onPress: () => onConfirm(true), style: 'destructive' },
 *     ]
 *   );
 * });
 * ```
 */
export function setAppModeWithWarning(
  mode: AppMode,
  showWarning: (onConfirm: ModeChangeCallback) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    // Switching to mock mode doesn't need a warning
    if (mode === 'mock') {
      APP_CONFIG.mode = mode;
      resolve(true);
      return;
    }

    // Switching to production mode needs confirmation
    showWarning((confirmed) => {
      if (confirmed) {
        APP_CONFIG.mode = mode;
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Get the current DMF endpoint based on app mode
 */
export function getDMFEndpoint(): string {
  return APP_CONFIG.endpoints.dmfProduction;
}

export default APP_CONFIG;
