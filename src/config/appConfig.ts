// config/appConfig.ts
//
// Application configuration for DMF submission modes and feature flags.
// Mode is now determined by environment variables at build time.

import { env, isTestMode, isProductionMode, isProduction } from './env';

export type AppMode = 'mock' | 'production';

export const APP_CONFIG = {
  /** Current mode - derived from environment at build time */
  get mode(): AppMode {
    return env.DMF_MODE;
  },

  features: {
    raffleEnabled: true,
    offlineQueueEnabled: true,
    photoCaptureEnabled: true,
    showTestModeBadge: env.SHOW_TEST_MODE_BADGE,
  },

  endpoints: {
    dmfProduction: env.DMF_ENDPOINT,
  },

  storageKeys: {
    harvestQueue: '@harvest_queue',
    harvestHistory: '@harvest_history',
    userProfile: 'userProfile',
    fishingLicense: 'fishingLicense',
    enteredRaffles: 'enteredRaffles',
    primaryHarvestArea: 'primaryHarvestArea',
    primaryFishingMethod: 'primaryFishingMethod',
  },

  limits: {
    maxHistoryEntries: 100,
    maxRetryAttempts: 3,
  },
};

// Re-export environment checks
export { isTestMode, isProductionMode } from './env';

/** Check if running in React Native development mode */
export function isDevelopment(): boolean {
  return __DEV__;
}

/**
 * @deprecated Mode is now set at build time via environment variables.
 * This function logs a warning and has no effect in production builds.
 */
export function setAppMode(mode: AppMode): void {
  if (isProduction()) {
    console.warn('[appConfig] Cannot change mode at runtime in production builds');
    return;
  }
  console.warn(`[appConfig] setAppMode is deprecated. Mode is set via EXPO_PUBLIC_DMF_MODE.`);
}

export type ModeChangeCallback = (confirmed: boolean) => void;

/**
 * @deprecated Mode is now set at build time via environment variables.
 */
export function setAppModeWithWarning(
  mode: AppMode,
  showWarning: (onConfirm: ModeChangeCallback) => void
): Promise<boolean> {
  console.warn('[appConfig] setAppModeWithWarning is deprecated. Mode is set via EXPO_PUBLIC_DMF_MODE.');
  return Promise.resolve(false);
}

/** Get the DMF endpoint */
export function getDMFEndpoint(): string {
  return APP_CONFIG.endpoints.dmfProduction;
}

export default APP_CONFIG;
