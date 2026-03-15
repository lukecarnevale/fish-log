/**
 * speciesBulletinService.test.ts - Species-specific bulletin fetching
 */
jest.unmock('../../src/services/bulletinService');

import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

import { fetchBulletinsForSpecies } from '../../src/services/speciesBulletinService';

describe('speciesBulletinService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  describe('fetchBulletinsForSpecies', () => {
    const mockBulletinRows = [
      {
        id: 'b-1',
        title: 'Normal Bulletin',
        message: 'Normal message',
        priority: 'normal',
        display_order: 1,
        is_active: true,
        expiration_date: null,
        created_at: '2026-01-01',
        type: 'info',
        action_url: null,
        action_label: null,
        icon_name: null,
        background_color: null,
        affected_species_ids: ['species-1'],
      },
      {
        id: 'b-2',
        title: 'Urgent Bulletin',
        message: 'Urgent message',
        priority: 'urgent',
        display_order: 2,
        is_active: true,
        expiration_date: null,
        created_at: '2026-01-01',
        type: 'warning',
        action_url: null,
        action_label: null,
        icon_name: null,
        background_color: null,
        affected_species_ids: ['species-1'],
      },
    ];

    it('returns empty array when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const bulletins = await fetchBulletinsForSpecies('species-1');
      expect(bulletins).toEqual([]);
    });

    it('fetches and sorts bulletins for a species', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBulletinRows, error: null }),
      }));

      const bulletins = await fetchBulletinsForSpecies('species-1');
      expect(bulletins.length).toBe(2);
      // Urgent should come first after priority sort
      expect(bulletins[0].title).toBe('Urgent Bulletin');
      expect(bulletins[1].title).toBe('Normal Bulletin');
    });

    it('returns empty array on Supabase error', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
      }));

      const bulletins = await fetchBulletinsForSpecies('species-1');
      expect(bulletins).toEqual([]);
    });

    it('returns empty array when data is empty', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const bulletins = await fetchBulletinsForSpecies('species-1');
      expect(bulletins).toEqual([]);
    });

    it('returns empty array when data is null (no error)', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const bulletins = await fetchBulletinsForSpecies('species-1');
      expect(bulletins).toEqual([]);
    });

    it('returns empty array on thrown exception', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockRejectedValue(new Error('Network error')),
      }));

      const bulletins = await fetchBulletinsForSpecies('species-1');
      expect(bulletins).toEqual([]);
    });

    it('queries the correct table with contains filter', async () => {
      const containsMock = jest.fn().mockReturnThis();
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        contains: containsMock,
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }));

      await fetchBulletinsForSpecies('species-42');
      expect(mockSupabase.from).toHaveBeenCalledWith('app_bulletins');
      expect(containsMock).toHaveBeenCalledWith('affected_species_ids', ['species-42']);
    });
  });
});
