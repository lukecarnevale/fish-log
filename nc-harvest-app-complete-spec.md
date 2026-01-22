# NC Harvest Reporting App - Complete Implementation Spec

## Overview

This app serves two purposes:
1. **DMF Compliance**: Submit mandatory harvest reports to NC Division of Marine Fisheries
2. **App Engagement**: Create user profiles and enter anglers into raffles

Data flows to TWO destinations:
- **NC DMF ArcGIS**: Official harvest reports (required by law)
- **Your Backend (Supabase)**: User profiles, raffle entries, catch history, photos

---

## Architecture: Dual Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Identity Info   │  │ Harvest Data    │  │ App-Only Data   │  │
│  │ - Name          │  │ - Species counts│  │ - Raffle opt-in │  │
│  │ - WRC ID        │  │ - Date          │  │ - Catch photos  │  │
│  │ - Email/Phone   │  │ - Area          │  │ - Notes         │  │
│  │ - Zip           │  │ - Gear          │  │ - GPS (optional)│  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     │
     ┌──────────────────────────────────────┐          │
     │     DMF SUBMISSION PAYLOAD           │          │
     │     (ArcGIS Feature Service)         │          │
     │                                      │          │
     │  Identity + Harvest Data ONLY        │          │
     │  No raffle, no photos, no GPS        │          │
     └──────────────────┬───────────────────┘          │
                        │                              │
                        ▼                              ▼
              ┌─────────────────┐           ┌─────────────────┐
              │   NC DMF        │           │  YOUR BACKEND   │
              │   ArcGIS        │           │  (Supabase)     │
              │                 │           │                 │
              │ - Official      │           │ - User profiles │
              │   harvest       │           │ - Raffle entries│
              │   records       │           │ - Catch history │
              │                 │           │ - Photos        │
              │                 │           │ - Analytics     │
              └─────────────────┘           └─────────────────┘
```

---

## Data Field Reference

### Fields That Go to BOTH DMF and Your Backend

| Field | DMF Field Name | Required for DMF | Your Backend Use |
|-------|---------------|------------------|------------------|
| Has License? | `Licenque` | ✅ Yes | Profile |
| WRC ID | `License` | ✅ When licensed | Profile, verification |
| First Name | `FirstN` | ✅ When unlicensed | Profile, raffle |
| Last Name | `LastN` | ✅ When unlicensed | Profile, raffle |
| ZIP Code | `Zip` | ✅ When unlicensed | Profile, analytics |
| Phone | `Phone` | ❌ Optional | Profile, raffle contact |
| Email | `Email` | ❌ Optional | Profile, raffle contact |
| Harvest Date | `DateH` | ✅ Yes | Catch history |
| Red Drum Count | `NumRD` | ✅ Yes | Catch history |
| Flounder Count | `NumF` | ✅ Yes | Catch history |
| Spotted Seatrout Count | `NumSS` | ✅ Yes | Catch history |
| Weakfish Count | `NumW` | ✅ Yes | Catch history |
| Striped Bass Count | `NumSB` | ✅ Yes | Catch history |
| Area of Harvest | `Area` | ✅ Yes | Catch history, analytics |
| Used Hook & Line? | `Hook` | ✅ Yes | Catch history |
| Gear Type | `Gear` | ✅ When not hook & line | Catch history |
| Reporting for Family? | `Fam` | ❌ Optional | - |
| Family Count | `FamNum` | ❌ Optional | - |

### Fields That Go ONLY to Your Backend (Not DMF)

| Field | Purpose | Required for Raffle |
|-------|---------|---------------------|
| User ID | Internal account identifier | ✅ |
| Password / Auth | Account security | ✅ |
| Raffle Opt-In | Consent to enter raffle | ✅ |
| Catch Photo | Fish ID, social sharing | ❌ |
| GPS Coordinates | Personal fishing log (private) | ❌ |
| Notes | Personal trip notes | ❌ |
| Favorite Spots | Personal data | ❌ |
| Push Notification Token | Alerts | ❌ |

---

## DMF Submission Details

### Endpoint

```
POST https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits
Content-Type: application/x-www-form-urlencoded
```

### Required vs Optional Fields for DMF

```
ALWAYS REQUIRED:
├── Licenque          (Yes/No - has license?)
├── DateH             (harvest date as Unix ms timestamp)
├── NumRD             (red drum count as string, can be "0")
├── NumF              (flounder count as string)
├── NumSS             (spotted seatrout count as string)
├── NumW              (weakfish count as string)
├── NumSB             (striped bass count as string)
├── Area              (area code as string, e.g., "80")
└── Hook              (Yes/No - used hook & line?)

CONDITIONALLY REQUIRED:
├── License           (WRC ID - required when Licenque = "Yes")
├── FirstN            (first name - required when Licenque = "No")
├── LastN             (last name - required when Licenque = "No")
├── Zip               (ZIP code - required when Licenque = "No")
└── Gear              (gear code - required when Hook = "No")

OPTIONAL:
├── Fam               (reporting for family?)
├── FamNum            (family count)
├── TextCon           (want text confirmation?)
├── Phone             (phone number)
├── EmailCon          (want email confirmation?)
└── Email             (email address)

