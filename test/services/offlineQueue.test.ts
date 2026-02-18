/**
 * offlineQueue.test.ts - Offline queue management tests
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockIsSupabaseConnected } from '../mocks/supabase';
import { makeHarvestInput, makeQueuedReport, makeSubmittedReport } from '../factories';

// Mock harvestReportService
const mockSubmitHarvestReport = jest.fn();
const mockTransformToDMFPayload = jest.fn().mockReturnValue({
  attributes: { GlobalID: '{MOCK-GUID}', Unique1: '123456' },
  geometry: { spatialReference: { wkid: 4326 }, x: 0, y: 0, z: 0 },
});
const mockTriggerDMFConfirmationWebhook = jest.fn().mockResolvedValue({
  success: true, webhooksTriggered: 1, errors: [],
});
const mockGenerateConfirmationNumber = jest.fn().mockReturnValue({
  dateS: '15', rand: '1234', unique1: '151234',
});

jest.mock('../../src/services/harvestReportService', () => ({
  submitHarvestReport: (...args: any[]) => mockSubmitHarvestReport(...args),
  generateConfirmationNumber: (...args: any[]) => mockGenerateConfirmationNumber(...args),
  transformToDMFPayload: (...args: any[]) => mockTransformToDMFPayload(...args),
  triggerDMFConfirmationWebhook: (...args: any[]) => mockTriggerDMFConfirmationWebhook(...args),
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

    it('converts Date to ISO string for harvestDate', async () => {
      const input = makeHarvestInput({ harvestDate: new Date('2026-01-15') });
      await addToQueue(input);

      const queue = await getQueue();
      expect(typeof queue[0].harvestDate).toBe('string');
      expect(queue[0].harvestDate).toContain('2026-01-15');
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
  });
});
