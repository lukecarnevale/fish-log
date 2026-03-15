/**
 * advertisementsService.test.ts - Advertisement fetching, filtering, and tracking
 */
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

import {
  fetchAdvertisements,
  fetchAdvertisementById,
  trackAdClick,
  trackAdImpression,
} from '../../src/services/advertisementsService';

const mockAdRow = {
  id: 'ad-1',
  company_name: 'Acme Bait Co',
  promo_text: '20% off all lures',
  promo_code: 'FISH20',
  link_url: 'https://acmebait.com',
  image_url: 'https://acmebait.com/banner.jpg',
  is_active: true,
  priority: 1,
  placements: ['home', 'catch_feed'],
  location: 'NC',
  start_date: '2026-01-01T00:00:00Z',
  end_date: '2026-12-31T23:59:59Z',
  click_count: 10,
  impression_count: 500,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

function adChainMock(resolveWith: any = { data: null, error: null }) {
  const chain: any = {};
  const self = () => chain;
  ['select', 'eq', 'contains', 'or', 'order', 'single', 'limit'].forEach(m => {
    chain[m] = jest.fn(self);
  });
  // Terminal methods
  chain.or = jest.fn().mockResolvedValue(resolveWith);
  return chain;
}

describe('advertisementsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  // ============================================================
  // fetchAdvertisements
  // ============================================================
  describe('fetchAdvertisements', () => {
    it('returns empty array when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await fetchAdvertisements();
      expect(result).toEqual({ advertisements: [], fromCache: false });
    });

    it('fetches and transforms advertisements from Supabase', async () => {
      // The chain ends with the second .or() call (date range filter)
      // Build chain: .from().select().eq().order().contains?().or().or()
      const orMock2 = jest.fn().mockResolvedValue({ data: [mockAdRow], error: null });
      const orMock1 = jest.fn().mockReturnValue({ or: orMock2 });
      const orderMock = jest.fn().mockReturnValue({ or: orMock1 });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
      }));

      const result = await fetchAdvertisements();
      expect(result.advertisements.length).toBe(1);
      expect(result.advertisements[0].companyName).toBe('Acme Bait Co');
      expect(result.advertisements[0].promoCode).toBe('FISH20');
      expect(result.fromCache).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('advertisements');
    });

    it('filters by placement when specified', async () => {
      const orMock2 = jest.fn().mockResolvedValue({ data: [mockAdRow], error: null });
      const orMock1 = jest.fn().mockReturnValue({ or: orMock2 });
      const containsMock = jest.fn().mockReturnValue({ or: orMock1 });
      const orderMock = jest.fn().mockReturnValue({ contains: containsMock });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
      }));

      const result = await fetchAdvertisements('home');
      expect(result.advertisements.length).toBe(1);
      expect(containsMock).toHaveBeenCalledWith('placements', ['home']);
    });

    it('returns empty array on Supabase error', async () => {
      const orMock2 = jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } });
      const orMock1 = jest.fn().mockReturnValue({ or: orMock2 });
      const orderMock = jest.fn().mockReturnValue({ or: orMock1 });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
      }));

      const result = await fetchAdvertisements();
      expect(result).toEqual({ advertisements: [], fromCache: false });
    });

    it('returns empty array when no active ads exist', async () => {
      const orMock2 = jest.fn().mockResolvedValue({ data: [], error: null });
      const orMock1 = jest.fn().mockReturnValue({ or: orMock2 });
      const orderMock = jest.fn().mockReturnValue({ or: orMock1 });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
      }));

      const result = await fetchAdvertisements();
      expect(result).toEqual({ advertisements: [], fromCache: false });
    });

    it('returns empty array when data is null (no error)', async () => {
      const orMock2 = jest.fn().mockResolvedValue({ data: null, error: null });
      const orMock1 = jest.fn().mockReturnValue({ or: orMock2 });
      const orderMock = jest.fn().mockReturnValue({ or: orMock1 });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
      }));

      const result = await fetchAdvertisements();
      expect(result).toEqual({ advertisements: [], fromCache: false });
    });

    it('returns empty array on thrown exception', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await fetchAdvertisements();
      expect(result).toEqual({ advertisements: [], fromCache: false });
    });
  });

  // ============================================================
  // fetchAdvertisementById
  // ============================================================
  describe('fetchAdvertisementById', () => {
    it('returns null when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await fetchAdvertisementById('ad-1');
      expect(result).toBeNull();
    });

    it('fetches and transforms a single advertisement', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockAdRow, error: null }),
      }));

      const result = await fetchAdvertisementById('ad-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('ad-1');
      expect(result!.companyName).toBe('Acme Bait Co');
    });

    it('returns null when ad is not found', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      const result = await fetchAdvertisementById('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null on error (withConnection fallback)', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Network error')),
      }));

      const result = await fetchAdvertisementById('ad-1');
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // trackAdClick
  // ============================================================
  describe('trackAdClick', () => {
    it('does nothing when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      await trackAdClick('ad-1');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('calls RPC to increment click count', async () => {
      const rpcMock = jest.fn().mockResolvedValue({ error: null });
      (mockSupabase as any).rpc = rpcMock;

      await trackAdClick('ad-1');
      expect(rpcMock).toHaveBeenCalledWith('increment_ad_click', { ad_id: 'ad-1' });
    });

    it('falls back to update when RPC fails', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { click_count: 5 }, error: null }),
        }),
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        error: { message: 'RPC not found' },
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
        update: updateMock,
      }));

      await trackAdClick('ad-1');
      expect(updateMock).toHaveBeenCalled();
    });

    it('handles exception in tracking gracefully', async () => {
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('Network error'));
      await trackAdClick('ad-1');
      // Should not throw
    });

    it('handles fallback update failure gracefully', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      });
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { click_count: 5 }, error: null }),
        }),
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        error: { message: 'RPC not found' },
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
        update: updateMock,
      }));

      await trackAdClick('ad-1');
      // Should not throw; returns early after logging warning
    });
  });

  // ============================================================
  // trackAdImpression
  // ============================================================
  describe('trackAdImpression', () => {
    it('does nothing when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      await trackAdImpression('ad-1');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('calls RPC to increment impression count', async () => {
      const rpcMock = jest.fn().mockResolvedValue({ error: null });
      (mockSupabase as any).rpc = rpcMock;

      await trackAdImpression('ad-1');
      expect(rpcMock).toHaveBeenCalledWith('increment_ad_impression', { ad_id: 'ad-1' });
    });

    it('falls back to update when RPC fails', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { impression_count: 100 }, error: null }),
        }),
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        error: { message: 'RPC not found' },
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
        update: updateMock,
      }));

      await trackAdImpression('ad-1');
      expect(updateMock).toHaveBeenCalled();
    });

    it('handles exception in tracking gracefully', async () => {
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('Network error'));
      await trackAdImpression('ad-1');
      // Should not throw
    });

    it('handles fallback update failure gracefully', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      });
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { impression_count: 100 }, error: null }),
        }),
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        error: { message: 'RPC not found' },
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: selectMock,
        update: updateMock,
      }));

      await trackAdImpression('ad-1');
      // Should not throw
    });
  });
});