SYSTEM-GENERATED (you create these):
├── Harvest           (always "Recreational")
├── SysDate           (current timestamp in ms)
├── DateS             (day of month as string)
├── Rand              (random 4-digit number as string)
├── Unique1           (DateS + Rand = confirmation number)
├── GlobalID          (GUID you generate)
├── RedDr             (null)
├── Flound            (null)
├── SST               (null)
├── Weakf             (null)
├── Striped           (null)
└── SubmitBy          (null)
```

### Dropdown Values

#### Area of Harvest (`Area` field)

```typescript
export const AREA_OPTIONS = [
  { value: "1", label: "ALBEMARLE SOUND" },
  { value: "2", label: "ALLIGATOR RIVER" },
  { value: "80", label: "BACK BAY" },
  { value: "3", label: "BAY RIVER" },
  { value: "5", label: "BOGUE SOUND" },
  { value: "6", label: "CAPE FEAR RIVER" },
  { value: "7", label: "CHOWAN RIVER" },
  { value: "8", label: "CORE SOUND" },
  { value: "9", label: "CROATAN SOUND" },
  { value: "10", label: "CURRITUCK SOUND" },
  { value: "53", label: "INLAND WATERWAY (BRUNSWICK)" },
  { value: "54", label: "INLAND WATERWAY (ONSLOW)" },
  { value: "13", label: "LAKE MATTAMUSKEET" },
  { value: "11", label: "LOCKWOOD'S FOLLY RIVER" },
  { value: "12", label: "MASONBORO SOUND" },
  { value: "29", label: "NEUSE RIVER" },
  { value: "30", label: "NEW RIVER" },
  { value: "31", label: "NEWPORT RIVER" },
  { value: "43", label: "NORTH RIVER (CARTERET COUNTY)" },
  { value: "22", label: "OCEAN > 3 MILES (NORTH OF CAPE HATTERAS)" },
  { value: "23", label: "OCEAN > 3 MILES (SOUTH OF CAPE HATTERAS)" },
  { value: "20", label: "OCEAN 0 - 3 MILES (NORTH OF CAPE HATTERAS)" },
  { value: "21", label: "OCEAN 0 - 3 MILES (SOUTH OF CAPE HATTERAS)" },
  { value: "33", label: "PAMLICO RIVER" },
  { value: "34", label: "PAMLICO SOUND" },
  { value: "35", label: "PASQUOTANK RIVER" },
  { value: "36", label: "PERQUIMANS RIVER" },
  { value: "52", label: "PUNGO RIVER" },
  { value: "37", label: "ROANOKE RIVER" },
  { value: "45", label: "ROANOKE SOUND" },
  { value: "38", label: "SHALLOTTE RIVER" },
  { value: "39", label: "STUMP SOUND (NEW RIVER INLET TO SURF CITY)" },
  { value: "41", label: "TOPSAIL SOUND (SURF CITY TO TOPSAIL INLET)" },
  { value: "42", label: "WHITE OAK RIVER" }
] as const;
```

#### Gear Type (`Gear` field)

```typescript
export const GEAR_OPTIONS = [
  { value: "1", label: "Hook & line" },
  { value: "2", label: "Dip net, A-frame net" },
  { value: "3", label: "Cast net" },
  { value: "4", label: "Gill net" },
  { value: "5", label: "Seine" },
  { value: "6", label: "Trawl" },
  { value: "7", label: "Trap" },
  { value: "8", label: "Gig/Spear" },
  { value: "9", label: "Hand" },
  { value: "10", label: "Other" }
] as const;
```

---

## Complete Submission Service

```typescript
// src/services/harvestReportService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const DMF_ENDPOINT = 
  'https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits';

// ============================================
// TYPES
// ============================================

/**
 * User input from your app's form
 * This includes BOTH DMF fields and app-only fields
 */
export interface HarvestReportInput {
  // === IDENTITY (goes to DMF + your backend) ===
  hasLicense: boolean;
  wrcId?: string;           // Required when hasLicense = true
  firstName?: string;       // Required when hasLicense = false
  lastName?: string;        // Required when hasLicense = false
  zipCode?: string;         // Required when hasLicense = false
  
  // === CONTACT (goes to DMF + your backend) ===
  wantTextConfirmation: boolean;
  phone?: string;
  wantEmailConfirmation: boolean;
  email?: string;
  
  // === HARVEST DATA (goes to DMF + your backend) ===
  harvestDate: Date;
  redDrumCount: number;
  flounderCount: number;
  spottedSeatroutCount: number;
  weakfishCount: number;
  stripedBassCount: number;
  areaCode: string;         // Required - use codes from AREA_OPTIONS
  usedHookAndLine: boolean;
  gearCode?: string;        // Required when usedHookAndLine = false
  
  // === OPTIONAL DMF FIELDS ===
  reportingFor: 'self' | 'family';
  familyCount?: number;     // When reportingFor = 'family'
  
  // === APP-ONLY FIELDS (do NOT send to DMF) ===
  userId?: string;          // Your internal user ID
  enterRaffle: boolean;     // Raffle opt-in
  catchPhoto?: string;      // Base64 or URI
  notes?: string;           // Personal notes
  gpsCoordinates?: {        // Private location data
    latitude: number;
    longitude: number;
  };
}

export interface DMFSubmissionResult {
  success: boolean;
  confirmationNumber?: string;
  objectId?: number;
  error?: string;
  queued?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateGlobalId(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16).toUpperCase();
  const segment = (len: number) => Array(len).fill(0).map(hex).join('');
  return `{${segment(8)}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(12)}}`;
}

function generateConfirmationNumber(): { dateS: string; rand: string; unique1: string } {
  const dateS = new Date().getDate().toString();
  const rand = Math.round(Math.random() * 10000).toString();
  return { dateS, rand, unique1: dateS + rand };
}

// ============================================
// DMF PAYLOAD TRANSFORMATION
// ============================================

/**
 * Transform user input into DMF ArcGIS format
 * IMPORTANT: This strips out app-only fields (raffle, photos, GPS, etc.)
 */
