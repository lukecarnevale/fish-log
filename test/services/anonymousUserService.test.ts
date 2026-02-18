/**
 * anonymousUserService.test.ts - Anonymous user management tests
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

import {
  getOrCreateAnonymousUser,
  getAnonymousUser,
  updateLastActive,
  dismissRewardsPrompt,
  hasUserDismissedRewardsPrompt,
  clearAnonymousUserCache,
  shouldShowRewardsPrompt,
} from '../../src/services/anonymousUserService';

const mockAnonymousUser = {
  id: 'anon-sb-1',
  device_id: 'device-123',
  created_at: '2026-01-01T00:00:00.000Z',
  last_active_at: '2026-01-15T00:00:00.000Z',
  dismissed_rewards_prompt: false,
};

const transformedAnonymousUser = {
  id: 'anon-sb-1',
  deviceId: 'device-123',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastActiveAt: '2026-01-15T00:00:00.000Z',
  dismissedRewardsPrompt: false,
};

describe('anonymousUserService', () => {
  // getOrCreateAnonymousUser uses a singleton with a 1000ms setTimeout to clear.
  // Without fake timers, the singleton persists across tests (they run in < 1000ms).
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  afterEach(() => {
    // Advance past the singleton's 1000ms clear timeout to reset between tests
    jest.advanceTimersByTime(1100);
    jest.useRealTimers();
  });

  // ============================================================
  // getOrCreateAnonymousUser
  // ============================================================
  describe('getOrCreateAnonymousUser', () => {
    it('creates user in Supabase when connected', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });

      const user = await getOrCreateAnonymousUser();

      expect(user.id).toBe('anon-sb-1');
      expect(user.deviceId).toBe('device-123');
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith('upsert_anonymous_user', {
        p_device_id: 'device-123',
      });
    });

    it('uses cached user when Supabase fails', async () => {
      // First, cache a user
      await AsyncStorage.setItem('@anonymous_user', JSON.stringify(transformedAnonymousUser));

      // Make Supabase fail
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('Connection error'));

      const user = await getOrCreateAnonymousUser();
      expect(user.id).toBe('anon-sb-1');
    });

    it('creates local user when Supabase fails and no cache', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const user = await getOrCreateAnonymousUser();
      expect(user.id).toBe('device-123'); // Uses device ID as fallback
      expect(user.deviceId).toBe('device-123');
    });

    it('caches user after Supabase creation', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });

      await getOrCreateAnonymousUser();

      const cached = await AsyncStorage.getItem('@anonymous_user');
      expect(cached).not.toBeNull();
      const parsed = JSON.parse(cached!);
      expect(parsed.id).toBe('anon-sb-1');
    });
  });

  // ============================================================
  // getAnonymousUser
  // ============================================================
  describe('getAnonymousUser', () => {
    it('fetches from Supabase when connected', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });

      const user = await getAnonymousUser();
      expect(user?.id).toBe('anon-sb-1');
    });

    it('falls back to cache when Supabase fails', async () => {
      await AsyncStorage.setItem('@anonymous_user', JSON.stringify(transformedAnonymousUser));
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('Fail'));

      const user = await getAnonymousUser();
      expect(user?.id).toBe('anon-sb-1');
    });

    it('returns null when no user exists anywhere', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const user = await getAnonymousUser();
      expect(user).toBeNull();
    });
  });

  // ============================================================
  // hasUserDismissedRewardsPrompt
  // ============================================================
  describe('hasUserDismissedRewardsPrompt', () => {
    it('returns false by default', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const dismissed = await hasUserDismissedRewardsPrompt();
      expect(dismissed).toBe(false);
    });

    it('returns true when prompt was dismissed', async () => {
      const dismissedUser = { ...transformedAnonymousUser, dismissedRewardsPrompt: true };
      await AsyncStorage.setItem('@anonymous_user', JSON.stringify(dismissedUser));
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('Fail'));

      const dismissed = await hasUserDismissedRewardsPrompt();
      expect(dismissed).toBe(true);
    });
  });

  // ============================================================
  // clearAnonymousUserCache
  // ============================================================
  describe('clearAnonymousUserCache', () => {
    it('removes cached user from AsyncStorage', async () => {
      await AsyncStorage.setItem('@anonymous_user', JSON.stringify(transformedAnonymousUser));
      await clearAnonymousUserCache();

      const cached = await AsyncStorage.getItem('@anonymous_user');
      expect(cached).toBeNull();
    });
  });

  // ============================================================
  // shouldShowRewardsPrompt
  // ============================================================
  describe('shouldShowRewardsPrompt', () => {
    it('returns false when user has rewardsOptedInAt in cache', async () => {
      await AsyncStorage.setItem('@current_user', JSON.stringify({
        id: 'user-1',
        rewardsOptedInAt: '2026-01-01',
      }));

      const result = await shouldShowRewardsPrompt();
      expect(result).toBe(false);
    });
  });
});
