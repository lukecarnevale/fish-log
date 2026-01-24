// types/report.ts
//
// Type definitions for harvest reports stored in Supabase.
// These complement the DMF types in harvestReport.ts.
//

/**
 * Harvest report stored in Supabase.
 */
export interface StoredReport {
  id: string;
  userId: string | null; // Nullable - set for rewards members
  anonymousUserId: string | null; // Nullable - set for anonymous users

  // DMF sync status
  dmfStatus: 'pending' | 'submitted' | 'confirmed' | 'failed';
  dmfConfirmationNumber: string | null;
  dmfObjectId: number | null;
  dmfSubmittedAt: string | null;
  dmfError: string | null;

  // Identity (as submitted)
  hasLicense: boolean;
  wrcId: string | null;
  firstName: string | null;
  lastName: string | null;
  zipCode: string | null;

  // Contact
  phone: string | null;
  email: string | null;
  wantTextConfirmation: boolean;
  wantEmailConfirmation: boolean;

  // Harvest data
  harvestDate: string; // ISO date
  areaCode: string;
  areaLabel: string | null;
  usedHookAndLine: boolean;
  gearCode: string | null;
  gearLabel: string | null;

  // Species counts
  redDrumCount: number;
  flounderCount: number;
  spottedSeatroutCount: number;
  weakfishCount: number;
  stripedBassCount: number;

  // Family reporting
  reportingFor: 'self' | 'family';
  familyCount: number | null;

  // App-only data
  notes: string | null;
  photoUrl: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;

  // Rewards
  enteredRewards: boolean;
  rewardsDrawingId: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Fish entry stored in Supabase.
 */
export interface StoredFishEntry {
  id: string;
  reportId: string;
  species: string;
  count: number;
  lengths: string[] | null;
  tagNumber: string | null;
  createdAt: string;
}

/**
 * Report input for creating a new report.
 * This maps from HarvestReportInput for Supabase storage.
 */
export interface ReportInput {
  userId?: string; // Set for rewards members
  anonymousUserId?: string; // Set for anonymous users

  // Identity
  hasLicense: boolean;
  wrcId?: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;

  // Contact
  phone?: string;
  email?: string;
  wantTextConfirmation: boolean;
  wantEmailConfirmation: boolean;

  // Harvest data
  harvestDate: string; // ISO date
  areaCode: string;
  areaLabel?: string;
  usedHookAndLine: boolean;
  gearCode?: string;
  gearLabel?: string;

  // Species counts
  redDrumCount: number;
  flounderCount: number;
  spottedSeatroutCount: number;
  weakfishCount: number;
  stripedBassCount: number;

  // Family reporting
  reportingFor: 'self' | 'family';
  familyCount?: number;

  // App-only data
  notes?: string;
  photoUrl?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;

  // Rewards
  enteredRewards?: boolean;
  rewardsDrawingId?: string;

  // Fish entries
  fishEntries?: Array<{
    species: string;
    count: number;
    lengths?: string[];
    tagNumber?: string;
  }>;
}

/**
 * DMF submission update for a report.
 */
export interface DMFStatusUpdate {
  dmfStatus: 'pending' | 'submitted' | 'confirmed' | 'failed';
  dmfConfirmationNumber?: string;
  dmfObjectId?: number;
  dmfSubmittedAt?: string;
  dmfError?: string;
}

/**
 * Transform Supabase report row to StoredReport type.
 */
export function transformReport(row: Record<string, unknown>): StoredReport {
  return {
    id: row.id as string,
    userId: row.user_id as string | null,
    anonymousUserId: row.anonymous_user_id as string | null,
    dmfStatus: row.dmf_status as StoredReport['dmfStatus'],
    dmfConfirmationNumber: row.dmf_confirmation_number as string | null,
    dmfObjectId: row.dmf_object_id as number | null,
    dmfSubmittedAt: row.dmf_submitted_at as string | null,
    dmfError: row.dmf_error as string | null,
    hasLicense: row.has_license as boolean,
    wrcId: row.wrc_id as string | null,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    zipCode: row.zip_code as string | null,
    phone: row.phone as string | null,
    email: row.email as string | null,
    wantTextConfirmation: row.want_text_confirmation as boolean,
    wantEmailConfirmation: row.want_email_confirmation as boolean,
    harvestDate: row.harvest_date as string,
    areaCode: row.area_code as string,
    areaLabel: row.area_label as string | null,
    usedHookAndLine: row.used_hook_and_line as boolean,
    gearCode: row.gear_code as string | null,
    gearLabel: row.gear_label as string | null,
    redDrumCount: row.red_drum_count as number,
    flounderCount: row.flounder_count as number,
    spottedSeatroutCount: row.spotted_seatrout_count as number,
    weakfishCount: row.weakfish_count as number,
    stripedBassCount: row.striped_bass_count as number,
    reportingFor: row.reporting_for as 'self' | 'family',
    familyCount: row.family_count as number | null,
    notes: row.notes as string | null,
    photoUrl: row.photo_url as string | null,
    gpsLatitude: row.gps_latitude as number | null,
    gpsLongitude: row.gps_longitude as number | null,
    enteredRewards: row.entered_rewards as boolean,
    rewardsDrawingId: row.rewards_drawing_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Transform Supabase fish entry row to StoredFishEntry type.
 */
export function transformFishEntry(row: Record<string, unknown>): StoredFishEntry {
  return {
    id: row.id as string,
    reportId: row.report_id as string,
    species: row.species as string,
    count: row.count as number,
    lengths: row.lengths as string[] | null,
    tagNumber: row.tag_number as string | null,
    createdAt: row.created_at as string,
  };
}

/**
 * Get total fish count from a stored report.
 */
export function getTotalFishCount(report: StoredReport): number {
  return (
    report.redDrumCount +
    report.flounderCount +
    report.spottedSeatroutCount +
    report.weakfishCount +
    report.stripedBassCount
  );
}

/**
 * Get species breakdown from a stored report.
 */
export function getSpeciesBreakdown(report: StoredReport): Array<{ species: string; count: number }> {
  const breakdown: Array<{ species: string; count: number }> = [];

  if (report.redDrumCount > 0) breakdown.push({ species: 'Red Drum', count: report.redDrumCount });
  if (report.flounderCount > 0) breakdown.push({ species: 'Flounder', count: report.flounderCount });
  if (report.spottedSeatroutCount > 0) breakdown.push({ species: 'Spotted Seatrout', count: report.spottedSeatroutCount });
  if (report.weakfishCount > 0) breakdown.push({ species: 'Weakfish', count: report.weakfishCount });
  if (report.stripedBassCount > 0) breakdown.push({ species: 'Striped Bass', count: report.stripedBassCount });

  return breakdown;
}
