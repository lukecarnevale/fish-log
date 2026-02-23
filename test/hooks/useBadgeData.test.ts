import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reset badge cache before module loads
jest.mock('../../src/screens/home/homeScreenConstants', () => ({
  BADGE_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  badgeDataCache: { data: null, timestamp: 0 },
  PERSISTENT_CACHE_KEYS: { badgeData: '@badge_data_cache' },
}));

jest.mock('../../src/utils/badgeUtils', () => ({
  BADGE_STORAGE_KEYS: {
    lastViewedPastReports: '@last_viewed_past_reports',
    lastReportTimestamp: '@last_report_timestamp',
    lastViewedCatchFeed: '@last_viewed_catch_feed',
  },
}));

jest.mock('../../src/services/reportsService', () => ({
  getReportsSummary: jest.fn(() =>
    Promise.resolve({ totalReports: 5 })
  ),
}));

jest.mock('../../src/services/fishSpeciesService', () => ({
  fetchAllFishSpecies: jest.fn(() =>
    Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }])
  ),
}));

jest.mock('../../src/services/catchFeedService', () => ({
  fetchRecentCatches: jest.fn(() =>
    Promise.resolve({ entries: [] })
  ),
}));

import { useBadgeData } from '../../src/hooks/useBadgeData';
import { getReportsSummary } from '../../src/services/reportsService';
import { fetchAllFishSpecies } from '../../src/services/fishSpeciesService';

describe('useBadgeData', () => {
  it('starts with default empty badge data', () => {
    const { result } = renderHook(() => useBadgeData());

    expect(result.current.badgeData).toEqual({
      pastReportsCount: 0,
      hasNewReport: false,
      totalSpecies: 0,
      newCatchesCount: 0,
    });
  });

  it('loadBadgeData fetches and populates badge data', async () => {
    const { result } = renderHook(() => useBadgeData());

    await act(async () => {
      await result.current.loadBadgeData(true);
    });

    expect(result.current.badgeData.pastReportsCount).toBe(5);
    expect(result.current.badgeData.totalSpecies).toBe(3);
  });

  it('updateBadgeData merges partial updates', () => {
    const { result } = renderHook(() => useBadgeData());

    act(() => {
      result.current.updateBadgeData({ hasNewReport: true });
    });

    expect(result.current.badgeData.hasNewReport).toBe(true);
    expect(result.current.badgeData.pastReportsCount).toBe(0); // unchanged
  });

  it('handles service failure gracefully', async () => {
    (getReportsSummary as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useBadgeData());

    await act(async () => {
      await result.current.loadBadgeData(true);
    });

    // Should not throw, badge data remains at defaults
    expect(result.current.badgeData.pastReportsCount).toBe(0);
    errorSpy.mockRestore();
  });

  it('detects new report when lastReportTimestamp is newer than lastViewedPastReports', async () => {
    await AsyncStorage.setItem('@last_report_timestamp', '2026-02-15');
    await AsyncStorage.setItem('@last_viewed_past_reports', '2026-02-10');

    const { result } = renderHook(() => useBadgeData());

    await act(async () => {
      await result.current.loadBadgeData(true);
    });

    expect(result.current.badgeData.hasNewReport).toBe(true);
  });
});