function transformToDMFPayload(input: HarvestReportInput): object {
  const now = new Date();
  const { dateS, rand, unique1 } = generateConfirmationNumber();
  const globalId = generateGlobalId();
  
  return {
    attributes: {
      // Identity
      Licenque: input.hasLicense ? "Yes" : "No",
      License: input.hasLicense ? (input.wrcId || null) : null,
      FirstN: input.firstName || null,
      LastN: input.lastName || null,
      Zip: input.zipCode || null,
      
      // Reporting scope
      Fam: input.reportingFor === 'family' 
        ? "Myself and/or minor children under the age of 18" 
        : "Myself Only",
      FamNum: input.reportingFor === 'family' 
        ? (input.familyCount?.toString() || null) 
        : null,
      
      // Contact (for DMF confirmations)
      TextCon: input.wantTextConfirmation ? "Yes" : "No",
      Phone: input.wantTextConfirmation ? (input.phone || null) : null,
      EmailCon: input.wantEmailConfirmation ? "Yes" : "No",
      Email: input.wantEmailConfirmation ? (input.email || null) : null,
      
      // Harvest date
      DateH: input.harvestDate.getTime(),
      
      // System timestamps
      SysDate: now.getTime(),
      DateS: dateS,
      
      // Species counts (as strings)
      RedDr: null,   // Yes/No field - send null
      NumRD: input.redDrumCount.toString(),
      Flound: null,  // Yes/No field - send null
      NumF: input.flounderCount.toString(),
      SST: null,     // Yes/No field - send null
      NumSS: input.spottedSeatroutCount.toString(),
      Weakf: null,   // Yes/No field - send null
      NumW: input.weakfishCount.toString(),
      Striped: null, // Yes/No field - send null
      NumSB: input.stripedBassCount.toString(),
      
      // Confirmation number
      Rand: rand,
      Unique1: unique1,
      
      // Fixed values
      Harvest: "Recreational",
      SubmitBy: null,
      
      // Location & gear
      Area: input.areaCode,
      Hook: input.usedHookAndLine ? "Yes" : "No",
      Gear: input.usedHookAndLine ? null : (input.gearCode || null),
      
      // Global ID
      GlobalID: globalId
    },
    geometry: {
      spatialReference: { wkid: 4326 },
      x: 0,
      y: 0,
      z: 0
    }
  };
}

// ============================================
// DMF SUBMISSION
// ============================================

export async function submitToDMF(input: HarvestReportInput): Promise<DMFSubmissionResult> {
  const feature = transformToDMFPayload(input);
  const confirmationNumber = (feature as any).attributes.Unique1;
  
  const edits = JSON.stringify([{
    id: 0,
    adds: [feature]
  }]);
  
  const formData = new URLSearchParams();
  formData.append('f', 'json');
  formData.append('edits', edits);
  formData.append('useGlobalIds', 'true');
  formData.append('rollbackOnFailure', 'true');
  
  try {
    const response = await fetch(DMF_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result[0]?.addResults?.[0]?.success) {
      return {
        success: true,
        confirmationNumber,
        objectId: result[0].addResults[0].objectId
      };
    } else {
      const error = result[0]?.addResults?.[0]?.error?.description || 'Unknown error';
      return { success: false, error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      queued: true,
      confirmationNumber
    };
  }
}

// ============================================
// YOUR BACKEND SUBMISSION (Supabase example)
// ============================================

/**
 * Save to your backend - includes ALL data (DMF fields + app-only fields)
 * This is where raffle entries, photos, GPS, etc. go
 */
export async function saveToYourBackend(
  input: HarvestReportInput,
  dmfConfirmationNumber: string,
  dmfObjectId?: number
): Promise<{ success: boolean; error?: string }> {
  
  // TODO: Replace with your actual Supabase client
  // import { supabase } from './supabaseClient';
  
  try {
    // Example Supabase insert - adjust to your schema
    /*
    const { error } = await supabase.from('harvest_reports').insert({
      // Link to user
      user_id: input.userId,
      
      // DMF reference
      dmf_confirmation: dmfConfirmationNumber,
      dmf_object_id: dmfObjectId,
      
      // Identity
      has_license: input.hasLicense,
      wrc_id: input.wrcId,
      first_name: input.firstName,
      last_name: input.lastName,
      zip_code: input.zipCode,
      phone: input.phone,
      email: input.email,
      
      // Harvest data
      harvest_date: input.harvestDate.toISOString(),
      red_drum_count: input.redDrumCount,
      flounder_count: input.flounderCount,
      spotted_seatrout_count: input.spottedSeatroutCount,
      weakfish_count: input.weakfishCount,
      striped_bass_count: input.stripedBassCount,
      area_code: input.areaCode,
      used_hook_and_line: input.usedHookAndLine,
      gear_code: input.gearCode,
      
      // APP-ONLY DATA (not sent to DMF)
      enter_raffle: input.enterRaffle,
      catch_photo_url: input.catchPhoto,  // Upload to storage first
      notes: input.notes,
      gps_latitude: input.gpsCoordinates?.latitude,
      gps_longitude: input.gpsCoordinates?.longitude,
      
      // Timestamps
      submitted_at: new Date().toISOString()
    });
    
    if (error) throw error;
    */
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save' 
    };
  }
}

/**
 * Handle raffle entry separately if needed
 */
export async function enterRaffle(
  userId: string,
  harvestReportId: string,
  contactInfo: { email?: string; phone?: string }
): Promise<{ success: boolean; error?: string }> {
  
  // TODO: Replace with your Supabase client
  /*
  const { error } = await supabase.from('raffle_entries').insert({
    user_id: userId,
    harvest_report_id: harvestReportId,
    email: contactInfo.email,
    phone: contactInfo.phone,
    entered_at: new Date().toISOString()
  });
  
  if (error) throw error;
  */
  
  return { success: true };
}

// ============================================
// COMBINED SUBMISSION FLOW
// ============================================

export interface FullSubmissionResult {
  dmfSuccess: boolean;
  backendSuccess: boolean;
  confirmationNumber?: string;
  dmfError?: string;
  backendError?: string;
}

/**
 * Main submission function - sends to BOTH DMF and your backend
 */
export async function submitHarvestReport(
  input: HarvestReportInput
): Promise<FullSubmissionResult> {
  
  // Step 1: Submit to DMF
  const dmfResult = await submitToDMF(input);
  
  // Step 2: Save to your backend (even if DMF failed - you want the record)
  const backendResult = await saveToYourBackend(
    input,
    dmfResult.confirmationNumber || '',
    dmfResult.objectId
  );
  
  // Step 3: Handle raffle entry if opted in
  if (input.enterRaffle && input.userId && backendResult.success) {
    await enterRaffle(input.userId, dmfResult.confirmationNumber || '', {
      email: input.email,
      phone: input.phone
    });
  }
  
  return {
    dmfSuccess: dmfResult.success,
    backendSuccess: backendResult.success,
    confirmationNumber: dmfResult.confirmationNumber,
    dmfError: dmfResult.error,
    backendError: backendResult.error
  };
}
```

---

## Validation Function

```typescript
// src/utils/validation.ts

