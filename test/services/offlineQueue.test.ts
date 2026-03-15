/**
 * offlineQueue.test.ts - Offline queue management tests
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockIsSupabaseConnected } from '../mocks/supabase';
import { makeHarvestInput, makeQueuedReport, makeSubmittedReport, makeStoredReport } from '../factories';

// Mock harvestReportService
const mockSubmitHarvestReport = jest.fn();
const mockGenerateConfirmationNumber = jest.fn().mockReturnValue({
  dateS: '15', rand: '1234', unique1: '151234',
});

jest.mock('../../src/services/harvestReportService', () => ({
  submitHarvestReport: (...args: any[]) => mockSubmitHarvestReport(...args),
  generateConfirmationNumber: (...args: any[]) => mockGenerateConfirmationNumber(...args),
}));

// Mock reportsService
jest.mock('../../src/services/reportsService', () => ({
  createReportFromHarvestInput: jest.fn().mockResolvedValue({
    success: true,
    report: { id: 'sb-1' },
    savedToSupabase: true,
  }),
  getReports: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
}));

import {
  addToQueue,
  getQueue,
  getQueueCount,
  clearQueue,
  removeFromQueue,
  syncQueuedReports,
  addToHistory,
  getHistory,
  getHistoryCount,
  clearHistory,
  getHistoryEntry,
  submitWithQueueFallback,
} from '../../src/services/offlineQueue';

// Grab references to mocked modules so we can override per-test
const mockCreateReportFromHarvestInput =
  require('../../src/services/reportsService').createReportFromHarvestInput as jest.Mock;
const mockGetReports =
  require('../../src/services/reportsService').getReports as jest.Mock;
const mockGetRewardsMember =
  require('../../src/services/rewardsConversionService').getRewardsMemberForAnonymousUser as jest.Mock;

describe('offlineQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  // ============================================================
  // Queue Management
  // ============================================================
  describe('addToQueue', () => {
    it('adds a report to the queue with metadata', async () => {
      const input = makeHarvestInput();
      const confirmation = await addToQueue(input);

      expect(confirmation).toBe('151234');

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].localConfirmationNumber).toBe('151234');
      expect(queue[0].retryCount).toBe(0);
      expect(queue[0].queuedAt).toBeDefined();
    });

    it('converts Date to YYYY-MM-DD string for harvestDate', async () => {
      // Use T12:00:00 to avoid UTC midnight timezone-shift in test runner
      const input = makeHarvestInput({ harvestDate: new Date('2026-01-15T12:00:00') });
      await addToQueue(input);

      const queue = await getQueue();
      expect(typeof queue[0].harvestDate).toBe('string');
      expect(queue[0].harvestDate).toBe('2026-01-15');
    });

    it('appends to existing queue', async () => {
      await addToQueue(makeHarvestInput());
      await addToQueue(makeHarvestInput());

      const queue = await getQueue();
      expect(queue).toHaveLength(2);
    });
  });

  describe('getQueue', () => {
    it('returns empty array when no queue exists', async () => {
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('handles corrupted JSON gracefully', async () => {
      await AsyncStorage.setItem('@harvest_queue', 'invalid json');
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('getQueueCount', () => {
    it('returns correct count', async () => {
      expect(await getQueueCount()).toBe(0);

      await addToQueue(makeHarvestInput());
      expect(await getQueueCount()).toBe(1);

      await addToQueue(makeHarvestInput());
      expect(await getQueueCount()).toBe(2);
    });
  });

  describe('clearQueue', () => {
    it('empties the queue', async () => {
      await addToQueue(makeHarvestInput());
      await addToQueue(makeHarvestInput());
      expect(await getQueueCount()).toBe(2);

      await clearQueue();
      expect(await getQueueCount()).toBe(0);
    });
  });

  describe('removeFromQueue', () => {
    it('removes a report by confirmation number', async () => {
      await addToQueue(makeHarvestInput());
      const queue = await getQueue();
      const confNum = queue[0].localConfirmationNumber;

      const removed = await removeFromQueue(confNum);
      expect(removed).toBe(true);
      expect(await getQueueCount()).toBe(0);
    });

    it('returns false if confirmation number not found', async () => {
      await addToQueue(makeHarvestInput());
      const removed = await removeFromQueue('NONEXISTENT');
      expect(removed).toBe(false);
      expect(await getQueueCount()).toBe(1);
    });
  });

  // ============================================================
  // History Management
  // ============================================================
  describe('addToHistory', () => {
    it('adds a submitted report to history', async () => {
      await addToHistory({
        hasLicense: true,
        wantTextConfirmation: false,
        wantEmailConfirmation: false,
        harvestDate: '2026-01-15T00:00:00.000Z',
        redDrumCount: 1,
        flounderCount: 0,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
        areaCode: 'NC-001',
        usedHookAndLine: true,
        reportingFor: 'self',
        enterRaffle: false,
        confirmationNumber: 'DMF-12345',
        submittedAt: new Date().toISOString(),
      });

      const history = await getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].confirmationNumber).toBe('DMF-12345');
    });

    it('adds newest reports first', async () => {
      await addToHistory({
        hasLicense: true, wantTextConfirmation: false, wantEmailConfirmation: false,
        harvestDate: '2026-01-10', redDrumCount: 1, flounderCount: 0,
        spottedSeatroutCount: 0, weakfishCount: 0, stripedBassCount: 0,
        areaCode: 'NC-001', usedHookAndLine: true, reportingFor: 'self',
        enterRaffle: false, confirmationNumber: 'FIRST',
        submittedAt: '2026-01-10T00:00:00.000Z',
      });
      await addToHistory({
        hasLicense: true, wantTextConfirmation: false, wantEmailConfirmation: false,
        harvestDate: '2026-01-15', redDrumCount: 1, flounderCount: 0,
        spottedSeatroutCount: 0, weakfishCount: 0, stripedBassCount: 0,
        areaCode: 'NC-001', usedHookAndLine: true, reportingFor: 'self',
        enterRaffle: false, confirmationNumber: 'SECOND',
        submittedAt: '2026-01-15T00:00:00.000Z',
      });

      const history = await getHistory();
      expect(history[0].confirmationNumber).toBe('SECOND');
    });

    it('trims to max entries (100)', async () => {
      // Seed with 100 entries
      const entries = Array.from({ length: 100 }, (_, i) => makeSubmittedReport({
        confirmationNumber: `REPORT-${i}`,
      }));
      await AsyncStorage.setItem('@harvest_history', JSON.stringify(entries));

      // Add one more
      await addToHistory({
        hasLicense: true, wantTextConfirmation: false, wantEmailConfirmation: false,
        harvestDate: '2026-01-15', redDrumCount: 1, flounderCount: 0,
        spottedSeatroutCount: 0, weakfishCount: 0, stripedBassCount: 0,
        areaCode: 'NC-001', usedHookAndLine: true, reportingFor: 'self',
        enterRaffle: false, confirmationNumber: 'NEW',
        submittedAt: '2026-01-15T00:00:00.000Z',
      });

      const history = await getHistory();
      expect(history).toHaveLength(100);
      expect(history[0].confirmationNumber).toBe('NEW');
    });
  });

  describe('clearHistory', () => {
    it('empties the history', async () => {
      await addToHistory({
        hasLicense: true, wantTextConfirmation: false, wantEmailConfirmation: false,
        harvestDate: '2026-01-15', redDrumCount: 1, flounderCount: 0,
        spottedSeatroutCount: 0, weakfishCount: 0, stripedBassCount: 0,
        areaCode: 'NC-001', usedHookAndLine: true, reportingFor: 'self',
        enterRaffle: false, confirmationNumber: 'TEST',
        submittedAt: new Date().toISOString(),
      });

      await clearHistory();
      expect(await getHistoryCount()).toBe(0);
    });
  });

  describe('getHistoryEntry', () => {
    it('finds a report by confirmation number', async () => {
      await addToHistory({
        hasLicense: true, wantTextConfirmation: false, wantEmailConfirmation: false,
        harvestDate: '2026-01-15', redDrumCount: 1, flounderCount: 0,
        spottedSeatroutCount: 0, weakfishCount: 0, stripedBassCount: 0,
        areaCode: 'NC-001', usedHookAndLine: true, reportingFor: 'self',
        enterRaffle: false, confirmationNumber: 'FIND-ME',
        submittedAt: new Date().toISOString(),
      });

      const entry = await getHistoryEntry('FIND-ME');
      expect(entry).toBeDefined();
      expect(entry?.confirmationNumber).toBe('FIND-ME');
    });

    it('returns undefined when not found', async () => {
      const entry = await getHistoryEntry('NOPE');
      expect(entry).toBeUndefined();
    });
  });

  // ============================================================
  // Sync Queue to DMF
  // ============================================================
  describe('syncQueuedReports', () => {
    it('returns zeroes when queue is empty', async () => {
      const result = await syncQueuedReports();
      expect(result).toEqual({ synced: 0, failed: 0, expired: 0, results: [] });
    });

    it('successfully syncs a queued report', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-SUCCESS',
        objectId: 42,
      });

      await addToQueue(makeHarvestInput());
      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000); // mock delay
      const result = await promise;

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(await getQueueCount()).toBe(0);
      jest.useRealTimers();
    });

    it('keeps failed reports in queue with incremented retry', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      await addToQueue(makeHarvestInput());
      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(await getQueueCount()).toBe(1);

      const queue = await getQueue();
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastError).toBe('Network error');
      jest.useRealTimers();
    });

    it('expires reports exceeding max retries', async () => {
      jest.useFakeTimers();
      // Seed a report that has already hit max retries
      const queuedReport = makeQueuedReport({ retryCount: 3 });
      await AsyncStorage.setItem('@harvest_queue', JSON.stringify([queuedReport]));

      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.expired).toBe(1);
      expect(result.synced).toBe(0);
      expect(await getQueueCount()).toBe(0);
      jest.useRealTimers();
    });
  });

  // ============================================================
  // submitWithQueueFallback
  // ============================================================
  describe('submitWithQueueFallback', () => {
    it('returns success on direct DMF submission', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-DIRECT',
        objectId: 99,
      });

      const input = makeHarvestInput();
      const promise = submitWithQueueFallback(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.queued).toBe(false);
      expect(result.confirmationNumber).toBe('DMF-DIRECT');
      jest.useRealTimers();
    });

    it('queues on DMF failure and returns local confirmation', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: false,
        error: 'DMF offline',
        queued: true,
      });

      const input = makeHarvestInput();
      const promise = submitWithQueueFallback(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
      expect(result.confirmationNumber).toBeDefined();
      expect(await getQueueCount()).toBe(1);
      jest.useRealTimers();
    });

    it('queues via offlineQueueEnabled when result.queued is false', async () => {
      // APP_CONFIG.features.offlineQueueEnabled is true in test config
      // but result.queued is false — should still queue
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: false,
        error: 'Server error',
        queued: false,
      });

      const input = makeHarvestInput();
      const promise = submitWithQueueFallback(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
      expect(result.confirmationNumber).toBeDefined();
      expect(result.error).toBe('Server error');
      jest.useRealTimers();
    });

    it('returns failed-not-queued when offlineQueueEnabled is false and result.queued is false', async () => {
      jest.useFakeTimers();
      // Temporarily override offlineQueueEnabled
      const { APP_CONFIG } = require('../../src/config/appConfig');
      const original = APP_CONFIG.features.offlineQueueEnabled;
      APP_CONFIG.features.offlineQueueEnabled = false;

      mockSubmitHarvestReport.mockResolvedValue({
        success: false,
        error: 'Server down',
        queued: false,
      });

      const input = makeHarvestInput();
      const promise = submitWithQueueFallback(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.queued).toBe(false);
      expect(result.confirmationNumber).toBeUndefined();
      expect(result.error).toBe('Server down');

      APP_CONFIG.features.offlineQueueEnabled = original;
      jest.useRealTimers();
    });

    it('reports supabase save failure on success path', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-SB-FAIL',
        objectId: 10,
      });
      mockCreateReportFromHarvestInput.mockResolvedValueOnce({
        success: false,
        error: 'Supabase is down',
      });

      const input = makeHarvestInput();
      const promise = submitWithQueueFallback(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.supabaseError).toBe('Supabase is down');
      jest.useRealTimers();
    });

    it('handles supabase save throwing an Error on success path', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-SB-THROW',
        objectId: 11,
      });
      mockCreateReportFromHarvestInput.mockRejectedValueOnce(new Error('Connection reset'));

      const input = makeHarvestInput();
      const promise = submitWithQueueFallback(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.supabaseError).toBe('Connection reset');
      jest.useRealTimers();
    });

    it('handles supabase save throwing a non-Error on success path', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-SB-STR',
        objectId: 12,
      });
      mockCreateReportFromHarvestInput.mockRejectedValueOnce('string error');

      const input = makeHarvestInput();
      const promise = submitWithQueueFallback(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.supabaseError).toBe('string error');
      jest.useRealTimers();
    });

    it('returns achievements when supabase save succeeds with achievements', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-ACH',
        objectId: 20,
      });
      mockCreateReportFromHarvestInput.mockResolvedValueOnce({
        success: true,
        report: { id: 'sb-ach' },
        savedToSupabase: true,
        achievementsAwarded: [{ name: 'First Catch', description: 'You caught your first fish!' }],
      });

      const input = makeHarvestInput();
      const promise = submitWithQueueFallback(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.savedToSupabase).toBe(true);
      expect(result.achievementsAwarded).toHaveLength(1);
      expect(result.achievementsAwarded![0].name).toBe('First Catch');
      jest.useRealTimers();
    });
  });

  // ============================================================
  // Concurrent Sync
  // ============================================================
  describe('syncQueuedReports - concurrent calls', () => {
    it('skips when sync is already in progress', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-CONCURRENT',
        objectId: 50,
      });

      await addToQueue(makeHarvestInput());

      // Start first sync (will be in-progress)
      const first = syncQueuedReports();
      // Start second sync immediately — should be skipped
      const second = syncQueuedReports();

      await jest.advanceTimersByTimeAsync(5000);

      const result1 = await first;
      const result2 = await second;

      // Second call should return zeroes (skipped)
      expect(result2).toEqual({ synced: 0, failed: 0, expired: 0, results: [] });
      // First call should have actually synced
      expect(result1.synced).toBe(1);
      jest.useRealTimers();
    });

    it('releases the lock after sync completes so next sync can proceed', async () => {
      jest.useFakeTimers();
      // First sync: succeeds
      await addToQueue(makeHarvestInput());
      mockSubmitHarvestReport.mockResolvedValueOnce({
        success: true,
        confirmationNumber: 'DMF-FIRST',
        objectId: 60,
      });

      const promise1 = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      const result1 = await promise1;
      expect(result1.synced).toBe(1);

      // Second sync should work fine (lock released by finally block)
      await addToQueue(makeHarvestInput());
      mockSubmitHarvestReport.mockResolvedValueOnce({
        success: true,
        confirmationNumber: 'DMF-SECOND',
        objectId: 61,
      });

      const promise2 = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      const result2 = await promise2;
      expect(result2.synced).toBe(1);
      jest.useRealTimers();
    });

    it('releases the lock after an error so next sync can proceed', async () => {
      jest.useFakeTimers();
      // First sync: throws an error
      await addToQueue(makeHarvestInput());
      mockSubmitHarvestReport.mockRejectedValueOnce(new Error('Unexpected crash'));

      // Capture the rejection before advancing timers so it doesn't become unhandled
      const promise1 = syncQueuedReports().catch((e: Error) => e);
      await jest.advanceTimersByTimeAsync(2000);
      const error = await promise1;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Unexpected crash');

      // Second sync should still work (lock released by finally block)
      // Re-seed queue since the first sync errored without cleaning up
      await AsyncStorage.setItem('@harvest_queue', JSON.stringify([makeQueuedReport()]));
      mockSubmitHarvestReport.mockResolvedValueOnce({
        success: true,
        confirmationNumber: 'DMF-AFTER-ERROR',
        objectId: 62,
      });

      const promise2 = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      const result2 = await promise2;
      expect(result2.synced).toBe(1);
      jest.useRealTimers();
    });
  });

  // ============================================================
  // syncQueuedReports - additional branches
  // ============================================================
  describe('syncQueuedReports - supabase branches', () => {
    it('handles supabase save success after sync', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-SYNC-SB',
        objectId: 70,
      });
      mockCreateReportFromHarvestInput.mockResolvedValueOnce({
        success: true,
        report: { id: 'sb-sync-1' },
        savedToSupabase: true,
      });

      await addToQueue(makeHarvestInput());
      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.synced).toBe(1);
      expect(mockCreateReportFromHarvestInput).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ confirmationNumber: 'DMF-SYNC-SB' }),
        { skipLocalCache: true },
      );
      jest.useRealTimers();
    });

    it('handles supabase save failure after sync (non-blocking)', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-SYNC-SB-FAIL',
        objectId: 71,
      });
      mockCreateReportFromHarvestInput.mockResolvedValueOnce({
        success: false,
        error: 'Supabase timeout',
      });

      await addToQueue(makeHarvestInput());
      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      // Sync itself should still succeed
      expect(result.synced).toBe(1);
      jest.useRealTimers();
    });

    it('handles supabase save throwing during sync (non-blocking)', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-SYNC-SB-THROW',
        objectId: 72,
      });
      mockCreateReportFromHarvestInput.mockRejectedValueOnce(new Error('Network fail'));

      await addToQueue(makeHarvestInput());
      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.synced).toBe(1);
      jest.useRealTimers();
    });
  });

  // ============================================================
  // syncQueuedReports - queuedReportToInput date conversion
  // ============================================================
  describe('syncQueuedReports - date conversion', () => {
    it('converts YYYY-MM-DD harvestDate to noon local time', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-DATE-SHORT',
        objectId: 80,
      });

      // Seed with a YYYY-MM-DD date (10 chars)
      const queuedReport = makeQueuedReport({ harvestDate: '2026-03-15' });
      await AsyncStorage.setItem('@harvest_queue', JSON.stringify([queuedReport]));

      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      await promise;

      const submittedInput = mockSubmitHarvestReport.mock.calls[0][0];
      expect(submittedInput.harvestDate).toEqual(new Date('2026-03-15T12:00:00'));
      jest.useRealTimers();
    });

    it('converts ISO string harvestDate directly', async () => {
      jest.useFakeTimers();
      mockSubmitHarvestReport.mockResolvedValue({
        success: true,
        confirmationNumber: 'DMF-DATE-ISO',
        objectId: 81,
      });

      // Seed with a full ISO date (longer than 10 chars)
      const queuedReport = makeQueuedReport({ harvestDate: '2026-03-15T00:00:00.000Z' });
      await AsyncStorage.setItem('@harvest_queue', JSON.stringify([queuedReport]));

      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(2000);
      await promise;

      const submittedInput = mockSubmitHarvestReport.mock.calls[0][0];
      expect(submittedInput.harvestDate).toEqual(new Date('2026-03-15T00:00:00.000Z'));
      jest.useRealTimers();
    });
  });

  // ============================================================
  // syncQueuedReports - mixed scenarios
  // ============================================================
  describe('syncQueuedReports - mixed queue', () => {
    it('handles a mix of success, failure, and expired reports', async () => {
      jest.useFakeTimers();
      const expired = makeQueuedReport({ retryCount: 3, localConfirmationNumber: 'EXPIRED-1' });
      const willSucceed = makeQueuedReport({ retryCount: 0, localConfirmationNumber: 'SUCCEED-1' });
      const willFail = makeQueuedReport({ retryCount: 1, localConfirmationNumber: 'FAIL-1' });

      await AsyncStorage.setItem('@harvest_queue', JSON.stringify([expired, willSucceed, willFail]));

      mockSubmitHarvestReport
        .mockResolvedValueOnce({ success: true, confirmationNumber: 'DMF-MIX-1', objectId: 90 })
        .mockResolvedValueOnce({ success: false, error: 'Timeout' });

      const promise = syncQueuedReports();
      await jest.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(result.expired).toBe(1);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);

      // Only the failed report should remain in queue
      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].localConfirmationNumber).toBe('FAIL-1');
      expect(queue[0].retryCount).toBe(2);
      jest.useRealTimers();
    });
  });

  // ============================================================
  // getHistory - Supabase integration branches
  // ============================================================
  describe('getHistory - Supabase branches', () => {
    it('merges Supabase and local history for rewards members', async () => {
      // Set up local history
      await AsyncStorage.setItem('@harvest_history', JSON.stringify([
        makeSubmittedReport({ confirmationNumber: 'LOCAL-1', submittedAt: '2026-01-10T00:00:00.000Z' }),
      ]));

      // Mock rewards member found
      mockGetRewardsMember.mockResolvedValueOnce({ id: 'member-1' });

      // Mock Supabase reports
      mockGetReports.mockResolvedValueOnce([
        makeStoredReport({
          dmfConfirmationNumber: 'SB-1',
          dmfSubmittedAt: '2026-01-15T00:00:00.000Z',
          createdAt: '2026-01-15T00:00:00.000Z',
        }),
      ]);

      const history = await getHistory();

      // Should have both local-only and supabase reports
      expect(history.length).toBe(2);
      // Sorted newest first
      expect(history[0].confirmationNumber).toBe('SB-1');
      expect(history[1].confirmationNumber).toBe('LOCAL-1');
    });

    it('deduplicates reports with same confirmation number', async () => {
      await AsyncStorage.setItem('@harvest_history', JSON.stringify([
        makeSubmittedReport({ confirmationNumber: 'DUPE-1', submittedAt: '2026-01-10T00:00:00.000Z' }),
      ]));

      mockGetRewardsMember.mockResolvedValueOnce({ id: 'member-1' });
      mockGetReports.mockResolvedValueOnce([
        makeStoredReport({
          dmfConfirmationNumber: 'DUPE-1',
          dmfSubmittedAt: '2026-01-10T00:00:00.000Z',
          createdAt: '2026-01-10T00:00:00.000Z',
        }),
      ]);

      const history = await getHistory();
      // Should be deduplicated — only one entry
      expect(history).toHaveLength(1);
      expect(history[0].confirmationNumber).toBe('DUPE-1');
    });

    it('uses report ID fallback when dmfConfirmationNumber is null', async () => {
      mockGetRewardsMember.mockResolvedValueOnce({ id: 'member-1' });
      mockGetReports.mockResolvedValueOnce([
        makeStoredReport({
          id: 'abcdef12-3456-7890-abcd-ef1234567890',
          dmfConfirmationNumber: null,
          dmfSubmittedAt: null,
          createdAt: '2026-01-10T00:00:00.000Z',
        }),
      ]);

      const history = await getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].confirmationNumber).toBe('RPT-ABCDEF12');
    });

    it('falls back to local history when Supabase fetch throws', async () => {
      await AsyncStorage.setItem('@harvest_history', JSON.stringify([
        makeSubmittedReport({ confirmationNumber: 'LOCAL-ONLY', submittedAt: '2026-01-10T00:00:00.000Z' }),
      ]));

      mockGetRewardsMember.mockRejectedValueOnce(new Error('Network error'));

      const history = await getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].confirmationNumber).toBe('LOCAL-ONLY');
    });

    it('falls back to local history when getReports throws', async () => {
      await AsyncStorage.setItem('@harvest_history', JSON.stringify([
        makeSubmittedReport({ confirmationNumber: 'LOCAL-ONLY-2', submittedAt: '2026-01-10T00:00:00.000Z' }),
      ]));

      mockGetRewardsMember.mockResolvedValueOnce({ id: 'member-1' });
      mockGetReports.mockRejectedValueOnce(new Error('Supabase down'));

      const history = await getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].confirmationNumber).toBe('LOCAL-ONLY-2');
    });

    it('returns empty array when outer try/catch fails', async () => {
      // Force AsyncStorage.getItem to throw for the history key
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage corrupt'));

      const history = await getHistory();
      expect(history).toEqual([]);
    });

    it('maps Supabase report gps coordinates when present', async () => {
      mockGetRewardsMember.mockResolvedValueOnce({ id: 'member-1' });
      mockGetReports.mockResolvedValueOnce([
        makeStoredReport({
          dmfConfirmationNumber: 'GPS-1',
          dmfSubmittedAt: '2026-01-10T00:00:00.000Z',
          createdAt: '2026-01-10T00:00:00.000Z',
          gpsLatitude: 35.7796,
          gpsLongitude: -78.6382,
        }),
      ]);

      const history = await getHistory();
      expect(history[0].gpsCoordinates).toEqual({ latitude: 35.7796, longitude: -78.6382 });
    });

    it('maps gpsCoordinates as undefined when lat/lng are null', async () => {
      mockGetRewardsMember.mockResolvedValueOnce({ id: 'member-1' });
      mockGetReports.mockResolvedValueOnce([
        makeStoredReport({
          dmfConfirmationNumber: 'NO-GPS',
          dmfSubmittedAt: '2026-01-10T00:00:00.000Z',
          createdAt: '2026-01-10T00:00:00.000Z',
          gpsLatitude: null,
          gpsLongitude: null,
        }),
      ]);

      const history = await getHistory();
      expect(history[0].gpsCoordinates).toBeUndefined();
    });

    it('uses createdAt as submittedAt when dmfSubmittedAt is null', async () => {
      mockGetRewardsMember.mockResolvedValueOnce({ id: 'member-1' });
      mockGetReports.mockResolvedValueOnce([
        makeStoredReport({
          dmfConfirmationNumber: 'NO-DMF-TIME',
          dmfSubmittedAt: null,
          createdAt: '2026-02-20T12:00:00.000Z',
        }),
      ]);

      const history = await getHistory();
      expect(history[0].submittedAt).toBe('2026-02-20T12:00:00.000Z');
    });
  });
});
