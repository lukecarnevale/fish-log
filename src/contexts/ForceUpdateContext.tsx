// contexts/ForceUpdateContext.tsx
//
// React Context that checks the app version against the server-configured
// minimum on startup. If the running version is too old, it renders a
// non-dismissible modal directing the user to the app store.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import ForceUpdateModal from '../components/ForceUpdateModal';
import {
  fetchAppVersionConfig,
  isUpdateRequired,
  AppVersionConfig,
} from '../services/forceUpdateService';
import { APP_VERSION } from '../config/appConfig';

// =============================================================================
// Context Types
// =============================================================================

interface ForceUpdateContextValue {
  /** Whether the force-update modal is currently blocking the app. */
  isShowingForceUpdate: boolean;
}

const defaultContextValue: ForceUpdateContextValue = {
  isShowingForceUpdate: false,
};

// =============================================================================
// Context Creation
// =============================================================================

const ForceUpdateContext = createContext<ForceUpdateContextValue>(defaultContextValue);

// =============================================================================
// Provider Component
// =============================================================================

interface ForceUpdateProviderProps {
  children: ReactNode;
}

export function ForceUpdateProvider({ children }: ForceUpdateProviderProps): React.ReactElement {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [config, setConfig] = useState<AppVersionConfig | null>(null);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    async function checkVersion() {
      try {
        const appConfig = await fetchAppVersionConfig();
        if (!appConfig) {
          // Offline or error — let the user proceed
          return;
        }

        setConfig(appConfig);

        if (isUpdateRequired(APP_VERSION, appConfig.minimumVersion)) {
          console.log(
            `[forceUpdate] Update required: running ${APP_VERSION}, minimum ${appConfig.minimumVersion}`,
          );
          setUpdateRequired(true);
        }
      } catch (error) {
        console.warn('[forceUpdate] Version check failed:', error);
      }
    }

    checkVersion();
  }, []);

  const contextValue: ForceUpdateContextValue = {
    isShowingForceUpdate: updateRequired,
  };

  return (
    <ForceUpdateContext.Provider value={contextValue}>
      {children}

      {/* Force Update Modal — rendered at provider level, non-dismissible */}
      <ForceUpdateModal visible={updateRequired} config={config} />
    </ForceUpdateContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to check if a force update is blocking the app.
 * Must be used within a ForceUpdateProvider.
 */
export function useForceUpdate(): ForceUpdateContextValue {
  const context = useContext(ForceUpdateContext);

  if (context === undefined) {
    throw new Error('useForceUpdate must be used within a ForceUpdateProvider');
  }

  return context;
}

// =============================================================================
// Exports
// =============================================================================

export { ForceUpdateContext };
export type { ForceUpdateContextValue, ForceUpdateProviderProps };