import { HarvestReportInput } from '../services/harvestReportService';

export interface ValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
}

export function validateHarvestReport(input: HarvestReportInput): ValidationResult {
  const errors: { field: string; message: string }[] = [];
  
  // === DMF REQUIRED FIELDS ===
  
  // License validation
  if (input.hasLicense === undefined || input.hasLicense === null) {
    errors.push({ field: 'hasLicense', message: 'Please indicate if you have a fishing license' });
  }
  
  if (input.hasLicense === true) {
    if (!input.wrcId || input.wrcId.trim() === '') {
      errors.push({ field: 'wrcId', message: 'WRC ID or Customer ID is required' });
    }
  }
  
  if (input.hasLicense === false) {
    if (!input.firstName || input.firstName.trim() === '') {
      errors.push({ field: 'firstName', message: 'First name is required' });
    }
    if (!input.lastName || input.lastName.trim() === '') {
      errors.push({ field: 'lastName', message: 'Last name is required' });
    }
    if (!input.zipCode || input.zipCode.trim() === '') {
      errors.push({ field: 'zipCode', message: 'ZIP code is required' });
    } else if (!/^\d{5}$/.test(input.zipCode)) {
      errors.push({ field: 'zipCode', message: 'ZIP code must be 5 digits' });
    }
  }
  
  // Date validation
  if (!input.harvestDate) {
    errors.push({ field: 'harvestDate', message: 'Harvest date is required' });
  } else {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (input.harvestDate > today) {
      errors.push({ field: 'harvestDate', message: 'Harvest date cannot be in the future' });
    }
  }
  
  // Species - at least one must be > 0
  const totalFish = 
    (input.redDrumCount || 0) +
    (input.flounderCount || 0) +
    (input.spottedSeatroutCount || 0) +
    (input.weakfishCount || 0) +
    (input.stripedBassCount || 0);
  
  if (totalFish === 0) {
    errors.push({ field: 'species', message: 'You must report at least one fish' });
  }
  
  // Area validation
  if (!input.areaCode || input.areaCode.trim() === '') {
    errors.push({ field: 'areaCode', message: 'Area of harvest is required' });
  }
  
  // Gear validation
  if (input.usedHookAndLine === undefined || input.usedHookAndLine === null) {
    errors.push({ field: 'usedHookAndLine', message: 'Please indicate if you used hook and line' });
  }
  if (input.usedHookAndLine === false && (!input.gearCode || input.gearCode.trim() === '')) {
    errors.push({ field: 'gearCode', message: 'Please select the gear type used' });
  }
  
  // === OPTIONAL FIELD VALIDATION ===
  
  // Phone format
  if (input.wantTextConfirmation && input.phone) {
    if (!/^\d{3}-\d{3}-\d{4}$/.test(input.phone)) {
      errors.push({ field: 'phone', message: 'Phone must be in xxx-xxx-xxxx format' });
    }
  }
  
  // Email format
  if (input.wantEmailConfirmation && input.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }
  }
  
  // === RAFFLE VALIDATION ===
  
  if (input.enterRaffle) {
    // Must have contact info for raffle
    if (!input.email && !input.phone) {
      errors.push({ 
        field: 'contact', 
        message: 'Email or phone required for raffle entry' 
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

## Suggested Supabase Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wrc_id VARCHAR(25),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(100),
  phone VARCHAR(15),
  zip_code VARCHAR(5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Harvest reports (your copy of DMF submissions + extra data)
CREATE TABLE harvest_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  -- DMF reference
  dmf_confirmation VARCHAR(20),
  dmf_object_id INTEGER,
  
  -- Harvest data
  harvest_date DATE NOT NULL,
  red_drum_count INTEGER DEFAULT 0,
  flounder_count INTEGER DEFAULT 0,
  spotted_seatrout_count INTEGER DEFAULT 0,
  weakfish_count INTEGER DEFAULT 0,
  striped_bass_count INTEGER DEFAULT 0,
  area_code VARCHAR(5),
  used_hook_and_line BOOLEAN,
  gear_code VARCHAR(5),
  
  -- APP-ONLY DATA
  catch_photo_url TEXT,
  notes TEXT,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Raffle entries
CREATE TABLE raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  harvest_report_id UUID REFERENCES harvest_reports(id),
  
  -- Contact for winner notification
  email VARCHAR(100),
  phone VARCHAR(15),
  
  -- Raffle period (e.g., monthly, weekly)
  raffle_period VARCHAR(20), -- e.g., "2026-01"
  
  entered_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate entries per period
  UNIQUE(user_id, raffle_period)
);

-- Index for raffle drawings
CREATE INDEX idx_raffle_period ON raffle_entries(raffle_period);
```

---

## UX Flow Recommendation

```
┌─────────────────────────────────────────────────────────────┐
│                    SCREEN 1: PROFILE                         │
│  (One-time setup, saved locally + to backend)               │
│                                                              │
│  ┌─ Do you have a NC Fishing License? ─┐                    │
│  │  ○ Yes  ○ No                         │                    │
│  └──────────────────────────────────────┘                    │
│                                                              │
│  ┌─ WRC ID / Customer ID ─────────────┐  (if Yes)           │
│  │  [_______________]                  │                    │
│  └──────────────────────────────────────┘                    │
│                                                              │
│  ┌─ Name ─────────────────────────────┐  (if No, or always) │
│  │  First: [________] Last: [________]│                    │
│  └──────────────────────────────────────┘                    │
│                                                              │
│  ┌─ Contact (for raffle & confirmations) ─┐                 │
│  │  Email: [_______________]               │                 │
│  │  Phone: [_______________]               │                 │
│  └──────────────────────────────────────────┘                │
│                                                              │
│  ☑ Enter me into the monthly raffle                         │
│                                                              │
│                              [Save Profile]                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SCREEN 2: LOG CATCH                       │
│  (Per-trip submission)                                       │
│                                                              │
│  Date: [Today ▼]                                            │
│                                                              │
│  ┌─ Species (tap + to add) ───────────────────────────────┐ │
│  │  🐟 Red Drum         [-] 1 [+]                          │ │
│  │  🐟 Flounder         [-] 0 [+]                          │ │
│  │  🐟 Spotted Seatrout [-] 2 [+]                          │ │
│  │  🐟 Weakfish         [-] 0 [+]                          │ │
│  │  🐟 Striped Bass     [-] 0 [+]                          │ │
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  📍 Where: [Pamlico Sound ▼]                                │
│                                                              │
│  🎣 Gear: ○ Hook & Line  ○ Other: [____▼]                   │
│                                                              │
│  📷 [Add Photo] (optional - for fish ID & your records)     │
│                                                              │
│  📝 Notes: [_________________] (optional - private)          │
│                                                              │
│                         [Submit Report]                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SCREEN 3: CONFIRMATION                      │
│                                                              │
│                    ✅ Report Submitted!                      │
│                                                              │
│        Confirmation #: 209421                                │
│        (Screenshot this for law enforcement)                 │
│                                                              │
│        🎟️ You've been entered into this month's raffle!     │
│                                                              │
│                    [Submit Another]                          │
└─────────────────────────────────────────────────────────────┘
```

---

---

## Test Mode / Mock Submissions

During development, you don't want to hit DMF's production servers. Use this configuration system:

```typescript
// src/config/appConfig.ts

export const APP_CONFIG = {
  // CHANGE TO 'production' WHEN READY TO DEPLOY
  mode: 'mock' as 'mock' | 'production',
  
  // Feature flags
  features: {
    fishIdEnabled: true,
    raffleEnabled: true,
    offlineQueueEnabled: true,
  },
  
  // Endpoints
  endpoints: {
    dmfProduction: 'https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits',
    // Optional: Create your own test Feature Service in ArcGIS Online for integration testing
    // dmfTest: 'https://services.arcgis.com/YOUR_ORG/arcgis/rest/services/TestHarvestReporting/FeatureServer/applyEdits',
  }
};

// React Native environment detection
export function isDevelopment(): boolean {
  return __DEV__;
}

// Helper to check mode
export function isTestMode(): boolean {
  return APP_CONFIG.mode === 'mock';
}

// Switch modes programmatically (useful for dev settings screen)
export function setAppMode(mode: 'mock' | 'production'): void {
  APP_CONFIG.mode = mode;
}
```

### Mock DMF Submission Function

```typescript
// Add to src/services/harvestReportService.ts

/**
 * MOCK submission for testing - does NOT hit DMF servers
 * Logs payload to console and returns fake success
 */
async function mockSubmitToDMF(input: HarvestReportInput): Promise<DMFSubmissionResult> {
  // Simulate network delay (1-2 seconds)
  const delay = 1000 + Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Generate confirmation number (same logic as real submission)
  const { dateS, rand, unique1 } = generateConfirmationNumber();
  
  // Build the payload that WOULD be sent
  const payload = transformToDMFPayload(input);
  
  // Log for debugging
  console.log('\n========== MOCK DMF SUBMISSION ==========');
  console.log('Mode: TEST (not sent to DMF)');
  console.log('Would POST to:', APP_CONFIG.endpoints.dmfProduction);
  console.log('Confirmation #:', unique1);
  console.log('\nPayload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('==========================================\n');
  
  // Optionally simulate random failures for testing error handling
  const SIMULATE_RANDOM_FAILURES = false;
  if (SIMULATE_RANDOM_FAILURES && Math.random() < 0.2) {
    console.log('⚠️ SIMULATED FAILURE for testing');
    return {
      success: false,
      error: 'Simulated network failure for testing',
      queued: true,
      confirmationNumber: unique1
    };
  }
  
  // Return success with fake object ID
  return {
    success: true,
    confirmationNumber: unique1,
    objectId: Math.floor(Math.random() * 10000) + 1000
  };
}

/**
 * REAL submission to DMF servers - use in production only
 */
async function realSubmitToDMF(input: HarvestReportInput): Promise<DMFSubmissionResult> {
  const feature = transformToDMFPayload(input);
  const confirmationNumber = (feature as any).attributes.Unique1;
  
  const edits = JSON.stringify([{
    id: 0,
    adds: [feature]
  }]);
  
  const formData = new URLSearchParams();
  formData.append('f', 'json');
  formData.append('edits', edits);
  formData.append('useGlobalIds', 'true');
  formData.append('rollbackOnFailure', 'true');
  
  console.log('📤 Submitting to DMF (PRODUCTION)...');
  
  try {
    const response = await fetch(APP_CONFIG.endpoints.dmfProduction, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result[0]?.addResults?.[0]?.success) {
      console.log('✅ DMF submission successful');
      return {
        success: true,
        confirmationNumber,
        objectId: result[0].addResults[0].objectId
      };
    } else {
      const error = result[0]?.addResults?.[0]?.error?.description || 'Unknown error';
      console.log('❌ DMF submission failed:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.log('❌ DMF submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      queued: true,
      confirmationNumber
    };
  }
}

/**
 * Main export - automatically switches between mock and real based on config
 */
export async function submitToDMF(input: HarvestReportInput): Promise<DMFSubmissionResult> {
  if (APP_CONFIG.mode === 'mock') {
    console.log('🧪 TEST MODE: Using mock submission');
    return mockSubmitToDMF(input);
  }
  
  console.log('🚀 PRODUCTION MODE: Submitting to real DMF servers');
  return realSubmitToDMF(input);
}
```

### Dev Settings Screen (Optional)

```typescript
// src/screens/DevSettingsScreen.tsx
// Only show this in development builds!

import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { APP_CONFIG, setAppMode, isTestMode } from '../config/appConfig';

export function DevSettingsScreen() {
  const [testMode, setTestMode] = useState(isTestMode());
  
  const handleToggle = (value: boolean) => {
    if (!value) {
      Alert.alert(
        'Switch to Production?',
        'This will send REAL data to NC DMF servers. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Yes, Go Live', 
            style: 'destructive',
            onPress: () => {
              setAppMode('production');
              setTestMode(false);
            }
          }
        ]
      );
    } else {
      setAppMode('mock');
      setTestMode(true);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Developer Settings</Text>
      
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>Test Mode</Text>
          <Text style={styles.hint}>
            {testMode ? 'Mock submissions (safe)' : '⚠️ PRODUCTION - Real DMF submissions'}
          </Text>
        </View>
        <Switch value={testMode} onValueChange={handleToggle} />
      </View>
      
      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Current Mode:</Text>
        <Text style={[styles.statusValue, { color: testMode ? '#31872E' : '#d32f2f' }]}>
          {testMode ? '🧪 TEST' : '🚀 PRODUCTION'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#666', marginTop: 2 },
  statusBox: { backgroundColor: '#f5f5f5', padding: 20, borderRadius: 10, marginTop: 20 },
  statusLabel: { fontSize: 14, color: '#666' },
  statusValue: { fontSize: 24, fontWeight: 'bold', marginTop: 5 },
});
```

---

## Confirmation UI & Notifications

### How Confirmations Work

| Source | Trigger | What Gets Sent |
|--------|---------|----------------|
| **DMF (automatic)** | `TextCon: "Yes"` with `Phone` | SMS with confirmation # |
| **DMF (automatic)** | `EmailCon: "Yes"` with `Email` | Email with confirmation # |
| **Your App UI** | Always | Confirmation screen with details |
| **Your Backend (optional)** | If you implement it | Custom email/SMS with raffle info |

**You don't need to do anything special for DMF confirmations** - just pass the flags and they handle it automatically via their Azure Logic Apps.

### Confirmation Screen Component

```typescript
// src/screens/ConfirmationScreen.tsx

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Share, 
  Alert, 
  ScrollView,
  TouchableOpacity,
  Clipboard 
} from 'react-native';

interface ConfirmationScreenProps {
  route: {
    params: {
      confirmationNumber: string;
      harvestDate: Date;
      speciesCounts: {
        redDrum: number;
        flounder: number;
        spottedSeatrout: number;
        weakfish: number;
        stripedBass: number;
      };
      dmfConfirmationSent: {
        text: boolean;
        email: boolean;
      };
      enteredRaffle: boolean;
      areaName: string;
    };
  };
  navigation: any;
}

export function ConfirmationScreen({ route, navigation }: ConfirmationScreenProps) {
  const { 
    confirmationNumber,
    harvestDate,
    speciesCounts,
    dmfConfirmationSent,
    enteredRaffle,
    areaName
  } = route.params;
  
  const totalFish = Object.values(speciesCounts).reduce((a, b) => a + b, 0);
  
  const handleCopyConfirmation = () => {
    Clipboard.setString(confirmationNumber);
    Alert.alert('Copied!', 'Confirmation number copied to clipboard');
  };
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `NC Harvest Report Confirmation

Confirmation #: ${confirmationNumber}
Date: ${new Date(harvestDate).toLocaleDateString()}
Location: ${areaName}
Total Fish: ${totalFish}

Keep this for law enforcement inspection.

Submitted via NC Fish Report App`
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };
  
  const handleSubmitAnother = () => {
    navigation.navigate('HarvestReport');
  };
  
  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.checkmark}>✓</Text>
      </View>
      
      {/* Main Title */}
      <Text style={styles.title}>Report Submitted!</Text>
      <Text style={styles.subtitle}>
        Your harvest has been reported to NC DMF
      </Text>
      
      {/* Confirmation Number - PROMINENT & TAPPABLE */}
      <TouchableOpacity 
        style={styles.confirmationBox} 
        onPress={handleCopyConfirmation}
        activeOpacity={0.8}
      >
        <Text style={styles.confirmationLabel}>CONFIRMATION NUMBER</Text>
        <Text style={styles.confirmationNumber}>{confirmationNumber}</Text>
        <Text style={styles.confirmationHint}>
          Tap to copy • Show to law enforcement if inspected
        </Text>
      </TouchableOpacity>
      
      {/* Harvest Summary */}
      <View style={styles.summaryBox}>
        <Text style={styles.sectionTitle}>Harvest Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>
            {new Date(harvestDate).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Location</Text>
          <Text style={styles.summaryValue}>{areaName}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.speciesTitle}>Fish Reported ({totalFish} total)</Text>
        
        {speciesCounts.redDrum > 0 && (
          <View style={styles.speciesRow}>
            <Text style={styles.speciesName}>🐟 Red Drum</Text>
            <Text style={styles.speciesCount}>{speciesCounts.redDrum}</Text>
          </View>
        )}
        {speciesCounts.flounder > 0 && (
          <View style={styles.speciesRow}>
            <Text style={styles.speciesName}>🐟 Flounder</Text>
            <Text style={styles.speciesCount}>{speciesCounts.flounder}</Text>
          </View>
        )}
        {speciesCounts.spottedSeatrout > 0 && (
          <View style={styles.speciesRow}>
            <Text style={styles.speciesName}>🐟 Spotted Seatrout</Text>
            <Text style={styles.speciesCount}>{speciesCounts.spottedSeatrout}</Text>
          </View>
        )}
        {speciesCounts.weakfish > 0 && (
          <View style={styles.speciesRow}>
            <Text style={styles.speciesName}>🐟 Weakfish</Text>
            <Text style={styles.speciesCount}>{speciesCounts.weakfish}</Text>
          </View>
        )}
        {speciesCounts.stripedBass > 0 && (
          <View style={styles.speciesRow}>
            <Text style={styles.speciesName}>🐟 Striped Bass</Text>
            <Text style={styles.speciesCount}>{speciesCounts.stripedBass}</Text>
          </View>
        )}
      </View>
      
      {/* DMF Confirmation Status */}
      <View style={styles.notificationBox}>
        <Text style={styles.sectionTitle}>Confirmation Sent</Text>
        
        {dmfConfirmationSent.text && (
          <View style={styles.notificationRow}>
            <Text style={styles.notificationIcon}>📱</Text>
            <Text style={styles.notificationText}>
              Text message sent to your phone
            </Text>
          </View>
        )}
        
        {dmfConfirmationSent.email && (
          <View style={styles.notificationRow}>
            <Text style={styles.notificationIcon}>📧</Text>
            <Text style={styles.notificationText}>
              Email sent to your inbox
            </Text>
          </View>
        )}
        
        {!dmfConfirmationSent.text && !dmfConfirmationSent.email && (
          <View style={styles.notificationRow}>
            <Text style={styles.notificationIcon}>📸</Text>
            <Text style={styles.notificationText}>
              No confirmation requested. Take a screenshot!
            </Text>
          </View>
        )}
      </View>
      
      {/* Raffle Entry */}
      {enteredRaffle && (
        <View style={styles.raffleBox}>
          <Text style={styles.raffleIcon}>🎟️</Text>
          <Text style={styles.raffleTitle}>Raffle Entry Confirmed!</Text>
          <Text style={styles.raffleText}>
            You've been entered into this month's raffle. 
            Good luck!
          </Text>
        </View>
      )}
      
      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleShare}>
          <Text style={styles.primaryButtonText}>Share Confirmation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSubmitAnother}>
          <Text style={styles.secondaryButtonText}>Submit Another Report</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tertiaryButton} onPress={handleViewHistory}>
          <Text style={styles.tertiaryButtonText}>View Report History</Text>
        </TouchableOpacity>
      </View>
      
      {/* Legal Note */}
      <Text style={styles.legalNote}>
        This report has been submitted to the NC Division of Marine Fisheries 
        as required by state law (G.S. 113-170.3).
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#31872E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  checkmark: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  confirmationBox: {
    backgroundColor: '#f0f7f0',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#31872E',
  },
  confirmationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#31872E',
    letterSpacing: 1,
    marginBottom: 8,
  },
  confirmationNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#31872E',
    letterSpacing: 3,
  },
  confirmationHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  speciesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  speciesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  speciesName: {
    fontSize: 14,
    color: '#333',
  },
  speciesCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#31872E',
  },
  notificationBox: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  raffleBox: {
    backgroundColor: '#fff8e1',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  raffleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  raffleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f57c00',
    marginBottom: 4,
  },
  raffleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#31872E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#31872E',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 14,
  },
  legalNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
});
```

### Sending Your Own Confirmation (Optional)

If you want to send your OWN email/SMS (in addition to DMF's), use a Supabase Edge Function:

```typescript
// supabase/functions/send-confirmation/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Use your preferred email service (Resend, SendGrid, etc.)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  const { 
    confirmationNumber, 
    email, 
    phone,
    firstName,
    speciesSummary,
    raffleEntry 
  } = await req.json();
  
  // Send email if provided
  if (email && RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NC Fish Report <noreply@yourapp.com>',
        to: email,
        subject: `Harvest Report Confirmed - #${confirmationNumber}`,
        html: `
          <h1>Thanks for reporting, ${firstName || 'Angler'}!</h1>
          
          <p>Your harvest report has been submitted to NC DMF.</p>
          
          <div style="background: #f0f7f0; padding: 20px; border-radius: 10px; text-align: center;">
            <p style="margin: 0; color: #666;">Confirmation Number</p>
            <h2 style="margin: 10px 0; color: #31872E; font-size: 32px;">${confirmationNumber}</h2>
          </div>
          
          <h3>Harvest Summary</h3>
          <p>${speciesSummary}</p>
          
          ${raffleEntry ? `
            <div style="background: #fff8e1; padding: 15px; border-radius: 10px; margin-top: 20px;">
              <p>🎟️ <strong>You're in the raffle!</strong> Good luck!</p>
            </div>
          ` : ''}
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Sent from NC Fish Report App. 
            <a href="https://yourapp.com">Download the app</a>
          </p>
        `
      })
    });
  }
  
  // For SMS, you'd use Twilio or similar
  // if (phone) { ... }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

