// api/speciesBulletinApi.ts
//
// Lightweight React Query hook for fetching bulletins that affect a specific species.
// Used by the SpeciesDetailBulletinBanner to show bulletin details and link to BulletinModal.

import { useQuery } from '@tanstack/react-query';
import { fetchBulletinsForSpecies } from '../services/speciesBulletinService';
import type { Bulletin } from '../types/bulletin';

/**
 * Fetch active bulletins for a single species.
 * Only enabled when speciesId is provided (non-null).
 * Stale time: 30 minutes — bulletins don't change frequently.
 */
export const useBulletinsForSpecies = (speciesId: string | null) => {
  return useQuery<Bulletin[]>({
    queryKey: ['bulletins', 'species', speciesId],
    queryFn: () => fetchBulletinsForSpecies(speciesId!),
    enabled: !!speciesId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
