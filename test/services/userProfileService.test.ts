/**
 * userProfileService.test.ts - User profile management
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('../../src/services/authService', () => ({
  getAuthState: jest.fn().mockResolvedValue({ isAuthenticated: false, user: null, session: null }),
  ensureValidSession: jest.fn().mockResolvedValue({ valid: false }),
}));

jest.mock('../../src/services/statsService', () => ({
  backfillUserStatsFromReports: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/services/userService', () => ({
  findUserByDeviceId: jest.fn().mockResolvedValue(null),
  findUserByEmail: jest.fn().mockResolvedValue(null),
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
}));

import { getAuthState } from '../../src/services/authService';
import { findUserByDeviceId } from '../../src/services/userService';

import {
  getCachedUser,
  cacheUser,
  getCachedStats,
  cacheStats,
  syncToUserProfile,
  getCachedFormPreferences,
  getCurrentUser,
  updateCurrentUser,
  getUserStats,
  syncUserData,
  updateUserInSupabase,
  fetchStatsFromSupabase,
  getAllAchievements,
} from '../../src/services/userProfileService';

describe('userProfileService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    await AsyncStorage.removeItem('@current_user');
    await AsyncStorage.removeItem('@user_stats');
    await AsyncStorage.removeItem('userProfile');
    await AsyncStorage.removeItem('fishingLicense');
  });

  // ============================================================
  // getCachedUser / cacheUser
  // ============================================================
  describe('getCachedUser / cacheUser', () => {
    it('returns null when no user cached', async () => {
      const user = await getCachedUser();
      expect(user).toBeNull();
    });

    it('stores and retrieves user from cache', async () => {
      const user = {
        id: 'user-1',
        deviceId: 'device-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Angler',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      } as any;

      await cacheUser(user);
      const cached = await getCachedUser();
      expect(cached).not.toBeNull();
      expect(cached?.id).toBe('user-1');
    });
  });

  // ============================================================
  // getCachedStats / cacheStats
  // ============================================================
  describe('getCachedStats / cacheStats', () => {
    it('returns null when no stats cached', async () => {
      const stats = await getCachedStats();
      expect(stats).toBeNull();
    });

    it('stores and retrieves stats', async () => {
      const stats = {
        totalReports: 10,
        totalFish: 25,
        currentStreak: 3,
        longestStreak: 7,
      } as any;

      await cacheStats(stats);
      const cached = await getCachedStats();
      expect(cached).not.toBeNull();
      expect(cached?.totalReports).toBe(10);
    });
  });

  // ============================================================
  // syncToUserProfile
  // ============================================================
  describe('syncToUserProfile', () => {
    it('writes user fields to userProfile key', async () => {
      const user = {
        id: 'user-1',
        firstName: 'Test',
        lastName: 'Angler',
        email: 'test@example.com',
        zipCode: '27601',
        hasLicense: true,
        wrcId: 'NC12345',
        wantsTextConfirmation: false,
        wantsEmailConfirmation: true,
      } as any;

      await syncToUserProfile(user);

      const profile = JSON.parse((await AsyncStorage.getItem('userProfile'))!);
      expect(profile.firstName).toBe('Test');
      expect(profile.email).toBe('test@example.com');
    });

    it('writes license data when meaningful fields present', async () => {
      const user = {
        id: 'user-1',
        hasLicense: true,
        wrcId: 'NC12345',
        licenseNumber: 'LIC-001',
        licenseType: 'Coastal',
      } as any;

      await syncToUserProfile(user);

      const license = JSON.parse((await AsyncStorage.getItem('fishingLicense'))!);
      expect(license).not.toBeNull();
    });
  });

  // ============================================================
  // getCachedFormPreferences
  // ============================================================
  describe('getCachedFormPreferences', () => {
    it('maps wantTextConfirmation to wantsTextConfirmation', async () => {
      await AsyncStorage.setItem('userProfile', JSON.stringify({
        wantTextConfirmation: true,
        wantEmailConfirmation: false,
      }));

      const prefs = await getCachedFormPreferences();
      expect(prefs.wantsTextConfirmation).toBe(true);
      expect(prefs.wantsEmailConfirmation).toBe(false);
    });

    it('returns empty object when no profile cached', async () => {
      const prefs = await getCachedFormPreferences();
      expect(prefs.wantsTextConfirmation).toBeUndefined();
      expect(prefs.wantsEmailConfirmation).toBeUndefined();
    });
  });

  // ============================================================
  // getCurrentUser
  // ============================================================
  describe('getCurrentUser', () => {
    it('returns cached user when available', async () => {
      await AsyncStorage.setItem('@current_user', JSON.stringify({
        id: 'user-1',
        deviceId: 'device-123',
        email: 'test@example.com',
        rewardsOptedInAt: '2026-01-01',
      }));

      const user = await getCurrentUser();
      expect(user).not.toBeNull();
    });

    it('returns local-prefixed fallback when no user found', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const user = await getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toMatch(/^local_/);
    });
  });

  // ============================================================
  // getUserStats
  // ============================================================
  describe('getUserStats', () => {
    it('returns cached stats when available', async () => {
      await AsyncStorage.setItem('@user_stats', JSON.stringify({
        totalReports: 5,
        totalFish: 12,
        currentStreak: 2,
        longestStreak: 4,
        speciesStats: [],
        achievements: [],
        recentReports: [],
      }));

      const stats = await getUserStats();
      expect(stats.totalReports).toBe(5);
    });

    it('returns default stats when nothing cached', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const stats = await getUserStats();
      expect(stats.totalReports).toBe(0);
    });

    it('fetches stats from Supabase when connected', async () => {
      // Make getCurrentUser return a user via device lookup
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        deviceId: 'device-123',
        email: 'test@example.com',
        totalReports: 0,
        totalFish: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastReportDate: null,
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          totalReports: 15,
          totalFish: 42,
          currentStreak: 5,
          longestStreak: 10,
          lastActiveAt: '2026-03-01',
          speciesStats: [
            { species: 'Bass', total_count: 10, largest_length: 22, last_caught_at: '2026-03-01' },
          ],
          achievements: [
            { id: 'ua-1', achievement_id: 'ach-1', earned_at: '2026-02-01', progress: 100, code: 'first_catch', name: 'First Catch', description: 'Catch your first fish', category: 'milestone', icon: 'fish', points: 10 },
          ],
        },
        error: null,
      });

      const stats = await getUserStats();
      expect(stats.totalReports).toBe(15);
      expect(stats.totalFish).toBe(42);
      expect(stats.speciesStats).toHaveLength(1);
      expect(stats.speciesStats[0].species).toBe('Bass');
      expect(stats.achievements).toHaveLength(1);
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith('get_user_profile_stats', { p_user_id: 'user-1' });

      // Verify stats were cached
      const cached = await getCachedStats();
      expect(cached?.totalReports).toBe(15);
    });

    it('falls back to cached stats when Supabase RPC fails', async () => {
      // Pre-cache stats
      await cacheStats({
        totalReports: 8,
        totalFish: 20,
        currentStreak: 1,
        longestStreak: 3,
        lastReportDate: '2026-02-15',
        speciesStats: [],
        achievements: [],
      });

      // Make getCurrentUser return a user
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        deviceId: 'device-123',
        totalReports: 0,
        totalFish: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastReportDate: null,
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const stats = await getUserStats();
      expect(stats.totalReports).toBe(8);
    });

    it('returns user-level stats when no cache and Supabase offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      // Pre-cache a user with stats
      await cacheUser({
        id: 'user-1',
        deviceId: 'device-123',
        email: null,
        authId: null,
        anonymousUserId: null,
        firstName: null,
        lastName: null,
        zipCode: null,
        profileImageUrl: null,
        preferredAreaCode: null,
        preferredAreaLabel: null,
        dateOfBirth: null,
        hasLicense: true,
        wrcId: null,
        licenseNumber: null,
        phone: null,
        wantsTextConfirmation: false,
        wantsEmailConfirmation: false,
        licenseType: null,
        licenseIssueDate: null,
        licenseExpiryDate: null,
        primaryHarvestArea: null,
        primaryFishingMethod: null,
        totalReports: 3,
        totalFish: 7,
        currentStreak: 1,
        longestStreak: 2,
        lastReportDate: '2026-02-01',
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });

      const stats = await getUserStats();
      expect(stats.totalReports).toBe(3);
      expect(stats.totalFish).toBe(7);
      expect(stats.speciesStats).toEqual([]);
      expect(stats.achievements).toEqual([]);
    });
  });

  // ============================================================
  // getCurrentUser (extended)
  // ============================================================
  describe('getCurrentUser (resolution logic)', () => {
    it('returns user from Supabase when connected and user found by device ID', async () => {
      const supabaseUser = {
        id: 'sb-user-1',
        deviceId: 'device-123',
        email: 'sb@example.com',
        firstName: 'Supabase',
        lastName: 'User',
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce(supabaseUser);

      const user = await getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toBe('sb-user-1');
      expect(user?.email).toBe('sb@example.com');

      // Verify user was cached
      const cached = await getCachedUser();
      expect(cached?.id).toBe('sb-user-1');
    });

    it('falls back to cache when Supabase lookup throws', async () => {
      (findUserByDeviceId as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Pre-cache a rewards user
      await AsyncStorage.setItem('@current_user', JSON.stringify({
        id: 'cached-user',
        deviceId: 'device-123',
        email: 'cached@example.com',
        rewardsOptedInAt: '2026-01-01',
      }));

      const user = await getCurrentUser();
      expect(user?.id).toBe('cached-user');
    });

    it('skips non-rewards cached user and returns local fallback', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      // Cache a user without rewardsOptedInAt
      await AsyncStorage.setItem('@current_user', JSON.stringify({
        id: 'non-rewards-user',
        deviceId: 'device-123',
        email: null,
        rewardsOptedInAt: null,
      }));

      const user = await getCurrentUser();
      expect(user?.id).toMatch(/^local_/);
    });

    it('returns local user with correct default fields', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const user = await getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toBe('local_device-123');
      expect(user?.deviceId).toBe('device-123');
      expect(user?.hasLicense).toBe(true);
      expect(user?.wantsTextConfirmation).toBe(false);
      expect(user?.wantsEmailConfirmation).toBe(false);
      expect(user?.totalReports).toBe(0);
      expect(user?.rewardsOptedInAt).toBeNull();
    });

    it('returns null from Supabase and falls through to local when no user in DB', async () => {
      // findUserByDeviceId already mocked to return null by default
      const user = await getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toMatch(/^local_/);
    });
  });

  // ============================================================
  // updateCurrentUser
  // ============================================================
  describe('updateCurrentUser', () => {
    it('updates Supabase when authenticated and connected', async () => {
      // Set up: getCurrentUser returns a Supabase user
      const existingUser = {
        id: 'user-1',
        deviceId: 'device-123',
        email: 'old@example.com',
        firstName: 'Old',
        lastName: 'Name',
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce(existingUser);

      // Auth is authenticated
      (getAuthState as jest.Mock).mockResolvedValueOnce({ isAuthenticated: true, user: { id: 'auth-1' }, session: {} });

      // Mock Supabase update chain
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'user-1',
          device_id: 'device-123',
          email: 'new@example.com',
          first_name: 'New',
          last_name: 'Name',
          has_license: true,
          wants_text_confirmation: false,
          wants_email_confirmation: false,
          total_reports: 0,
          total_fish_reported: 0,
          current_streak_days: 0,
          longest_streak_days: 0,
          created_at: '2026-01-01',
          updated_at: '2026-03-14',
        },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      const updated = await updateCurrentUser({ email: 'new@example.com', firstName: 'New' });
      expect(updated.email).toBe('new@example.com');
      expect(updated.firstName).toBe('New');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('falls back to local cache update when not authenticated', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const user = await updateCurrentUser({ firstName: 'Local', email: 'LOCAL@Example.com' });
      expect(user.firstName).toBe('Local');
      expect(user.email).toBe('local@example.com'); // lowercased
      expect(user.id).toMatch(/^local_/);

      // Verify cached
      const cached = await getCachedUser();
      expect(cached?.firstName).toBe('Local');
    });

    it('falls back to local update when Supabase update throws', async () => {
      const existingUser = {
        id: 'user-1',
        deviceId: 'device-123',
        email: 'old@example.com',
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce(existingUser);
      (getAuthState as jest.Mock).mockResolvedValueOnce({ isAuthenticated: true, user: { id: 'auth-1' }, session: {} });

      // Mock Supabase update to throw
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      const user = await updateCurrentUser({ firstName: 'Fallback' });
      // Should still return a user with the update applied locally
      expect(user.firstName).toBe('Fallback');
    });

    it('logs info message when connected but not authenticated', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // getCurrentUser returns a Supabase user
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        deviceId: 'device-123',
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
      (getAuthState as jest.Mock).mockResolvedValueOnce({ isAuthenticated: false, user: null, session: null });

      await updateCurrentUser({ firstName: 'Test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User not authenticated')
      );
      consoleSpy.mockRestore();
    });
  });

  // ============================================================
  // syncUserData
  // ============================================================
  describe('syncUserData', () => {
    it('re-fetches user from Supabase and updates cache', async () => {
      // Pre-cache a user
      await cacheUser({
        id: 'user-1',
        deviceId: 'device-123',
        email: 'old@example.com',
        authId: null,
        anonymousUserId: null,
        firstName: 'Old',
        lastName: 'Name',
        zipCode: null,
        profileImageUrl: null,
        preferredAreaCode: null,
        preferredAreaLabel: null,
        dateOfBirth: null,
        hasLicense: true,
        wrcId: null,
        licenseNumber: null,
        phone: null,
        wantsTextConfirmation: false,
        wantsEmailConfirmation: false,
        licenseType: null,
        licenseIssueDate: null,
        licenseExpiryDate: null,
        primaryHarvestArea: null,
        primaryFishingMethod: null,
        totalReports: 0,
        totalFish: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastReportDate: null,
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });

      const freshUser = {
        id: 'user-1',
        deviceId: 'device-123',
        email: 'new@example.com',
        firstName: 'Fresh',
        lastName: 'Data',
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-03-14',
      };
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce(freshUser);

      await syncUserData();

      const cached = await getCachedUser();
      expect(cached?.email).toBe('new@example.com');
      expect(cached?.firstName).toBe('Fresh');
    });

    it('does nothing when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      await cacheUser({
        id: 'user-1',
        deviceId: 'device-123',
        email: 'old@example.com',
      } as any);

      await syncUserData();

      // Cache should be unchanged
      const cached = await getCachedUser();
      expect(cached?.email).toBe('old@example.com');
      expect(findUserByDeviceId).not.toHaveBeenCalled();
    });

    it('does nothing when no cached user', async () => {
      await syncUserData();
      expect(findUserByDeviceId).not.toHaveBeenCalled();
    });

    it('handles errors gracefully without throwing', async () => {
      await cacheUser({
        id: 'user-1',
        deviceId: 'device-123',
        email: 'test@example.com',
      } as any);

      (findUserByDeviceId as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(syncUserData()).resolves.toBeUndefined();
    });
  });

  // ============================================================
  // syncToUserProfile (extended)
  // ============================================================
  describe('syncToUserProfile (extended)', () => {
    it('merges with existing profile data without overwriting', async () => {
      // Pre-existing profile with some data
      await AsyncStorage.setItem('userProfile', JSON.stringify({
        firstName: 'Existing',
        customField: 'should-persist',
      }));

      const user = {
        id: 'user-1',
        firstName: 'Updated',
        lastName: 'Angler',
      } as any;

      await syncToUserProfile(user);

      const profile = JSON.parse((await AsyncStorage.getItem('userProfile'))!);
      expect(profile.firstName).toBe('Updated');
      expect(profile.lastName).toBe('Angler');
      expect(profile.customField).toBe('should-persist');
    });

    it('does not write fishingLicense when no meaningful license data', async () => {
      const user = {
        id: 'user-1',
        firstName: null,
        lastName: null,
        licenseNumber: null,
        licenseType: null,
      } as any;

      await syncToUserProfile(user);

      const license = await AsyncStorage.getItem('fishingLicense');
      expect(license).toBeNull();
    });

    it('merges with existing license data', async () => {
      await AsyncStorage.setItem('fishingLicense', JSON.stringify({
        firstName: 'Existing',
        licenseNumber: 'OLD-001',
      }));

      const user = {
        id: 'user-1',
        firstName: 'New',
        lastName: 'Angler',
        licenseNumber: 'NEW-001',
        licenseType: 'Coastal',
        licenseIssueDate: '2026-01-01',
        licenseExpiryDate: '2027-01-01',
      } as any;

      await syncToUserProfile(user);

      const license = JSON.parse((await AsyncStorage.getItem('fishingLicense'))!);
      expect(license.firstName).toBe('New');
      expect(license.licenseNumber).toBe('NEW-001');
      expect(license.issueDate).toBe('2026-01-01');
      expect(license.expiryDate).toBe('2027-01-01');
    });
  });

  // ============================================================
  // updateUserInSupabase
  // ============================================================
  describe('updateUserInSupabase', () => {
    it('throws when Supabase returns an error', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Row not found' },
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      await expect(updateUserInSupabase('user-1', { firstName: 'Test' }))
        .rejects.toThrow('Failed to update user: Row not found');
    });

    it('lowercases email in the update payload', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'user-1',
          device_id: 'device-123',
          email: 'test@example.com',
          first_name: 'Test',
          has_license: true,
          wants_text_confirmation: false,
          wants_email_confirmation: false,
          total_reports: 0,
          total_fish_reported: 0,
          current_streak_days: 0,
          longest_streak_days: 0,
          created_at: '2026-01-01',
          updated_at: '2026-03-14',
        },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({
        update: mockUpdate,
      } as any);

      await updateUserInSupabase('user-1', { email: 'TEST@Example.COM' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });
  });

  // ============================================================
  // fetchStatsFromSupabase
  // ============================================================
  describe('fetchStatsFromSupabase', () => {
    it('throws when RPC returns error', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC timeout' },
      });

      await expect(fetchStatsFromSupabase('user-1'))
        .rejects.toThrow('Failed to fetch user stats: RPC timeout');
    });

    it('throws when RPC returns null data', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(fetchStatsFromSupabase('user-1'))
        .rejects.toThrow('No stats returned from RPC');
    });

    it('handles empty speciesStats and achievements arrays', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          totalReports: 0,
          totalFish: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveAt: null,
          speciesStats: [],
          achievements: [],
        },
        error: null,
      });

      const stats = await fetchStatsFromSupabase('user-1');
      expect(stats.totalReports).toBe(0);
      expect(stats.speciesStats).toEqual([]);
      expect(stats.achievements).toEqual([]);
    });

    it('handles missing speciesStats and achievements keys gracefully', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          totalReports: 5,
          totalFish: 10,
          currentStreak: 1,
          longestStreak: 2,
          lastActiveAt: '2026-03-01',
        },
        error: null,
      });

      const stats = await fetchStatsFromSupabase('user-1');
      expect(stats.totalReports).toBe(5);
      expect(stats.speciesStats).toEqual([]);
      expect(stats.achievements).toEqual([]);
    });
  });

  // ============================================================
  // getAllAchievements
  // ============================================================
  describe('getAllAchievements', () => {
    it('returns empty array when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const achievements = await getAllAchievements();
      expect(achievements).toEqual([]);
    });

    it('returns empty array when Supabase query errors', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      } as any);

      const achievements = await getAllAchievements();
      expect(achievements).toEqual([]);
    });

    it('transforms and returns achievements from Supabase', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'ach-1',
            code: 'first_catch',
            name: 'First Catch',
            description: 'Catch your first fish',
            icon: 'fish',
            category: 'milestone',
            is_active: true,
            sort_order: 1,
          },
        ],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      } as any);

      const achievements = await getAllAchievements();
      expect(achievements).toHaveLength(1);
      expect(achievements[0].code).toBe('first_catch');
      expect(achievements[0].iconName).toBe('fish');
    });
  });

  // ============================================================
  // Cache invalidation
  // ============================================================
  describe('cache invalidation', () => {
    it('getCurrentUser overwrites stale cache with fresh Supabase data', async () => {
      // Pre-cache stale user
      await cacheUser({
        id: 'user-1',
        deviceId: 'device-123',
        email: 'stale@example.com',
        firstName: 'Stale',
      } as any);

      // Supabase returns fresh data
      const freshUser = {
        id: 'user-1',
        deviceId: 'device-123',
        email: 'fresh@example.com',
        firstName: 'Fresh',
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-03-14',
      };
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce(freshUser);

      const user = await getCurrentUser();
      expect(user?.email).toBe('fresh@example.com');

      // Cache should now have fresh data
      const cached = await getCachedUser();
      expect(cached?.email).toBe('fresh@example.com');
    });

    it('getUserStats caches fresh stats from Supabase', async () => {
      // getCurrentUser needs a user
      (findUserByDeviceId as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        deviceId: 'device-123',
        rewardsOptedInAt: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          totalReports: 99,
          totalFish: 200,
          currentStreak: 10,
          longestStreak: 20,
          lastActiveAt: '2026-03-14',
          speciesStats: [],
          achievements: [],
        },
        error: null,
      });

      await getUserStats();

      const cached = await getCachedStats();
      expect(cached?.totalReports).toBe(99);
      expect(cached?.totalFish).toBe(200);
    });
  });

  // ============================================================
  // Error handling
  // ============================================================
  describe('error handling', () => {
    it('getCachedUser returns null on parse error', async () => {
      await AsyncStorage.setItem('@current_user', 'not-valid-json{{{');

      const user = await getCachedUser();
      expect(user).toBeNull();
    });

    it('getCachedStats returns null on parse error', async () => {
      await AsyncStorage.setItem('@user_stats', 'not-valid-json{{{');

      const stats = await getCachedStats();
      expect(stats).toBeNull();
    });

    it('getCachedFormPreferences returns empty on parse error', async () => {
      await AsyncStorage.setItem('userProfile', 'not-valid-json{{{');

      const prefs = await getCachedFormPreferences();
      expect(prefs).toEqual({});
    });

    it('syncToUserProfile handles errors gracefully', async () => {
      // Force an error by making getItem throw
      const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await expect(syncToUserProfile({ id: 'user-1' } as any)).resolves.toBeUndefined();

      spy.mockRestore();
    });

    it('cacheUser logs error on storage failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage full'));

      await cacheUser({ id: 'user-1' } as any);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to cache user:', expect.any(Error));
      consoleSpy.mockRestore();
      spy.mockRestore();
    });

    it('cacheStats logs error on storage failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage full'));

      await cacheStats({ totalReports: 0, totalFish: 0, currentStreak: 0, longestStreak: 0, lastReportDate: null, speciesStats: [], achievements: [] });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to cache stats:', expect.any(Error));
      consoleSpy.mockRestore();
      spy.mockRestore();
    });
  });
});
