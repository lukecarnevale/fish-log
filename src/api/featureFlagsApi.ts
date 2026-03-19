import { useQuery } from '@tanstack/react-query';
import { fetchFeatureFlags, type FeatureFlagKey } from '../services/featureFlagService';

export const FEATURE_FLAG_QUERY_KEY = 'featureFlags';

/**
 * Hook to check if a specific feature flag is enabled.
 *
 * Returns `false` while loading (safe default for gating new features).
 */
export function useFeatureFlag(key: FeatureFlagKey): {
  enabled: boolean;
  isLoading: boolean;
} {
  const { data: flags, isLoading } = useQuery({
    queryKey: [FEATURE_FLAG_QUERY_KEY],
    queryFn: fetchFeatureFlags,
    staleTime: 5 * 60 * 1000, // 5 minutes — matches service cache TTL
  });

  return {
    enabled: flags?.[key] ?? false,
    isLoading,
  };
}
