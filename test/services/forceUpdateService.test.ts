/**
 * forceUpdateService.test.ts - Version comparison and app config fetching
 */
jest.unmock('../../src/services/forceUpdateService');

import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

import {
  compareVersions,
  isUpdateRequired,
  fetchAppVersionConfig,
} from '../../src/services/forceUpdateService';

describe('forceUpdateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  // ============================================================
  // compareVersions
  // ============================================================
  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('returns -1 when a < b (major)', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    });

    it('returns 1 when a > b (major)', () => {
      expect(compareVersions('3.0.0', '2.0.0')).toBe(1);
    });

    it('returns -1 when a < b (minor)', () => {
      expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
    });

    it('returns 1 when a > b (minor)', () => {
      expect(compareVersions('1.3.0', '1.2.0')).toBe(1);
    });

    it('returns -1 when a < b (patch)', () => {
      expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
    });

    it('returns 1 when a > b (patch)', () => {
      expect(compareVersions('1.0.3', '1.0.2')).toBe(1);
    });

    it('handles versions with different lengths', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.0.1', '1.0')).toBe(1);
    });

    it('handles single-segment versions', () => {
      expect(compareVersions('2', '1')).toBe(1);
      expect(compareVersions('1', '2')).toBe(-1);
      expect(compareVersions('1', '1')).toBe(0);
    });
  });

  // ============================================================
  // isUpdateRequired
  // ============================================================
  describe('isUpdateRequired', () => {
    it('returns true when current version is below minimum', () => {
      expect(isUpdateRequired('1.0.0', '1.1.0')).toBe(true);
    });

    it('returns false when current version equals minimum', () => {
      expect(isUpdateRequired('1.1.0', '1.1.0')).toBe(false);
    });

    it('returns false when current version exceeds minimum', () => {
      expect(isUpdateRequired('2.0.0', '1.1.0')).toBe(false);
    });
  });

  // ============================================================
  // fetchAppVersionConfig
  // ============================================================
  describe('fetchAppVersionConfig', () => {
    const mockRow = {
      minimum_version: '1.2.0',
      latest_version: '1.5.0',
      update_message: 'A new version is available.',
      force_update_message: 'You must update to continue.',
      ios_store_url: 'https://apps.apple.com/app/123',
      android_store_url: 'https://play.google.com/store/apps/details?id=com.example',
    };

    it('returns null when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await fetchAppVersionConfig();
      expect(result).toBeNull();
    });

    it('fetches and transforms config from Supabase', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockRow, error: null }),
      }));

      const config = await fetchAppVersionConfig();
      expect(config).toEqual({
        minimumVersion: '1.2.0',
        latestVersion: '1.5.0',
        updateMessage: 'A new version is available.',
        forceUpdateMessage: 'You must update to continue.',
        iosStoreUrl: 'https://apps.apple.com/app/123',
        androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.example',
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('app_config');
    });

    it('returns null on Supabase error', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      const config = await fetchAppVersionConfig();
      expect(config).toBeNull();
    });

    it('returns null when data is null (no error)', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const config = await fetchAppVersionConfig();
      expect(config).toBeNull();
    });

    it('returns null when an exception is thrown', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Network error')),
      }));

      const config = await fetchAppVersionConfig();
      expect(config).toBeNull();
    });
  });
});