```typescript
// Call from your app after successful submission
// src/services/notificationService.ts

import { supabase } from './supabaseClient';

export async function sendAppConfirmation(params: {
  confirmationNumber: string;
  email?: string;
  phone?: string;
  firstName?: string;
  speciesSummary: string;
  raffleEntry: boolean;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-confirmation', {
      body: params
    });
    
    if (error) {
      console.error('Failed to send app confirmation:', error);
    }
  } catch (e) {
    // Non-critical - don't fail the submission if this fails
    console.error('Notification service error:', e);
  }
}
```

---

## Offline Support & Queued Submissions

Anglers often have poor signal. Implement offline queueing:

```typescript
// src/services/offlineQueue.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { HarvestReportInput, submitToDMF, DMFSubmissionResult } from './harvestReportService';

const QUEUE_KEY = '@harvest_queue';
const HISTORY_KEY = '@harvest_history';

interface QueuedReport extends HarvestReportInput {
  queuedAt: string;
  localConfirmationNumber: string;
}

// ============================================
// QUEUE MANAGEMENT
// ============================================

export async function addToQueue(report: HarvestReportInput): Promise<string> {
  const { unique1 } = generateConfirmationNumber();
  
  const queuedReport: QueuedReport = {
    ...report,
    harvestDate: report.harvestDate.toISOString() as any, // Serialize
    queuedAt: new Date().toISOString(),
    localConfirmationNumber: unique1,
  };
  
  const queue = await getQueue();
  queue.push(queuedReport);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  
  return unique1;
}

export async function getQueue(): Promise<QueuedReport[]> {
  const data = await AsyncStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}

// ============================================
// AUTO-SYNC WHEN ONLINE
// ============================================

export async function syncQueuedReports(): Promise<{
  synced: number;
  failed: number;
  results: DMFSubmissionResult[];
}> {
  const queue = await getQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0, results: [] };
  }
  
  console.log(`📤 Syncing ${queue.length} queued reports...`);
  
  const results: DMFSubmissionResult[] = [];
  const stillQueued: QueuedReport[] = [];
  let synced = 0;
  let failed = 0;
  
  for (const report of queue) {
    // Restore Date object
    const input: HarvestReportInput = {
      ...report,
      harvestDate: new Date(report.harvestDate as any),
    };
    
    const result = await submitToDMF(input);
    results.push(result);
    
    if (result.success) {
      synced++;
      // Save to history
      await addToHistory({
        ...input,
        confirmationNumber: result.confirmationNumber!,
        objectId: result.objectId!,
        submittedAt: new Date().toISOString(),
      });
    } else {
      failed++;
      stillQueued.push(report);
    }
  }
  
  // Update queue with only failed reports
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(stillQueued));
  
  console.log(`✅ Synced: ${synced}, ❌ Failed: ${failed}`);
  
  return { synced, failed, results };
}

// ============================================
// CONNECTIVITY LISTENER
// ============================================

let unsubscribe: (() => void) | null = null;

export function startConnectivityListener(): void {
  if (unsubscribe) return; // Already listening
  
  unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      const count = await getQueueCount();
      if (count > 0) {
        console.log('📶 Back online! Syncing queued reports...');
        await syncQueuedReports();
      }
    }
  });
}

export function stopConnectivityListener(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// ============================================
// HISTORY MANAGEMENT
// ============================================

interface HistoryEntry extends HarvestReportInput {
  confirmationNumber: string;
  objectId: number;
  submittedAt: string;
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
  const history = await getHistory();
  
  // Add to beginning
  history.unshift({
    ...entry,
    harvestDate: entry.harvestDate instanceof Date 
      ? entry.harvestDate.toISOString() 
      : entry.harvestDate,
  });
  
  // Keep last 100
  const trimmed = history.slice(0, 100);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const data = await AsyncStorage.getItem(HISTORY_KEY);
  if (!data) return [];
  
  return JSON.parse(data).map((item: any) => ({
    ...item,
    harvestDate: new Date(item.harvestDate),
  }));
}
```

