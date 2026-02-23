/**
 * reportsService.sync.test.ts - Sync regression suite (25+ tests)
 *
 * Dedicated test file for syncPendingReports — the most complex function
 * in the codebase, modified in ALL 5 most recent commits.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';
import { makeStoredReport } from '../factories';

// Service-level mocks
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: jest.fn().mockResolvedValue({
    id: 'anon-user-123', deviceId: 'device-123',
    createdAt: '2026-01-01T00:00:00.000Z', lastActiveAt: '2026-01-01T00:00:00.000Z',
    dismissedRewardsPrompt: false,
  }),
}));
jest.mock('../../src/services/photoUploadService', () => ({
  ensurePublicPhotoUrl: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
  isLocalUri: jest.fn((uri: string) => uri?.startsWith('file://') || false),
}));
jest.mock('../../src/services/authService', () => ({
  ensureValidSession: jest.fn().mockResolvedValue({ valid: true, authUserId: 'auth-123' }),
}));
jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

import { syncPendingReports } from '../../src/services/reportsService';
import { ensurePublicPhotoUrl, isLocalUri } from '../../src/services/photoUploadService';

// Helper: seed a local report + pending sync queue
async function seedPendingReport(overrides: Partial<ReturnType<typeof makeStoredReport>> = {}) {
  const report = makeStoredReport({ id: 'local_123_abc', ...overrides });
  await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));
  await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify([report.id]));
  return report;
}

// Helper: setup supabase RPC mock for successful sync
function mockSuccessfulRpc(reportId = 'sb-synced-1') {
  (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
    data: {
      report_id: reportId,
      dmf_status: 'pending',
      anonymous_user_id: 'anon-user-123',
      created_at: '2026-01-15T00:00:00.000Z',
    },
    error: null,
  });
}

// Helper: mock supabase.from chain for idempotency queries
function mockFromChain(existingReport: { id: string } | null = null) {
  const maybeSingleMock = jest.fn().mockResolvedValue({
    data: existingReport,
    error: null,
  });

  (mockSupabase.from as jest.Mock).mockImplementation(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    maybeSingle: maybeSingleMock,
    lt: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
  }));

  return maybeSingleMock;
}

describe('syncPendingReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    mockFromChain(null);
    mockSuccessfulRpc();
  });

  // ─── Empty queue ───────────────────────────────────────────
  it('returns { synced: 0, failed: 0 } when pending queue is empty', async () => {
    const result = await syncPendingReports();
    expect(result).toEqual({ synced: 0, failed: 0 });
  });

  // ─── Connectivity ──────────────────────────────────────────
  describe('connectivity', () => {
    it('retries connectivity check up to 3 times', async () => {
      jest.useFakeTimers();
      await seedPendingReport();
      mockIsSupabaseConnected
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const promise = syncPendingReports();
      // Advance through retry delays
      await jest.advanceTimersByTimeAsync(2000); // attempt 1 delay
      await jest.advanceTimersByTimeAsync(4000); // attempt 2 delay

      const result = await promise;
      expect(result.synced).toBe(1);
      expect(mockIsSupabaseConnected).toHaveBeenCalledTimes(3);
      jest.useRealTimers();
    });

    it('preserves reports in queue after all retries fail', async () => {
      jest.useFakeTimers();
      await seedPendingReport();
      mockIsSupabaseConnected.mockResolvedValue(false);

      const promise = syncPendingReports();
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      const result = await promise;
      expect(result).toEqual({ synced: 0, failed: 0 });

      // Queue should still have the report
      const pending = JSON.parse((await AsyncStorage.getItem('@pending_sync_reports'))!);
      expect(pending).toHaveLength(1);
      jest.useRealTimers();
    });

    it('reports can be retried on next sync cycle after exhaustion', async () => {
      jest.useFakeTimers();
      // First attempt: all connectivity fails
      await seedPendingReport();
      mockIsSupabaseConnected.mockResolvedValue(false);
      const promise1 = syncPendingReports();
      await jest.advanceTimersByTimeAsync(10000);
      await promise1;
      jest.useRealTimers();

      // Queue still has the report
      const pending = JSON.parse((await AsyncStorage.getItem('@pending_sync_reports'))!);
      expect(pending).toHaveLength(1);

      // Second attempt: connectivity restored
      mockIsSupabaseConnected.mockResolvedValue(true);
      const result = await syncPendingReports();
      expect(result.synced).toBe(1);
    });
  });

  // ─── Client-side idempotency ───────────────────────────────
  describe('client-side idempotency', () => {
    it('detects duplicate by dmf_object_id and skips RPC', async () => {
      const report = await seedPendingReport({ dmfObjectId: 42 });
      mockFromChain({ id: 'existing-sb-id' });

      const result = await syncPendingReports();

      expect(result.synced).toBe(1);
      // RPC should NOT have been called since duplicate was found
      expect((mockSupabase as any).rpc).not.toHaveBeenCalled();
    });

    it('falls back to composite key when dmf_object_id is undefined', async () => {
      const maybeSingleMock = mockFromChain(null);
      // First call (dmf_object_id check) returns null, second (composite) returns match
      maybeSingleMock
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: 'composite-match-id' }, error: null });

      await seedPendingReport({ dmfObjectId: null, userId: 'user-1' });

      const result = await syncPendingReports();
      expect(result.synced).toBe(1);
    });

    it('allows same user/date/area with different dmf_object_id', async () => {
      mockFromChain(null); // No duplicates found
      await seedPendingReport({ dmfObjectId: 999 });

      const result = await syncPendingReports();
      expect(result.synced).toBe(1);
      expect((mockSupabase as any).rpc).toHaveBeenCalled();
    });

    it('handles missing dmf_object_id gracefully (proceeds to RPC)', async () => {
      mockFromChain(null);
      await seedPendingReport({ dmfObjectId: null, userId: null });

      const result = await syncPendingReports();
      expect(result.synced).toBe(1);
      expect((mockSupabase as any).rpc).toHaveBeenCalled();
    });
  });

  // ─── Fish entry preservation (commit bbb1cc8) ─────────────
  describe('fish entry preservation', () => {
    it('sends individual fishEntries when available', async () => {
      mockFromChain(null);
      const fishEntries = [
        { species: 'Red Drum', count: 2, lengths: ['18', '22'], tagNumber: 'T001' },
      ];
      await seedPendingReport({ fishEntries });

      await syncPendingReports();

      const rpcCall = (mockSupabase as any).rpc.mock.calls[0];
      const rpcInput = rpcCall[1].p_input;
      expect(rpcInput.fish_entries).toEqual([
        { species: 'Red Drum', count: 2, lengths: ['18', '22'], tag_number: 'T001' },
      ]);
    });

    it('falls back to aggregate count when fishEntries is empty array', async () => {
      mockFromChain(null);
      await seedPendingReport({
        fishEntries: [],
        redDrumCount: 3,
        flounderCount: 1,
      });

      await syncPendingReports();

      const rpcCall = (mockSupabase as any).rpc.mock.calls[0];
      const rpcInput = rpcCall[1].p_input;
      // Should have reconstructed entries from aggregate counts
      expect(rpcInput.fish_entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ species: 'Red Drum', count: 3 }),
          expect.objectContaining({ species: 'Southern Flounder', count: 1 }),
        ])
      );
    });

    it('handles fishEntries undefined from older reports', async () => {
      mockFromChain(null);
      await seedPendingReport({
        fishEntries: undefined,
        redDrumCount: 1,
        flounderCount: 0,
        spottedSeatroutCount: 2,
        weakfishCount: 0,
        stripedBassCount: 0,
      });

      await syncPendingReports();

      const rpcCall = (mockSupabase as any).rpc.mock.calls[0];
      const rpcInput = rpcCall[1].p_input;
      expect(rpcInput.fish_entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ species: 'Red Drum', count: 1 }),
          expect.objectContaining({ species: 'Spotted Seatrout', count: 2 }),
        ])
      );
    });

    it('old reports without tag numbers still sync correctly', async () => {
      mockFromChain(null);
      await seedPendingReport({
        fishEntries: [{ species: 'Red Drum', count: 1 }],
      });

      const result = await syncPendingReports();
      expect(result.synced).toBe(1);
    });
  });

  // ─── Photo upload during sync (commit 11deb21) ────────────
  describe('photo upload during sync', () => {
    it('uploads photo before syncing the report', async () => {
      mockFromChain(null);
      await seedPendingReport({ photoUrl: 'file://local/photo.jpg' });

      await syncPendingReports();

      expect(ensurePublicPhotoUrl).toHaveBeenCalledWith(
        'file://local/photo.jpg',
        expect.any(String)
      );
    });

    it('proceeds without photo when upload fails', async () => {
      mockFromChain(null);
      (ensurePublicPhotoUrl as jest.Mock).mockResolvedValueOnce(null);
      await seedPendingReport({ photoUrl: 'file://local/photo.jpg' });

      const result = await syncPendingReports();
      expect(result.synced).toBe(1);

      // RPC should have been called with undefined photo
      const rpcInput = (mockSupabase as any).rpc.mock.calls[0][1].p_input;
      expect(rpcInput.photo_url).toBeNull();
    });

    it('does not attempt upload for https URLs', async () => {
      mockFromChain(null);
      await seedPendingReport({ photoUrl: 'https://example.com/photo.jpg' });

      await syncPendingReports();

      expect(ensurePublicPhotoUrl).not.toHaveBeenCalled();
    });
  });

  // ─── Sync diagnostics (commit 16c6b6d) ────────────────────
  describe('sync diagnostics', () => {
    it('writes sync diagnostics to anonymous_users.sync_debug', async () => {
      await seedPendingReport();
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'anonymous_users') {
          return { update: updateMock };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await syncPendingReports();

      expect(updateMock).toHaveBeenCalled();
      const firstCallArg = updateMock.mock.calls[0][0];
      expect(firstCallArg).toHaveProperty('sync_debug');
    });
  });

  // ─── Error handling ────────────────────────────────────────
  describe('error handling', () => {
    it('handles Supabase RPC returning null data', async () => {
      mockFromChain(null);
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Internal error' },
      });
      await seedPendingReport();

      const result = await syncPendingReports();

      expect(result.failed).toBe(1);
      expect(result.synced).toBe(0);
    });

    it('handles AsyncStorage returning invalid JSON for pending queue', async () => {
      await AsyncStorage.setItem('@pending_sync_reports', 'bad json');

      const result = await syncPendingReports();
      expect(result).toEqual({ synced: 0, failed: 0 });
    });

    it('handles missing report from @harvest_reports (orphaned queue entry)', async () => {
      // Queue references a report ID that doesn't exist in local reports
      await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['orphan-id']));
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([]));

      const result = await syncPendingReports();

      // Should clean up the orphan without failing
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);

      const pending = JSON.parse((await AsyncStorage.getItem('@pending_sync_reports'))!);
      expect(pending).toHaveLength(0);
    });

    it('continues syncing remaining reports after one fails', async () => {
      const report1 = makeStoredReport({ id: 'local_1_abc' });
      const report2 = makeStoredReport({ id: 'local_2_abc' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report1, report2]));
      await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify([report1.id, report2.id]));

      // First RPC call fails, second succeeds
      (mockSupabase as any).rpc = jest.fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'Timeout' } })
        .mockResolvedValueOnce({
          data: {
            report_id: 'sb-2',
            dmf_status: 'pending',
            anonymous_user_id: 'anon-123',
            created_at: '2026-01-15T00:00:00.000Z',
          },
          error: null,
        });

      const result = await syncPendingReports();

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('removes synced report from pending queue', async () => {
      mockFromChain(null);
      await seedPendingReport();

      await syncPendingReports();

      const pending = JSON.parse((await AsyncStorage.getItem('@pending_sync_reports'))!);
      expect(pending).toHaveLength(0);
    });

    it('updates local report ID to Supabase ID after sync', async () => {
      mockFromChain(null);
      await seedPendingReport();

      await syncPendingReports();

      const reports = JSON.parse((await AsyncStorage.getItem('@harvest_reports'))!);
      expect(reports[0].id).toBe('sb-synced-1');
    });
  });
});
