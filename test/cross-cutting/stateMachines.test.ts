/**
 * State Machine Tests
 *
 * Tests the valid and invalid state transitions for:
 * 1. DMF Status (pending -> submitted -> confirmed | failed)
 * 2. Sync Queue lifecycle (offline creation -> queue -> sync -> removal)
 * 3. Offline Queue lifecycle (add -> retry -> success/expiry)
 * 4. Auth session lifecycle (no session -> authenticated -> expired -> refreshed)
 *
 * These tests verify the actual behavior of state transitions in the codebase,
 * not assumed abstract state machines.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeStoredReport, makeHarvestInput, makeQueuedReport } from '../factories';

// =============================================================================
// DMF Status State Machine
// =============================================================================

// Mock dependencies for reportsService
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: jest.fn().mockResolvedValue({ id: 'anon-123', deviceId: 'device-123' }),
}));
jest.mock('../../src/services/photoUploadService', () => ({
  ensurePublicPhotoUrl: jest.fn().mockResolvedValue(null),
  isLocalUri: jest.fn().mockReturnValue(false),
}));
jest.mock('../../src/services/rewardsService', () => ({
  fetchCurrentDrawing: jest.fn().mockResolvedValue(null),
  addReportToRewardsEntry: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/statsService', () => ({
  updateAllStatsAfterReport: jest.fn().mockResolvedValue({ achievementsAwarded: [] }),
}));
jest.mock('../../src/services/authService', () => ({
  ...jest.requireActual('../../src/services/authService'),
  ensureValidSession: jest.fn().mockResolvedValue({ valid: false, reason: 'no_session' }),
}));
jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('test-device-id'),
}));

const { mockSupabase, mockIsSupabaseConnected } = require('../mocks/supabase');

describe('DMF status state machine', () => {
  beforeEach(() => {
    mockIsSupabaseConnected.mockResolvedValue(false);
  });

  it('new reports start with dmfStatus="pending"', async () => {
    mockIsSupabaseConnected.mockResolvedValue(false);

    const { createReport } = require('../../src/services/reportsService');
    const { harvestInputToReportInput } = require('../../src/services/reportsService');

    const input = harvestInputToReportInput(makeHarvestInput(), undefined, 'anon-123');
    const result = await createReport(input);

    expect(result.success).toBe(true);
    expect(result.report.dmfStatus).toBe('pending');
  });

  it('transitions pending -> submitted when DMF confirmation is provided', async () => {
    const report = makeStoredReport({
      id: 'report-to-update',
      dmfStatus: 'pending',
    });
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

    const { updateDMFStatus } = require('../../src/services/reportsService');
    const updated = await updateDMFStatus('report-to-update', {
      dmfStatus: 'submitted',
      dmfConfirmationNumber: 'DMF-12345',
      dmfObjectId: 42,
      dmfSubmittedAt: '2026-01-15T10:00:00.000Z',
    });

    expect(updated).toBeTruthy();
    expect(updated!.dmfStatus).toBe('submitted');
    expect(updated!.dmfConfirmationNumber).toBe('DMF-12345');
    expect(updated!.dmfObjectId).toBe(42);
  });

  it('transitions submitted -> confirmed', async () => {
    const report = makeStoredReport({
      id: 'submitted-report',
      dmfStatus: 'submitted',
      dmfConfirmationNumber: 'DMF-12345',
    });
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

    const { updateDMFStatus } = require('../../src/services/reportsService');
    const updated = await updateDMFStatus('submitted-report', {
      dmfStatus: 'confirmed',
    });

    expect(updated).toBeTruthy();
    expect(updated!.dmfStatus).toBe('confirmed');
  });

  it('transitions pending -> failed when DMF submission errors', async () => {
    const report = makeStoredReport({
      id: 'failed-report',
      dmfStatus: 'pending',
    });
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

    const { updateDMFStatus } = require('../../src/services/reportsService');
    const updated = await updateDMFStatus('failed-report', {
      dmfStatus: 'failed',
      dmfError: 'ArcGIS server returned 500',
    });

    expect(updated).toBeTruthy();
    expect(updated!.dmfStatus).toBe('failed');
    expect(updated!.dmfError).toBe('ArcGIS server returned 500');
  });

  it('transitions submitted -> failed on post-submission error', async () => {
    const report = makeStoredReport({
      id: 'post-error-report',
      dmfStatus: 'submitted',
      dmfConfirmationNumber: 'DMF-999',
    });
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

    const { updateDMFStatus } = require('../../src/services/reportsService');

    // updateDMFStatus replaces all DMF fields with the provided values.
    // To preserve the confirmation number on failure, caller must include it.
    const updated = await updateDMFStatus('post-error-report', {
      dmfStatus: 'failed',
      dmfConfirmationNumber: 'DMF-999',
      dmfError: 'Confirmation webhook failed',
    });

    expect(updated).toBeTruthy();
    expect(updated!.dmfStatus).toBe('failed');
    expect(updated!.dmfConfirmationNumber).toBe('DMF-999');
    expect(updated!.dmfError).toBe('Confirmation webhook failed');
  });

  it('returns null when updating a non-existent report', async () => {
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([]));

    const { updateDMFStatus } = require('../../src/services/reportsService');
    const updated = await updateDMFStatus('non-existent', {
      dmfStatus: 'submitted',
    });

    // Local update fails silently, and local lookup returns null
    expect(updated).toBeNull();
  });
});

// =============================================================================
// Sync Queue State Machine
// =============================================================================

describe('sync queue state machine', () => {
  beforeEach(() => {
    mockIsSupabaseConnected.mockResolvedValue(false);
  });

  it('offline-created report is added to pending sync queue', async () => {
    mockIsSupabaseConnected.mockResolvedValue(false);

    const { createReport, harvestInputToReportInput } = require('../../src/services/reportsService');
    const input = harvestInputToReportInput(makeHarvestInput(), undefined, 'anon-123');
    const result = await createReport(input);

    expect(result.savedToSupabase).toBe(false);
    expect(result.report.id).toMatch(/^local_/);

    // Verify it's in the pending sync queue
    const pendingRaw = await AsyncStorage.getItem('@pending_sync_reports');
    const pending = JSON.parse(pendingRaw!);
    expect(pending).toContain(result.report.id);
  });

  it('successfully synced report is removed from pending sync queue', async () => {
    mockIsSupabaseConnected.mockResolvedValue(true);

    const report = makeStoredReport({
      id: 'local_to_sync',
      anonymousUserId: 'anon-123',
    });
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));
    await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['local_to_sync']));

    // Mock successful RPC
    mockSupabase.rpc = jest.fn().mockResolvedValue({
      data: {
        report_id: 'server-uuid',
        dmf_status: 'pending',
        anonymous_user_id: 'anon-123',
        created_at: new Date().toISOString(),
      },
      error: null,
    });

    // Mock idempotency check (no existing)
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
    });

    const { syncPendingReports } = require('../../src/services/reportsService');
    const result = await syncPendingReports();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);

    // Queue should now be empty
    const pendingRaw = await AsyncStorage.getItem('@pending_sync_reports');
    const pending = JSON.parse(pendingRaw!);
    expect(pending).toEqual([]);
  });

  it('report that already exists in Supabase is deduped and removed from queue', async () => {
    mockIsSupabaseConnected.mockResolvedValue(true);

    const report = makeStoredReport({
      id: 'local_dupe',
      dmfObjectId: 42,
    });
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));
    await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['local_dupe']));

    // Mock idempotency check: report already exists
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'existing-server-uuid' },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    });

    const { syncPendingReports } = require('../../src/services/reportsService');
    const result = await syncPendingReports();

    expect(result.synced).toBe(1); // Counted as synced (already exists)
    expect(result.failed).toBe(0);

    // Queue should be empty
    const pendingRaw = await AsyncStorage.getItem('@pending_sync_reports');
    const pending = JSON.parse(pendingRaw!);
    expect(pending).toEqual([]);
  });

  it('failed sync keeps report in pending queue', async () => {
    mockIsSupabaseConnected.mockResolvedValue(true);

    const report = makeStoredReport({
      id: 'local_fail',
      anonymousUserId: 'anon-123',
    });
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));
    await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['local_fail']));

    // Mock idempotency check (no existing)
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
    });

    // Mock RPC failure
    mockSupabase.rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Server error' },
    });

    const { syncPendingReports } = require('../../src/services/reportsService');
    const result = await syncPendingReports();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);

    // Report should still be in the queue
    const pendingRaw = await AsyncStorage.getItem('@pending_sync_reports');
    const pending = JSON.parse(pendingRaw!);
    expect(pending).toContain('local_fail');
  });

  it('sync does nothing when offline', async () => {
    jest.useFakeTimers();
    mockIsSupabaseConnected.mockResolvedValue(false);

    const report = makeStoredReport({ id: 'local_offline' });
    await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));
    await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['local_offline']));

    const { syncPendingReports } = require('../../src/services/reportsService');
    const syncPromise = syncPendingReports();

    // Advance past the 3 connectivity retry delays (2s + 4s)
    await jest.advanceTimersByTimeAsync(10000);

    const result = await syncPromise;

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);

    // Queue should be unchanged
    const pendingRaw = await AsyncStorage.getItem('@pending_sync_reports');
    const pending = JSON.parse(pendingRaw!);
    expect(pending).toContain('local_offline');

    jest.useRealTimers();
  });

  it('sync handles empty queue gracefully', async () => {
    await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify([]));

    const { syncPendingReports } = require('../../src/services/reportsService');
    const result = await syncPendingReports();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });
});

// =============================================================================
// Offline Queue (DMF) State Machine
// =============================================================================

// Need separate mocks for offlineQueue since it imports different services
jest.mock('../../src/services/harvestReportService', () => ({
  submitHarvestReport: jest.fn(),
  generateConfirmationNumber: jest.fn().mockReturnValue({
    dateS: '15',
    rand: '4321',
    unique1: '154321',
  }),
  transformToDMFPayload: jest.fn().mockReturnValue({
    attributes: { GlobalID: '{mock-guid}' },
    geometry: { spatialReference: { wkid: 4326 }, x: 0, y: 0, z: 0 },
  }),
  triggerDMFConfirmationWebhook: jest.fn().mockResolvedValue({ success: true }),
}));

describe('offline queue (DMF) state machine', () => {
  it('adds report to queue with retryCount=0', async () => {
    const { addToQueue, getQueue } = require('../../src/services/offlineQueue');
    const input = makeHarvestInput();

    const confirmationNumber = await addToQueue(input);

    expect(confirmationNumber).toBeDefined();
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(0);
    expect(queue[0].localConfirmationNumber).toBe(confirmationNumber);
  });

  it('successful sync moves report from queue to history', async () => {
    const { submitHarvestReport } = require('../../src/services/harvestReportService');
    (submitHarvestReport as jest.Mock).mockResolvedValue({
      success: true,
      confirmationNumber: 'DMF-SUCCESS',
      objectId: 99,
    });

    const { addToQueue, syncQueuedReports, getQueue, getHistory } =
      require('../../src/services/offlineQueue');

    await addToQueue(makeHarvestInput());
    const beforeQueue = await getQueue();
    expect(beforeQueue).toHaveLength(1);

    const result = await syncQueuedReports();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.expired).toBe(0);

    const afterQueue = await getQueue();
    expect(afterQueue).toHaveLength(0);

    // Note: getHistory calls getRewardsMemberForAnonymousUser which returns null,
    // so it just returns local history
    const history = await getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].confirmationNumber).toBe('DMF-SUCCESS');
  });

  it('failed sync increments retryCount and keeps in queue', async () => {
    const { submitHarvestReport } = require('../../src/services/harvestReportService');
    (submitHarvestReport as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Network timeout',
    });

    const { addToQueue, syncQueuedReports, getQueue } =
      require('../../src/services/offlineQueue');

    await addToQueue(makeHarvestInput());

    const result = await syncQueuedReports();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(1);
    expect(queue[0].lastError).toBe('Network timeout');
  });

  it('report exceeding maxRetryAttempts is expired (removed from queue)', async () => {
    const { submitHarvestReport } = require('../../src/services/harvestReportService');
    (submitHarvestReport as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Persistent failure',
    });

    // Seed a report that's already at max retries
    const queuedReport = makeQueuedReport({
      retryCount: 3, // APP_CONFIG.limits.maxRetryAttempts = 3
    });
    await AsyncStorage.setItem('@harvest_queue', JSON.stringify([queuedReport]));

    const { syncQueuedReports, getQueue } = require('../../src/services/offlineQueue');
    const result = await syncQueuedReports();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.expired).toBe(1);

    const queue = await getQueue();
    expect(queue).toHaveLength(0);
  });

  it('processes reports in FIFO order', async () => {
    const { submitHarvestReport } = require('../../src/services/harvestReportService');
    const submissionOrder: string[] = [];

    (submitHarvestReport as jest.Mock).mockImplementation((input: any) => {
      submissionOrder.push(input.areaCode);
      return Promise.resolve({
        success: true,
        confirmationNumber: `DMF-${input.areaCode}`,
        objectId: 1,
      });
    });

    const { addToQueue, syncQueuedReports } = require('../../src/services/offlineQueue');

    // Add reports in specific order
    await addToQueue(makeHarvestInput({ areaCode: 'FIRST' }));
    await addToQueue(makeHarvestInput({ areaCode: 'SECOND' }));
    await addToQueue(makeHarvestInput({ areaCode: 'THIRD' }));

    await syncQueuedReports();

    expect(submissionOrder).toEqual(['FIRST', 'SECOND', 'THIRD']);
  });
});

// =============================================================================
// Auth Session State Machine
// =============================================================================

describe('auth session state machine', () => {
  // These tests use the actual authService (not the mock), so we need to
  // re-import with the supabase mock in play

  it('getAuthState returns unauthenticated when no session exists', async () => {
    const { mockSupabase } = require('../mocks/supabase');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { getAuthState } = require('../../src/services/authService');
    const state = await getAuthState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('getAuthState returns authenticated when session exists', async () => {
    const { mockSupabase } = require('../mocks/supabase');
    const mockSession = {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      user: { id: 'user-1', email: 'test@example.com' },
    };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { getAuthState } = require('../../src/services/authService');
    const state = await getAuthState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockSession.user);
    expect(state.session).toEqual(mockSession);
  });

  it('getAuthState handles Supabase errors gracefully', async () => {
    const { mockSupabase } = require('../mocks/supabase');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Network error' },
    });

    const { getAuthState } = require('../../src/services/authService');
    const state = await getAuthState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('isMagicLinkCallback correctly identifies callback URLs', () => {
    const { isMagicLinkCallback } = require('../../src/services/authService');

    // Standalone app
    expect(isMagicLinkCallback('fishlog://auth/callback#access_token=abc')).toBe(true);

    // Expo Go
    expect(isMagicLinkCallback('exp://192.168.1.1:8081/--/auth/callback#access_token=abc')).toBe(true);

    // Not a callback
    expect(isMagicLinkCallback('fishlog://home')).toBe(false);
    expect(isMagicLinkCallback('https://example.com/auth/callback')).toBe(false);
  });

  it('storePendingAuth and getPendingAuth round-trip correctly', async () => {
    const { storePendingAuth, getPendingAuth } = require('../../src/services/authService');

    await storePendingAuth({
      email: 'fisher@example.com',
      firstName: 'Jane',
      lastName: 'Fisher',
      phone: '919-555-0000',
      sentAt: '2026-01-15T10:00:00.000Z',
    });

    const pending = await getPendingAuth();

    expect(pending).toBeTruthy();
    expect(pending!.email).toBe('fisher@example.com');
    expect(pending!.firstName).toBe('Jane');
    expect(pending!.lastName).toBe('Fisher');
    expect(pending!.phone).toBe('919-555-0000');
  });

  it('clearPendingAuth removes pending auth data', async () => {
    const { storePendingAuth, getPendingAuth, clearPendingAuth } =
      require('../../src/services/authService');

    await storePendingAuth({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      sentAt: new Date().toISOString(),
    });

    expect(await getPendingAuth()).toBeTruthy();

    await clearPendingAuth();

    expect(await getPendingAuth()).toBeNull();
  });
});
