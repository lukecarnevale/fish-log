import {
  transformReport,
  transformFishEntry,
  getTotalFishCount,
  getSpeciesBreakdown,
} from '../../src/types/report';
import { makeStoredReport } from '../factories';

describe('transformReport', () => {
  const makeRow = (overrides?: Record<string, unknown>) => ({
    id: 'report-1',
    user_id: 'user-1',
    anonymous_user_id: null,
    dmf_status: 'submitted',
    dmf_confirmation_number: 'DMF-12345',
    dmf_object_id: 99,
    dmf_submitted_at: '2026-01-15T12:00:00Z',
    dmf_error: null,
    has_license: true,
    wrc_id: 'NC12345',
    first_name: 'Test',
    last_name: 'Angler',
    zip_code: '27601',
    phone: '919-555-1234',
    email: 'test@example.com',
    want_text_confirmation: true,
    want_email_confirmation: false,
    harvest_date: '2026-01-15',
    area_code: 'NC-001',
    area_label: 'Pamlico Sound',
    used_hook_and_line: true,
    gear_code: null,
    gear_label: null,
    red_drum_count: 2,
    flounder_count: 1,
    spotted_seatrout_count: 0,
    weakfish_count: 0,
    striped_bass_count: 3,
    reporting_for: 'self',
    family_count: null,
    notes: 'Great day',
    photo_url: 'https://example.com/photo.jpg',
    gps_latitude: 35.5,
    gps_longitude: -76.5,
    entered_rewards: true,
    rewards_drawing_id: 'draw-1',
    webhook_status: 'sent',
    webhook_error: null,
    webhook_attempts: 1,
    created_at: '2026-01-15T12:00:00Z',
    updated_at: '2026-01-15T12:00:00Z',
    ...overrides,
  });

  it('maps all snake_case fields to camelCase', () => {
    const result = transformReport(makeRow());
    expect(result.id).toBe('report-1');
    expect(result.userId).toBe('user-1');
    expect(result.dmfStatus).toBe('submitted');
    expect(result.dmfConfirmationNumber).toBe('DMF-12345');
    expect(result.dmfObjectId).toBe(99);
    expect(result.hasLicense).toBe(true);
    expect(result.wrcId).toBe('NC12345');
    expect(result.firstName).toBe('Test');
    expect(result.harvestDate).toBe('2026-01-15');
    expect(result.areaCode).toBe('NC-001');
    expect(result.usedHookAndLine).toBe(true);
    expect(result.redDrumCount).toBe(2);
    expect(result.flounderCount).toBe(1);
    expect(result.stripedBassCount).toBe(3);
    expect(result.reportingFor).toBe('self');
    expect(result.enteredRewards).toBe(true);
    expect(result.webhookStatus).toBe('sent');
    expect(result.webhookAttempts).toBe(1);
  });

  it('does NOT map fishEntries from DB row', () => {
    const row = makeRow();
    (row as any).fish_entries = [{ species_id: 'X', count: 2 }];
    const result = transformReport(row);
    expect(result.fishEntries).toBeUndefined();
  });

  it('defaults webhookStatus to null when missing', () => {
    const result = transformReport(makeRow({ webhook_status: undefined }));
    expect(result.webhookStatus).toBeNull();
  });

  it('defaults webhookAttempts to 0 when missing', () => {
    const result = transformReport(makeRow({ webhook_attempts: undefined }));
    expect(result.webhookAttempts).toBe(0);
  });
});

describe('transformFishEntry', () => {
  it('maps fish entry fields', () => {
    const result = transformFishEntry({
      id: 'fe-1',
      report_id: 'report-1',
      species: 'Flounder',
      count: 2,
      lengths: ['18', '20'],
      tag_number: 'TAG-001',
      created_at: '2026-01-15T12:00:00Z',
    });
    expect(result).toEqual({
      id: 'fe-1',
      reportId: 'report-1',
      species: 'Flounder',
      count: 2,
      lengths: ['18', '20'],
      tagNumber: 'TAG-001',
      createdAt: '2026-01-15T12:00:00Z',
    });
  });

  it('handles null lengths and tagNumber', () => {
    const result = transformFishEntry({
      id: 'fe-2', report_id: 'r2', species: 'Drum',
      count: 1, lengths: null, tag_number: null, created_at: '2026-01-15',
    });
    expect(result.lengths).toBeNull();
    expect(result.tagNumber).toBeNull();
  });
});

describe('getTotalFishCount', () => {
  it('sums all species counts', () => {
    const report = makeStoredReport({
      redDrumCount: 2,
      flounderCount: 3,
      spottedSeatroutCount: 1,
      weakfishCount: 0,
      stripedBassCount: 4,
    });
    expect(getTotalFishCount(report)).toBe(10);
  });

  it('returns 0 for all zero counts', () => {
    const report = makeStoredReport({
      redDrumCount: 0, flounderCount: 0, spottedSeatroutCount: 0,
      weakfishCount: 0, stripedBassCount: 0,
    });
    expect(getTotalFishCount(report)).toBe(0);
  });
});

describe('getSpeciesBreakdown', () => {
  it('returns only species with count > 0', () => {
    const report = makeStoredReport({
      redDrumCount: 2,
      flounderCount: 0,
      spottedSeatroutCount: 1,
      weakfishCount: 0,
      stripedBassCount: 0,
    });
    const breakdown = getSpeciesBreakdown(report);
    expect(breakdown).toEqual([
      { species: 'Red Drum', count: 2 },
      { species: 'Spotted Seatrout', count: 1 },
    ]);
  });

  it('returns empty array when all counts are 0', () => {
    const report = makeStoredReport({
      redDrumCount: 0, flounderCount: 0, spottedSeatroutCount: 0,
      weakfishCount: 0, stripedBassCount: 0,
    });
    expect(getSpeciesBreakdown(report)).toEqual([]);
  });

  it('returns all 5 species when all > 0', () => {
    const report = makeStoredReport({
      redDrumCount: 1, flounderCount: 1, spottedSeatroutCount: 1,
      weakfishCount: 1, stripedBassCount: 1,
    });
    expect(getSpeciesBreakdown(report)).toHaveLength(5);
  });
});
