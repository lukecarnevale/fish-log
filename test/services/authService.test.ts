/**
 * authService.test.ts - Authentication service tests
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase } from '../mocks/supabase';

import {
  sendMagicLink,
  storePendingAuth,
  getPendingAuth,
  clearPendingAuth,
  clearStalePendingAuth,
  ensureValidSession,
  getAuthState,
  getCurrentAuthUser,
  isAuthenticated,
  signOut,
  onAuthStateChange,
  isMagicLinkCallback,
  updateUserMetadata,
  deleteAccount,
} from '../../src/services/authService';

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Pending Auth Storage
  // ============================================================
  describe('storePendingAuth / getPendingAuth / clearPendingAuth', () => {
    it('stores and retrieves pending auth data', async () => {
      const data = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        sentAt: '2026-01-15T00:00:00.000Z',
      };
      await storePendingAuth(data);

      const retrieved = await getPendingAuth();
      expect(retrieved).toEqual(data);
    });

    it('returns null when no pending auth exists', async () => {
      const result = await getPendingAuth();
      expect(result).toBeNull();
    });

    it('clears pending auth data', async () => {
      await storePendingAuth({
        email: 'test@example.com', firstName: 'Test',
        lastName: 'User', sentAt: '2026-01-15',
      });
      await clearPendingAuth();

      const result = await getPendingAuth();
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // ensureValidSession
  // ============================================================
  describe('ensureValidSession', () => {
    it('returns valid when session exists and refresh succeeds', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token', user: { id: 'u1', email: 'test@test.com' } } },
        error: null,
      });
      (mockSupabase.auth as any).refreshSession = jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'u1', email: 'test@test.com' } } },
        error: null,
      });

      const result = await ensureValidSession();
      expect(result.valid).toBe(true);
      expect(result.authUserId).toBe('u1');
    });

    it('returns invalid when no session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await ensureValidSession();
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('no_session');
    });

    it('returns invalid when refresh fails', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });
      (mockSupabase.auth as any).refreshSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Token expired' },
      });

      const result = await ensureValidSession();
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('refresh_failed');
    });

    it('handles thrown errors gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

      const result = await ensureValidSession();
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('error');
    });
  });

  // ============================================================
  // getAuthState
  // ============================================================
  describe('getAuthState', () => {
    it('returns authenticated state with user when session exists', async () => {
      const mockUser = { id: 'u1', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'token' };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const state = await getAuthState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
    });

    it('returns unauthenticated state when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const state = await getAuthState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('handles errors gracefully', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      });

      const state = await getAuthState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ============================================================
  // signOut
  // ============================================================
  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await signOut();
      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await signOut();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
    });
  });

  // ============================================================
  // isMagicLinkCallback
  // ============================================================
  describe('isMagicLinkCallback', () => {
    it('recognizes standalone/production app scheme', () => {
      expect(isMagicLinkCallback('fishlog://auth/callback#access_token=abc')).toBe(true);
    });

    it('recognizes Expo Dev Client scheme (exp+fishlog://)', () => {
      expect(isMagicLinkCallback('exp+fishlog://auth/callback#access_token=abc')).toBe(true);
    });

    it('recognizes Expo Go scheme', () => {
      expect(isMagicLinkCallback('exp://192.168.1.1:8081/--/auth/callback#token=abc')).toBe(true);
    });

    it('recognizes legacy expo-development-client scheme', () => {
      expect(isMagicLinkCallback('expo-development-client://auth/callback#token=abc')).toBe(true);
    });

    it('recognizes Expo Go with /--/ path separator', () => {
      expect(isMagicLinkCallback('exp://192.168.1.5:19000/--/auth/callback#token=abc')).toBe(true);
    });

    it('rejects non-auth URLs', () => {
      expect(isMagicLinkCallback('fishlog://settings')).toBe(false);
      expect(isMagicLinkCallback('https://example.com')).toBe(false);
    });

    it('rejects unknown schemes even with auth/callback path', () => {
      expect(isMagicLinkCallback('https://evil.com/auth/callback')).toBe(false);
      expect(isMagicLinkCallback('randomapp://auth/callback')).toBe(false);
    });
  });

  // ============================================================
  // onAuthStateChange
  // ============================================================
  describe('onAuthStateChange', () => {
    it('subscribes and returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = onAuthStateChange(callback);

      expect(typeof unsubscribe).toBe('function');
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  // ============================================================
  // sendMagicLink
  // ============================================================
  describe('sendMagicLink', () => {
    it('calls signInWithOtp with lowercase email', async () => {
      (mockSupabase.auth as any).signInWithOtp = jest.fn().mockResolvedValue({ error: null });

      const result = await sendMagicLink('Test@Example.com');
      expect(result.success).toBe(true);
      expect((mockSupabase.auth as any).signInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      );
    });

    it('handles OTP error', async () => {
      (mockSupabase.auth as any).signInWithOtp = jest.fn().mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      const result = await sendMagicLink('test@example.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  // ============================================================
  // deleteAccount
  // ============================================================
  describe('deleteAccount', () => {
    it('calls delete_user_account RPC', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({ error: null });

      const result = await deleteAccount();
      expect(result.success).toBe(true);
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith('delete_user_account');
    });

    it('handles RPC error', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        error: { message: 'Account not found' },
      });

      const result = await deleteAccount();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found');
    });
  });

  // ============================================================
  // updateUserMetadata
  // ============================================================
  describe('updateUserMetadata', () => {
    it('updates user metadata', async () => {
      (mockSupabase.auth as any).updateUser = jest.fn().mockResolvedValue({ error: null });

      const result = await updateUserMetadata({ displayName: 'Test' });
      expect(result.success).toBe(true);
    });

    it('handles update error', async () => {
      (mockSupabase.auth as any).updateUser = jest.fn().mockResolvedValue({
        error: { message: 'Update failed' },
      });

      const result = await updateUserMetadata({ displayName: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  // ============================================================
  // PendingAuth with intent fields
  // ============================================================
  describe('PendingAuth intent fields', () => {
    it('stores and retrieves intent and existingUserId', async () => {
      const data = {
        email: 'new@example.com',
        firstName: 'Test',
        lastName: 'User',
        sentAt: '2026-01-15T00:00:00.000Z',
        intent: 'update_email' as const,
        existingUserId: 'user-123',
      };
      await storePendingAuth(data);

      const retrieved = await getPendingAuth();
      expect(retrieved?.intent).toBe('update_email');
      expect(retrieved?.existingUserId).toBe('user-123');
    });

    it('stores pending auth without intent (backward compatible)', async () => {
      const data = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        sentAt: '2026-01-15T00:00:00.000Z',
      };
      await storePendingAuth(data);

      const retrieved = await getPendingAuth();
      expect(retrieved?.intent).toBeUndefined();
      expect(retrieved?.existingUserId).toBeUndefined();
    });
  });

  // ============================================================
  // clearStalePendingAuth
  // ============================================================
  describe('clearStalePendingAuth', () => {
    it('clears pending auth older than maxAgeMs', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      await storePendingAuth({
        email: 'stale@example.com',
        firstName: 'Stale',
        lastName: 'Auth',
        sentAt: threeHoursAgo,
      });

      await clearStalePendingAuth(2 * 60 * 60 * 1000);

      const retrieved = await getPendingAuth();
      expect(retrieved).toBeNull();
    });

    it('keeps pending auth newer than maxAgeMs', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await storePendingAuth({
        email: 'fresh@example.com',
        firstName: 'Fresh',
        lastName: 'Auth',
        sentAt: tenMinutesAgo,
      });

      await clearStalePendingAuth(2 * 60 * 60 * 1000);

      const retrieved = await getPendingAuth();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.email).toBe('fresh@example.com');
    });

    it('does nothing when no pending auth exists', async () => {
      // Should not throw
      await clearStalePendingAuth();
      const retrieved = await getPendingAuth();
      expect(retrieved).toBeNull();
    });
  });

  // ============================================================
  // signOut clears pending auth
  // ============================================================
  describe('signOut clears pending auth', () => {
    it('clears pending auth on successful sign-out', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await storePendingAuth({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        sentAt: new Date().toISOString(),
      });

      const result = await signOut();
      expect(result.success).toBe(true);

      const pendingAuth = await getPendingAuth();
      expect(pendingAuth).toBeNull();
    });

    it('does not clear pending auth when sign-out fails', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      await storePendingAuth({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        sentAt: new Date().toISOString(),
      });

      const result = await signOut();
      expect(result.success).toBe(false);

      const pendingAuth = await getPendingAuth();
      expect(pendingAuth).not.toBeNull();
    });
  });
});
