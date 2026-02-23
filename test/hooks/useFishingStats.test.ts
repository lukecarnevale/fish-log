import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../src/services/reportsService', () => ({
  getReports: jest.fn(() => Promise.resolve([])),
  getFishEntries: jest.fn(() => Promise.resolve([])),
}));

import { useFishingStats } from '../../src/hooks/useFishingStats';
import { getReports, getFishEntries } from '../../src/services/reportsService';

describe('useFishingStats', () => {
  it('starts with loading=true and zeroed stats', () => {
    const { result } = renderHook(() => useFishingStats());

    expect(result.current.statsLoading).toBe(true);
    expect(result.current.fishingStats).toEqual({
      totalCatches: 0,
      uniqueSpecies: 0,
      largestFish: null,
    });
  });

  it('returns zeroed stats when no reports exist', async () => {
    (getReports as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useFishingStats());

    await waitFor(() => {
      expect(result.current.statsLoading).toBe(false);
    });

    expect(result.current.fishingStats).toEqual({
      totalCatches: 0,
      uniqueSpecies: 0,
      largestFish: null,
    });
  });

  it('calculates totalCatches as sum of all species counts', async () => {
    (getReports as jest.Mock).mockResolvedValue([
      {
        id: 'server-1',
        redDrumCount: 2,
        flounderCount: 1,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 3,
      },
    ]);

    const { result } = renderHook(() => useFishingStats());

    await waitFor(() => {
      expect(result.current.statsLoading).toBe(false);
    });

    expect(result.current.fishingStats.totalCatches).toBe(6);
  });

  it('calculates uniqueSpecies correctly', async () => {
    (getReports as jest.Mock).mockResolvedValue([
      {
        id: 'server-1',
        redDrumCount: 1,
        flounderCount: 0,
        spottedSeatroutCount: 2,
        weakfishCount: 0,
        stripedBassCount: 0,
      },
      {
        id: 'server-2',
        redDrumCount: 0,
        flounderCount: 1,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
      },
    ]);

    const { result } = renderHook(() => useFishingStats());

    await waitFor(() => {
      expect(result.current.statsLoading).toBe(false);
    });

    // Red Drum, Spotted Seatrout, Southern Flounder = 3 unique
    expect(result.current.fishingStats.uniqueSpecies).toBe(3);
  });

  it('finds largest fish from fish entries', async () => {
    (getReports as jest.Mock).mockResolvedValue([
      {
        id: 'server-1',
        redDrumCount: 1,
        flounderCount: 0,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
      },
    ]);
    (getFishEntries as jest.Mock).mockResolvedValue([
      { species: 'Red Drum', count: 1, lengths: ['22.5', '18.3'] },
    ]);

    const { result } = renderHook(() => useFishingStats());

    await waitFor(() => {
      expect(result.current.statsLoading).toBe(false);
    });

    expect(result.current.fishingStats.largestFish).toBe(22.5);
  });

  it('skips fish entries for local reports (id starts with local_)', async () => {
    (getReports as jest.Mock).mockResolvedValue([
      {
        id: 'local_123',
        redDrumCount: 1,
        flounderCount: 0,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
      },
    ]);

    const { result } = renderHook(() => useFishingStats());

    await waitFor(() => {
      expect(result.current.statsLoading).toBe(false);
    });

    expect(getFishEntries).not.toHaveBeenCalled();
    expect(result.current.fishingStats.largestFish).toBeNull();
  });

  it('handles getReports failure gracefully', async () => {
    (getReports as jest.Mock).mockRejectedValue(new Error('Network error'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useFishingStats());

    await waitFor(() => {
      expect(result.current.statsLoading).toBe(false);
    });

    // Should still have default values
    expect(result.current.fishingStats.totalCatches).toBe(0);
    errorSpy.mockRestore();
  });
});
