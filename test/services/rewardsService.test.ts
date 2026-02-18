/**
 * rewardsService.test.ts - Rewards system tests
 */
// Unmock rewardsService (auto-mocked in jest.setup.ts)
jest.unmock('../../src/services/rewardsService');

import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('../../src/services/pendingSubmissionService', () => ({
  getPendingDrawingId: jest.fn().mockResolvedValue(null),
  getPendingSubmission: jest.fn().mockResolvedValue(null),
}));

import {
  fetchRewardsData,
  enterRewardsDrawing,
  isUserEntered,
  clearRewardsCache,
  getEnteredDrawingIds,
  recordDrawingEntry,
  getLastSeenDrawingId,
  setLastSeenDrawingId,
  checkForNewQuarter,
  resetSupabaseAvailabilityCache,
  addReportToRewardsEntry,
} from '../../src/services/rewardsService';

const STORAGE_KEYS = {
  config: '@rewards_config',
  currentDrawing: '@rewards_current_drawing',
  userEntry: '@rewards_user_entry',
  lastFetched: '@rewards_last_fetched',
  enteredRaffles: 'enteredRaffles',
  lastSeenDrawingId: '@rewards_last_seen_drawing_id',
};

describe('rewardsService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    resetSupabaseAvailabilityCache();
    await clearRewardsCache();
  });

  // ============================================================
  // clearRewardsCache
  // ============================================================
  describe('clearRewardsCache', () => {
    it('removes all rewards-related keys', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.config, 'data');
      await AsyncStorage.setItem(STORAGE_KEYS.currentDrawing, 'drawing');
      await AsyncStorage.setItem(STORAGE_KEYS.userEntry, 'entry');
      await AsyncStorage.setItem(STORAGE_KEYS.lastFetched, 'ts');

      await clearRewardsCache();

      expect(await AsyncStorage.getItem(STORAGE_KEYS.config)).toBeNull();
      expect(await AsyncStorage.getItem(STORAGE_KEYS.currentDrawing)).toBeNull();
      expect(await AsyncStorage.getItem(STORAGE_KEYS.userEntry)).toBeNull();
      expect(await AsyncStorage.getItem(STORAGE_KEYS.lastFetched)).toBeNull();
    });
  });

  // ============================================================
  // getEnteredDrawingIds / recordDrawingEntry
  // ============================================================
  describe('getEnteredDrawingIds', () => {
    it('returns empty array when no entries recorded', async () => {
      const ids = await getEnteredDrawingIds();
      expect(ids).toEqual([]);
    });

    it('returns recorded drawing IDs', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.enteredRaffles, JSON.stringify(['draw-1', 'draw-2']));

      const ids = await getEnteredDrawingIds();
      expect(ids).toContain('draw-1');
      expect(ids).toContain('draw-2');
    });
  });

  describe('recordDrawingEntry', () => {
    it('appends drawing ID to legacy array', async () => {
      await recordDrawingEntry('draw-1');

      const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.enteredRaffles))!);
      expect(stored).toContain('draw-1');
    });

    it('does not create duplicates', async () => {
      await recordDrawingEntry('draw-1');
      await recordDrawingEntry('draw-1');

      const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.enteredRaffles))!);
      expect(stored.filter((id: string) => id === 'draw-1')).toHaveLength(1);
    });
  });

  // ============================================================
  // lastSeenDrawingId
  // ============================================================
  describe('getLastSeenDrawingId / setLastSeenDrawingId', () => {
    it('returns null when not set', async () => {
      const id = await getLastSeenDrawingId();
      expect(id).toBeNull();
    });

    it('stores and retrieves drawing ID', async () => {
      await setLastSeenDrawingId('draw-q1-2026');

      const id = await getLastSeenDrawingId();
      expect(id).toBe('draw-q1-2026');
    });
  });

  // ============================================================
  // isUserEntered
  // ============================================================
  describe('isUserEntered', () => {
    it('returns false when not connected and no local entry', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const entered = await isUserEntered('user-1', 'draw-1');
      expect(entered).toBe(false);
    });

    it('checks Supabase for entry when connected', async () => {
      // Chain: .from().select().eq().eq().limit().single()
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'entry-1', is_entered: true, user_id: 'user-1', drawing_id: 'draw-1' },
          error: null,
        }),
      }));

      const entered = await isUserEntered('user-1', 'draw-1');
      expect(entered).toBe(true);
    });
  });

  // ============================================================
  // enterRewardsDrawing
  // ============================================================
  describe('enterRewardsDrawing', () => {
    it('upserts entry to Supabase', async () => {
      const entryData = {
        id: 'entry-1',
        user_id: 'user-1',
        drawing_id: 'draw-1',
        is_entered: true,
        entry_method: 'app',
        entered_at: '2026-01-15',
        associated_report_ids: ['report-1'],
        created_at: '2026-01-15',
        updated_at: '2026-01-15',
      };

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // fetchUserEntryFromSupabase: .select().eq().eq().limit().single()
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          };
        }
        // upsertUserEntryToSupabase: .upsert().select().single()
        return {
          upsert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: entryData, error: null }),
        };
      });

      const entry = await enterRewardsDrawing('user-1', 'draw-1', 'report-1');
      expect(entry).toBeDefined();
      expect(entry.userId).toBe('user-1');
    });

    it('falls back to local storage on error', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const entry = await enterRewardsDrawing('user-1', 'draw-1');
      expect(entry).toBeDefined();
      expect(entry.userId).toBe('user-1');
    });
  });

  // ============================================================
  // addReportToRewardsEntry
  // ============================================================
  describe('addReportToRewardsEntry', () => {
    it('returns false when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await addReportToRewardsEntry('user-1', 'report-1');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // checkForNewQuarter
  // ============================================================
  describe('checkForNewQuarter', () => {
    it('returns isNewQuarter=false when no drawing available', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await checkForNewQuarter();
      expect(result.isNewQuarter).toBe(false);
    });
  });

  // ============================================================
  // fetchRewardsData
  // ============================================================
  describe('fetchRewardsData', () => {
    it('returns fallback data when not connected and no cache', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const data = await fetchRewardsData();
      expect(data).toBeDefined();
      expect(data.config).toBeDefined();
    });

    it('uses cached data when available', async () => {
      const config = { isEnabled: true, description: 'Test' };
      await AsyncStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
      await AsyncStorage.setItem(STORAGE_KEYS.lastFetched, Date.now().toString());

      mockIsSupabaseConnected.mockResolvedValue(false);
      const data = await fetchRewardsData();
      expect(data.config.isEnabled).toBe(true);
      expect(data.fromCache).toBe(true);
    });
  });
});
