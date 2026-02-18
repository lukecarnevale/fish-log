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
