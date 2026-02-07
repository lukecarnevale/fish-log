// Harvest Report Types (NC DMF)
export {
  type HarvestReportInput,
  type FishEntry,
  type DMFSubmissionResult,
  type FullSubmissionResult,
  type ValidationError,
  type ValidationResult,
  type DMFPayload,
  type DMFAttributes,
  type DMFGeometry,
  type QueuedReport,
  type SubmittedReport,
  inputToSpeciesCounts,
  getTotalFishFromInput,
  createEmptyHarvestReportInput,
} from './harvestReport';

// User Types (Supabase)
export {
  type User,
  type UserInput,
  type UserStats,
  type SpeciesStat,
  type Achievement,
  type UserAchievement,
  type DeviceMergeRequest,
  transformUser,
  transformSpeciesStat,
  transformAchievement,
  transformUserAchievement,
} from './user';

// Stored Report Types (Supabase)
export {
  type StoredReport,
  type StoredFishEntry,
  type ReportInput,
  type DMFStatusUpdate,
  transformReport,
  transformFishEntry,
  getTotalFishCount,
  getSpeciesBreakdown,
} from './report';

// Rewards Types (Supabase)
export {
  type Prize,
  type RewardsDrawing,
  type RewardsConfig,
  type UserRewardsEntry,
  type Quarter,
  type RewardsState,
  type RewardsCalculated,
} from './rewards';

// Partner Types (Supabase)
export {
  type Partner,
  transformPartner,
} from './partner';

// Legal Document Types
export type LegalDocumentType = 'privacy' | 'terms' | 'licenses';

// Navigation Types
export type RootStackParamList = {
  Home: undefined;
  ReportForm: undefined;
  Confirmation: { reportData: FishReportData };
  PastReports: undefined;
  SpeciesInfo: { showRequiredOnly?: boolean } | undefined;
  LicenseDetails: undefined;
  CatchFeed: undefined;
  Profile: undefined;
  LegalDocument: { type: LegalDocumentType };
};

// Fish Report Types
export interface FishReportData {
  id?: string;
  species?: string;
  length?: string;
  weight?: string;
  condition?: string;
  location?: string;
  waterbody?: string;
  date?: Date | string;
  time?: Date | string;
  fishingMethod?: string;
  baitType?: string;
  hookType?: string;
  hookLocation?: string;
  released?: boolean;
  tagNumber?: string;
  angler?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
  };
  additionalInformation?: string;
  photo?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  enteredRaffle?: string; // Raffle ID if user entered a raffle with this report
  zipCode?: string; // Zip code for unlicensed anglers or profile data
  wrcId?: string; // WRC ID / Customer ID from fishing license
  [key: string]: any;
}

// Fish Species Types
export interface FishSpecies {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  description: string;
  habitat: string;
  seasons: {
    spring: boolean;
    summer: boolean;
    fall: boolean;
    winter: boolean;
  };
  regulations?: string[] | string;
  [key: string]: any;
}

// User Profile Types
export interface UserProfile {
  // License status (for DMF harvest reporting)
  hasLicense?: boolean;
  wrcId?: string; // WRC ID or Customer ID from fishing license

  // Personal info
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  zipCode?: string; // Required for unlicensed anglers per DMF
  address?: string;

  // Contact info
  email?: string;
  phone?: string;

  // DMF notification preferences
  wantTextConfirmation?: boolean;
  wantEmailConfirmation?: boolean;

  // Preferred area of harvest (pre-fills report form)
  preferredAreaCode?: string;
  preferredAreaLabel?: string;

  // Profile customization
  profileImage?: string;

  // Allow additional properties
  [key: string]: any;
}

// Fishing License Types
export interface FishingLicense {
  id?: string;
  firstName?: string;
  lastName?: string;
  licenseNumber?: string;
  licenseType?: string;
  issueDate?: string;
  expiryDate?: string;
  [key: string]: any;
}