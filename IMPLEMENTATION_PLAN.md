# NC Harvest Reporting App - Implementation Plan

## Overview

This document outlines the implementation blocks needed to integrate NC DMF (Division of Marine Fisheries) harvest reporting into the Fish-Log app. The app will submit mandatory harvest reports to NC DMF's ArcGIS API while also storing user data locally (with future Supabase integration).

**Dual Data Flow:**
- **NC DMF ArcGIS**: Official harvest reports (required by law)
- **Local Storage (now) / Supabase (future)**: User profiles, raffle entries, catch history, photos

---

## Implementation Blocks

### Block 1: App Configuration & Constants
**Priority:** High | **Complexity:** Low | **Status:** COMPLETE

**Goal:** Create configuration files for test/production mode switching and define all DMF-required dropdown values with their official codes.

**Files Created:**
- `src/config/appConfig.ts` - Mode switching (mock/production), feature flags, endpoints, storage keys
- `src/constants/areaOptions.ts` - 34 area of harvest options with DMF codes
- `src/constants/gearOptions.ts` - 10 gear type options with DMF codes
- `src/constants/species.ts` - 5 species with DMF field name mappings
- `src/constants/index.ts` - Barrel export for all constants

**Key Features Implemented:**
- `APP_CONFIG.mode` switches between 'mock' and 'production'
- `isTestMode()` / `isProductionMode()` helper functions
- `setAppMode()` to change modes programmatically
- Area lookup by label or code with `getAreaByLabel()` / `getAreaByCode()`
- Gear lookup with `getGearByLabel()` / `mapFishingMethodToGearCode()`
- Species aggregation with `aggregateFishEntries()` and `speciesToDMFPayload()`
- Hook & Line detection with `isHookAndLine()`

**Acceptance Criteria:**
- [x] `APP_CONFIG.mode` can be set to 'mock' or 'production'
- [x] All 34 area options have correct DMF codes
- [x] All 10 gear options have correct DMF codes
- [x] Species map to DMF field names (NumRD, NumF, NumSS, NumW, NumSB)

---

### Block 2: Type Definitions & Interfaces
**Priority:** High | **Complexity:** Low | **Status:** COMPLETE

**Goal:** Define TypeScript interfaces that match the spec's dual data flow architecture, separating DMF fields from app-only fields.

**Files Created:**
- `src/types/harvestReport.ts` - All harvest-related types
- Updated `src/types/index.ts` - Added barrel exports

**Key Interfaces Implemented:**
- `HarvestReportInput` - User form data with clear separation of DMF vs app-only fields
- `FishEntry` - Individual fish with per-fish details (length, tag)
- `DMFSubmissionResult` - Result from DMF API call
- `FullSubmissionResult` - Combined result (DMF + local storage)
- `ValidationError` / `ValidationResult` - Validation types
- `DMFPayload` / `DMFAttributes` / `DMFGeometry` - Exact DMF API structure
- `QueuedReport` - For offline queue (uses ISO date strings for serialization)
- `SubmittedReport` - For history (uses ISO date strings for serialization)

**Helper Functions Implemented:**
- `inputToSpeciesCounts()` - Convert form input to SpeciesCounts
- `getTotalFishFromInput()` - Get total fish count from input
- `createEmptyHarvestReportInput()` - Factory for empty input

**Acceptance Criteria:**
- [x] `HarvestReportInput` includes all form fields
- [x] Clear separation between DMF fields and app-only fields (raffle, photos, GPS)
- [x] Types exported and usable across the app
- [x] QueuedReport/SubmittedReport handle Date→string serialization correctly

---

### Block 3: Harvest Report Service (DMF Submission)
**Priority:** High | **Complexity:** Medium | **Status:** COMPLETE

**Goal:** Create a service that transforms user input into the exact DMF ArcGIS payload format and submits it.

**Files Created:**
- `src/services/harvestReportService.ts` - Main service with all submission logic
- `src/services/index.ts` - Barrel export for services

**Key Functions Implemented:**
- `generateGlobalId()` - Creates GUID in format `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}`
- `generateConfirmationNumber()` - Returns `{ dateS, rand, unique1 }` for confirmation number
- `transformToDMFPayload(input)` - Converts HarvestReportInput to exact DMF format
- `submitToDMF(input)` - Production POST to ArcGIS endpoint
- `mockSubmitToDMF(input, options)` - Logs payload to console, simulates delay
- `submitHarvestReport(input)` - Main function, auto-routes based on APP_CONFIG.mode
- `previewDMFPayload(input)` - Get payload without submitting (for debugging)
- `checkRequiredDMFFields(input)` - Quick validation of required fields

