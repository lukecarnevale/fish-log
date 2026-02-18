import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  markNewReportSubmitted,
  clearNewReportIndicator,
  hasNewReportSinceLastView,
  invalidateBadgeCache,
  BADGE_STORAGE_KEYS,
} from '../../src/utils/badgeUtils';

// Mock the homeScreenConstants module
jest.mock('../../src/screens/home/homeScreenConstants', () => ({
  badgeDataCache: { data: null, timestamp: 0 },
  PERSISTENT_CACHE_KEYS: { badgeData: 'homeScreen_badgeDataCache' },
}));

describe('badgeUtils', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('markNewReportSubmitted', () => {
    it('stores a timestamp', async () => {
      await markNewReportSubmitted();
      const stored = await AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastReportTimestamp);
      expect(stored).toBeDefined();
      expect(stored).not.toBeNull();
    });

    it('stores an ISO date string', async () => {
      await markNewReportSubmitted();
      const stored = await AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastReportTimestamp);
      expect(() => new Date(stored!)).not.toThrow();
    });
  });

  describe('clearNewReportIndicator', () => {
    it('stores a timestamp for last viewed', async () => {
      await clearNewReportIndicator();
      const stored = await AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastViewedPastReports);
      expect(stored).toBeDefined();
    });
  });

  describe('hasNewReportSinceLastView', () => {
    it('returns false when no reports exist', async () => {
      expect(await hasNewReportSinceLastView()).toBe(false);
    });

    it('returns true when report exists but never viewed', async () => {
      await AsyncStorage.setItem(
        BADGE_STORAGE_KEYS.lastReportTimestamp,
        new Date().toISOString()
      );
      expect(await hasNewReportSinceLastView()).toBe(true);
    });

    it('returns true when report is newer than last view', async () => {
      const oldDate = new Date('2026-01-01T00:00:00Z').toISOString();
      const newDate = new Date('2026-01-02T00:00:00Z').toISOString();
      await AsyncStorage.setItem(BADGE_STORAGE_KEYS.lastViewedPastReports, oldDate);
      await AsyncStorage.setItem(BADGE_STORAGE_KEYS.lastReportTimestamp, newDate);
      expect(await hasNewReportSinceLastView()).toBe(true);
    });

    it('returns false when last view is newer than report', async () => {
      const oldDate = new Date('2026-01-01T00:00:00Z').toISOString();
      const newDate = new Date('2026-01-02T00:00:00Z').toISOString();
      await AsyncStorage.setItem(BADGE_STORAGE_KEYS.lastReportTimestamp, oldDate);
      await AsyncStorage.setItem(BADGE_STORAGE_KEYS.lastViewedPastReports, newDate);
      expect(await hasNewReportSinceLastView()).toBe(false);
    });
  });

  describe('invalidateBadgeCache', () => {
    it('resets in-memory cache', () => {
      const { badgeDataCache } = require('../../src/screens/home/homeScreenConstants');
      badgeDataCache.timestamp = 12345;
      badgeDataCache.data = { some: 'data' };

      invalidateBadgeCache();

      expect(badgeDataCache.timestamp).toBe(0);
      expect(badgeDataCache.data).toBeNull();
    });
  });
});
