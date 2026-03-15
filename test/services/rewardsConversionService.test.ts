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

jest.mock('../../src/services/catchFeedService', () => ({
  clearCatchFeedCache: jest.fn().mockResolvedValue(undefined),
}));

import {
  convertToRewardsMember,
  createRewardsMemberFromAuthUser,
  isRewardsMember,
  getRewardsMemberForAnonymousUser,
  linkEmailToUser,
  findRewardsMemberByAuthId,
} from '../../src/services/rewardsConversionService';

describe('rewardsConversionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);

    // Reset mocks to their default factory values, since clearAllMocks only
    // clears call history but does NOT undo mockResolvedValue overrides.
    const { getAuthState, ensureValidSession, getPendingAuth, clearPendingAuth, getCurrentAuthUser } = require('../../src/services/authService');
    ensureValidSession.mockResolvedValue({ valid: false });
    getAuthState.mockResolvedValue({ isAuthenticated: false, user: null, session: null });
    getPendingAuth.mockResolvedValue(null);
    clearPendingAuth.mockResolvedValue(undefined);
    getCurrentAuthUser.mockResolvedValue(null);

    const { getCachedUser, cacheUser, syncToUserProfile, updateUserInSupabase, getCachedFormPreferences, getCurrentUser } = require('../../src/services/userProfileService');
    getCachedUser.mockResolvedValue(null);
    cacheUser.mockResolvedValue(undefined);
    syncToUserProfile.mockResolvedValue(undefined);
    updateUserInSupabase.mockResolvedValue(undefined);
    getCachedFormPreferences.mockResolvedValue({});
    getCurrentUser.mockResolvedValue(null);

    const { findUserByDeviceId, findUserByEmail, createUserInSupabase: createUser, clearUserCache } = require('../../src/services/userService');
    findUserByDeviceId.mockResolvedValue(null);
    findUserByEmail.mockResolvedValue(null);
    createUser.mockResolvedValue(null);
    clearUserCache.mockResolvedValue(undefined);

    const { getAnonymousUser, getOrCreateAnonymousUser } = require('../../src/services/anonymousUserService');
    getOrCreateAnonymousUser.mockResolvedValue({
      id: 'anon-123', deviceId: 'device-123',
      createdAt: '2026-01-01', lastActiveAt: '2026-01-01',
      dismissedRewardsPrompt: false,
    });
    getAnonymousUser.mockResolvedValue({
      id: 'anon-123', deviceId: 'device-123',
      createdAt: '2026-01-01', lastActiveAt: '2026-01-01',
      dismissedRewardsPrompt: false,
    });

    const { getEnteredDrawingIds, enterRewardsDrawing, fetchCurrentDrawing } = require('../../src/services/rewardsService');
    getEnteredDrawingIds.mockResolvedValue([]);
    enterRewardsDrawing.mockResolvedValue(undefined);
    fetchCurrentDrawing.mockResolvedValue(null);

    const { getPendingSubmission } = require('../../src/services/pendingSubmissionService');
    getPendingSubmission.mockResolvedValue(null);

    // Reset Supabase from chain to its default factory implementation
    (mockSupabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      then: jest.fn(),
    }));

    // Reset rpc to a no-op default
    (mockSupabase as any).rpc = jest.fn().mockResolvedValue({ data: null, error: null });
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

    it('returns false when getCachedUser returns null', async () => {
      const { getAuthState } = require('../../src/services/authService');
      getAuthState.mockResolvedValue({ isAuthenticated: true, user: { email: 'test@example.com' }, session: {} });

      const { getCachedUser } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue(null);

      const result = await isRewardsMember();
      expect(result).toBe(false);
    });

    it('returns false when rewardsOptedInAt is undefined', async () => {
      const { getAuthState } = require('../../src/services/authService');
      getAuthState.mockResolvedValue({ isAuthenticated: true, user: { email: 'test@example.com' }, session: {} });

      const { getCachedUser } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue({ id: 'user-1' });

      const result = await isRewardsMember();
      expect(result).toBe(false);
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

    it('falls back to anonymous_user_id when no auth session', async () => {
      const dbUser = {
        id: 'user-2',
        email: 'anon@example.com',
        device_id: 'device-123',
        anonymous_user_id: 'anon-123',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: dbUser, error: null }),
      }));

      const result = await getRewardsMemberForAnonymousUser();
      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-2');
    });

    it('returns null when anonymous_user_id lookup returns PGRST116', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
      }));

      const result = await getRewardsMemberForAnonymousUser();
      expect(result).toBeNull();
    });

    it('returns null when anonymous_user_id lookup throws a non-PGRST116 error', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'server error' } }),
      }));

      const result = await getRewardsMemberForAnonymousUser();
      expect(result).toBeNull();
    });

    it('returns null when no anonymous user exists', async () => {
      const { getAnonymousUser } = require('../../src/services/anonymousUserService');
      getAnonymousUser.mockResolvedValue(null);

      // Auth email lookup fails
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
        eq: jest.fn().mockReturnThis(),
      }));

      const result = await getRewardsMemberForAnonymousUser();
      expect(result).toBeNull();
    });

    it('returns null when anonymous_user_id query returns null data', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await getRewardsMemberForAnonymousUser();
      expect(result).toBeNull();
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

    it('returns error when no anonymous user found', async () => {
      const { getAnonymousUser } = require('../../src/services/anonymousUserService');
      getAnonymousUser.mockResolvedValue(null);

      const result = await convertToRewardsMember({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No anonymous user found');
    });

    it('detaches device_id from old user when device is already claimed', async () => {
      const { findUserByDeviceId } = require('../../src/services/userService');
      findUserByDeviceId.mockResolvedValue({ id: 'old-user', email: 'old@example.com' });

      const rpcResult = { user_id: 'user-new' };
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

      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: userData, error: null });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: updateMock,
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      }));

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      const result = await convertToRewardsMember({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Angler',
      } as any);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('handles duplicate key RPC error with user-friendly message', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      });

      const result = await convertToRewardsMember({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Angler',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already linked to a rewards account');
    });

    it('handles generic RPC error with user-friendly message', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'some internal error' },
      });

      const result = await convertToRewardsMember({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Angler',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Something went wrong');
    });

    it('returns error when RPC returns null result', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await convertToRewardsMember({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Angler',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No user returned');
    });

    it('returns error when user fetch after RPC fails', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { user_id: 'user-new' },
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'fetch error' } }),
      }));

      const result = await convertToRewardsMember({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Angler',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch created user');
    });

    it('syncs cached form preferences after successful conversion', async () => {
      const { getCachedFormPreferences, updateUserInSupabase } = require('../../src/services/userProfileService');
      getCachedFormPreferences.mockResolvedValue({ wants_text_confirmation: true });

      const rpcResult = { user_id: 'user-new' };
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
      expect(updateUserInSupabase).toHaveBeenCalledWith('user-new', { wants_text_confirmation: true });
    });

    it('succeeds even when preference sync fails', async () => {
      const { getCachedFormPreferences, updateUserInSupabase } = require('../../src/services/userProfileService');
      getCachedFormPreferences.mockResolvedValue({ wants_text_confirmation: true });
      updateUserInSupabase.mockRejectedValue(new Error('sync failed'));

      const rpcResult = { user_id: 'user-new' };
      const userData = {
        id: 'user-new',
        email: 'test@example.com',
        device_id: 'device-123',
        created_at: '2026-01-15',
        updated_at: '2026-01-15',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

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
    });
  });

  // ============================================================
  // linkEmailToUser
  // ============================================================
  describe('linkEmailToUser', () => {
    it('returns error when no current user', async () => {
      const result = await linkEmailToUser('test@example.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('No current user');
    });

    it('returns error when not connected', async () => {
      const { getCachedUser } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue({ id: 'user-1', email: 'old@example.com' });
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await linkEmailToUser('test@example.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('No connection to server');
    });

    it('creates merge request when email already exists', async () => {
      const { getCachedUser } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue({ id: 'user-1', email: 'old@example.com' });

      const { findUserByEmail } = require('../../src/services/userService');
      findUserByEmail.mockResolvedValue({ id: 'user-other', email: 'test@example.com' });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'merge-req-1' },
          error: null,
        }),
      }));

      const result = await linkEmailToUser('test@example.com');
      expect(result.success).toBe(true);
      expect(result.merged).toBe(false);
      expect(result.mergeRequestId).toBe('merge-req-1');
    });

    it('updates current user email when email does not exist', async () => {
      const { getCachedUser, updateUserInSupabase, cacheUser } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue({ id: 'user-1', email: 'old@example.com' });

      const { findUserByEmail } = require('../../src/services/userService');
      findUserByEmail.mockResolvedValue(null);

      const updatedUser = { id: 'user-1', email: 'new@example.com' };
      updateUserInSupabase.mockResolvedValue(updatedUser);

      const result = await linkEmailToUser('new@example.com');
      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(updateUserInSupabase).toHaveBeenCalledWith('user-1', { email: 'new@example.com' });
      expect(cacheUser).toHaveBeenCalledWith(updatedUser);
    });

    it('returns error when merge request insert fails', async () => {
      const { getCachedUser } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue({ id: 'user-1', email: 'old@example.com' });

      const { findUserByEmail } = require('../../src/services/userService');
      findUserByEmail.mockResolvedValue({ id: 'user-other', email: 'test@example.com' });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'insert failed' },
        }),
      }));

      const result = await linkEmailToUser('test@example.com');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create merge request');
    });

    it('returns error when updateUserInSupabase throws', async () => {
      const { getCachedUser, updateUserInSupabase } = require('../../src/services/userProfileService');
      getCachedUser.mockResolvedValue({ id: 'user-1', email: 'old@example.com' });

      const { findUserByEmail } = require('../../src/services/userService');
      findUserByEmail.mockResolvedValue(null);
      updateUserInSupabase.mockRejectedValue(new Error('update failed'));

      const result = await linkEmailToUser('new@example.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('update failed');
    });
  });

  // ============================================================
  // createRewardsMemberFromAuthUser - intent handling
  // ============================================================
  describe('createRewardsMemberFromAuthUser', () => {
    it('returns error when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await createRewardsMemberFromAuthUser();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No connection to server');
    });

    it('returns error when no auth user', async () => {
      const { getCurrentAuthUser } = require('../../src/services/authService');
      getCurrentAuthUser.mockResolvedValue(null);

      const result = await createRewardsMemberFromAuthUser();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No authenticated user found');
    });

    it('updates existing user when intent is update_email', async () => {
      const { getCurrentAuthUser, getPendingAuth, clearPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail } = require('../../src/services/userService');
      const { cacheUser, syncToUserProfile } = require('../../src/services/userProfileService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-456',
        email: 'new@example.com',
        user_metadata: {},
      });

      // No existing user by email (it's a new email)
      findUserByEmail.mockResolvedValue(null);

      // Pending auth has update_email intent
      getPendingAuth.mockResolvedValue({
        email: 'new@example.com',
        firstName: 'Test',
        lastName: 'User',
        sentAt: new Date().toISOString(),
        intent: 'update_email',
        existingUserId: 'user-existing-123',
      });

      const updatedUserData = {
        id: 'user-existing-123',
        email: 'new@example.com',
        auth_id: 'auth-456',
        device_id: 'device-123',
        first_name: 'Test',
        last_name: 'User',
        rewards_opted_in_at: '2026-01-01',
        created_at: '2026-01-01',
        updated_at: '2026-02-24',
      };

      // Mock the Supabase update chain
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedUserData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('new@example.com');
      expect(result.user?.id).toBe('user-existing-123');
      expect(cacheUser).toHaveBeenCalled();
      expect(syncToUserProfile).toHaveBeenCalled();
      expect(clearPendingAuth).toHaveBeenCalled();
    });

    it('proceeds with normal flow when intent is new_account', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-789',
        email: 'fresh@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);

      getPendingAuth.mockResolvedValue({
        email: 'fresh@example.com',
        firstName: 'Fresh',
        lastName: 'Start',
        sentAt: new Date().toISOString(),
        intent: 'new_account',
      });

      const rpcResult = { user_id: 'user-new', reports_linked: 0 };
      const userData = {
        id: 'user-new',
        email: 'fresh@example.com',
        device_id: 'device-123',
        auth_id: 'auth-789',
        first_name: 'Fresh',
        last_name: 'Start',
        rewards_opted_in_at: '2026-02-24',
        created_at: '2026-02-24',
        updated_at: '2026-02-24',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('fresh@example.com');
      // Should have called the RPC (not the update path)
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'convert_to_rewards_member',
        expect.objectContaining({
          p_email: 'fresh@example.com',
          p_auth_id: 'auth-789',
        })
      );
    });

    it('returns error when auth user has no email', async () => {
      const { getCurrentAuthUser } = require('../../src/services/authService');
      getCurrentAuthUser.mockResolvedValue({ id: 'auth-1', email: null, user_metadata: {} });

      const result = await createRewardsMemberFromAuthUser();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No authenticated user found');
    });

    it('deletes conflicting device-only user and updates existing email user', async () => {
      const { getCurrentAuthUser, clearPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');
      const { cacheUser, syncToUserProfile } = require('../../src/services/userProfileService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-100',
        email: 'existing@example.com',
        user_metadata: {},
      });

      const existingUser = {
        id: 'email-user',
        email: 'existing@example.com',
        deviceId: 'other-device',
      };
      findUserByEmail.mockResolvedValue(existingUser);

      // Conflicting device user has no email
      findUserByDeviceId.mockResolvedValue({ id: 'device-only-user', email: null });

      const updatedData = {
        id: 'email-user',
        email: 'existing@example.com',
        device_id: 'device-123',
        auth_id: 'auth-100',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        delete: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect(cacheUser).toHaveBeenCalled();
      expect(syncToUserProfile).toHaveBeenCalled();
      expect(clearPendingAuth).toHaveBeenCalled();
    });

    it('keeps existing user when both conflicting users have emails', async () => {
      const { getCurrentAuthUser, clearPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');
      const { cacheUser, syncToUserProfile } = require('../../src/services/userProfileService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-200',
        email: 'email-user@example.com',
        user_metadata: {},
      });

      const existingUser = {
        id: 'email-user',
        email: 'email-user@example.com',
        deviceId: 'other-device',
      };
      findUserByEmail.mockResolvedValue(existingUser);

      // Conflicting device user also has an email
      findUserByDeviceId.mockResolvedValue({ id: 'other-email-user', email: 'other@example.com' });

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(existingUser);
      expect(cacheUser).toHaveBeenCalledWith(existingUser);
      expect(syncToUserProfile).toHaveBeenCalledWith(existingUser);
      expect(clearPendingAuth).toHaveBeenCalled();
    });

    it('still returns existing user when device_id update fails', async () => {
      const { getCurrentAuthUser, clearPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');
      const { cacheUser, syncToUserProfile } = require('../../src/services/userProfileService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-300',
        email: 'user@example.com',
        user_metadata: {},
      });

      const existingUser = {
        id: 'user-300',
        email: 'user@example.com',
      };
      findUserByEmail.mockResolvedValue(existingUser);
      findUserByDeviceId.mockResolvedValue(null);

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(existingUser);
      expect(cacheUser).toHaveBeenCalledWith(existingUser);
      expect(syncToUserProfile).toHaveBeenCalledWith(existingUser);
      expect(clearPendingAuth).toHaveBeenCalled();
    });

    it('returns error when update_email intent fails', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-400',
        email: 'newemail@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);

      getPendingAuth.mockResolvedValue({
        email: 'newemail@example.com',
        firstName: 'Test',
        lastName: 'User',
        sentAt: new Date().toISOString(),
        intent: 'update_email',
        existingUserId: 'user-400',
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'constraint violation' } }),
      }));

      const result = await createRewardsMemberFromAuthUser();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Something went wrong updating your email');
    });

    it('returns error when update_email returns null data', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-401',
        email: 'newemail@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);

      getPendingAuth.mockResolvedValue({
        email: 'newemail@example.com',
        intent: 'update_email',
        existingUserId: 'user-401',
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Something went wrong updating your email');
    });

    it('detaches device_id from old user before creating new user', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-500',
        email: 'brand-new@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      // Device is claimed by another user
      findUserByDeviceId.mockResolvedValue({ id: 'old-device-user', email: 'old@example.com' });

      const rpcResult = { user_id: 'user-new-500', reports_linked: 0 };
      const userData = {
        id: 'user-new-500',
        email: 'brand-new@example.com',
        device_id: 'device-123',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('handles RPC already_exists error by fetching existing user', async () => {
      const { getCurrentAuthUser, getPendingAuth, clearPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');
      const { cacheUser, syncToUserProfile } = require('../../src/services/userProfileService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-600',
        email: 'exists@example.com',
        user_metadata: {},
      });

      // First call returns null (no existing user), second call returns the user
      findUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-600', email: 'exists@example.com' });
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'already_exists' },
      });

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe('user-600');
      expect(cacheUser).toHaveBeenCalled();
      expect(syncToUserProfile).toHaveBeenCalled();
      expect(clearPendingAuth).toHaveBeenCalled();
    });

    it('handles RPC duplicate key error with user-friendly message', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-700',
        email: 'dup@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      });

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(false);
      expect(result.error).toContain('already linked to a rewards account');
    });

    it('handles generic RPC error with user-friendly message', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-701',
        email: 'generic@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'some random database error' },
      });

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Something went wrong');
    });

    it('returns error when RPC returns null result', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-800',
        email: 'nullrpc@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No result returned');
    });

    it('returns error when user fetch after RPC fails', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-801',
        email: 'fetchfail@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { user_id: 'user-801', reports_linked: 0 },
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'fetch error' } }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch user after RPC');
    });

    it('succeeds and returns claimedCatches when reports are linked', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-900',
        email: 'linked@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      const rpcResult = { user_id: 'user-900', reports_linked: 3 };
      const userData = {
        id: 'user-900',
        email: 'linked@example.com',
        device_id: 'device-123',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      // Dynamic imports may not work in this Jest config (no --experimental-vm-modules),
      // but the bug fix ensures the conversion still succeeds even if cache clearing fails.
      expect(result.success).toBe(true);
      expect(result.claimedCatches).toBe(3);
    });

    it('migrates local rewards entries with pending submission after RPC', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');
      const { getPendingSubmission } = require('../../src/services/pendingSubmissionService');
      const { enterRewardsDrawing, getEnteredDrawingIds, fetchCurrentDrawing } = require('../../src/services/rewardsService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-1000',
        email: 'migrate@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      // Pending submission with a drawingId
      getPendingSubmission.mockResolvedValue({
        formData: { drawingId: 'drawing-pending' },
      });

      // Local drawing entries
      getEnteredDrawingIds.mockResolvedValue(['drawing-1', 'drawing-2']);
      fetchCurrentDrawing.mockResolvedValue({ id: 'drawing-1' });

      const rpcResult = { user_id: 'user-1000', reports_linked: 0 };
      const userData = {
        id: 'user-1000',
        email: 'migrate@example.com',
        device_id: 'device-123',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      // Should migrate pending drawing entry + 2 local entries
      expect(enterRewardsDrawing).toHaveBeenCalledWith('user-1000', 'drawing-pending');
      expect(enterRewardsDrawing).toHaveBeenCalledWith('user-1000', 'drawing-1');
      expect(enterRewardsDrawing).toHaveBeenCalledWith('user-1000', 'drawing-2');
    });

    it('handles migration errors gracefully without failing conversion', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');
      const { enterRewardsDrawing, getEnteredDrawingIds, fetchCurrentDrawing } = require('../../src/services/rewardsService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-1100',
        email: 'migfail@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      getEnteredDrawingIds.mockResolvedValue(['drawing-fail']);
      fetchCurrentDrawing.mockResolvedValue({ id: 'drawing-fail' });
      enterRewardsDrawing.mockRejectedValue(new Error('drawing entry failed'));

      const rpcResult = { user_id: 'user-1100', reports_linked: 0 };
      const userData = {
        id: 'user-1100',
        email: 'migfail@example.com',
        device_id: 'device-123',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      // Conversion should still succeed even if migration fails
      expect(result.success).toBe(true);
    });

    it('syncs cached form preferences for new user', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');
      const { getCachedFormPreferences, updateUserInSupabase } = require('../../src/services/userProfileService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-1200',
        email: 'prefs@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);
      getCachedFormPreferences.mockResolvedValue({ wants_email_confirmation: true });

      const rpcResult = { user_id: 'user-1200', reports_linked: 0 };
      const userData = {
        id: 'user-1200',
        email: 'prefs@example.com',
        device_id: 'device-123',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect(updateUserInSupabase).toHaveBeenCalledWith('user-1200', { wants_email_confirmation: true });
    });

    it('succeeds even when preference sync fails for new user', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');
      const { getCachedFormPreferences, updateUserInSupabase } = require('../../src/services/userProfileService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-1201',
        email: 'preffail@example.com',
        user_metadata: {},
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);
      getCachedFormPreferences.mockResolvedValue({ wants_email_confirmation: true });
      updateUserInSupabase.mockRejectedValue(new Error('pref sync failed'));

      const rpcResult = { user_id: 'user-1201', reports_linked: 0 };
      const userData = {
        id: 'user-1201',
        email: 'preffail@example.com',
        device_id: 'device-123',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();
      expect(result.success).toBe(true);
    });

    it('uses user_metadata fallbacks when no pending auth', async () => {
      const { getCurrentAuthUser, getPendingAuth } = require('../../src/services/authService');
      const { findUserByEmail, findUserByDeviceId } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({
        id: 'auth-1300',
        email: 'metadata@example.com',
        user_metadata: {
          firstName: 'Meta',
          lastName: 'Data',
          phone: '555-1234',
          zipCode: '12345',
          wrcId: 'WRC-1',
        },
      });

      findUserByEmail.mockResolvedValue(null);
      findUserByDeviceId.mockResolvedValue(null);
      getPendingAuth.mockResolvedValue(null);

      const rpcResult = { user_id: 'user-1300', reports_linked: 0 };
      const userData = {
        id: 'user-1300',
        email: 'metadata@example.com',
        device_id: 'device-123',
        first_name: 'Meta',
        last_name: 'Data',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userData, error: null }),
      }));

      const result = await createRewardsMemberFromAuthUser();

      expect(result.success).toBe(true);
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'convert_to_rewards_member',
        expect.objectContaining({
          p_first_name: 'Meta',
          p_last_name: 'Data',
          p_phone: '555-1234',
          p_zip_code: '12345',
          p_wrc_id: 'WRC-1',
        })
      );
    });
  });

  // ============================================================
  // findRewardsMemberByAuthId
  // ============================================================
  describe('findRewardsMemberByAuthId', () => {
    it('returns null when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await findRewardsMemberByAuthId('auth-1');
      expect(result).toBeNull();
    });

    it('returns null when no auth user', async () => {
      const { getCurrentAuthUser } = require('../../src/services/authService');
      getCurrentAuthUser.mockResolvedValue(null);

      const result = await findRewardsMemberByAuthId('auth-1');
      expect(result).toBeNull();
    });

    it('returns null when auth user has no email', async () => {
      const { getCurrentAuthUser } = require('../../src/services/authService');
      getCurrentAuthUser.mockResolvedValue({ id: 'auth-1', email: null });

      const result = await findRewardsMemberByAuthId('auth-1');
      expect(result).toBeNull();
    });

    it('finds user by auth user email', async () => {
      const { getCurrentAuthUser } = require('../../src/services/authService');
      const { findUserByEmail } = require('../../src/services/userService');

      getCurrentAuthUser.mockResolvedValue({ id: 'auth-1', email: 'found@example.com' });
      findUserByEmail.mockResolvedValue({ id: 'user-found', email: 'found@example.com' });

      const result = await findRewardsMemberByAuthId('auth-1');
      expect(result).toEqual({ id: 'user-found', email: 'found@example.com' });
      expect(findUserByEmail).toHaveBeenCalledWith('found@example.com');
    });
  });
});