### Initialize in App Entry Point

```typescript
// App.tsx or index.tsx

import { useEffect } from 'react';
import { startConnectivityListener, syncQueuedReports } from './services/offlineQueue';

function App() {
  useEffect(() => {
    // Start listening for connectivity changes
    startConnectivityListener();
    
    // Try to sync any queued reports on app start
    syncQueuedReports();
    
    return () => {
      stopConnectivityListener();
    };
  }, []);
  
  // ... rest of app
}
```

---

## Complete File Structure

```
src/
├── config/
│   └── appConfig.ts                 # Mode (mock/production), feature flags
│
├── constants/
│   ├── areaOptions.ts               # AREA_OPTIONS array
│   ├── gearOptions.ts               # GEAR_OPTIONS array
│   └── species.ts                   # Species info
│
├── services/
│   ├── harvestReportService.ts      # Main submission logic (mock + real)
│   ├── offlineQueue.ts              # Queue management, auto-sync
│   ├── notificationService.ts       # Optional: send your own confirmations
│   └── supabaseClient.ts            # Supabase initialization
│
├── utils/
│   └── validation.ts                # Form validation
│
├── hooks/
│   ├── useHarvestForm.ts            # Form state management
│   └── useOfflineStatus.ts          # Track connectivity & queue count
│
├── screens/
│   ├── ProfileScreen.tsx            # One-time user setup
│   ├── HarvestReportScreen.tsx      # Main form
│   ├── ConfirmationScreen.tsx       # Success screen
│   ├── HistoryScreen.tsx            # Past submissions
│   └── DevSettingsScreen.tsx        # Test mode toggle (dev only)
│
└── components/
    ├── SpeciesCounter.tsx           # +/- counter for each species
    ├── AreaPicker.tsx               # Dropdown for harvest area
    ├── GearPicker.tsx               # Gear selection
    ├── OfflineBanner.tsx            # Shows when offline + queue count
    └── TestModeBadge.tsx            # Shows "TEST MODE" indicator
```

