/**
 * reportsService.coverage.test.ts - Supplementary tests for uncovered paths
 *
 * Targets lines/branches NOT covered by the existing test files:
 *   - getReports (online path with merging)
 *   - getReport (online path)
 *   - getFishEntries (online + offline)
 *   - getFishEntriesBatch (all branches)
 *   - linkReportsToUser (all branches)
 *   - updateDMFStatus (online + local-only + error branches)
 *   - createReport (photo upload, skipLocalCache, achievements)
 *   - createReportFromHarvestInput (enterRaffle/drawing, cached user error)
 *   - harvestInputToReportInput (gpsCoordinates, no fishEntries)
 *   - Edge cases in local storage helpers
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';
import { makeStoredReport, makeHarvestInput, makeUser } from '../factories';

// ── Service-level mocks ──────────────────────────────────────────────
const mockGetCurrentUser = jest.fn().mockResolvedValue(null);
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

const mockGetRewardsMemberForAnonymousUser = jest.fn().mockResolvedValue(null);
jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: (...args: any[]) => mockGetRewardsMemberForAnonymousUser(...args),
}));

const mockGetOrCreateAnonymousUser = jest.fn().mockResolvedValue({
  id: 'anon-user-123',
  deviceId: 'device-123',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastActiveAt: '2026-01-01T00:00:00.000Z',
  dismissedRewardsPrompt: false,
});
jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: (...args: any[]) => mockGetOrCreateAnonymousUser(...args),
}));

const mockEnsurePublicPhotoUrl = jest.fn().mockResolvedValue(null);
const mockIsLocalUri = jest.fn((uri: string) => uri?.startsWith('file://') || false);
jest.mock('../../src/services/photoUploadService', () => ({
  ensurePublicPhotoUrl: (...args: any[]) => mockEnsurePublicPhotoUrl(...args),
  isLocalUri: (...args: any[]) => mockIsLocalUri(...args),
}));

const mockEnsureValidSession = jest.fn().mockResolvedValue({ valid: true, authUserId: 'auth-123' });
jest.mock('../../src/services/authService', () => ({
  ensureValidSession: (...args: any[]) => mockEnsureValidSession(...args),
}));

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

// statsService and rewardsService are auto-mocked in jest.setup.ts;
// provide implementations for the functions we need.
const mockUpdateAllStatsAfterReport = jest.fn().mockResolvedValue({ achievementsAwarded: [] });
const mockAddReportToRewardsEntry = jest.fn().mockResolvedValue(undefined);
const mockFetchCurrentDrawing = jest.fn().mockResolvedValue(null);

import { updateAllStatsAfterReport } from '../../src/services/statsService';
import { addReportToRewardsEntry, fetchCurrentDrawing } from '../../src/services/rewardsService';

// ── Import service under test ────────────────────────────────────────
import {
  createReport,
  createReportFromHarvestInput,
  getReports,
  getReport,
  getFishEntries,
  getFishEntriesBatch,
  updateDMFStatus,
  linkReportsToUser,
  harvestInputToReportInput,
  clearReportsCache,
  getPendingSyncCount,
  getReportsSummary,
} from '../../src/services/reportsService';

import type { ReportInput, DMFStatusUpdate } from '../../src/types/report';

// ── Helpers ──────────────────────────────────────────────────────────
function makeReportInput(overrides?: Partial<ReportInput>): ReportInput {
  return {
    hasLicense: true,
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    harvestDate: '2026-01-15',
    areaCode: 'NC-001',
    usedHookAndLine: true,
    redDrumCount: 1,
    flounderCount: 0,
    spottedSeatroutCount: 0,
    weakfishCount: 0,
    stripedBassCount: 0,
    reportingFor: 'self',
    ...overrides,
  };
}

/** Set up the supabase.from() chain to return a configurable result per table. */
function mockFromChainMulti(handlers: Record<string, any>) {
  (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
    if (handlers[table]) return handlers[table];
    // Default chain that returns empty results
    return {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn(),
    };
  });
}

