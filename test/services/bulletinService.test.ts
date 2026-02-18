/**
 * bulletinService.test.ts - App bulletins service
 */
// Unmock bulletinService (auto-mocked in jest.setup.ts)
jest.unmock('../../src/services/bulletinService');

import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

import { fetchActiveBulletins } from '../../src/services/bulletinService';

describe('bulletinService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  describe('fetchActiveBulletins', () => {
    it('returns empty array when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const bulletins = await fetchActiveBulletins();
      expect(bulletins).toEqual([]);
    });

    it('fetches and sorts bulletins by priority then displayOrder', async () => {
      const rows = [
        {
          id: 'b-1',
          title: 'Normal',
          message: 'A normal bulletin',
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
        },
        {
          id: 'b-2',
          title: 'Urgent',
          message: 'An urgent bulletin',
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
        },
      ];

      // Chain: .from().select().eq().or().order() - order is terminal
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: rows, error: null }),
      }));

      const bulletins = await fetchActiveBulletins();
      expect(bulletins.length).toBe(2);
      // Urgent should come first (priority 0 < normal priority 2)
      expect(bulletins[0].title).toBe('Urgent');
      expect(bulletins[1].title).toBe('Normal');
    });

    it('handles Supabase error gracefully', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
      }));

      const bulletins = await fetchActiveBulletins();
      expect(bulletins).toEqual([]);
    });
  });
});