---

## Deployment Checklist

Before going to production:

- [ ] Change `APP_CONFIG.mode` from `'mock'` to `'production'`
- [ ] Remove or hide DevSettingsScreen
- [ ] Test real submission with your own data
- [ ] Verify DMF confirmation email/text arrives
- [ ] Test offline queueing and auto-sync
- [ ] Set up your Supabase production project
- [ ] Configure environment variables for API keys
- [ ] Submit to app stores

---

## Summary

| Data | Goes to DMF | Goes to Your Backend |
|------|-------------|---------------------|
| License status, WRC ID | ✅ | ✅ |
| Name, ZIP | ✅ | ✅ |
| Email, Phone | ✅ (for their confirmation) | ✅ (for raffle) |
| Species counts | ✅ | ✅ |
| Area, Gear, Date | ✅ | ✅ |
| **Raffle opt-in** | ❌ | ✅ |
| **Catch photos** | ❌ | ✅ |
| **GPS coordinates** | ❌ | ✅ |
| **Personal notes** | ❌ | ✅ |

| Feature | Implementation |
|---------|---------------|
| **Test Mode** | `APP_CONFIG.mode = 'mock'` - logs to console, doesn't hit DMF |
| **DMF Confirmations** | Automatic when `TextCon`/`EmailCon` = "Yes" |
| **Your App Confirmations** | Supabase Edge Function + Resend/SendGrid |
| **Offline Support** | AsyncStorage queue + NetInfo auto-sync |
| **Confirmation UI** | Show immediately with copy/share functionality |
