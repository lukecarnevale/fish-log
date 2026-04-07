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
  getCurrentUserState,
  isCurrentUserRewardsMember,
  syncAnonymousUserData,
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

    it('returns true when anonymous user has not dismissed prompt and is not a member', async () => {
      // No @current_user cached
      // getOrCreateAnonymousUser returns user with dismissedRewardsPrompt=false
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });
      // findRewardsMemberByAnonymousId returns no match
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await shouldShowRewardsPrompt();
      expect(result).toBe(true);
    });

    it('returns false when anonymous user has dismissed prompt', async () => {
      const dismissedUser = { ...mockAnonymousUser, dismissed_rewards_prompt: true };
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: dismissedUser,
        error: null,
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await shouldShowRewardsPrompt();
      expect(result).toBe(false);
    });

    it('handles error checking cached @current_user gracefully', async () => {
      // Store invalid JSON in @current_user
      await AsyncStorage.setItem('@current_user', 'not valid json');

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      // Should not throw, falls back to checking anonymous user state
      const result = await shouldShowRewardsPrompt();
      expect(result).toBe(true);
    });
  });

  // ============================================================
  // getOrCreateAnonymousUser – race condition guard
  // ============================================================
  describe('getOrCreateAnonymousUser – race condition guard', () => {
    it('returns the same promise for concurrent calls (singleton guard)', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });

      // Launch two concurrent calls
      const promise1 = getOrCreateAnonymousUser();
      const promise2 = getOrCreateAnonymousUser();

      const [user1, user2] = await Promise.all([promise1, promise2]);

      // Both should resolve to the same user
      expect(user1.id).toBe('anon-sb-1');
      expect(user2.id).toBe('anon-sb-1');

      // RPC should only be called once since the singleton is reused
      expect((mockSupabase as any).rpc).toHaveBeenCalledTimes(1);
    });

    it('clears singleton after timeout allowing fresh calls', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });

      await getOrCreateAnonymousUser();
      expect((mockSupabase as any).rpc).toHaveBeenCalledTimes(1);

      // Advance past the 1000ms singleton clear timeout
      jest.advanceTimersByTime(1100);

      await getOrCreateAnonymousUser();
      expect((mockSupabase as any).rpc).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // getCurrentUserState
  // ============================================================
  describe('getCurrentUserState', () => {
    it('returns anonymous state when no rewards member exists', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const state = await getCurrentUserState();
      expect(state.state).toBe('anonymous');
      expect(state.isRewardsMember).toBe(false);
      expect(state.rewardsMember).toBeNull();
      expect(state.anonymousUser).not.toBeNull();
      expect(state.shouldShowRewardsPrompt).toBe(true);
    });

    it('returns rewards_member state when linked user exists', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });

      const memberRow = {
        id: 'member-1',
        device_id: 'device-123',
        email: 'member@test.com',
        auth_id: null,
        anonymous_user_id: 'anon-sb-1',
        first_name: 'Test',
        last_name: 'Member',
        zip_code: null,
        profile_image_url: null,
        preferred_area_code: null,
        preferred_area_label: null,
        date_of_birth: null,
        has_license: false,
        wrc_id: null,
        license_number: null,
        phone: null,
        wants_text_confirmation: false,
        wants_email_confirmation: false,
        license_type: null,
        license_issue_date: null,
        license_expiry_date: null,
        primary_harvest_area: null,
        primary_fishing_method: null,
        total_reports: 5,
        total_fish_reported: 10,
        current_streak_days: 2,
        longest_streak_days: 3,
        last_active_at: null,
        rewards_opted_in_at: '2026-01-01',
        created_at: '2025-12-01',
        updated_at: '2026-01-15',
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: memberRow, error: null }),
      }));

      const state = await getCurrentUserState();
      expect(state.state).toBe('rewards_member');
      expect(state.isRewardsMember).toBe(true);
      expect(state.rewardsMember).not.toBeNull();
      expect(state.shouldShowRewardsPrompt).toBe(false);
    });

    it('handles Supabase error when checking rewards member gracefully', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockRejectedValue(new Error('DB error')),
      }));

      const state = await getCurrentUserState();
      // Should fall back to anonymous, not throw
      expect(state.state).toBe('anonymous');
      expect(state.isRewardsMember).toBe(false);
    });

    it('treats user as anonymous when offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const state = await getCurrentUserState();
      expect(state.state).toBe('anonymous');
      expect(state.rewardsMember).toBeNull();
    });
  });

  // ============================================================
  // isCurrentUserRewardsMember
  // ============================================================
  describe('isCurrentUserRewardsMember', () => {
    it('returns false for anonymous user', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await isCurrentUserRewardsMember();
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // updateLastActive
  // ============================================================
  describe('updateLastActive', () => {
    it('updates last active in Supabase when connected', async () => {
      // getAnonymousUser will call rpc('get_anonymous_user')
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });

      // updateAnonymousUserInSupabase with lastActiveAt uses direct update
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockAnonymousUser, last_active_at: '2026-03-14T00:00:00.000Z' },
          error: null,
        }),
      }));

      await updateLastActive();

      // Verify the cached user was updated
      const cached = await AsyncStorage.getItem('@anonymous_user');
      expect(cached).not.toBeNull();
    });

    it('does nothing when no user exists', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      // No cached user either

      await updateLastActive();
      // Should not throw
    });

    it('handles Supabase update failure gracefully', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }),
      }));

      // Should not throw
      await updateLastActive();
    });
  });

  // ============================================================
  // dismissRewardsPrompt
  // ============================================================
  describe('dismissRewardsPrompt', () => {
    it('dismisses via RPC when connected', async () => {
      const dismissedRow = { ...mockAnonymousUser, dismissed_rewards_prompt: true };

      // getAnonymousUser calls rpc, then dismissRewardsPrompt calls rpc again
      (mockSupabase as any).rpc = jest.fn()
        .mockResolvedValueOnce({ data: mockAnonymousUser, error: null })  // getAnonymousUser
        .mockResolvedValueOnce({ data: dismissedRow, error: null });      // dismiss_rewards_prompt

      await dismissRewardsPrompt();

      expect((mockSupabase as any).rpc).toHaveBeenCalledWith('dismiss_rewards_prompt', {
        p_device_id: 'device-123',
      });

      const cached = await AsyncStorage.getItem('@anonymous_user');
      const parsed = JSON.parse(cached!);
      expect(parsed.dismissedRewardsPrompt).toBe(true);
    });

    it('updates locally when Supabase fails', async () => {
      // Cache the user first
      await AsyncStorage.setItem('@anonymous_user', JSON.stringify(transformedAnonymousUser));

      // getAnonymousUser succeeds from cache, but dismiss RPC fails
      (mockSupabase as any).rpc = jest.fn()
        .mockResolvedValueOnce({ data: mockAnonymousUser, error: null })   // getAnonymousUser
        .mockRejectedValueOnce(new Error('RPC failed'));                    // dismiss_rewards_prompt

      await dismissRewardsPrompt();

      const cached = await AsyncStorage.getItem('@anonymous_user');
      const parsed = JSON.parse(cached!);
      expect(parsed.dismissedRewardsPrompt).toBe(true);
    });

    it('updates locally when offline', async () => {
      await AsyncStorage.setItem('@anonymous_user', JSON.stringify(transformedAnonymousUser));
      mockIsSupabaseConnected.mockResolvedValue(false);

      await dismissRewardsPrompt();

      const cached = await AsyncStorage.getItem('@anonymous_user');
      const parsed = JSON.parse(cached!);
      expect(parsed.dismissedRewardsPrompt).toBe(true);
    });

    it('does nothing when no user exists', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      // Should not throw
      await dismissRewardsPrompt();
    });
  });

  // ============================================================
  // syncAnonymousUserData
  // ============================================================
  describe('syncAnonymousUserData', () => {
    it('syncs user data from Supabase to cache', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: mockAnonymousUser,
        error: null,
      });

      await syncAnonymousUserData();

      const cached = await AsyncStorage.getItem('@anonymous_user');
      const parsed = JSON.parse(cached!);
      expect(parsed.id).toBe('anon-sb-1');
    });

    it('does nothing when offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      await syncAnonymousUserData();

      const cached = await AsyncStorage.getItem('@anonymous_user');
      expect(cached).toBeNull();
    });

    it('handles Supabase error gracefully', async () => {
      (mockSupabase as any).rpc = jest.fn().mockRejectedValue(new Error('Network error'));

      // Should not throw
      await syncAnonymousUserData();
    });

    it('does not update cache when user is not found', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      await syncAnonymousUserData();

      const cached = await AsyncStorage.getItem('@anonymous_user');
      expect(cached).toBeNull();
    });
  });

  // ============================================================
  // getAnonymousUser – additional cases
  // ============================================================
  describe('getAnonymousUser – Supabase returns null', () => {
    it('falls back to cache when Supabase returns no user', async () => {
      await AsyncStorage.setItem('@anonymous_user', JSON.stringify(transformedAnonymousUser));

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const user = await getAnonymousUser();
      expect(user?.id).toBe('anon-sb-1');
    });
  });

  // ============================================================
  // getOrCreateAnonymousUser – Supabase connected but RPC errors
  // ============================================================
  describe('getOrCreateAnonymousUser – Supabase RPC returns error', () => {
    it('falls back to cached user when RPC returns error', async () => {
      await AsyncStorage.setItem('@anonymous_user', JSON.stringify(transformedAnonymousUser));

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC function not found' },
      });

      const user = await getOrCreateAnonymousUser();
      // The RPC error will cause createAnonymousUserInSupabase to throw,
      // falling back to cached user
      expect(user.id).toBe('anon-sb-1');
    });
  });
});
