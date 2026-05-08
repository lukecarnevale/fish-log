/**
 * reportsService.test.ts - Core reports service tests
 *
 * Tests the public API of reportsService: createReport, getReports,
 * updateDMFStatus, harvestInputToReportInput, clearReportsCache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';
import { makeStoredReport, makeHarvestInput, seedAsyncStorage } from '../factories';

// Service-level mocks (must be before importing the service)
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: jest.fn().mockResolvedValue({
    id: 'anon-user-123',
    deviceId: 'device-123',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: '2026-01-01T00:00:00.000Z',
    dismissedRewardsPrompt: false,
  }),
}));

jest.mock('../../src/services/photoUploadService', () => ({
  ensurePublicPhotoUrl: jest.fn().mockResolvedValue(null),
  ensurePublicPhotoUrls: jest.fn().mockResolvedValue([]),
  isLocalUri: jest.fn((uri: string) => uri?.startsWith('file://') || false),
}));

jest.mock('../../src/services/authService', () => ({
  ensureValidSession: jest.fn().mockResolvedValue({ valid: true, authUserId: 'auth-123' }),
}));

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

// Now import the service
import {
  createReport,
  createReportFromHarvestInput,
  getReports,
  getReport,
  updateDMFStatus,
  harvestInputToReportInput,
  clearReportsCache,
  getPendingSyncCount,
  getReportsSummary,
} from '../../src/services/reportsService';

import type { ReportInput } from '../../src/types/report';

describe('reportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  // ============================================================
  // harvestInputToReportInput
  // ============================================================
  describe('harvestInputToReportInput', () => {
    it('converts Date to ISO string for harvestDate', () => {
      const input = makeHarvestInput({ harvestDate: new Date('2026-01-15') });
      const result = harvestInputToReportInput(input, 'user-1', undefined);

      expect(result.harvestDate).toBe(new Date('2026-01-15').toISOString());
      expect(result.userId).toBe('user-1');
      expect(result.anonymousUserId).toBeUndefined();
    });

    it('maps enterRaffle to enteredRewards', () => {
      const input = makeHarvestInput({ enterRaffle: true });
      const result = harvestInputToReportInput(input);

      expect(result.enteredRewards).toBe(true);
    });

    it('maps catchPhoto to photoUrl', () => {
      const input = makeHarvestInput({ catchPhoto: 'file://photo.jpg' } as any);
      const result = harvestInputToReportInput(input);

      expect(result.photoUrl).toBe('file://photo.jpg');
    });

    it('preserves fish entries with lengths and tag numbers', () => {
      const input = makeHarvestInput({
        fishEntries: [
          { species: 'Red Drum', count: 2, lengths: ['18', '22'], tagNumber: 'T001' },
        ],
      } as any);
      const result = harvestInputToReportInput(input);

      expect(result.fishEntries).toEqual([
        { species: 'Red Drum', count: 2, lengths: ['18', '22'], tagNumber: 'T001' },
      ]);
    });
  });

  // ============================================================
  // Local storage helpers (via public API)
  // ============================================================
  describe('getReports (local fallback)', () => {
    it('returns empty array when no reports stored and offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const reports = await getReports();
      expect(reports).toEqual([]);
    });

    it('returns locally stored reports when offline', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const stored = [makeStoredReport({ id: 'r1' }), makeStoredReport({ id: 'r2' })];
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify(stored));

      const reports = await getReports();
      expect(reports).toHaveLength(2);
    });

    it('normalizes old reports missing webhook fields', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      // Simulate old report format without webhook fields
      const oldReport = { id: 'old-1', hasLicense: true, redDrumCount: 1, flounderCount: 0, spottedSeatroutCount: 0, weakfishCount: 0, stripedBassCount: 0, wantTextConfirmation: false, wantEmailConfirmation: false, harvestDate: '2026-01-01', areaCode: 'NC-001', usedHookAndLine: true, reportingFor: 'self', enteredRewards: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([oldReport]));

      const reports = await getReports();
      expect(reports[0].webhookStatus).toBeNull();
      expect(reports[0].webhookError).toBeNull();
      expect(reports[0].webhookAttempts).toBe(0);
    });

    it('handles corrupted JSON in AsyncStorage gracefully', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      await AsyncStorage.setItem('@harvest_reports', 'not valid json{{{');

      const reports = await getReports();
      expect(reports).toEqual([]);
    });
  });

  // ============================================================
  // createReport - offline path
  // ============================================================
  describe('createReport (offline)', () => {
    it('saves locally and queues for sync when disconnected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const input: ReportInput = {
        hasLicense: true,
        wrcId: 'NC12345',
        firstName: 'Test',
        lastName: 'Angler',
        zipCode: '27601',
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
      };

      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect(result.savedToSupabase).toBe(false);
      expect(result.report.id).toMatch(/^local_/);
      expect(result.supabaseError).toBe('No connection to Supabase');

      // Verify it was queued for sync
      const pendingCount = await getPendingSyncCount();
      expect(pendingCount).toBe(1);
    });

    it('generates local ID with timestamp prefix', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const input: ReportInput = {
        hasLicense: true,
        wantTextConfirmation: false,
        wantEmailConfirmation: false,
        harvestDate: '2026-01-15',
        areaCode: 'NC-001',
        usedHookAndLine: true,
        redDrumCount: 0,
        flounderCount: 0,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
        reportingFor: 'self',
      };

      const result = await createReport(input);
      expect(result.report.id).toMatch(/^local_\d+_[a-z0-9]+$/);
    });
  });

  // ============================================================
  // createReport - online path
  // ============================================================
  describe('createReport (online)', () => {
    it('saves to Supabase and locally when connected', async () => {
      // Mock the RPC to return a stored report
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-report-1',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

      const input: ReportInput = {
        anonymousUserId: 'anon-123',
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
      };

      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect(result.savedToSupabase).toBe(true);
      expect(result.report.id).toBe('sb-report-1');
    });

    it('falls back to local when Supabase RPC fails', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const input: ReportInput = {
        anonymousUserId: 'anon-123',
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
      };

      const result = await createReport(input);

      expect(result.success).toBe(true);
      expect(result.savedToSupabase).toBe(false);
      expect(result.report.id).toMatch(/^local_/);
      expect(result.supabaseError).toContain('Database error');
    });
  });

  // ============================================================
  // createReport - multi-photo (catch_log carousel) path
  //
  // Covers the Phase 3 upload orchestration: photos array with local URIs
  // triggers ensurePublicPhotoUrls, failure returns a distinct error code,
  // and photoUrl stays in sync with photos[0] so legacy and new readers agree.
  // ============================================================
  describe('createReport (multi-photo catch_log)', () => {
    const baseInput: ReportInput = {
      reportType: 'catch_log',
      anonymousUserId: 'anon-123',
      hasLicense: true,
      wantTextConfirmation: false,
      wantEmailConfirmation: false,
      harvestDate: '2026-01-15',
      areaCode: 'UNK',
      usedHookAndLine: true,
      redDrumCount: 0,
      flounderCount: 0,
      spottedSeatroutCount: 0,
      weakfishCount: 0,
      stripedBassCount: 0,
      reportingFor: 'self',
    };

    const successfulRpc = () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: {
          report_id: 'sb-report-photos',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });
    };

    it('uploads the whole photos array when any entry is a local URI', async () => {
      successfulRpc();
      const uploadService = require('../../src/services/photoUploadService');
      uploadService.ensurePublicPhotoUrls.mockResolvedValueOnce([
        'https://cdn/1.jpg',
        'https://cdn/2.jpg',
        'https://cdn/3.jpg',
      ]);

      const result = await createReport({
        ...baseInput,
        photos: ['file:///raw1.jpg', 'file:///raw2.jpg', 'file:///raw3.jpg'],
        photoUrl: 'file:///raw1.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.savedToSupabase).toBe(true);
      // The RPC payload should contain the uploaded public URLs as photos
      // and the first one mirrored to photo_url.
      const rpcCall = (mockSupabase as any).rpc.mock.calls[0];
      expect(rpcCall[0]).toBe('create_report_anonymous');
      expect(rpcCall[1].p_input.photos).toEqual([
        'https://cdn/1.jpg',
        'https://cdn/2.jpg',
        'https://cdn/3.jpg',
      ]);
      expect(rpcCall[1].p_input.photo_url).toBe('https://cdn/1.jpg');
    });

    it('skips the upload helper when photos array is fully public already', async () => {
      successfulRpc();
      const uploadService = require('../../src/services/photoUploadService');
      uploadService.ensurePublicPhotoUrls.mockClear();

      await createReport({
        ...baseInput,
        photos: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
        photoUrl: 'https://cdn/a.jpg',
      });

      // No locals → skip the multi-upload path entirely.
      expect(uploadService.ensurePublicPhotoUrls).not.toHaveBeenCalled();
    });

    it('returns photo_upload_failed supabaseError code when the batch upload throws', async () => {
      successfulRpc();
      const uploadService = require('../../src/services/photoUploadService');
      uploadService.ensurePublicPhotoUrls.mockRejectedValueOnce(
        new Error('Photo upload failed for 2 of 3 photos. Please try again.'),
      );
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await createReport({
        ...baseInput,
        photos: ['file:///a.jpg', 'file:///b.jpg', 'file:///c.jpg'],
      });

      expect(result.success).toBe(false);
      expect(result.savedToSupabase).toBe(false);
      // Distinct code so the form UI shows a retry-friendly "Photo Upload Failed"
      // alert instead of the generic error message.
      expect(result.supabaseError).toBe('photo_upload_failed');
      expect(result.error).toContain('Photo upload failed');
      // RPC should NOT have been called — we abort before persisting.
      expect((mockSupabase as any).rpc).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('threads onPhotoUploadProgress through to the upload helper', async () => {
      successfulRpc();
      const uploadService = require('../../src/services/photoUploadService');
      let forwarded: any;
      uploadService.ensurePublicPhotoUrls.mockImplementation(
        (_uris: string[], _uid: string | undefined, onProgress: any) => {
          forwarded = onProgress;
          return Promise.resolve(['https://cdn/x.jpg']);
        },
      );
      const onPhotoUploadProgress = jest.fn();

      await createReport(
        {
          ...baseInput,
          photos: ['file:///raw.jpg'],
        },
        { onPhotoUploadProgress },
      );

      // The helper receives the exact callback reference so the form can
      // render "Uploading N of M".
      expect(forwarded).toBe(onPhotoUploadProgress);
    });

    it('does not touch ensurePublicPhotoUrls for DMF submissions (no photos array)', async () => {
      successfulRpc();
      const uploadService = require('../../src/services/photoUploadService');
      uploadService.ensurePublicPhotoUrls.mockClear();

      await createReport({
        ...baseInput,
        reportType: 'dmf_harvest',
        photoUrl: 'file:///dmf-raffle.jpg', // DMF still uses single-photo path
      });

      // Confirms the DMF payload remains on the legacy single-photo code path.
      expect(uploadService.ensurePublicPhotoUrls).not.toHaveBeenCalled();
      expect(uploadService.ensurePublicPhotoUrl).toHaveBeenCalled();
    });
  });

  // ============================================================
  // clearReportsCache
  // ============================================================
  describe('clearReportsCache', () => {
    it('removes both report keys from AsyncStorage', async () => {
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([makeStoredReport()]));
      await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['local_1']));

      await clearReportsCache();

      const reports = await AsyncStorage.getItem('@harvest_reports');
      const pending = await AsyncStorage.getItem('@pending_sync_reports');
      expect(reports).toBeNull();
      expect(pending).toBeNull();
    });
  });

  // ============================================================
  // getReport
  // ============================================================
  describe('getReport', () => {
    it('returns null for non-existent report', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const report = await getReport('non-existent-id');
      expect(report).toBeNull();
    });
  });

  // ============================================================
  // getReportsSummary
  // ============================================================
  describe('getReportsSummary', () => {
    it('calculates correct totals', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const reports = [
        makeStoredReport({ redDrumCount: 2, flounderCount: 1, spottedSeatroutCount: 0, weakfishCount: 0, stripedBassCount: 0, harvestDate: '2026-01-15' }),
        makeStoredReport({ redDrumCount: 0, flounderCount: 0, spottedSeatroutCount: 3, weakfishCount: 0, stripedBassCount: 0, harvestDate: '2026-01-10' }),
      ];
      await AsyncStorage.setItem('@harvest_reports', JSON.stringify(reports));

      const summary = await getReportsSummary();

      expect(summary.totalReports).toBe(2);
      expect(summary.totalFish).toBe(6); // 2 + 1 + 3
      expect(summary.lastReportDate).toBe('2026-01-15');
    });
  });
});
