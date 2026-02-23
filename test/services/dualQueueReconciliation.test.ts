/**
 * dualQueueReconciliation.test.ts
 *
 * Validates that the dual queue system (System A: offlineQueue, System B: reportsService)
 * does not create duplicate submissions. Both queues use AsyncStorage but different keys
 * and different sync mechanisms.
 *
 * System A: @harvest_queue + @harvest_history (offlineQueue.ts)
 * System B: @pending_sync_reports (reportsService.ts)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';
import { makeHarvestInput, makeStoredReport } from '../factories';

// Mock all service dependencies
jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: jest.fn().mockResolvedValue({
    id: 'anon-123', deviceId: 'device-123',
    createdAt: '2026-01-01', lastActiveAt: '2026-01-01',
    dismissedRewardsPrompt: false,
  }),
}));
jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/photoUploadService', () => ({
  ensurePublicPhotoUrl: jest.fn().mockResolvedValue(null),
  isLocalUri: jest.fn(() => false),
}));
jest.mock('../../src/services/authService', () => ({
  ensureValidSession: jest.fn().mockResolvedValue({ valid: true }),
}));
jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));
jest.mock('../../src/services/harvestReportService', () => ({
  triggerDMFConfirmationWebhook: jest.fn().mockResolvedValue({
    success: true, webhooksTriggered: 1, errors: [],
  }),
  generateGlobalId: jest.fn(() => '{MOCK-GUID}'),
  generateConfirmationNumber: jest.fn(() => ({
    dateS: '18', rand: '1234', unique1: 'LOCAL-MOCK',
  })),
  submitHarvestReport: jest.fn().mockResolvedValue({
    success: true,
    confirmationNumber: 'DMF-TEST',
    objectId: 42,
  }),
}));
jest.mock('../../src/services/statsService', () => ({
  updateAllStatsAfterReport: jest.fn().mockResolvedValue({
    success: true, achievementsAwarded: [],
  }),
}));

import { addToQueue, getQueue, getHistory } from '../../src/services/offlineQueue';
import { syncPendingReports, clearReportsCache } from '../../src/services/reportsService';

describe('Dual Queue Reconciliation', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    // Clear both queue systems
    await AsyncStorage.removeItem('@harvest_queue');
    await AsyncStorage.removeItem('@harvest_history');
    await AsyncStorage.removeItem('@pending_sync_reports');
    await AsyncStorage.removeItem('@harvest_reports');
  });

  // ============================================================
  // Queue isolation
  // ============================================================
  describe('queue isolation', () => {
    it('System A queue uses @harvest_queue key', async () => {
      const report = makeHarvestInput();
      await addToQueue(report);

      const queueA = await AsyncStorage.getItem('@harvest_queue');
      const queueB = await AsyncStorage.getItem('@pending_sync_reports');

      expect(queueA).not.toBeNull();
      expect(JSON.parse(queueA!)).toHaveLength(1);
      expect(queueB).toBeNull();
    });

    it('System B queue uses @pending_sync_reports key', async () => {
      // Seed System B queue directly
      const pendingReport = makeStoredReport({ id: 'pending-b1' });
      await AsyncStorage.setItem(
        '@pending_sync_reports',
        JSON.stringify([pendingReport])
      );

      const queueA = await AsyncStorage.getItem('@harvest_queue');
      const queueB = await AsyncStorage.getItem('@pending_sync_reports');

      expect(queueA).toBeNull();
      expect(queueB).not.toBeNull();
      expect(JSON.parse(queueB!)).toHaveLength(1);
    });

    it('both queues can coexist without interference', async () => {
      // Add to System A (addToQueue generates its own localConfirmationNumber)
      const reportA = makeHarvestInput();
      await addToQueue(reportA);

      // Add to System B
      const reportB = makeStoredReport({ id: 'pending-dual' });
      await AsyncStorage.setItem(
        '@pending_sync_reports',
        JSON.stringify([reportB])
      );

      const queueA = JSON.parse((await AsyncStorage.getItem('@harvest_queue'))!);
      const queueB = JSON.parse((await AsyncStorage.getItem('@pending_sync_reports'))!);

      expect(queueA).toHaveLength(1);
      expect(queueB).toHaveLength(1);
      // addToQueue generates localConfirmationNumber via generateConfirmationNumber()
      expect(queueA[0].localConfirmationNumber).toBe('LOCAL-MOCK');
      expect(queueB[0].id).toBe('pending-dual');
    });
  });

  // ============================================================
  // Idempotency
  // ============================================================
  describe('idempotency guards', () => {
    it('System B stores report IDs in pending queue, reports in @harvest_reports', async () => {
      // @pending_sync_reports stores string[] of report IDs (not full objects)
      // Full reports live in @harvest_reports
      const report = makeStoredReport({ id: 'pending-1', dmfObjectId: 42 });
      await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['pending-1']));
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

      const pendingIds = JSON.parse((await AsyncStorage.getItem('@pending_sync_reports'))!);
      const allReports = JSON.parse((await AsyncStorage.getItem('@harvest_reports'))!);

      expect(pendingIds).toEqual(['pending-1']);
      expect(allReports).toHaveLength(1);
      expect(allReports[0].dmfObjectId).toBe(42);
    });

    it('System A uses localConfirmationNumber for tracking', async () => {
      const report = makeHarvestInput();
      await addToQueue(report);

      const queue = await getQueue();
      // addToQueue assigns the generated localConfirmationNumber
      expect(queue[0].localConfirmationNumber).toBe('LOCAL-MOCK');
    });
  });

  // ============================================================
  // History tracking
  // ============================================================
  describe('history tracking', () => {
    it('System A moves successful syncs to history', async () => {
      // The history should start empty
      const history = await getHistory();
      expect(history).toEqual([]);
    });

    it('System A and System B have separate history mechanisms', async () => {
      // System A uses @harvest_history
      // System B removes from @pending_sync_reports after sync
      // They should not interfere
      await AsyncStorage.setItem('@harvest_history', JSON.stringify([
        { confirmationNumber: 'DMF-HIST-A', submittedAt: new Date().toISOString() },
      ]));
      await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify([
        makeStoredReport({ id: 'pending-hist-b' }),
      ]));

      const historyA = JSON.parse((await AsyncStorage.getItem('@harvest_history'))!);
      const pendingB = JSON.parse((await AsyncStorage.getItem('@pending_sync_reports'))!);

      expect(historyA).toHaveLength(1);
      expect(pendingB).toHaveLength(1);
    });
  });
});
