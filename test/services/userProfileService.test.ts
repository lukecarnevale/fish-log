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
  getAuthState: jest.fn().mockResolvedValue({ authenticated: false, user: null }),
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

import {
  getCachedUser,
  cacheUser,
  getCachedStats,
  cacheStats,
  syncToUserProfile,
  getCachedFormPreferences,
  getCurrentUser,
  getUserStats,
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
  });
});