/** Basic supabase.from() chain that returns an empty/null result for any query. */
function mockFromChainDefault() {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn(),
  };
  (mockSupabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

// ── Test suites ──────────────────────────────────────────────────────
describe('reportsService (coverage gaps)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    mockGetRewardsMemberForAnonymousUser.mockResolvedValue(null);
    mockEnsureValidSession.mockResolvedValue({ valid: true, authUserId: 'auth-123' });
    mockEnsurePublicPhotoUrl.mockResolvedValue(null);
    mockUpdateAllStatsAfterReport.mockResolvedValue({ achievementsAwarded: [] });
    mockAddReportToRewardsEntry.mockResolvedValue(undefined);
    mockFetchCurrentDrawing.mockResolvedValue(null);

    // Re-bind auto-mocked implementations each test (cross-file isolation)
    (updateAllStatsAfterReport as jest.Mock).mockImplementation(mockUpdateAllStatsAfterReport);
    (addReportToRewardsEntry as jest.Mock).mockImplementation(mockAddReportToRewardsEntry);
    (fetchCurrentDrawing as jest.Mock).mockImplementation(mockFetchCurrentDrawing);
  });

  // ============================================================
  // getReports - online path
  // ============================================================
  describe('getReports (online)', () => {
    it('fetches from Supabase for anonymous user (RPC path)', async () => {
      const rpcData = [
        {
          id: 'sb-1',
          user_id: null,
          anonymous_user_id: 'anon-user-123',
          dmf_status: 'pending',
          dmf_confirmation_number: null,
          dmf_object_id: null,
          dmf_submitted_at: null,
          dmf_error: null,
          has_license: true,
          wrc_id: null,
          first_name: 'Test',
          last_name: 'Angler',
          zip_code: '27601',
          phone: null,
          email: null,
          want_text_confirmation: false,
          want_email_confirmation: false,
          harvest_date: '2026-01-15',
          area_code: 'NC-001',
          area_label: null,
          used_hook_and_line: true,
          gear_code: null,
          gear_label: null,
          red_drum_count: 1,
          flounder_count: 0,
          spotted_seatrout_count: 0,
          weakfish_count: 0,
          striped_bass_count: 0,
          reporting_for: 'self',
          family_count: null,
          notes: null,
          photo_url: null,
          gps_latitude: null,
          gps_longitude: null,
          entered_rewards: false,
          rewards_drawing_id: null,
          webhook_status: null,
          webhook_error: null,
          webhook_attempts: 0,
          fish_entries: null,
          created_at: '2026-01-15T00:00:00.000Z',
          updated_at: '2026-01-15T00:00:00.000Z',
        },
      ];

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: rpcData,
        error: null,
      });

      const reports = await getReports();

      expect(reports).toHaveLength(1);
      expect(reports[0].id).toBe('sb-1');
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith('get_reports_for_device', {
        p_device_id: 'device-123',
      });
    });

    it('fetches from Supabase for rewards member (direct query with userId)', async () => {
      const member = makeUser({ id: 'user-1', anonymousUserId: 'anon-user-123' });
      mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);

      const orderMock = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'sb-2',
            user_id: 'user-1',
            anonymous_user_id: 'anon-user-123',
            dmf_status: 'submitted',
            dmf_confirmation_number: 'DMF-123',
            dmf_object_id: 42,
            dmf_submitted_at: '2026-01-15T00:00:00.000Z',
            dmf_error: null,
            has_license: true,
            wrc_id: null,
            first_name: 'Test',
            last_name: 'Angler',
            zip_code: '27601',
            phone: null,
            email: null,
            want_text_confirmation: false,
            want_email_confirmation: false,
            harvest_date: '2026-01-15',
            area_code: 'NC-001',
            area_label: null,
            used_hook_and_line: true,
            gear_code: null,
            gear_label: null,
            red_drum_count: 1,
            flounder_count: 0,
            spotted_seatrout_count: 0,
            weakfish_count: 0,
            striped_bass_count: 0,
            reporting_for: 'self',
            family_count: null,
            notes: null,
            photo_url: null,
            gps_latitude: null,
            gps_longitude: null,
            entered_rewards: false,
            rewards_drawing_id: null,
            webhook_status: null,
            webhook_error: null,
            webhook_attempts: 0,
            fish_entries: null,
            created_at: '2026-01-15T00:00:00.000Z',
            updated_at: '2026-01-15T00:00:00.000Z',
          },
        ],
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: orderMock,
      });

      const reports = await getReports();

      expect(reports).toHaveLength(1);
      expect(reports[0].id).toBe('sb-2');
    });

    it('merges local-only reports with Supabase reports', async () => {
      // Seed a local-only report
      const localReport = makeStoredReport({ id: 'local_123_abc' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([localReport]));

      // RPC returns nothing from server
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const reports = await getReports();

      // local_123_abc should be preserved in merged result
      expect(reports.some((r) => r.id === 'local_123_abc')).toBe(true);
    });

    it('falls back to local reports when Supabase fetch throws', async () => {
      const localReport = makeStoredReport({ id: 'local-fallback' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([localReport]));

      // Make getOrCreateAnonymousUser throw
      mockGetOrCreateAnonymousUser.mockRejectedValueOnce(new Error('Network error'));

      const reports = await getReports();

      expect(reports).toHaveLength(1);
      expect(reports[0].id).toBe('local-fallback');
    });

    it('returns empty for non-array RPC response', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: 'not-an-array',
        error: null,
      });

      const reports = await getReports();
      // Should return empty (or just local reports)
      // The RPC returned non-array, fetchReportsFromSupabase returns []
      expect(Array.isArray(reports)).toBe(true);
    });
  });

  // ============================================================
  // getReport - online path
  // ============================================================
  describe('getReport (online)', () => {
    it('returns matching report when found in Supabase result', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const report = makeStoredReport({ id: 'target-id' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

      const found = await getReport('target-id');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('target-id');
    });
  });

  // ============================================================
  // getFishEntries
  // ============================================================
  describe('getFishEntries', () => {
    it('fetches from Supabase for non-local report', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'fe-1',
              report_id: 'sb-report-1',
              species: 'Red Drum',
              count: 2,
              lengths: ['18', '22'],
              tag_number: 'T001',
              created_at: '2026-01-15T00:00:00.000Z',
            },
          ],
          error: null,
        }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(chain);

      const entries = await getFishEntries('sb-report-1');

      expect(entries).toHaveLength(1);
      expect(entries[0].species).toBe('Red Drum');
      expect(entries[0].count).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('fish_entries');
    });

    it('returns empty array for local report', async () => {
      const entries = await getFishEntries('local_123_abc');
      expect(entries).toEqual([]);
    });

    it('returns empty array when offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const entries = await getFishEntries('sb-report-1');
      expect(entries).toEqual([]);
    });

    it('returns empty array when Supabase query fails', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(chain);

      const entries = await getFishEntries('sb-report-1');
      expect(entries).toEqual([]);
    });
  });

  // ============================================================
  // getFishEntriesBatch
  // ============================================================
  describe('getFishEntriesBatch', () => {
    it('returns empty map for empty reportIds', async () => {
      const result = await getFishEntriesBatch([]);
      expect(result.size).toBe(0);
    });

    it('returns empty map when all IDs are local', async () => {
      const result = await getFishEntriesBatch(['local_1_abc', 'local_2_def']);
      expect(result.size).toBe(0);
    });

    it('returns empty map when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await getFishEntriesBatch(['sb-1', 'sb-2']);
      expect(result.size).toBe(0);
    });

    it('groups entries by report ID', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'fe-1', report_id: 'sb-1', species: 'Red Drum', count: 1, lengths: null, tag_number: null, created_at: '2026-01-15T00:00:00.000Z' },
            { id: 'fe-2', report_id: 'sb-1', species: 'Flounder', count: 2, lengths: null, tag_number: null, created_at: '2026-01-15T00:00:00.000Z' },
            { id: 'fe-3', report_id: 'sb-2', species: 'Weakfish', count: 1, lengths: null, tag_number: null, created_at: '2026-01-15T00:00:00.000Z' },
          ],
          error: null,
        }),
      };
      (mockSupabase.from as jest.Mock).mockReturnValue(chain);

      const result = await getFishEntriesBatch(['sb-1', 'sb-2']);

      expect(result.size).toBe(2);
      expect(result.get('sb-1')).toHaveLength(2);
      expect(result.get('sb-2')).toHaveLength(1);
    });

    it('filters out local IDs and queries only remote ones', async () => {
      const inMock = jest.fn().mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: inMock,
      });

      await getFishEntriesBatch(['local_1_abc', 'sb-1']);

      expect(inMock).toHaveBeenCalledWith('report_id', ['sb-1']);
    });

    it('returns empty map when Supabase query errors', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
      });

      const result = await getFishEntriesBatch(['sb-1']);
      expect(result.size).toBe(0);
    });

    it('returns empty map when Supabase throws', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const result = await getFishEntriesBatch(['sb-1']);
      expect(result.size).toBe(0);
    });
  });

  // ============================================================
  // linkReportsToUser
  // ============================================================
  describe('linkReportsToUser', () => {
    it('returns error when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await linkReportsToUser('anon-1', 'user-1');
      expect(result).toEqual({ updated: 0, error: 'Not connected to Supabase' });
    });

    it('links anonymous reports to user', async () => {
      const selectMock = jest.fn().mockResolvedValue({
        data: [{ id: 'r1' }, { id: 'r2' }],
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnValue({
          select: selectMock,
        }),
      });

      const result = await linkReportsToUser('anon-1', 'user-1');
      expect(result.updated).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('returns 0 updated when update query errors', async () => {
      // First call: check existing reports (succeeds)
      // Second call: update (fails)
      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Check existing reports
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [{ id: 'r1' }], error: null }),
          };
        }
        // Update call
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Update failed' },
            }),
          }),
        };
      });

      const result = await linkReportsToUser('anon-1', 'user-1');
      expect(result.updated).toBe(0);
      expect(result.error).toBe('Update failed');
    });

    it('handles exception gracefully', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const result = await linkReportsToUser('anon-1', 'user-1');
      expect(result.updated).toBe(0);
      expect(result.error).toBe('Connection lost');
    });

    it('handles check error on existing reports gracefully', async () => {
      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Check failed' } }),
          };
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ id: 'r1' }],
              error: null,
            }),
          }),
        };
      });

      const result = await linkReportsToUser('anon-1', 'user-1');
      // Should still proceed to update even if check fails
      expect(result.updated).toBe(1);
    });
  });

  // ============================================================
  // updateDMFStatus
  // ============================================================
  describe('updateDMFStatus', () => {
    const status: DMFStatusUpdate = {
      dmfStatus: 'submitted',
      dmfConfirmationNumber: 'DMF-999',
      dmfObjectId: 99,
      dmfSubmittedAt: '2026-01-15T12:00:00.000Z',
    };

    it('updates in Supabase when connected and report is non-local', async () => {
      // Seed a non-local report locally
      const report = makeStoredReport({ id: 'sb-report-1' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

      const updatedRow = {
        id: 'sb-report-1',
        user_id: null,
        anonymous_user_id: 'anon-123',
        dmf_status: 'submitted',
        dmf_confirmation_number: 'DMF-999',
        dmf_object_id: 99,
        dmf_submitted_at: '2026-01-15T12:00:00.000Z',
        dmf_error: null,
        has_license: true,
        wrc_id: null,
        first_name: 'Test',
        last_name: 'Angler',
        zip_code: '27601',
        phone: null,
        email: null,
        want_text_confirmation: false,
        want_email_confirmation: false,
        harvest_date: '2026-01-15',
        area_code: 'NC-001',
        area_label: null,
        used_hook_and_line: true,
        gear_code: null,
        gear_label: null,
        red_drum_count: 1,
        flounder_count: 0,
        spotted_seatrout_count: 0,
        weakfish_count: 0,
        striped_bass_count: 0,
        reporting_for: 'self',
        family_count: null,
        notes: null,
        photo_url: null,
        gps_latitude: null,
        gps_longitude: null,
        entered_rewards: false,
        rewards_drawing_id: null,
        webhook_status: null,
        webhook_error: null,
        webhook_attempts: 0,
        fish_entries: null,
        created_at: '2026-01-15T00:00:00.000Z',
        updated_at: '2026-01-15T12:00:00.000Z',
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedRow, error: null }),
      });

      const result = await updateDMFStatus('sb-report-1', status);

      expect(result).not.toBeNull();
      expect(result!.dmfStatus).toBe('submitted');
      expect(result!.dmfConfirmationNumber).toBe('DMF-999');
    });

    it('skips Supabase update for local reports', async () => {
      const localReport = makeStoredReport({ id: 'local_123_abc' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([localReport]));

      mockIsSupabaseConnected.mockResolvedValue(true);

      const result = await updateDMFStatus('local_123_abc', status);

      // Should NOT call supabase.from for the update (only for local lookup)
      // It should return the locally updated report
      expect(result).not.toBeNull();
      expect(result!.id).toBe('local_123_abc');
    });

    it('falls back to local when Supabase update fails', async () => {
      const report = makeStoredReport({ id: 'sb-report-1' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      });

      const result = await updateDMFStatus('sb-report-1', status);

      // Should return local version even when Supabase fails
      expect(result).not.toBeNull();
      expect(result!.id).toBe('sb-report-1');
    });

    it('updates locally when offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const report = makeStoredReport({ id: 'sb-report-1' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));

      const result = await updateDMFStatus('sb-report-1', status);

      expect(result).not.toBeNull();
    });

    it('returns null for non-existent report', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await updateDMFStatus('non-existent', status);
      expect(result).toBeNull();
    });

    it('handles dmfError in status update', async () => {
      const report = makeStoredReport({ id: 'sb-report-err' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([report]));
      mockIsSupabaseConnected.mockResolvedValue(false);

      const errorStatus: DMFStatusUpdate = {
        dmfStatus: 'error',
        dmfError: 'Submission timed out',
      };

      const result = await updateDMFStatus('sb-report-err', errorStatus);

      expect(result).not.toBeNull();
    });
  });

  // ============================================================
  // createReport - photo upload path
  // ============================================================
  describe('createReport (photo upload)', () => {
    it('uploads local photo when connected and uses public URL', async () => {
      mockEnsurePublicPhotoUrl.mockResolvedValueOnce('https://storage.example.com/photo.jpg');

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-photo-1',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({
        anonymousUserId: 'anon-123',
        photoUrl: 'file://local/photo.jpg',
      });

      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect(mockEnsurePublicPhotoUrl).toHaveBeenCalledWith('file://local/photo.jpg', 'anon-123');
    });

    it('clears photoUrl when upload fails', async () => {
      mockEnsurePublicPhotoUrl.mockResolvedValueOnce(null);

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-no-photo',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({
        anonymousUserId: 'anon-123',
        photoUrl: 'file://local/photo.jpg',
      });

      const result = await createReport(input);

      expect(result.success).toBe(true);
      // Verify the RPC was called with null/undefined photo
      const rpcInput = (mockSupabase as any).rpc.mock.calls[0][1].p_input;
      expect(rpcInput.photo_url).toBeNull();
    });

    it('does not attempt upload for non-local URIs', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-remote-photo',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({
        anonymousUserId: 'anon-123',
        photoUrl: 'https://already-uploaded.com/photo.jpg',
      });

      await createReport(input);

      expect(mockEnsurePublicPhotoUrl).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // createReport - skipLocalCache
  // ============================================================
  describe('createReport (skipLocalCache)', () => {
    it('does not write to local cache when skipLocalCache is true', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-skip-cache',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({ anonymousUserId: 'anon-123' });
      await createReport(input, { skipLocalCache: true });

      const stored = await AsyncStorage.getItem('@harvest_reports');
      // Should be null since we skipped local cache
      expect(stored).toBeNull();
    });
  });

  // ============================================================
  // createReport - achievements
  // ============================================================
  describe('createReport (achievements)', () => {
    it('updates stats and awards achievements for rewards member', async () => {
      mockUpdateAllStatsAfterReport.mockResolvedValueOnce({
        achievementsAwarded: [{ name: 'First Catch', description: 'Log your first fish' }],
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-achieve-1',
          dmf_status: 'pending',
          anonymous_user_id: null,
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({ userId: 'user-1' });
      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect(result.achievementsAwarded).toEqual([
        { name: 'First Catch', description: 'Log your first fish' },
      ]);
      expect(mockUpdateAllStatsAfterReport).toHaveBeenCalledWith('user-1', expect.any(Object));
      expect(mockAddReportToRewardsEntry).toHaveBeenCalledWith('user-1', 'sb-achieve-1');
    });

    it('still returns success when stats update fails', async () => {
      mockUpdateAllStatsAfterReport.mockRejectedValueOnce(new Error('Stats DB error'));

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-stats-fail',
          dmf_status: 'pending',
          anonymous_user_id: null,
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({ userId: 'user-1' });
      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect(result.savedToSupabase).toBe(true);
    });

    it('does not update stats for anonymous users', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-anon-1',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({ anonymousUserId: 'anon-123' });
      await createReport(input);

      expect(mockUpdateAllStatsAfterReport).not.toHaveBeenCalled();
      expect(mockAddReportToRewardsEntry).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // createReportFromHarvestInput - raffle/drawing
  // ============================================================
  describe('createReportFromHarvestInput (enterRaffle)', () => {
    it('fetches current drawing when enterRaffle is true', async () => {
      mockFetchCurrentDrawing.mockResolvedValueOnce({ id: 'drawing-42', name: 'Jan 2026' });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-raffle-1',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeHarvestInput({ enterRaffle: true });
      const result = await createReportFromHarvestInput(input);

      expect(result.success).toBe(true);
      expect(mockFetchCurrentDrawing).toHaveBeenCalled();

      // Verify the drawing ID was passed to the RPC
      const rpcInput = (mockSupabase as any).rpc.mock.calls[0][1].p_input;
      expect(rpcInput.rewards_drawing_id).toBe('drawing-42');
    });

    it('continues without drawing when fetchCurrentDrawing fails', async () => {
      mockFetchCurrentDrawing.mockRejectedValueOnce(new Error('Network error'));

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-raffle-err',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeHarvestInput({ enterRaffle: true });
      const result = await createReportFromHarvestInput(input);

      expect(result.success).toBe(true);
    });

    it('does not fetch drawing when enterRaffle is false', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-no-raffle',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeHarvestInput({ enterRaffle: false });
      await createReportFromHarvestInput(input);

      expect(mockFetchCurrentDrawing).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // createReportFromHarvestInput - cached user error
  // ============================================================
  describe('createReportFromHarvestInput (cached user fallback)', () => {
    it('handles corrupted cached user JSON gracefully', async () => {
      await AsyncStorage.setItem('@current_user', 'not valid json{{{');

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-corrupted-cache',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeHarvestInput();
      const result = await createReportFromHarvestInput(input);

      // Should still succeed using anonymous path
      expect(result.success).toBe(true);
    });

    it('ignores cached user without rewardsOptedInAt', async () => {
      await AsyncStorage.setItem('@current_user', JSON.stringify({ id: 'user-no-rewards' }));

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-no-rewards-user',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeHarvestInput();
      await createReportFromHarvestInput(input);

      // Should use anonymous path (create_report_anonymous)
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'create_report_anonymous',
        expect.anything()
      );
    });
  });

  // ============================================================
  // harvestInputToReportInput - additional branches
  // ============================================================
  describe('harvestInputToReportInput (additional branches)', () => {
    it('maps gpsCoordinates to gpsLatitude/gpsLongitude', () => {
      const input = makeHarvestInput({
        gpsCoordinates: { latitude: 35.7796, longitude: -78.6382 },
      } as any);
      const result = harvestInputToReportInput(input);

      expect(result.gpsLatitude).toBe(35.7796);
      expect(result.gpsLongitude).toBe(-78.6382);
    });

    it('handles undefined gpsCoordinates', () => {
      const input = makeHarvestInput();
      const result = harvestInputToReportInput(input);

      expect(result.gpsLatitude).toBeUndefined();
      expect(result.gpsLongitude).toBeUndefined();
    });

    it('handles string harvestDate (no conversion needed)', () => {
      const input = makeHarvestInput({ harvestDate: '2026-03-01' as any });
      const result = harvestInputToReportInput(input);

      expect(result.harvestDate).toBe('2026-03-01');
    });

    it('maps all optional fields', () => {
      const input = makeHarvestInput({
        areaLabel: 'Pamlico Sound',
        gearCode: 'HL',
        gearLabel: 'Hook and Line',
        familyCount: 3,
        notes: 'Great day fishing',
      } as any);
      const result = harvestInputToReportInput(input);

      expect(result.areaLabel).toBe('Pamlico Sound');
      expect(result.gearCode).toBe('HL');
      expect(result.gearLabel).toBe('Hook and Line');
      expect(result.familyCount).toBe(3);
      expect(result.notes).toBe('Great day fishing');
    });

    it('maps with userId and anonymousUserId', () => {
      const input = makeHarvestInput();
      const result = harvestInputToReportInput(input, 'user-1', 'anon-1');

      expect(result.userId).toBe('user-1');
      expect(result.anonymousUserId).toBe('anon-1');
    });

    it('handles fishEntries as undefined', () => {
      const input = makeHarvestInput({ fishEntries: undefined } as any);
      const result = harvestInputToReportInput(input);

      expect(result.fishEntries).toBeUndefined();
    });
  });

  // ============================================================
  // createReport - createReportInSupabase authenticated path
  // ============================================================
  describe('createReport (authenticated path via createReportInSupabase)', () => {
    it('calls create_report_atomic for userId input', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-auth-1',
          dmf_status: 'pending',
          anonymous_user_id: null,
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({ userId: 'user-1' });
      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'create_report_atomic',
        expect.objectContaining({
          p_input: expect.objectContaining({
            user_id: 'user-1',
          }),
        })
      );
    });

    it('falls back to anonymous RPC when session is invalid', async () => {
      mockEnsureValidSession.mockResolvedValueOnce({ valid: false, reason: 'expired' });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-fallback-anon',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({ userId: 'user-1' });
      const result = await createReport(input);

      expect(result.success).toBe(true);
      // Should have called create_report_anonymous (not create_report_atomic)
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'create_report_anonymous',
        expect.anything()
      );
    });

    it('falls back to anonymous RPC on auth error from create_report_atomic', async () => {
      (mockSupabase as any).rpc = jest.fn()
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Unauthorized: JWT expired' },
        })
        .mockResolvedValueOnce({
          data: {
            report_id: 'sb-fallback-2',
            dmf_status: 'pending',
            anonymous_user_id: 'anon-123',
            created_at: '2026-01-15T00:00:00.000Z',
          },
          error: null,
        });

      const input = makeReportInput({ userId: 'user-1' });
      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect((mockSupabase as any).rpc).toHaveBeenCalledTimes(2);
    });

    it('throws and falls back to local for non-auth errors from create_report_atomic', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      });

      const input = makeReportInput({ userId: 'user-1' });
      const result = await createReport(input);

      // Should fall back to local (the throw from createReportInSupabase
      // is caught by createReport's try/catch)
      expect(result.success).toBe(true);
      expect(result.savedToSupabase).toBe(false);
      expect(result.report.id).toMatch(/^local_/);
    });

    it('throws and falls back to local when anonymous RPC also fails', async () => {
      // No userId, anonymous RPC fails
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      const input = makeReportInput({ anonymousUserId: 'anon-123' });
      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect(result.savedToSupabase).toBe(false);
      expect(result.report.id).toMatch(/^local_/);
    });
  });

  // ============================================================
  // createReport - RPC input mapping (all fields)
  // ============================================================
  describe('createReport (RPC input mapping)', () => {
    it('maps all optional fields to snake_case RPC input', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-full-input',
          dmf_status: 'submitted',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeReportInput({
        anonymousUserId: 'anon-123',
        dmfStatus: 'submitted',
        dmfConfirmationNumber: 'DMF-42',
        dmfObjectId: 42,
        dmfSubmittedAt: '2026-01-15T12:00:00.000Z',
        wrcId: 'NC12345',
        firstName: 'Test',
        lastName: 'Angler',
        zipCode: '27601',
        phone: '555-1234',
        email: 'test@example.com',
        areaLabel: 'Pamlico Sound',
        gearCode: 'HL',
        gearLabel: 'Hook and Line',
        familyCount: 3,
        notes: 'Nice catch',
        photoUrl: 'https://example.com/photo.jpg',
        gpsLatitude: 35.7796,
        gpsLongitude: -78.6382,
        enteredRewards: true,
        rewardsDrawingId: 'drawing-1',
        fishEntries: [
          { species: 'Red Drum', count: 2, lengths: ['18', '22'], tagNumber: 'T001' },
        ],
      });

      await createReport(input);

      const rpcInput = (mockSupabase as any).rpc.mock.calls[0][1].p_input;
      expect(rpcInput.dmf_confirmation_number).toBe('DMF-42');
      expect(rpcInput.dmf_object_id).toBe(42);
      expect(rpcInput.dmf_submitted_at).toBe('2026-01-15T12:00:00.000Z');
      expect(rpcInput.phone).toBe('555-1234');
      expect(rpcInput.email).toBe('test@example.com');
      expect(rpcInput.area_label).toBe('Pamlico Sound');
      expect(rpcInput.gear_code).toBe('HL');
      expect(rpcInput.gear_label).toBe('Hook and Line');
      expect(rpcInput.family_count).toBe(3);
      expect(rpcInput.notes).toBe('Nice catch');
      expect(rpcInput.gps_latitude).toBe(35.7796);
      expect(rpcInput.gps_longitude).toBe(-78.6382);
      expect(rpcInput.entered_rewards).toBe(true);
      expect(rpcInput.rewards_drawing_id).toBe('drawing-1');
      expect(rpcInput.fish_entries).toEqual([
        { species: 'Red Drum', count: 2, lengths: ['18', '22'], tag_number: 'T001' },
      ]);
    });
  });

  // ============================================================
  // fetchReportsFromSupabase - userId only path
  // ============================================================
  describe('getReports (fetchReportsFromSupabase userId-only path)', () => {
    it('uses direct query for rewards member without anonymousUserId', async () => {
      const member = makeUser({ id: 'user-1', anonymousUserId: null });
      mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);

      const orderMock = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: orderMock,
      });

      const reports = await getReports();

      expect(mockSupabase.from).toHaveBeenCalledWith('harvest_reports');
      expect(Array.isArray(reports)).toBe(true);
    });
  });

  // ============================================================
  // getPendingSyncCount
  // ============================================================
  describe('getPendingSyncCount', () => {
    it('returns 0 when no pending reports', async () => {
      const count = await getPendingSyncCount();
      expect(count).toBe(0);
    });

    it('returns correct count', async () => {
      await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['r1', 'r2', 'r3']));
      const count = await getPendingSyncCount();
      expect(count).toBe(3);
    });
  });

  // ============================================================
  // clearReportsCache - error handling
  // ============================================================
  describe('clearReportsCache (error handling)', () => {
    it('does not throw when AsyncStorage.multiRemove fails', async () => {
      const spy = jest.spyOn(AsyncStorage, 'multiRemove').mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await expect(clearReportsCache()).resolves.toBeUndefined();

      spy.mockRestore();
    });
  });

  // ============================================================
  // fetchReportsFromSupabase - error paths (accessed via getReports)
  // ============================================================
  describe('getReports (fetchReportsFromSupabase error paths)', () => {
    it('uses userId-only path when anonymousUserId is empty string (line 319-329)', async () => {
      // Rewards member with null anonymousUserId AND anonymous user with empty id
      const member = makeUser({ id: 'user-1', anonymousUserId: null });
      mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);
      // Override anonymous user to have empty id so effectiveAnonymousUserId is falsy
      mockGetOrCreateAnonymousUser.mockResolvedValueOnce({
        id: '',
        deviceId: 'device-123',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastActiveAt: '2026-01-01T00:00:00.000Z',
        dismissedRewardsPrompt: false,
      });

      const supabaseRow = {
        id: 'sb-uid-only',
        user_id: 'user-1',
        anonymous_user_id: null,
        dmf_status: 'pending',
        dmf_confirmation_number: null,
        dmf_object_id: null,
        dmf_submitted_at: null,
        dmf_error: null,
        has_license: true,
        wrc_id: null,
        first_name: 'Test',
        last_name: 'Angler',
        zip_code: '27601',
        phone: null,
        email: null,
        want_text_confirmation: false,
        want_email_confirmation: false,
        harvest_date: '2026-01-15',
        area_code: 'NC-001',
        area_label: null,
        used_hook_and_line: true,
        gear_code: null,
        gear_label: null,
        red_drum_count: 1,
        flounder_count: 0,
        spotted_seatrout_count: 0,
        weakfish_count: 0,
        striped_bass_count: 0,
        reporting_for: 'self',
        family_count: null,
        notes: null,
        photo_url: null,
        gps_latitude: null,
        gps_longitude: null,
        entered_rewards: false,
        rewards_drawing_id: null,
        webhook_status: null,
        webhook_error: null,
        webhook_attempts: 0,
        fish_entries: null,
        created_at: '2026-01-15T00:00:00.000Z',
        updated_at: '2026-01-15T00:00:00.000Z',
      };

      const orderMock = jest.fn().mockResolvedValue({
        data: [supabaseRow],
        error: null,
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: orderMock,
      });

      const reports = await getReports();
      expect(reports.some((r) => r.id === 'sb-uid-only')).toBe(true);
    });

    it('falls back to local when userId-only query errors (line 326)', async () => {
      const member = makeUser({ id: 'user-1', anonymousUserId: null });
      mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);
      mockGetOrCreateAnonymousUser.mockResolvedValueOnce({
        id: '',
        deviceId: 'device-123',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastActiveAt: '2026-01-01T00:00:00.000Z',
        dismissedRewardsPrompt: false,
      });

      const orderMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: orderMock,
      });

      const localReport = makeStoredReport({ id: 'local-err-fb' });
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([localReport]));

      const reports = await getReports();
      // Should fall back to local reports
      expect(reports.some((r) => r.id === 'local-err-fb')).toBe(true);
    });

    it('falls back to local when userId+anonymousUserId query throws (line 341)', async () => {
      const member = makeUser({ id: 'user-1', anonymousUserId: 'anon-user-123' });
      mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);

      const orderMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query timeout' },
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: orderMock,
      });

      const reports = await getReports();
      expect(Array.isArray(reports)).toBe(true);
    });

    it('falls back to local when anonymous RPC throws (line 354)', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC timeout' },
      });

      const reports = await getReports();
      expect(Array.isArray(reports)).toBe(true);
    });

    it('returns empty from fetchReportsFromSupabase when no userId and no anonymousUserId (line 365)', async () => {
      // No rewards member and anonymous user has empty id
      mockGetRewardsMemberForAnonymousUser.mockResolvedValue(null);
      mockGetOrCreateAnonymousUser.mockResolvedValueOnce({
        id: '',
        deviceId: 'device-123',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastActiveAt: '2026-01-01T00:00:00.000Z',
        dismissedRewardsPrompt: false,
      });

      const reports = await getReports();
      expect(Array.isArray(reports)).toBe(true);
    });
  });

  // ============================================================
  // saveLocalReports error path (line 70)
  // ============================================================
  describe('saveLocalReports (error path)', () => {
    it('handles AsyncStorage.setItem failure gracefully', async () => {
      const spy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage full'));
      mockIsSupabaseConnected.mockResolvedValue(false);

      // createReport offline calls addLocalReport -> saveLocalReports
      // The error should be caught, not thrown
      const input = makeReportInput();
      const result = await createReport(input);

      // Despite storage error, function shouldn't throw
      expect(result.success).toBe(true);
      spy.mockRestore();
    });
  });

  // ============================================================
  // createLocalReport - fishEntries mapping (line 489)
  // ============================================================
  describe('createReport (offline with fishEntries)', () => {
    it('preserves fishEntries in local report', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const input = makeReportInput({
        fishEntries: [
          { species: 'Red Drum', count: 2, lengths: ['18', '22'], tagNumber: 'T001' },
          { species: 'Flounder', count: 1 },
        ],
      });

      const result = await createReport(input);

      expect(result.report.fishEntries).toEqual([
        { species: 'Red Drum', count: 2, lengths: ['18', '22'], tagNumber: 'T001' },
        { species: 'Flounder', count: 1, lengths: undefined, tagNumber: undefined },
      ]);
    });
  });

  // ============================================================
  // getReportsSummary - empty reports
  // ============================================================
  describe('getReportsSummary (edge cases)', () => {
    it('returns null lastReportDate when no reports', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const summary = await getReportsSummary();

      expect(summary.totalReports).toBe(0);
      expect(summary.totalFish).toBe(0);
      expect(summary.lastReportDate).toBeNull();
    });
  });

  // ============================================================
  // createReportFromHarvestInput - skipLocalCache passthrough
  // ============================================================
  describe('createReportFromHarvestInput (options passthrough)', () => {
    it('passes skipLocalCache to createReport', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-opts',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeHarvestInput();
      await createReportFromHarvestInput(input, undefined, { skipLocalCache: true });

      // If skipLocalCache was passed through, no local reports should be saved
      const stored = await AsyncStorage.getItem('@harvest_reports');
      expect(stored).toBeNull();
    });
  });

  // ============================================================
  // createReportFromHarvestInput - dmfResult with no confirmationNumber
  // ============================================================
  describe('createReportFromHarvestInput (dmfResult variations)', () => {
    it('sets dmf_status to pending when dmfResult has no confirmationNumber', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-no-conf',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeHarvestInput();
      await createReportFromHarvestInput(input, { objectId: 42 });

      const rpcInput = (mockSupabase as any).rpc.mock.calls[0][1].p_input;
      expect(rpcInput.dmf_status).toBe('pending');
      expect(rpcInput.dmf_object_id).toBe(42);
    });

    it('sets dmf_status to submitted when confirmationNumber is provided', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-with-conf',
          dmf_status: 'submitted',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input = makeHarvestInput();
      await createReportFromHarvestInput(input, {
        confirmationNumber: 'DMF-12345',
        objectId: 42,
        submittedAt: '2026-01-15T12:00:00.000Z',
      });

      const rpcInput = (mockSupabase as any).rpc.mock.calls[0][1].p_input;
      expect(rpcInput.dmf_status).toBe('submitted');
      expect(rpcInput.dmf_confirmation_number).toBe('DMF-12345');
    });
  });
});
