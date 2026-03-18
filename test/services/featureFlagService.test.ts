import {
  fetchFeatureFlags,
  isFeatureEnabled,
  clearFlagCache,
} from '../../src/services/featureFlagService';
import { supabase, isSupabaseConnected } from '../../src/config/supabase';

jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
  isSupabaseConnected: jest.fn(),
}));

const mockIsConnected = isSupabaseConnected as jest.MockedFunction<typeof isSupabaseConnected>;
const mockFrom = supabase.from as jest.Mock;

describe('featureFlagService', () => {
  beforeEach(() => {
    clearFlagCache();
    jest.clearAllMocks();
  });

  describe('fetchFeatureFlags', () => {
    it('returns defaults when offline', async () => {
      mockIsConnected.mockResolvedValue(false);

      const flags = await fetchFeatureFlags();

      expect(flags).toEqual({ promotions_hub: false });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('fetches flags from Supabase when connected', async () => {
      mockIsConnected.mockResolvedValue(true);
      mockFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ key: 'promotions_hub', enabled: true }],
          error: null,
        }),
      });

      const flags = await fetchFeatureFlags();

      expect(flags.promotions_hub).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('feature_flags');
    });

    it('returns defaults on Supabase error', async () => {
      mockIsConnected.mockResolvedValue(true);
      mockFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'table not found' },
        }),
      });

      const flags = await fetchFeatureFlags();

      expect(flags).toEqual({ promotions_hub: false });
    });

    it('uses cached values on subsequent calls', async () => {
      mockIsConnected.mockResolvedValue(true);
      mockFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ key: 'promotions_hub', enabled: true }],
          error: null,
        }),
      });

      await fetchFeatureFlags();
      await fetchFeatureFlags();

      // Only one Supabase call — second used cache
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('refetches after cache is cleared', async () => {
      mockIsConnected.mockResolvedValue(true);
      mockFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ key: 'promotions_hub', enabled: true }],
          error: null,
        }),
      });

      await fetchFeatureFlags();
      clearFlagCache();
      await fetchFeatureFlags();

      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it('returns defaults when fetch throws', async () => {
      mockIsConnected.mockResolvedValue(true);
      mockFrom.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('network error')),
      });

      const flags = await fetchFeatureFlags();

      expect(flags).toEqual({ promotions_hub: false });
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns true when flag is enabled', async () => {
      mockIsConnected.mockResolvedValue(true);
      mockFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ key: 'promotions_hub', enabled: true }],
          error: null,
        }),
      });

      expect(await isFeatureEnabled('promotions_hub')).toBe(true);
    });

    it('returns false when flag is disabled', async () => {
      mockIsConnected.mockResolvedValue(true);
      mockFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ key: 'promotions_hub', enabled: false }],
          error: null,
        }),
      });

      expect(await isFeatureEnabled('promotions_hub')).toBe(false);
    });

    it('returns false when offline', async () => {
      mockIsConnected.mockResolvedValue(false);

      expect(await isFeatureEnabled('promotions_hub')).toBe(false);
    });
  });
});