**Mock Mode Features:**
- Logs full payload to console with formatting
- Configurable delay (default 1500ms)
- Optional failure simulation for testing error handling
- Generates fake objectId like ArcGIS would return

**Acceptance Criteria:**
- [x] Payload matches DMF's exact field names and formats
- [x] GUID generation follows correct format
- [x] Confirmation number generated correctly
- [x] Mock mode logs payload without hitting server
- [x] Production mode POSTs to real endpoint
- [x] Proper error handling for network failures (returns queued: true)

---

### Block 4: Validation Utility
**Priority:** High | **Complexity:** Medium | **Status:** COMPLETE

**Goal:** Implement comprehensive validation that checks DMF-required fields conditionally based on license status.

**Files Created:**
- `src/utils/validation.ts` - Main validation function with all rules
- `src/utils/index.ts` - Barrel export for utils

**Key Functions Implemented:**
- `validateHarvestReport(input)` - Main validation returning `{ isValid, errors }`
- `isValidPhone(phone)` - Check xxx-xxx-xxxx format
- `isValidEmail(email)` - Check email format
- `isValidZipCode(zipCode)` - Check 5-digit format
- `isValidHarvestDate(date)` - Check not in future
- `hasAtLeastOneFish(input)` - Check total count > 0
- `formatPhoneNumber(phone)` - Auto-format to xxx-xxx-xxxx
- `formatZipCode(zipCode)` - Auto-format to 5 digits
- `getFieldErrors(errors, field)` - Get all errors for a field
- `getFieldError(errors, field)` - Get first error for a field
- `hasFieldError(errors, field)` - Check if field has errors

**Validation Rules:**

| Condition | Required Fields |
|-----------|-----------------|
| Always | harvestDate, at least one species > 0, areaCode, usedHookAndLine |
| hasLicense = true | wrcId |
| hasLicense = false | firstName, lastName, zipCode (5 digits) |
| usedHookAndLine = false | gearCode |
| enterRaffle = true | email OR phone (valid format) |
| wantTextConfirmation = true | phone (xxx-xxx-xxxx format) |
| wantEmailConfirmation = true | email (valid format) |
| reportingFor = 'family' | familyCount >= 2 |

**Acceptance Criteria:**
- [x] Returns `{ isValid: boolean, errors: Array<{field, message}> }`
- [x] Conditional validation based on license status
- [x] Gear required only when not hook & line
- [x] Date cannot be in future
- [x] ZIP must be 5 digits
- [x] Phone format validated
- [x] Email format validated
- [x] Family count validated when reportingFor = 'family'

---

### Block 5: Offline Queue Service
**Priority:** High | **Complexity:** Medium | **Status:** COMPLETE

**Goal:** Implement AsyncStorage-based queuing for offline submissions with automatic retry.

**Files Created:**
- `src/services/offlineQueue.ts` - Queue and history management
- Updated `src/services/index.ts` - Added exports

**Key Functions Implemented:**

Queue Management:
- `addToQueue(report)` - Queue report when offline, returns local confirmation number
- `getQueue()` - Get all queued reports (dates as ISO strings)
- `getQueueCount()` - Get number of pending reports
- `clearQueue()` - Clear all queued reports
- `removeFromQueue(localConfirmationNumber)` - Remove specific report
- `syncQueuedReports()` - Submit all queued reports to DMF

History Management:
- `addToHistory(report)` - Save successful submission to history
- `getHistory()` - Get all submitted reports (newest first)
- `getHistoryCount()` - Get count of history entries
- `clearHistory()` - Clear all history
- `getHistoryEntry(confirmationNumber)` - Get specific report

Combined Submission:
- `submitWithQueueFallback(input)` - Submit to DMF, auto-queue on failure

**Storage Keys (from APP_CONFIG):**
- `@harvest_queue` - Pending submissions
- `@harvest_history` - Successful submissions

**Features:**
- FIFO queue processing
- Retry count tracking per report
- Max retry limit (default 3) - expired reports are removed
- History limited to 100 entries
- Proper Date serialization (Date → ISO string → Date)
- Uses proper types (QueuedReport, SubmittedReport) from types/harvestReport.ts

