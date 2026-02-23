/**
 * rewardsConversionService.test.ts - Anonymous-to-rewards member conversion
 */
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: jest.fn().mockResolvedValue({
    id: 'anon-123', deviceId: 'device-123',
    createdAt: '2026-01-01', lastActiveAt: '2026-01-01',
    dismissedRewardsPrompt: false,
  }),
  getAnonymousUser: jest.fn().mockResolvedValue({
    id: 'anon-123', deviceId: 'device-123',
    createdAt: '2026-01-01', lastActiveAt: '2026-01-01',
    dismissedRewardsPrompt: false,
  }),
}));

jest.mock('../../src/services/authService', () => ({
  ensureValidSession: jest.fn().mockResolvedValue({ valid: false }),
  getAuthState: jest.fn().mockResolvedValue({ isAuthenticated: false, user: null, session: null }),
  getPendingAuth: jest.fn().mockResolvedValue(null),
  clearPendingAuth: jest.fn().mockResolvedValue(undefined),
  getCurrentAuthUser: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/services/statsService', () => ({
  backfillUserStatsFromReports: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/services/rewardsService', () => ({
  getEnteredDrawingIds: jest.fn().mockResolvedValue([]),
  recordDrawingEntry: jest.fn().mockResolvedValue(undefined),
  clearRewardsCache: jest.fn().mockResolvedValue(undefined),
  enterRewardsDrawing: jest.fn().mockResolvedValue(undefined),
  fetchCurrentDrawing: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/services/pendingSubmissionService', () => ({
  getPendingSubmission: jest.fn().mockResolvedValue(null),
  completePendingSubmission: jest.fn().mockResolvedValue(undefined),
  clearPendingSubmission: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/userService', () => ({
  findUserByDeviceId: jest.fn().mockResolvedValue(null),
  findUserByEmail: jest.fn().mockResolvedValue(null),
  createUserInSupabase: jest.fn().mockResolvedValue(null),
  clearUserCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/userProfileService', () => ({
  getCachedUser: jest.fn().mockResolvedValue(null),
  cacheUser: jest.fn().mockResolvedValue(undefined),
  syncToUserProfile: jest.fn().mockResolvedValue(undefined),
  updateUserInSupabase: jest.fn().mockResolvedValue(undefined),
  getCachedFormPreferences: jest.fn().mockResolvedValue({}),
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));

import {
  convertToRewardsMember,
  isRewardsMember,
  getRewardsMemberForAnonymousUser,
  linkEmailToUser,
} from '../../src/services/rewardsConversionService';

describe('rewardsConversionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  // ============================================================
  // isRewardsMember
  // ============================================================
  describe('isRewardsMember', () => {
    it('returns false when no auth session', async () => {
      const result = await isRewardsMember();
      expect(result).toBe(false);
    });

    it('returns false when user has no rewardsOptedInAt', async () => {
      const { getAuthState } = require('../../src/services/authService');
      getAuthState.mockResolvedValue({ isAuthenticated: true, user: { email: 'test@example.com' }, session: {} });

      const { getCachedUser } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue({ id: 'user-1', rewardsOptedInAt: null });

      const result = await isRewardsMember();
      expect(result).toBe(false);
    });

    it('returns true when both auth session and rewardsOptedInAt exist', async () => {
      const { getAuthState } = require('../../src/services/authService');
      getAuthState.mockResolvedValue({ isAuthenticated: true, user: { email: 'test@example.com' }, session: {} });

      const { getCachedUser } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue({
        id: 'user-1',
        rewardsOptedInAt: '2026-01-01',
      });

      const result = await isRewardsMember();
      expect(result).toBe(true);
    });
  });

  // ============================================================
  // getRewardsMemberForAnonymousUser
  // ============================================================
  describe('getRewardsMemberForAnonymousUser', () => {
    it('returns null when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await getRewardsMemberForAnonymousUser();
      expect(result).toBeNull();
    });

    it('tries auth email lookup first', async () => {
      const { getAuthState } = require('../../src/services/authService');
      getAuthState.mockResolvedValue({
        isAuthenticated: true,
        user: { email: 'test@example.com' },
        session: {},
      });

      const dbUser = {
        id: 'user-1',
        email: 'test@example.com',
        device_id: 'device-123',
        rewards_opted_in_at: '2026-01-01',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      // getRewardsMemberForAnonymousUser queries Supabase directly:
      // .from('users').select('*').ilike('email', ...).limit(1).single()
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: dbUser, error: null }),
        eq: jest.fn().mockReturnThis(),
      }));

      const result = await getRewardsMemberForAnonymousUser();
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });
  });

  // ============================================================
  // convertToRewardsMember
  // ============================================================
  describe('convertToRewardsMember', () => {
    it('returns error when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await convertToRewardsMember({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Angler',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('calls convert_to_rewards_member RPC', async () => {
      const rpcResult = {
        user_id: 'user-new',
      };
      const userData = {
        id: 'user-new',
        email: 'test@example.com',
        device_id: 'device-123',
        first_name: 'Test',
        last_name: 'Angler',
        rewards_opted_in_at: '2026-01-15',
        created_at: '2026-01-15',
        updated_at: '2026-01-15',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      // Mock the user fetch after RPC
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await convertToRewardsMember({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Angler',
      } as any);

      expect(result.success).toBe(true);
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'convert_to_rewards_member',
        expect.objectContaining({
          p_email: 'test@example.com',
          p_device_id: 'device-123',
        })
      );
    });

    it('handles already_exists error by fetching existing user', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'already_exists' },
      });

      const { findUserByEmail } = require('../../src/services/userService');
      findUserByEmail.mockResolvedValue({
        id: 'user-existing',
        email: 'existing@example.com',
      });

      const result = await convertToRewardsMember({
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
      } as any);

      expect(result.success).toBe(true);
      expect(findUserByEmail).toHaveBeenCalledWith('existing@example.com');
    });
  });

  // ============================================================
  // linkEmailToUser
  // ============================================================
  describe('linkEmailToUser', () => {
    it('returns error when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await linkEmailToUser('test@example.com');
      expect(result.success).toBe(false);
    });
  });
});
