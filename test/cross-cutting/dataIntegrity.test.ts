/**
 * Round-Trip Data Integrity Tests
 *
 * For a government-facing app, the most important integration invariant is:
 * create data with known values -> transform -> verify every field preserved.
 *
 * Tests the full data conversion chain:
 * HarvestReportInput -> ReportInput -> StoredReport (and back)
 *
 * Also tests that fishEntries survive local storage round-trips.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  makeHarvestInput,
  makeStoredReport,
  makeFishEntry,
} from '../factories';
import { harvestInputToReportInput } from '../../src/services/reportsService';
import {
  transformReport,
  transformFishEntry,
  getTotalFishCount,
  getSpeciesBreakdown,
} from '../../src/types/report';
import type { StoredReport, ReportInput } from '../../src/types/report';
import type { HarvestReportInput } from '../../src/types/harvestReport';

describe('round-trip data integrity', () => {
  describe('HarvestReportInput -> ReportInput conversion', () => {
    it('preserves all DMF-required identity fields', () => {
      const input = makeHarvestInput({
        hasLicense: true,
        wrcId: 'NC-WRCID-999',
        firstName: 'Jane',
        lastName: 'Fisher',
        zipCode: '28401',
      });

      const reportInput = harvestInputToReportInput(input, 'user-1', undefined);

      expect(reportInput.hasLicense).toBe(true);
      expect(reportInput.wrcId).toBe('NC-WRCID-999');
      expect(reportInput.firstName).toBe('Jane');
      expect(reportInput.lastName).toBe('Fisher');
      expect(reportInput.zipCode).toBe('28401');
      expect(reportInput.userId).toBe('user-1');
    });

    it('preserves all species counts exactly', () => {
      const input = makeHarvestInput({
        redDrumCount: 3,
        flounderCount: 2,
        spottedSeatroutCount: 5,
        weakfishCount: 1,
        stripedBassCount: 4,
      });

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.redDrumCount).toBe(3);
      expect(reportInput.flounderCount).toBe(2);
      expect(reportInput.spottedSeatroutCount).toBe(5);
      expect(reportInput.weakfishCount).toBe(1);
      expect(reportInput.stripedBassCount).toBe(4);
    });

    it('converts harvestDate from Date to ISO string', () => {
      const date = new Date('2026-06-15T12:00:00.000Z');
      const input = makeHarvestInput({ harvestDate: date });

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.harvestDate).toBe('2026-06-15T12:00:00.000Z');
      expect(typeof reportInput.harvestDate).toBe('string');
    });

    it('handles harvestDate that is already a string (defensive)', () => {
      // Edge case: if harvestDate is somehow already a string
      const input = makeHarvestInput();
      (input as any).harvestDate = '2026-06-15';

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.harvestDate).toBe('2026-06-15');
    });

    it('maps enterRaffle to enteredRewards', () => {
      const input = makeHarvestInput({ enterRaffle: true });
      const reportInput = harvestInputToReportInput(input);
      expect(reportInput.enteredRewards).toBe(true);

      const input2 = makeHarvestInput({ enterRaffle: false });
      const reportInput2 = harvestInputToReportInput(input2);
      expect(reportInput2.enteredRewards).toBe(false);
    });

    it('maps catchPhoto to photoUrl', () => {
      const input = makeHarvestInput({
        catchPhoto: 'file:///photos/catch.jpg',
      });

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.photoUrl).toBe('file:///photos/catch.jpg');
    });

    it('maps gpsCoordinates to separate lat/lng fields', () => {
      const input = makeHarvestInput({
        gpsCoordinates: { latitude: 35.7796, longitude: -78.6382 },
      });

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.gpsLatitude).toBe(35.7796);
      expect(reportInput.gpsLongitude).toBe(-78.6382);
    });

    it('preserves contact/confirmation fields', () => {
      const input = makeHarvestInput({
        wantTextConfirmation: true,
        phone: '919-555-1234',
        wantEmailConfirmation: true,
        email: 'fisher@example.com',
      });

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.wantTextConfirmation).toBe(true);
      expect(reportInput.phone).toBe('919-555-1234');
      expect(reportInput.wantEmailConfirmation).toBe(true);
      expect(reportInput.email).toBe('fisher@example.com');
    });

    it('preserves harvest area and gear fields', () => {
      const input = makeHarvestInput({
        areaCode: 'NC-034',
        areaLabel: 'Pamlico Sound',
        usedHookAndLine: false,
        gearCode: '8',
        gearLabel: 'Gig/Spear',
      });

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.areaCode).toBe('NC-034');
      expect(reportInput.areaLabel).toBe('Pamlico Sound');
      expect(reportInput.usedHookAndLine).toBe(false);
      expect(reportInput.gearCode).toBe('8');
      expect(reportInput.gearLabel).toBe('Gig/Spear');
    });

    it('preserves family reporting fields', () => {
      const input = makeHarvestInput({
        reportingFor: 'family',
        familyCount: 3,
      });

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.reportingFor).toBe('family');
      expect(reportInput.familyCount).toBe(3);
    });

    it('preserves fishEntries with lengths and tag numbers', () => {
      const input = makeHarvestInput({
        fishEntries: [
          { species: 'Red Drum', count: 2, lengths: ['18.5', '22.0'], tagNumber: 'T001' },
          { species: 'Flounder', count: 1, lengths: ['15.0'], tagNumber: undefined },
        ],
      });

      const reportInput = harvestInputToReportInput(input);

      expect(reportInput.fishEntries).toHaveLength(2);
      expect(reportInput.fishEntries![0]).toEqual({
        species: 'Red Drum',
        count: 2,
        lengths: ['18.5', '22.0'],
        tagNumber: 'T001',
      });
      expect(reportInput.fishEntries![1]).toEqual({
        species: 'Flounder',
        count: 1,
        lengths: ['15.0'],
        tagNumber: undefined,
      });
    });
  });

  describe('Supabase row -> StoredReport transformation', () => {
    it('transforms all snake_case fields to camelCase', () => {
      const row: Record<string, unknown> = {
        id: 'uuid-123',
        user_id: 'user-456',
        anonymous_user_id: null,
        dmf_status: 'submitted',
        dmf_confirmation_number: 'CONF-789',
        dmf_object_id: 42,
        dmf_submitted_at: '2026-01-15T10:00:00.000Z',
        dmf_error: null,
        has_license: true,
        wrc_id: 'NC12345',
        first_name: 'Test',
        last_name: 'Angler',
        zip_code: '27601',
        phone: '919-555-0000',
        email: 'test@example.com',
        want_text_confirmation: true,
        want_email_confirmation: true,
        harvest_date: '2026-01-15',
        area_code: 'NC-001',
        area_label: 'Albemarle Sound',
        used_hook_and_line: true,
        gear_code: null,
        gear_label: null,
        red_drum_count: 3,
        flounder_count: 1,
        spotted_seatrout_count: 0,
        weakfish_count: 0,
        striped_bass_count: 2,
        reporting_for: 'self',
        family_count: null,
        notes: 'Great day fishing',
        photo_url: 'https://example.com/photo.jpg',
        gps_latitude: 35.77,
        gps_longitude: -78.63,
        entered_rewards: true,
        rewards_drawing_id: 'draw-1',
        webhook_status: 'sent',
        webhook_error: null,
        webhook_attempts: 1,
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-01-15T10:00:00.000Z',
      };

      const report = transformReport(row);

      // Verify every field maps correctly
      expect(report.id).toBe('uuid-123');
      expect(report.userId).toBe('user-456');
      expect(report.anonymousUserId).toBeNull();
      expect(report.dmfStatus).toBe('submitted');
      expect(report.dmfConfirmationNumber).toBe('CONF-789');
      expect(report.dmfObjectId).toBe(42);
      expect(report.dmfSubmittedAt).toBe('2026-01-15T10:00:00.000Z');
      expect(report.dmfError).toBeNull();
      expect(report.hasLicense).toBe(true);
      expect(report.wrcId).toBe('NC12345');
      expect(report.firstName).toBe('Test');
      expect(report.lastName).toBe('Angler');
      expect(report.zipCode).toBe('27601');
      expect(report.phone).toBe('919-555-0000');
      expect(report.email).toBe('test@example.com');
      expect(report.wantTextConfirmation).toBe(true);
      expect(report.wantEmailConfirmation).toBe(true);
      expect(report.harvestDate).toBe('2026-01-15');
      expect(report.areaCode).toBe('NC-001');
      expect(report.areaLabel).toBe('Albemarle Sound');
      expect(report.usedHookAndLine).toBe(true);
      expect(report.gearCode).toBeNull();
      expect(report.gearLabel).toBeNull();
      expect(report.redDrumCount).toBe(3);
      expect(report.flounderCount).toBe(1);
      expect(report.spottedSeatroutCount).toBe(0);
      expect(report.weakfishCount).toBe(0);
      expect(report.stripedBassCount).toBe(2);
      expect(report.reportingFor).toBe('self');
      expect(report.familyCount).toBeNull();
      expect(report.notes).toBe('Great day fishing');
      expect(report.photoUrl).toBe('https://example.com/photo.jpg');
      expect(report.gpsLatitude).toBe(35.77);
      expect(report.gpsLongitude).toBe(-78.63);
      expect(report.enteredRewards).toBe(true);
      expect(report.rewardsDrawingId).toBe('draw-1');
      expect(report.webhookStatus).toBe('sent');
      expect(report.webhookError).toBeNull();
      expect(report.webhookAttempts).toBe(1);
      expect(report.createdAt).toBe('2026-01-15T10:00:00.000Z');
      expect(report.updatedAt).toBe('2026-01-15T10:00:00.000Z');
    });

    it('defaults webhook fields when missing from DB row', () => {
      const row: Record<string, unknown> = {
        id: 'uuid-1',
        user_id: null,
        anonymous_user_id: 'anon-1',
        dmf_status: 'pending',
        dmf_confirmation_number: null,
        dmf_object_id: null,
        dmf_submitted_at: null,
        dmf_error: null,
        has_license: true,
        wrc_id: null,
        first_name: null,
        last_name: null,
        zip_code: null,
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
        red_drum_count: 0,
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
        // webhook fields intentionally missing
        webhook_status: undefined,
        webhook_error: undefined,
        webhook_attempts: undefined,
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-01-15T10:00:00.000Z',
      };

      const report = transformReport(row);

      expect(report.webhookStatus).toBeNull();
      expect(report.webhookError).toBeNull();
      expect(report.webhookAttempts).toBe(0);
    });
  });

  describe('Supabase row -> StoredFishEntry transformation', () => {
    it('transforms fish entry row correctly', () => {
      const row = {
        id: 'fe-1',
        report_id: 'report-1',
        species: 'Red Drum',
        count: 2,
        lengths: ['18.5', '22.0'],
        tag_number: 'T001',
        created_at: '2026-01-15T10:00:00.000Z',
      };

      const entry = transformFishEntry(row);

      expect(entry.id).toBe('fe-1');
      expect(entry.reportId).toBe('report-1');
      expect(entry.species).toBe('Red Drum');
      expect(entry.count).toBe(2);
      expect(entry.lengths).toEqual(['18.5', '22.0']);
      expect(entry.tagNumber).toBe('T001');
      expect(entry.createdAt).toBe('2026-01-15T10:00:00.000Z');
    });

    it('handles null lengths and tagNumber', () => {
      const row = {
        id: 'fe-2',
        report_id: 'report-1',
        species: 'Flounder',
        count: 1,
        lengths: null,
        tag_number: null,
        created_at: '2026-01-15T10:00:00.000Z',
      };

      const entry = transformFishEntry(row);

      expect(entry.lengths).toBeNull();
      expect(entry.tagNumber).toBeNull();
    });
  });

  describe('fishEntries survive local storage round-trip', () => {
    it('preserves fish entry details through AsyncStorage serialization', async () => {
      const report = makeStoredReport({
        fishEntries: [
          { species: 'Red Drum', count: 2, lengths: ['18.5', '22.0'], tagNumber: 'T001' },
          { species: 'Southern Flounder', count: 1, lengths: ['15.0'], tagNumber: undefined },
          { species: 'Spotted Seatrout', count: 3 },
        ],
      });

      // Serialize -> deserialize (simulates AsyncStorage round-trip)
      await AsyncStorage.setItem('@pending_sync_reports_test', JSON.stringify([report]));
      const raw = await AsyncStorage.getItem('@pending_sync_reports_test');
      const parsed = JSON.parse(raw!);

      expect(parsed[0].fishEntries).toHaveLength(3);
      expect(parsed[0].fishEntries[0].species).toBe('Red Drum');
      expect(parsed[0].fishEntries[0].count).toBe(2);
      expect(parsed[0].fishEntries[0].lengths).toEqual(['18.5', '22.0']);
      expect(parsed[0].fishEntries[0].tagNumber).toBe('T001');
      expect(parsed[0].fishEntries[1].lengths).toEqual(['15.0']);
      // undefined serializes to missing key in JSON
      expect(parsed[0].fishEntries[1].tagNumber).toBeUndefined();
    });
  });

  describe('getTotalFishCount and getSpeciesBreakdown', () => {
    it('calculates total fish count from species counts', () => {
      const report = makeStoredReport({
        redDrumCount: 3,
        flounderCount: 2,
        spottedSeatroutCount: 5,
        weakfishCount: 1,
        stripedBassCount: 4,
      });

      expect(getTotalFishCount(report)).toBe(15);
    });

    it('returns 0 for report with all zero counts', () => {
      const report = makeStoredReport({
        redDrumCount: 0,
        flounderCount: 0,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
      });

      expect(getTotalFishCount(report)).toBe(0);
    });

    it('only includes non-zero species in breakdown', () => {
      const report = makeStoredReport({
        redDrumCount: 2,
        flounderCount: 0,
        spottedSeatroutCount: 3,
        weakfishCount: 0,
        stripedBassCount: 0,
      });

      const breakdown = getSpeciesBreakdown(report);

      expect(breakdown).toHaveLength(2);
      expect(breakdown).toEqual([
        { species: 'Red Drum', count: 2 },
        { species: 'Spotted Seatrout', count: 3 },
      ]);
    });

    it('returns empty array for report with all zero counts', () => {
      const report = makeStoredReport({
        redDrumCount: 0,
        flounderCount: 0,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
      });

      expect(getSpeciesBreakdown(report)).toEqual([]);
    });
  });
});