**Acceptance Criteria:**
- [x] Reports saved to queue when submission fails
- [x] Queue persists across app restarts (AsyncStorage)
- [x] Sync function processes queue in order (FIFO)
- [x] Failed items remain in queue with retry count
- [x] Successful items move to history
- [x] History limited to last 100 entries
- [x] Reports exceeding max retries are removed

---

### Block 6: Supabase Backend Integration
**Priority:** Low (Future) | **Complexity:** Medium | **Status:** Deferred

**Goal:** Set up Supabase client and functions for cloud storage of user data.

**Files to Create (Future):**
- `src/services/supabaseClient.ts`
- `src/services/backendService.ts`

**Database Tables (Future):**
- `users` - User profiles
- `harvest_reports` - Copy of submissions + app-only data
- `raffle_entries` - Raffle participation

**Notes:**
- For now, all data stored locally via AsyncStorage
- Supabase integration can be added later without changing UI
- Service layer will abstract storage location

**Placeholder Acceptance Criteria:**
- [ ] Create stub functions that use AsyncStorage
- [ ] Document Supabase schema for future implementation
- [ ] Ensure easy swap from local to cloud storage

---

### Block 7: Profile Screen Enhancements
**Priority:** High | **Complexity:** Low | **Status:** COMPLETE

**Goal:** Add license status toggle that controls which identity fields are required per DMF rules.

**Files Modified:**
- `src/screens/ProfileScreen.tsx` - Added license toggle and conditional fields
- `src/types/index.ts` - Added license fields to UserProfile type

**Changes Implemented:**
1. Added "Do you have a NC Fishing License?" Yes/No toggle with styled buttons
2. When Yes: Shows WRC ID field (required) with help text
3. When No: Shows Name fields as required + ZIP code field (5 digits, validated)
4. Name fields always visible but only required when hasLicense = false
5. Email and Phone remain optional (for confirmations/raffle)
6. All data persists to AsyncStorage via existing profile save mechanism
7. Updated validation schema with conditional yup rules
8. Profile display view shows license status and relevant ID/ZIP

**UserProfile Type Updates:**
```typescript
interface UserProfile {
  hasLicense?: boolean;    // NC fishing license status
  wrcId?: string;          // Required when hasLicense = true
  zipCode?: string;        // Required when hasLicense = false
  // ... existing fields
}
```

**New UI Components:**
- License toggle section with Yes/No buttons
- Conditional WRC ID input (when Yes)
- Conditional ZIP code input (when No, 5-digit validated)
- License status display in profile view

**Acceptance Criteria:**
- [x] License toggle persists to AsyncStorage
- [x] Conditional fields show/hide based on toggle
- [x] Validation prevents save without required fields (yup conditional schema)
- [x] Data loads into Report Form correctly (stored in same profile object)

---

### Block 8: Report Form Screen Updates
**Priority:** High | **Complexity:** High | **Status:** COMPLETE

**Goal:** Update the Report Form to collect all DMF-required fields while preserving current UX flow.

**File Modified:**
- `src/screens/ReportFormScreen.tsx`

**Changes Implemented:**

1. **Area Picker Updated**
   - Uses `AREA_LABELS` from constants (official DMF area names)
   - Converts to `areaCode` using `getAreaCodeFromLabel()` on submit
   - Both label and code passed to confirmation screen

2. **Fishing Method → Hook & Line Toggle**
   - Added "Used Hook & Line?" Yes/No toggle with Switch component
   - Gear picker only visible when toggle is "No"
   - Uses `NON_HOOK_GEAR_LABELS` from constants
   - Converts to `gearCode` using `getGearCodeFromLabel()` on submit

3. **Confirmation Preferences**
   - Added "Send email confirmation from NC DMF" toggle (shows when email entered)
   - Added "Send text confirmation from NC DMF" toggle (shows when phone entered)
   - Both values passed to confirmation for DMF submission

4. **Load Profile Data**
   - Loads `hasLicense`, `wrcId`, `zipCode` from profile
   - Pre-fills name, email, phone from profile
   - Shows toast when profile data loaded

5. **Identity Fields Updated**
   - Shows WRC ID field when `hasLicense = true`
   - Shows ZIP code field when `hasLicense = false`
   - Removed legacy `angler.licenseNumber` field

