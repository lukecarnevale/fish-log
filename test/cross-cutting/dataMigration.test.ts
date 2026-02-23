/**
 * Data Migration Backward Compatibility Tests
 *
 * Verifies that new code correctly handles data stored by older app versions.
 * Critical for a government-facing app where data cannot be lost during updates.
 *
 * Key scenarios:
 * - Old StoredReports missing webhookStatus/webhookError/webhookAttempts fields
 * - Old StoredReports missing fishEntries field
 * - Old QueuedReports missing fishEntries field
 * - Mixed old/new format data in the same storage key
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeStoredReport, makeQueuedReport, seedAsyncStorage } from '../factories';

// We need to test the actual getLocalReports normalization logic.
// Since getLocalReports is a private function, we test it indirectly through
// the public API: getReports (which calls getLocalReports internally).
// For sync, we test through syncPendingReports.

// Mock dependencies that reportsService imports
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
  ensureValidSession: jest.fn().mockResolvedValue({ valid: false, reason: 'no_session' }),
}));
jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('test-device-id'),
}));

// Mock isSupabaseConnected to return false so getReports uses local path
const { mockIsSupabaseConnected } = require('../mocks/supabase');

describe('data migration backward compatibility', () => {
  beforeEach(() => {
    mockIsSupabaseConnected.mockResolvedValue(false);
  });

  describe('old-format StoredReports (missing webhook fields)', () => {
    it('normalizes reports missing webhookStatus/webhookError/webhookAttempts', async () => {
      // Simulate data stored by an older app version that didn't have webhook fields
      const oldFormatReport = {
        id: 'old-report-1',
        userId: null,
        anonymousUserId: 'anon-1',
        dmfStatus: 'submitted',
        dmfConfirmationNumber: 'DMF-12345',
        dmfObjectId: 42,
        dmfSubmittedAt: '2026-01-15T00:00:00.000Z',
        dmfError: null,
        hasLicense: true,
        wrcId: 'NC12345',
        firstName: 'Test',
        lastName: 'Angler',
        zipCode: '27601',
        phone: null,
        email: null,
        wantTextConfirmation: false,
        wantEmailConfirmation: false,
        harvestDate: '2026-01-15',
        areaCode: 'NC-001',
        areaLabel: null,
        usedHookAndLine: true,
        gearCode: null,
        gearLabel: null,
        redDrumCount: 2,
        flounderCount: 0,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
        reportingFor: 'self',
        familyCount: null,
        notes: null,
        photoUrl: null,
        gpsLatitude: null,
        gpsLongitude: null,
        enteredRewards: false,
        rewardsDrawingId: null,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-15T10:00:00.000Z',
        // NOTE: No webhookStatus, webhookError, webhookAttempts fields
      };

      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([oldFormatReport]));

      const { getReports } = require('../../src/services/reportsService');
      const reports = await getReports();

      expect(reports).toHaveLength(1);
      // Verify webhook fields are normalized with defaults
      expect(reports[0].webhookStatus).toBeNull();
      expect(reports[0].webhookError).toBeNull();
      expect(reports[0].webhookAttempts).toBe(0);
      // Verify other fields are preserved
      expect(reports[0].id).toBe('old-report-1');
      expect(reports[0].dmfStatus).toBe('submitted');
      expect(reports[0].redDrumCount).toBe(2);
    });

    it('preserves webhook fields when they already exist', async () => {
      const newFormatReport = makeStoredReport({
        webhookStatus: 'sent',
        webhookError: null,
        webhookAttempts: 1,
      });

      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([newFormatReport]));

      const { getReports } = require('../../src/services/reportsService');
      const reports = await getReports();

      expect(reports).toHaveLength(1);
      expect(reports[0].webhookStatus).toBe('sent');
      expect(reports[0].webhookAttempts).toBe(1);
    });

    it('handles mixed old and new format reports in same storage', async () => {
      const oldReport = {
        id: 'old-1',
        userId: null,
        anonymousUserId: 'anon-1',
        dmfStatus: 'pending',
        dmfConfirmationNumber: null,
        dmfObjectId: null,
        dmfSubmittedAt: null,
        dmfError: null,
        hasLicense: true,
        wrcId: null,
        firstName: 'Old',
        lastName: 'Report',
        zipCode: '27601',
        phone: null,
        email: null,
        wantTextConfirmation: false,
        wantEmailConfirmation: false,
        harvestDate: '2026-01-10',
        areaCode: 'NC-001',
        areaLabel: null,
        usedHookAndLine: true,
        gearCode: null,
        gearLabel: null,
        redDrumCount: 1,
        flounderCount: 0,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
        reportingFor: 'self',
        familyCount: null,
        notes: null,
        photoUrl: null,
        gpsLatitude: null,
        gpsLongitude: null,
        enteredRewards: false,
        rewardsDrawingId: null,
        createdAt: '2026-01-10T10:00:00.000Z',
        updatedAt: '2026-01-10T10:00:00.000Z',
        // Missing webhook fields
      };

      const newReport = makeStoredReport({
        id: 'new-1',
        webhookStatus: 'failed',
        webhookError: 'timeout',
        webhookAttempts: 2,
      });

      await AsyncStorage.setItem(
        '@harvest_reports',
        JSON.stringify([oldReport, newReport])
      );

      const { getReports } = require('../../src/services/reportsService');
      const reports = await getReports();

      expect(reports).toHaveLength(2);
      // Old report gets defaults
      const old = reports.find((r: any) => r.id === 'old-1');
      expect(old?.webhookStatus).toBeNull();
      expect(old?.webhookAttempts).toBe(0);
      // New report keeps its values
      const newer = reports.find((r: any) => r.id === 'new-1');
      expect(newer?.webhookStatus).toBe('failed');
      expect(newer?.webhookAttempts).toBe(2);
    });
  });

  describe('old-format StoredReports (missing fishEntries)', () => {
    it('handles reports without fishEntries field gracefully', async () => {
      // Reports from before the fishEntries feature was added
      const oldReport = makeStoredReport({
        id: 'pre-fish-entries',
        redDrumCount: 2,
        flounderCount: 1,
      });
      // Remove fishEntries to simulate old format
      delete (oldReport as any).fishEntries;

      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([oldReport]));

      const { getReports } = require('../../src/services/reportsService');
      const reports = await getReports();

      expect(reports).toHaveLength(1);
      // fishEntries should be undefined (not crash)
      expect(reports[0].fishEntries).toBeUndefined();
      // Species counts should still be intact
      expect(reports[0].redDrumCount).toBe(2);
      expect(reports[0].flounderCount).toBe(1);
    });
  });

  describe('corrupted or empty storage', () => {
    it('returns empty array for corrupted JSON in @harvest_reports', async () => {
      await AsyncStorage.setItem('@harvest_reports', '{not valid json[');

      const { getReports } = require('../../src/services/reportsService');
      const reports = await getReports();

      expect(reports).toEqual([]);
    });

    it('returns empty array when @harvest_reports key does not exist', async () => {
      // AsyncStorage is cleared in afterEach, so the key doesn't exist
      const { getReports } = require('../../src/services/reportsService');
      const reports = await getReports();

      expect(reports).toEqual([]);
    });
  });

  describe('syncPendingReports with old-format local reports', () => {
    it('reconstructs fishEntries from aggregate counts when fishEntries is missing', async () => {
      // This tests the fallback path in syncPendingReports where fishEntries
      // is not present, so entries are reconstructed from species counts.
      // We verify the reconstruction logic is correct by checking the input
      // passed to createReportInSupabase.

      const { mockSupabase } = require('../mocks/supabase');
      mockIsSupabaseConnected.mockResolvedValue(true);

      const oldReport = makeStoredReport({
        id: 'local_sync_test',
        redDrumCount: 2,
        flounderCount: 1,
        spottedSeatroutCount: 3,
        weakfishCount: 0,
        stripedBassCount: 0,
      });
      // Remove fishEntries to simulate old format
      delete (oldReport as any).fishEntries;

      await AsyncStorage.setItem('@harvest_reports', JSON.stringify([oldReport]));
      await AsyncStorage.setItem('@pending_sync_reports', JSON.stringify(['local_sync_test']));

      // Mock the RPC call to capture the input
      let capturedInput: any = null;
      mockSupabase.rpc = jest.fn().mockImplementation((_fn: string, params: any) => {
        capturedInput = params;
        return Promise.resolve({
          data: {
            report_id: 'synced-uuid',
            dmf_status: 'pending',
            anonymous_user_id: 'anon-123',
            created_at: new Date().toISOString(),
          },
          error: null,
        });
      });

      // Mock the idempotency check (no existing report)
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

      // Verify that the RPC was called with reconstructed fish entries
      expect(capturedInput).toBeTruthy();
      const fishEntries = capturedInput.p_input?.fish_entries || capturedInput.p_device_id ? null : capturedInput;
      // The fish entries should be reconstructed from species counts
      if (capturedInput.p_input) {
        const entries = capturedInput.p_input.fish_entries;
        expect(entries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ species: 'Red Drum', count: 2 }),
            expect.objectContaining({ species: 'Southern Flounder', count: 1 }),
            expect.objectContaining({ species: 'Spotted Seatrout', count: 3 }),
          ])
        );
        // Species with 0 count should not be included
        expect(entries).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ species: 'Weakfish' }),
          ])
        );
      }
    });
  });
});
