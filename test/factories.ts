import { v4 as uuid } from 'uuid';
import type { HarvestReportInput, FishEntry, QueuedReport, SubmittedReport } from '../src/types/harvestReport';
import type { StoredReport, StoredFishEntry, ReportInput } from '../src/types/report';
import type { UserProfile } from '../src/types';
import type { User } from '../src/types/user';
import type { Advertisement } from '../src/services/transformers/advertisementTransformer';
import type { PartnerInquiry } from '../src/types/partnerInquiry';

// Harvest report input (what the user submits from the form)
export function makeHarvestInput(overrides?: Partial<HarvestReportInput>): HarvestReportInput {
  return {
    hasLicense: true,
    wrcId: 'NC12345',
    firstName: 'Test',
    lastName: 'Angler',
    zipCode: '27601',
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    harvestDate: new Date('2026-01-15'),
    redDrumCount: 1,
    flounderCount: 0,
    spottedSeatroutCount: 0,
    weakfishCount: 0,
    stripedBassCount: 0,
    areaCode: 'NC-001',
    usedHookAndLine: true,
    reportingFor: 'self',
    enterRaffle: false,
    ...overrides,
  };
}

// Queued report (offline queue format — harvestDate is ISO string)
export function makeQueuedReport(overrides?: Partial<QueuedReport>): QueuedReport {
  return {
    hasLicense: true,
    wrcId: 'NC12345',
    firstName: 'Test',
    lastName: 'Angler',
    zipCode: '27601',
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    harvestDate: '2026-01-15T00:00:00.000Z',
    redDrumCount: 1,
    flounderCount: 0,
    spottedSeatroutCount: 0,
    weakfishCount: 0,
    stripedBassCount: 0,
    areaCode: 'NC-001',
    usedHookAndLine: true,
    reportingFor: 'self',
    enterRaffle: false,
    queuedAt: new Date().toISOString(),
    localConfirmationNumber: `LOCAL-${uuid().slice(0, 8).toUpperCase()}`,
    retryCount: 0,
    ...overrides,
  };
}

// Submitted report (after successful DMF submission)
export function makeSubmittedReport(overrides?: Partial<SubmittedReport>): SubmittedReport {
  return {
    hasLicense: true,
    wrcId: 'NC12345',
    firstName: 'Test',
    lastName: 'Angler',
    zipCode: '27601',
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    harvestDate: '2026-01-15T00:00:00.000Z',
    redDrumCount: 1,
    flounderCount: 0,
    spottedSeatroutCount: 0,
    weakfishCount: 0,
    stripedBassCount: 0,
    areaCode: 'NC-001',
    usedHookAndLine: true,
    reportingFor: 'self',
    enterRaffle: false,
    confirmationNumber: `DMF-${uuid().slice(0, 8).toUpperCase()}`,
    submittedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Stored report (what lives in Supabase — uses null for optional fields)
export function makeStoredReport(overrides?: Partial<StoredReport>): StoredReport {
  return {
    id: uuid(),
    userId: null,
    anonymousUserId: uuid(),
    dmfStatus: 'pending',
    dmfConfirmationNumber: null,
    dmfObjectId: null,
    dmfSubmittedAt: null,
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
    webhookStatus: null,
    webhookError: null,
    webhookAttempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Fish entry (individual species entry on a report)
export function makeFishEntry(overrides?: Partial<FishEntry>): FishEntry {
  return {
    species: 'FLOUNDER',
    count: 1,
    ...overrides,
  };
}

// Stored fish entry (Supabase format with id and timestamps)
export function makeStoredFishEntry(overrides?: Partial<StoredFishEntry>): StoredFishEntry {
  return {
    id: uuid(),
    reportId: uuid(),
    species: 'FLOUNDER',
    count: 1,
    lengths: null,
    tagNumber: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// User profile (local AsyncStorage profile — all optional fields)
export function makeUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    hasLicense: true,
    wrcId: 'NC12345',
    firstName: 'Test',
    lastName: 'Angler',
    email: 'test@example.com',
    zipCode: '27601',
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    ...overrides,
  };
}

// Supabase User (full server-side user record)
export function makeUser(overrides?: Partial<User>): User {
  return {
    id: uuid(),
    deviceId: uuid(),
    email: 'test@example.com',
    authId: null,
    anonymousUserId: null,
    firstName: 'Test',
    lastName: 'Angler',
    zipCode: '27601',
    profileImageUrl: null,
    preferredAreaCode: null,
    preferredAreaLabel: null,
    dateOfBirth: null,
    hasLicense: true,
    wrcId: 'NC12345',
    licenseNumber: null,
    phone: null,
    wantsTextConfirmation: false,
    wantsEmailConfirmation: false,
    licenseType: null,
    licenseIssueDate: null,
    licenseExpiryDate: null,
    primaryHarvestArea: null,
    primaryFishingMethod: null,
    totalReports: 0,
    totalFish: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastReportDate: null,
    rewardsOptedInAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Advertisement (camelCase, post-transformation)
export function makeAdvertisement(overrides?: Partial<Advertisement>): Advertisement {
  return {
    id: uuid(),
    companyName: 'Test Bait & Tackle',
    promoText: '20% off all tackle',
    promoCode: 'FISH20',
    linkUrl: 'https://example.com',
    imageUrl: 'https://example.com/ad.jpg',
    isActive: true,
    priority: 1,
    placements: ['home'],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    clickCount: 0,
    impressionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'promotion',
    areaCodes: ['OBX'],
    featured: false,
    ...overrides,
  };
}

// Supabase advertisement row (snake_case, pre-transformation)
export function makeSupabaseAdvertisementRow(overrides?: Record<string, unknown>) {
  return {
    id: uuid(),
    company_name: 'Test Bait & Tackle',
    promo_text: '20% off all tackle',
    promo_code: 'FISH20',
    link_url: 'https://example.com',
    image_url: 'https://example.com/ad.jpg',
    is_active: true,
    priority: 1,
    placements: ['home'],
    location: 'Outer Banks',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    click_count: 0,
    impression_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: 'promotion',
    area_codes: ['OBX'],
    featured: false,
    ...overrides,
  };
}

// Partner inquiry (for submission testing)
export function makePartnerInquiry(overrides?: Partial<PartnerInquiry>): PartnerInquiry {
  return {
    businessName: 'Test Charters LLC',
    contactName: 'Captain Bob',
    email: 'bob@testcharters.com',
    businessType: 'charter',
    areaCodes: ['OBX', 'CRC'],
    message: 'We want to advertise our charter fishing services to NC anglers through the app.',
    ...overrides,
  };
}

// AsyncStorage seeding helper
export async function seedAsyncStorage(overrides: Record<string, any> = {}) {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const defaults: Record<string, any> = {
    '@pending_sync_reports': [],
    '@harvest_queue': [],
    '@harvest_history': [],
    '@current_user': null,
  };
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }
}