6. **TEST MODE Badge**
   - Shows orange "TEST MODE" badge in header when `isTestMode()` returns true
   - Helps developers/testers know submissions won't go to real DMF

7. **Report Data Enhanced**
   - Passes all DMF fields to confirmation screen
   - Includes `areaCode`, `gearCode`, `reportingFor`, `familyCount`
   - Species aggregation will happen in Confirmation screen (Block 9)

**Existing UI Preserved:**
- Progressive disclosure (sections appear as you complete)
- Reporting type selection (Myself / Myself + Minors)
- Species picker with count +/- buttons
- Optional details toggle (length, tag)
- Multi-fish entry capability
- Photo capture for raffle
- Raffle entry section
- Toast notifications
- Abandonment confirmation modal

**Acceptance Criteria:**
- [x] All DMF-required fields collected
- [x] Hook & Line toggle controls gear picker visibility
- [x] Area codes included in submission (via getAreaCodeFromLabel)
- [x] Profile data pre-fills correctly
- [x] Validation shows inline errors
- [x] Success navigates to confirmation
- [x] TEST MODE badge shows when in mock mode
- [x] Species counts aggregated correctly (Block 9 - Confirmation screen)
- [x] Submit calls harvestReportService (Block 9 - Confirmation screen)
- [x] Handles offline gracefully (Block 9 - uses submitWithQueueFallback)

---

### Block 9: Confirmation Screen Enhancement
**Priority:** Medium | **Complexity:** Low | **Status:** COMPLETE

**Goal:** Display DMF confirmation number prominently with copy/share functionality.

**File Modified:**
- `src/screens/ConfirmationScreen.tsx` - Complete rewrite for DMF integration

**Dependencies Added:**
- `expo-clipboard` - For copy to clipboard functionality

**Changes Implemented:**

1. **DMF Submission on Mount**
   - Calls `submitWithQueueFallback()` when screen loads
   - Builds `HarvestReportInput` from `FishReportData` passed via navigation
   - Aggregates fish entries using `aggregateFishEntries()` from species constants

2. **Loading State**
   - Shows spinner while submitting to DMF
   - Displays "Submitting to NC DMF..." message
   - Shows "TEST MODE - Not sending to real DMF" note when in test mode

3. **Error State**
   - Shows error icon and message when submission fails (and not queued)
   - "Try Again" button to retry submission
   - "Return Home" button to exit

4. **Success State - Prominent Confirmation Box**
   - Large dashed-border box with confirmation number
   - 42pt bold font for number
   - Tap anywhere to copy to clipboard
   - Hint text: "Tap to copy • Show to law enforcement if inspected"

5. **Queued State (Offline)**
   - Orange/yellow header instead of green
   - Clock icon instead of checkmark
   - "LOCAL CONFIRMATION #" label
   - Warning banner: "Report saved offline. It will automatically submit when you have internet connection."
   - Hint text: "This number will update when synced"

6. **Share Functionality**
   - Share button sends formatted text message with:
     - Confirmation number
     - Date
     - Location
     - Total fish count
     - NC DMF attribution

7. **Report Summary**
   - Species summary (aggregated counts)
   - Total fish count
   - Location
   - Date
   - Method (Hook & Line or gear type)
   - Photo (if captured)

8. **Confirmation Delivery Status**
   - Shows which confirmations were sent (text/email)
   - Shows icons for each delivery method
   - Shows "Take a screenshot!" prompt if neither selected

9. **Raffle Entry Status**
   - Blue info box when raffle entered
   - Gift icon with "Raffle Entry" header
   - Note about winner contact method

10. **Legal & Info Box**
    - "What happens next?" section
    - DMF processing explanation
    - NC General Statute 113-170.3 citation

11. **Navigation Buttons**
    - "Share Confirmation" (green)
    - "Return to Home" (green)
    - "Submit Another Report" (outlined/secondary)
    - "View Report History" (outlined)

12. **TEST MODE Badge**
    - Orange badge in header when `isTestMode()` returns true
    - Consistent with Report Form screen

**Acceptance Criteria:**
- [x] Confirmation number prominently displayed
- [x] Copy to clipboard works (expo-clipboard)
- [x] Share functionality works (React Native Share)
- [x] Summary shows all relevant data (species, count, location, date)
- [x] Raffle status shows when applicable
- [x] Navigation to new report works
- [x] Navigation to history works
- [x] Queued status shows when offline
- [x] Loading state while submitting
- [x] Error state with retry option
- [x] TEST MODE badge visible

