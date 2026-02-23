/**
 * fishSpeciesService.test.ts - Fish species data fetching and caching
 */
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

import {
  fetchAllFishSpecies,
  fetchFishSpeciesById,
  searchFishSpecies,
  clearSpeciesCache,
  refreshSpeciesCache,
} from '../../src/services/fishSpeciesService';

function chainMock(resolveWith: any = { data: null, error: null }) {
  const chain: any = {};
  const self = () => chain;
  ['select', 'eq', 'neq', 'or', 'ilike', 'order', 'limit', 'single', 'maybeSingle', 'not'].forEach(m => {
    chain[m] = jest.fn(self);
  });
  chain.single = jest.fn().mockResolvedValue(resolveWith);
  chain.maybeSingle = jest.fn().mockResolvedValue(resolveWith);
  // Allow terminal resolution for list queries
  chain.order = jest.fn().mockResolvedValue(resolveWith);
  return chain;
}

const mockSpeciesRow = {
  id: 'species-1',
  common_name: 'Red Drum',
  scientific_name: 'Sciaenops ocellatus',
  is_active: true,
  sort_order: 1,
  common_names: ['Red Drum', 'Channel Bass'],
  image_url: null,
  description: 'A popular gamefish',
  size_limit_inches: 18,
  bag_limit: 1,
  season_notes: 'Year-round',
};

describe('fishSpeciesService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    await clearSpeciesCache();
  });

  // ============================================================
  // fetchAllFishSpecies
  // ============================================================
  describe('fetchAllFishSpecies', () => {
    it('fetches species from Supabase and caches', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: [mockSpeciesRow], error: null })
      );

      const species = await fetchAllFishSpecies();
      expect(species.length).toBeGreaterThan(0);
      expect(mockSupabase.from).toHaveBeenCalledWith('fish_species');
    });

    it('returns empty array when disconnected and no cache', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const species = await fetchAllFishSpecies();
      expect(species).toEqual([]);
    });

    it('returns empty array on Supabase error', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: null, error: { message: 'Query failed' } })
      );

      const species = await fetchAllFishSpecies();
      expect(species).toEqual([]);
    });
  });

  // ============================================================
  // fetchFishSpeciesById
  // ============================================================
  describe('fetchFishSpeciesById', () => {
    it('fetches a single species by ID', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: mockSpeciesRow, error: null })
      );

      const species = await fetchFishSpeciesById('species-1');
      expect(species).not.toBeNull();
    });

    it('returns null on PGRST116 (not found)', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
      );

      const species = await fetchFishSpeciesById('nonexistent');
      expect(species).toBeNull();
    });
  });

  // ============================================================
  // searchFishSpecies
  // ============================================================
  describe('searchFishSpecies', () => {
    it('returns empty array for queries shorter than 2 characters', async () => {
      const results = await searchFishSpecies('R');
      expect(results).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('searches Supabase with ilike when connected', async () => {
      // Chain: .from().select().eq().or().order() - order is terminal
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockSpeciesRow], error: null }),
      }));

      const results = await searchFishSpecies('Red Drum');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // refreshSpeciesCache
  // ============================================================
  describe('refreshSpeciesCache', () => {
    it('returns false when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await refreshSpeciesCache();
      expect(result).toBe(false);
    });

    it('returns true and updates cache on success', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: [mockSpeciesRow], error: null })
      );

      const result = await refreshSpeciesCache();
      expect(result).toBe(true);
    });
  });
});
