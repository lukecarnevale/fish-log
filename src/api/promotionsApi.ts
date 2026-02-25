/**
 * src/api/promotionsApi.ts
 *
 * React Query hooks for the Promotions Hub.
 * Follows the same pattern as speciesApi.ts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPromotions,
  submitPartnerInquiry,
  type Advertisement,
  type AdCategory,
} from '../services/promotionsService';
import type { PartnerInquiry } from '../types/partnerInquiry';

// Cache keys
export const PROMOTIONS_KEYS = {
  all: ['promotions'] as const,
  list: (filters: { area?: string; category?: AdCategory | null }) =>
    ['promotions', 'list', filters] as const,
};

// 5 minutes stale time for promotions
const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Hook to fetch promotions with optional area/category filters.
 */
export function usePromotions(options?: {
  area?: string;
  category?: AdCategory | null;
}) {
  const area = options?.area;
  const category = options?.category ?? undefined;

  return useQuery({
    queryKey: PROMOTIONS_KEYS.list({ area, category }),
    queryFn: () =>
      fetchPromotions({
        area,
        category: category || undefined,
      }),
    staleTime: FIVE_MINUTES,
    retry: 2,
    select: (data) => data,
  });
}

/**
 * Mutation hook for submitting a partner inquiry.
 */
export function useSubmitPartnerInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { inquiry: PartnerInquiry; userId?: string }) =>
      submitPartnerInquiry(params.inquiry, params.userId),
    onSuccess: () => {
      // Invalidate promotions cache in case new partnerships show up
      queryClient.invalidateQueries({ queryKey: PROMOTIONS_KEYS.all });
    },
  });
}

/**
 * Prefetch promotions for a given filter set.
 * Call before navigation to have data ready instantly.
 */
export async function prefetchPromotions(
  queryClient: ReturnType<typeof useQueryClient>,
  options?: { area?: string; category?: AdCategory | null }
) {
  const area = options?.area;
  const category = options?.category ?? undefined;

  await queryClient.prefetchQuery({
    queryKey: PROMOTIONS_KEYS.list({ area, category }),
    queryFn: () =>
      fetchPromotions({
        area,
        category: category || undefined,
      }),
    staleTime: FIVE_MINUTES,
  });
}