---

### Block 10: History/Past Reports Screen
**Priority:** Medium | **Complexity:** Low | **Status:** COMPLETE

**Goal:** Display saved harvest reports with confirmation numbers and sync status.

**File Modified:**
- `src/screens/PastReportsScreen.tsx` - Complete rewrite for DMF integration

**Changes Implemented:**

1. **Data Loading from DMF Services**
   - Uses `getHistory()` to load submitted reports
   - Uses `getQueue()` to load pending reports
   - Combined into unified `DisplayReport` type for consistent UI

2. **Header with Stats**
   - Shows "X submitted • Y pending" count
   - Sync button in header (refresh icon)
   - TEST MODE badge when in mock mode

3. **Pending Reports Banner**
   - Yellow warning banner when queue has pending reports
   - "Sync Now" button to trigger manual sync
   - WiFi-off icon to indicate offline status

4. **Filter Tabs**
   - "All" - Shows all reports (pending first)
   - "Submitted" - Only synced reports
   - "Pending" - Only queued reports
   - Shows count in each tab

5. **Report Cards with Confirmation Numbers**
   - Status badge (SUBMITTED green / PENDING yellow)
   - Prominent confirmation number box
     - Green dashed border for submitted
     - Yellow/orange for pending (LOCAL #)
     - Tap to copy to clipboard
   - Date, location, method summary
   - Species summary with counts
   - Retry warning for failed queued reports
   - "View Details" button

6. **Pull-to-Refresh**
   - RefreshControl on FlatList
   - Reloads both history and queue

7. **Sync Functionality**
   - Manual sync via header button or banner
   - Shows syncing indicator (spinner)
   - Alert with results (X synced, Y failed)
   - Auto-reloads after sync

8. **Detail Modal**
   - Status header (green for submitted, yellow for pending)
   - Large confirmation number with copy
   - Catch photo if available
   - Harvest details table (date, location, method, submitted/queued time)
   - Species counts table
   - Angler info (name, WRC ID)
   - DMF Object ID for submitted reports

9. **Empty States**
   - Different messages for each filter
   - "Submit Your First Report" button when no reports

**Acceptance Criteria:**
- [x] Shows all past reports from history
- [x] Shows pending count from queue
- [x] Confirmation numbers displayed prominently
- [x] Sync status indicators work (SUBMITTED/PENDING badges)
- [x] Pull-to-refresh triggers reload
- [x] Manual sync button triggers syncQueuedReports
- [x] Empty state when no reports
- [x] Filter tabs for All/Submitted/Pending
- [x] Copy confirmation number to clipboard
- [x] TEST MODE badge visible

---

### Block 11: Test Mode & Mock Submission
**Priority:** High | **Complexity:** Low | **Status:** COMPLETE

**Goal:** Implement mock submission that logs payloads without hitting DMF servers.

**Implementation:**
- Mock submission already implemented in Block 3 (harvestReportService)
- Added visual indicators to UI
- Added mode toggle in Developer Tools menu

**Files Created:**
- `src/components/TestModeBadge.tsx` - Reusable TEST MODE badge component

**Files Modified:**
- `src/config/appConfig.ts` - Added `setAppModeWithWarning()` function with production warning
- `src/screens/HomeScreen.tsx` - Added DMF Mode toggle to Developer Tools menu

**Existing Implementation (Block 3):**
- `src/services/harvestReportService.ts` - `mockSubmitToDMF()` function
  - Console logs full payload with separator lines
  - Simulates 1.5 second network delay
  - Returns fake success with generated confirmation number
  - Supports `simulateFailure` option for error testing

**Test Mode Behavior:**
1. `mockSubmitToDMF()` logs:
   - `🧪 MOCK DMF SUBMISSION (Test Mode)` header
   - Confirmation number
   - Global ID
   - Full payload JSON
   - Form data (edits) that would be sent
   - `✅ MOCK SUCCESS` or `⚠️ SIMULATED FAILURE`

2. Visual indicators:
   - Orange "TEST MODE" badge in ReportFormScreen header
   - Orange "TEST MODE" badge in ConfirmationScreen header
   - Orange "TEST MODE" badge in PastReportsScreen header
   - Reusable `TestModeBadge` component for future use

3. Mode Toggle (Developer Tools menu):
   - Shows current mode: "DMF Mode: TEST" or "DMF Mode: PRODUCTION"
   - Toggle icon changes based on mode
   - Production warning alert when switching to production

**Acceptance Criteria:**
- [x] Mock mode doesn't hit real servers (uses `mockSubmitToDMF()`)
- [x] Payloads logged to console (full payload + edits JSON)
- [x] Visual "TEST MODE" indicator shown (in ReportForm, Confirmation, PastReports)
- [x] Easy toggle between modes (Developer Tools menu)
- [x] Production mode warning when switching (destructive alert)

---

### Block 12: Connectivity Listener & Auto-Sync
**Priority:** Medium | **Complexity:** Low | **Status:** COMPLETE

**Goal:** Automatically sync queued reports when connectivity is restored.

**Files Created:**
- `src/hooks/useOfflineStatus.ts` - Hook and standalone listener for connectivity monitoring
- `src/hooks/index.ts` - Barrel export for hooks

**Files Modified:**
- `src/App.tsx` - Initialize listener on mount via AppInitializer

**Implementation:**

1. **useOfflineStatus Hook**
   - Tracks `isConnected`, `isInternetReachable`, `isOnline` status
   - Tracks `pendingCount` of queued reports
   - Tracks `isSyncing` state and `lastSyncResult`
   - Provides `triggerSync()` for manual sync
   - Provides `refreshPendingCount()` to update queue count
   - Auto-syncs on offline→online transition (configurable)
   - Callbacks for `onSyncComplete` and `onConnectivityChange`

2. **startConnectivityListener Function**
   - Standalone function for global listener (used in App.tsx)
   - Detects offline→online transitions
   - 1-second delay before sync to ensure network stability
   - Sync lock prevents duplicate operations
   - Logs sync results to console

3. **App.tsx Integration**
   - Listener started in AppInitializer useEffect
   - Properly cleaned up on unmount
   - Logs sync results (success, failed, expired counts)

**Acceptance Criteria:**
- [x] Listener starts on app launch (via AppInitializer)
- [x] Sync triggers when coming online (offline→online detection)
- [x] No duplicate syncs (syncLock ref prevents concurrent syncs)
- [x] Listener cleaned up on unmount (unsubscribe returned)
- [x] Hook exposes offline status for UI (useOfflineStatus)

---

## Implementation Order

**Phase 1: Foundation (Blocks 1-4)**
1. Block 1: Constants & Config
2. Block 2: Type Definitions
3. Block 3: DMF Service
4. Block 4: Validation

**Phase 2: Core Features (Blocks 5, 7, 8)**
5. Block 5: Offline Queue
6. Block 7: Profile Enhancements
7. Block 8: Report Form Updates

**Phase 3: Polish (Blocks 9-12)**
8. Block 9: Confirmation Screen
9. Block 10: History Screen
10. Block 11: Test Mode UI
11. Block 12: Connectivity Listener

**Phase 4: Cloud Integration (Block 6)**
12. Block 6: Supabase (when ready)

---

## Dependencies to Install

```bash
# Already installed (verify):
npm list @react-native-async-storage/async-storage
npm list @react-native-community/netinfo

# May need to install:
npm install @react-native-community/netinfo
```

---

## Testing Checklist

### Manual Testing
- [ ] Submit report in test mode - verify console logs
- [ ] Submit report in production mode - verify DMF accepts
- [ ] Submit while offline - verify queued
- [ ] Come back online - verify auto-sync
- [ ] View confirmation - verify all data correct
- [ ] View history - verify reports listed
- [ ] Change license status - verify form fields change

### Edge Cases
- [ ] Submit with no fish (should fail validation)
- [ ] Submit future date (should fail validation)
- [ ] Submit without required fields (should show errors)
- [ ] Network timeout during submit (should queue)
- [ ] Invalid WRC ID format (should warn)

---

## Notes

- Keep current UI/UX patterns - progressive disclosure works well
- Aggregate fish counts by species for DMF, but keep individual entries for user history
- Phone format for DMF: `xxx-xxx-xxxx`
- All DMF counts are strings, not numbers
- DMF dates are Unix milliseconds
- GlobalID format: `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}`
- Confirmation number = day of month + random 4-digit number
