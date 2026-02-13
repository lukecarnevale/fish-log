// hooks/index.ts
//
// Barrel export for all custom hooks.
//

export {
  useOfflineStatus,
  startConnectivityListener,
  type OfflineStatus,
  type UseOfflineStatusOptions,
} from './useOfflineStatus';

export {
  useZipCodeLookup,
} from './useZipCodeLookup';

export {
  useFloatingHeaderAnimation,
} from './useFloatingHeaderAnimation';

export {
  usePulseAnimation,
} from './usePulseAnimation';

export {
  useSkeletonAnimation,
} from './useSkeletonAnimation';

export {
  useToast,
} from './useToast';

export {
  useInitializeData,
} from './useInitializeData';

export {
  useDeepLinkHandler,
} from './useDeepLinkHandler';

export {
  useConnectivityMonitoring,
} from './useConnectivityMonitoring';

export {
  usePendingSubmissionRecovery,
} from './usePendingSubmissionRecovery';

export {
  useAuthStateListener,
} from './useAuthStateListener';

export {
  useAnonymousUserInitialization,
} from './useAnonymousUserInitialization';

export {
  usePartners,
} from './usePartners';
