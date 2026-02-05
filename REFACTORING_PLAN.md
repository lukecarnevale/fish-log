# Fish Harvest App - Technical Review & Refactoring Plan

## Codebase Overview

**Total source files analyzed:** 95 files across 9 directories
**Total lines of code (excluding node_modules):** ~25,000+ lines
**Architecture:** React Native + Expo, Supabase backend, Redux Toolkit + React Context state management

---

## Executive Summary

The codebase demonstrates solid architecture with good offline-first patterns, consistent data flows, and premium UI styling. However, six independent deep-dive reviews identified significant opportunities for consolidation. The primary issues are: **oversized files** (3 files exceed 1,800+ lines, with ReportFormScreen at 4,493), **duplicated patterns** across screens and components (achievement mappings, animations, modal wrappers, form inputs, loading states), and **scattered utilities** (date formatting in type files, transform logic in service files, storage keys in multiple locations).

This plan outlines a phased refactoring strategy that preserves all existing functionality and UI/UX while dramatically improving readability, maintainability, and developer experience.

---

## Part 1: Critical Findings

### 1.1 Oversized Files (Top Priority)

| File | Lines | State Vars | Animated Values | Assessment |
|------|-------|-----------|-----------------|------------|
| ReportFormScreen.tsx | 4,493 | 27+ | 36+ | Critical - must decompose |
| ProfileScreen.tsx | 2,762 | 20+ | Multiple | Critical - must decompose |
| PastReportsScreen.tsx | 1,853 | 9 | N/A | High - should decompose |
| CatchFeedScreen.tsx | 1,336 | 11 | 4 | Medium - extract hooks |
| QuarterlyRewardsCard.tsx | 1,202 | Multiple | Multiple | High - must decompose |
| HomeScreen.tsx | 1,132 | 13 | 7 | Medium - extract hooks |
| ConfirmationScreen.tsx | 1,139 | 6 | 2 | Medium - extract submission logic |
| userService.ts | 1,100 | N/A | N/A | High - split responsibilities |
| RewardsPromptModal.tsx | 936 | Multi-step | Multiple | High - decompose steps |
| reportsService.ts | 829 | N/A | N/A | Medium - split CRUD/sync |
| catchFeedService.ts | 810 | N/A | N/A | Medium - extract transforms |
| DrawerMenu.tsx | 784 | N/A | N/A | Medium - extract SVG icons |

### 1.2 Exact Code Duplication

**Achievement Color/Icon Mappings** - Identical 80+ lines duplicated word-for-word:
- `HomeScreen.tsx` (lines 49-133): `ACHIEVEMENT_COLORS`, `ACHIEVEMENT_ICONS`, `getAchievementColor()`, `getAchievementIcon()`
- `ProfileScreen.tsx` (lines 52-135): Exact same code

**Floating Header Animation** - Identical interpolation in 3 screens:
- `HomeScreen.tsx` (line 211): `scrollY.interpolate({ inputRange: [0, HEADER_HEIGHT * 0.5, HEADER_HEIGHT], outputRange: [0, 0, 1], extrapolate: 'clamp' })`
- `ReportFormScreen.tsx` (line 132): Identical
- `CatchFeedScreen.tsx` (line 432): Identical

**HEADER_HEIGHT Constant** - `const HEADER_HEIGHT = 100` defined in 3 separate files

**Pulse Animation Pattern** - Nearly identical Animated.loop sequences:
- `HomeScreen.tsx` (lines 221-240): Badge pulse animation
- `CatchFeedScreen.tsx` (lines 441-458): Live dot pulse animation

**Skeleton Shimmer Animation** - Identical animation setup in 4+ skeleton components within SkeletonLoader.tsx

**Supabase Error Handling** - Same try/catch pattern in 8+ service files:
```
try { const { data, error } = await supabase.from(table)...; if (error) { console.error(...); return null; } return data; } catch { ... }
```

**UUID Generation** - `generateUUID()` and `getDeviceId()` duplicated in both `anonymousUserService.ts` and `userService.ts`

### 1.3 Near-Duplicate Patterns

**Modal Implementations:** 6 modal components exist, but only 1 (AchievementModal) uses the AnimatedModal base. The other 5 implement their own animation logic.

**Form Input Styling:** TextInput patterns with validation error states are independently implemented in ReportFormScreen, ProfileScreen, FeedbackModal, and FishingLicenseScreen.

**Screen Wrappers:** 8 screens independently configure SafeAreaView with `edges={["left", "right"]}` + StatusBar setup.

**Button Gradients:** `LinearGradient` with `colors={[colors.primary, colors.primaryDark]}` appears identically in HomeScreen, CatchFeedScreen, and FishingLicenseScreen.

**Alert.alert("Error", ...)** pattern appears in 8+ locations with similar structure.

**AsyncStorage caching** has at least 3 different patterns across services with no shared abstraction.

### 1.4 Readability Issues

**Business logic in views:** ReportFormScreen contains 5 separate auto-save functions (lines 362-482) that do nearly identical AsyncStorage operations. These should be in a service/hook layer.

**Utilities in wrong locations:**
- Date formatting functions (`formatRelativeTime`, `formatMemberSince`) are in `types/catchFeed.ts` instead of `utils/`
- Species lookup/theme functions are in `constants/speciesColors.ts` instead of `utils/`
- `aggregateFishEntries()` utility function lives in `constants/species.ts`
- Transform functions are scattered across type files (`user.ts`, `report.ts`, `feedback.ts`)

**Inconsistent barrel exports:**
- `services/index.ts` only exports 2 of 15 services
- `utils/index.ts` only exports from `validation.ts`, missing `badgeUtils`, `debounce`, storage modules
- `constants/index.ts` doesn't export `screenLabels`

**Hardcoded data in components:**
- MandatoryHarvestCard: 9 FAQ items as hardcoded JSX (lines 177-249)
- Footer: Sponsor list hardcoded (lines 23-60)
- CatchFeedScreen: 20+ species aliases hardcoded in component (lines 320-342)
- DrawerMenu: 6 inline SVG components (lines 60-182)
- TopAnglersSection: 3 inline SVG icons (lines 33-104)

**Inconsistent naming:**
- AsyncStorage keys: some use `@` prefix (`@harvest_queue`), some don't (`userProfile`)
- Type naming: `Prize` vs `RewardsDrawing` dual systems in types/prizes.ts and types/rewards.ts
- Field naming: `harvestDate` vs `catch_date` vs `catchDate` across types

### 1.5 Architecture Observations

**Redux vs Context is well-separated** - Redux handles persistent app data (user, license, reports), Context handles feature state (rewards, achievements). This is a good pattern and should be preserved.

**Circular dependencies exist** between:
- `offlineQueue` <-> `reportsService` (lazy imports)
- `userService` <-> `reportsService` (lazy imports)

**RewardsContext is monolithic** at 519 lines, handling data fetching, business logic, auth integration, app lifecycle, drawing entry management, and calculated values.

**AppInitializer in App.tsx** is ~200 lines of complex initialization logic (deep links, data loading, connectivity monitoring, pending submissions, auth state) all in one component.

---

## Part 2: Refactoring Plan

### Phase 1: Extract Shared Constants & Utilities (Low Risk, High Impact)

These changes are pure extraction/consolidation with zero behavior change.

**Step 1.1: Achievement Mappings**
- Create `src/constants/achievementMappings.ts`
- Move `ACHIEVEMENT_COLORS`, `ACHIEVEMENT_ICONS`, `getAchievementColor()`, `getAchievementIcon()` from HomeScreen and ProfileScreen
- Update imports in both files
- **Lines saved:** ~80 duplicated lines removed
- **Risk:** Very low - pure move

**Step 1.2: UI Constants**
- Create `src/constants/ui.ts`
- Move `HEADER_HEIGHT = 100` (currently in 3 files)
- Add any other shared UI constants discovered during implementation
- **Risk:** Very low

**Step 1.3: Storage Keys Consolidation**
- Create `src/constants/storageKeys.ts`
- Centralize all AsyncStorage keys from `appConfig.ts`, `badgeUtils.ts`, `secureStorage.ts`, and scattered string literals
- Standardize naming convention (recommend `@app_` prefix for all)
- **Risk:** Low - must be thorough to find all string literals

**Step 1.4: UUID/Device ID Extraction**
- Create `src/utils/deviceId.ts`
- Move `generateUUID()` and `getDeviceId()` from both `anonymousUserService.ts` and `userService.ts`
- Update imports in both services
- **Lines saved:** ~40 duplicated lines
- **Risk:** Low

**Step 1.5: Date Utilities**
- Create `src/utils/dateUtils.ts`
- Move `formatRelativeTime()` and `formatMemberSince()` from `types/catchFeed.ts`
- Move quarter calculation functions from `data/rewardsFallbackData.ts`
- **Risk:** Low - pure move

**Step 1.6: Relocate Misplaced Utilities**
- Move `aggregateFishEntries()` from `constants/species.ts` to `utils/speciesUtils.ts`
- Move species theme/lookup helpers from `constants/speciesColors.ts` to `utils/speciesUtils.ts` (keep the raw data in constants)
- Move transform functions from type files to `utils/transforms.ts`
- **Risk:** Low

**Step 1.7: Fix Barrel Exports**
- Update `services/index.ts` to export all 15 services
- Update `utils/index.ts` to export all utility modules
- Update `constants/index.ts` to include `screenLabels` and new files
- **Risk:** Very low

**Step 1.8: Extract Hardcoded Data**
- Create `constants/faqData.ts` for MandatoryHarvestCard FAQ items
- Create `constants/sponsorsData.ts` for Footer sponsor list
- Create `constants/speciesAliases.ts` for CatchFeedScreen alias map
- **Risk:** Low

---

### Phase 2: Extract Custom Hooks (Low-Medium Risk)

These create new abstractions from repeated patterns across screens.

**Step 2.1: `useFloatingHeaderAnimation` Hook**
- Create `src/hooks/useFloatingHeaderAnimation.ts`
- Encapsulate: `scrollY` Animated.Value creation, `floatingOpacity` interpolation, `HEADER_HEIGHT` usage
- Replace in: HomeScreen, ReportFormScreen, CatchFeedScreen
- **Lines saved:** ~20 per screen (60 total)

**Step 2.2: `usePulseAnimation` Hook**
- Create `src/hooks/usePulseAnimation.ts`
- Encapsulate: Animated.Value, Animated.loop with sequence, cleanup
- Parameters: `duration` (default 1000ms), `enabled` (conditional)
- Replace in: HomeScreen (badge pulse), CatchFeedScreen (live dot)

**Step 2.3: `useSkeletonAnimation` Hook**
- Create `src/hooks/useSkeletonAnimation.ts`
- Encapsulate the shimmer animation pattern used in all skeleton loaders
- Replace in: SkeletonLoader.tsx (4 internal components), SpeciesInfoScreen SkeletonCard

**Step 2.4: `useToast` Hook + Toast Component**
- Create `src/hooks/useToast.ts` and `src/components/Toast.tsx`
- Extract from ReportFormScreen (lines 197-227): toast state, animation, show/hide logic
- Make reusable for any screen that needs toast notifications

**Step 2.5: `useFormValidation` Hook**
- Create `src/hooks/useFormValidation.ts`
- Standardize validation pattern used across ReportFormScreen and ProfileScreen
- Support both inline validation and Yup/Zod schemas
- Provide consistent `validationErrors` state and `validate()` function

**Step 2.6: `useAutoSave` Hook**
- Create `src/hooks/useAutoSave.ts`
- Extract the repeated AsyncStorage save-toggle pattern from ReportFormScreen (5 functions doing nearly identical operations)
- Provide: `toggle(key, value)`, `save(key, value)`, `load(key)`

---

### Phase 3: Extract Shared Components (Medium Risk)

New components that consolidate duplicated UI patterns.

**Step 3.1: `GradientButton` Component**
- Create `src/components/GradientButton.tsx`
- Consolidate the `LinearGradient` + `TouchableOpacity` button pattern used in HomeScreen, CatchFeedScreen, FishingLicenseScreen
- Props: `title`, `onPress`, `colors?`, `style?`, `disabled?`

**Step 3.2: `FormInput` Component**
- Create `src/components/FormInput.tsx`
- Consolidate TextInput + label + error display pattern from ProfileScreen, ReportFormScreen, FeedbackModal, FishingLicenseScreen
- Props: `label?`, `value`, `onChangeText`, `error?`, `placeholder`, `multiline?`, etc.

**Step 3.3: SVG Icon Library**
- Create `src/components/icons/` directory
- Move inline SVGs from DrawerMenu (6 icons), TopAnglersSection (3 icons), MandatoryHarvestCard (1 icon)
- Export as individual components from `icons/index.ts`
- **Lines moved:** ~300+ lines of SVG out of component files

**Step 3.4: Expand Modal Base Usage**
- AnimatedModal already exists and works well
- Refactor AnglerProfileModal, FeedbackModal, and WrcIdInfoModal to use AnimatedModal as their base
- This gives all modals consistent animation behavior without changing their content or appearance
- **Important:** Do not change any modal's visible UI/UX - only the animation wrapper

---

### Phase 4: Decompose Large Files (Medium-High Risk)

Breaking down the oversized files into focused sub-components. Each decomposition must maintain identical UI/UX.

**Step 4.1: ReportFormScreen Decomposition (4,493 lines -> ~1,500 + sub-components)**

Split into:
```
src/screens/ReportFormScreen.tsx          (orchestrator, ~1,500 lines)
src/screens/reportForm/FishEntryForm.tsx  (fish species input section)
src/screens/reportForm/AnglerInfoSection.tsx (contact details section)
src/screens/reportForm/RaffleEntrySection.tsx (rewards/raffle section)
src/screens/reportForm/useReportForm.ts   (form state management hook)
src/screens/reportForm/useReportFormAutoSave.ts (auto-save logic)
```

The orchestrator (ReportFormScreen) manages:
- Navigation and scroll position
- Top-level form state (passed down as props)
- Submit flow coordination
- Toast notifications

Each sub-component receives props and callbacks, maintaining the exact same rendering.

**Step 4.2: ProfileScreen Decomposition (2,762 lines)**

Split into:
```
src/screens/ProfileScreen.tsx               (orchestrator)
src/screens/profile/ProfileForm.tsx         (form fields section)
src/screens/profile/ProfileAchievements.tsx (achievements display)
src/screens/profile/ProfileStats.tsx        (stats section)
src/screens/profile/useProfileForm.ts       (form state + validation)
```

**Step 4.3: QuarterlyRewardsCard Decomposition (1,202 lines)**

Split into:
```
src/components/QuarterlyRewardsCard.tsx                  (main card)
src/components/quarterlyRewards/RewardsDetailModal.tsx   (detail modal)
src/components/quarterlyRewards/RewardsIllustrations.tsx (SVG illustrations)
src/components/quarterlyRewards/RewardsSkeleton.tsx      (skeleton loader)
src/components/quarterlyRewards/useRewardsCard.ts        (state hook)
```

**Step 4.4: RewardsPromptModal Decomposition (936 lines)**

Split into:
```
src/components/RewardsPromptModal.tsx          (step manager)
src/components/rewardsPrompt/RewardsFormStep.tsx
src/components/rewardsPrompt/EmailSentStep.tsx
src/components/rewardsPrompt/LoginStep.tsx
src/components/rewardsPrompt/useRewardsMagicLink.ts
```

**Step 4.5: PastReportsScreen Decomposition (1,853 lines)**

Split into:
```
src/screens/PastReportsScreen.tsx              (orchestrator)
src/screens/pastReports/ReportCard.tsx         (individual report card)
src/screens/pastReports/ReportTabs.tsx         (tab navigation)
src/screens/pastReports/ReportFilters.tsx      (filtering controls)
src/screens/pastReports/usePastReports.ts      (data loading hook)
```

---

### Phase 5: Service Layer Improvements (Medium Risk)

**Step 5.1: Supabase Query Helper**
- Create `src/services/base/supabaseHelper.ts`
- Provide `withConnection<T>(operation, fallback)` utility
- Provide `handleSupabaseError(error, context)` utility
- Replace the 8+ identical try/catch patterns across services

**Step 5.2: AsyncStorage Cache Factory**
- Create `src/utils/cache.ts`
- Provide `createCache<T>(key, options?)` factory with TTL support
- Replace the 10+ ad-hoc caching patterns across services

**Step 5.3: Data Transform Layer**
- Create `src/services/transformers/` directory
- Consolidate all snake_case -> camelCase transformations
- One transformer per entity type (advertisement, fishSpecies, harvestReport, user, etc.)

**Step 5.4: Split userService.ts (1,100 lines)**
- `src/services/userProfileService.ts` - Profile CRUD operations
- `src/services/rewardsConversionService.ts` - Anonymous -> rewards member flow
- `src/services/userService.ts` - Core user identity (reduced)

**Step 5.5: Resolve Circular Dependencies**
- Break `offlineQueue` <-> `reportsService` cycle via event pattern or dependency injection
- Break `userService` <-> `reportsService` cycle similarly

---

### Phase 6: Style & Type Cleanup (Low Risk)

**Step 6.1: Common Styles Expansion**
- Add modal styles to `common.ts` (currently duplicated in 3+ screen style files)
- Add divider styles (duplicated in 3 files)
- Add input field styles (duplicated in 2 screen style files)

**Step 6.2: Replace Hardcoded Style Values**
- Replace ~30+ hardcoded `borderRadius: 12`, `borderRadius: 16`, `borderRadius: 24` with `borderRadius.md/lg/xl`
- Replace ~15+ hardcoded `padding: 16` with `spacing.md`
- Replace ~12+ hardcoded `marginTop: 24` with `spacing.lg`
- Add magic number constants for z-index hierarchy, opacity values, dimension sizes

**Step 6.3: Consolidate Type Definitions**
- Remove `types/prizes.ts` (legacy), update all imports to use `types/rewards.ts`
- Resolve `User` / `UserProfile` / `FishReportData` overlap - create shared base type
- Consolidate the 3 species type representations (`FishSpecies`, `EnhancedFishSpecies`, `SpeciesInfo`)

**Step 6.4: Remove Unused Code**
- Verify and remove abandoned swipe-to-dismiss in ConfirmationScreen
- Verify and remove `clearNewCatchesIndicator()` in badgeUtils if unused
- Verify `debounce.ts` usage - remove if unused
- Remove deprecated `setAppMode()` / `setAppModeWithWarning()` from appConfig
- Remove `prizesData.ts` (marked deprecated)
- Clean up extensive `console.log` debugging statements in CatchFeedScreen (lines 299-317)

---

### Phase 7: App Structure Improvements (Medium Risk)

**Step 7.1: Decompose AppInitializer**
- Extract `useInitializeData()` hook - Redux data fetching
- Extract `useDeepLinkHandler()` hook - Magic link processing
- Extract `useConnectivityMonitoring()` hook - Sync on network restore
- Extract `usePendingSubmissionRecovery()` hook - Mid-auth recovery

**Step 7.2: Split RewardsContext**
- `RewardsDataProvider` - Data fetching, caching, refresh logic
- `RewardsUIProvider` - Calculated values, UI-specific derived state
- Extract pure helper functions (`calculateDaysRemaining`, etc.) to `utils/rewards/rewardsCalculations.ts`

---

## Part 3: Implementation Strategy

### Recommended Order

**Week 1-2: Phase 1 (Constants & Utilities)**
- Lowest risk, immediate improvement to code organization
- Every subsequent phase benefits from these extractions
- Can be done file-by-file with easy verification

**Week 2-3: Phase 2 (Custom Hooks)**
- Medium risk but high impact on readability
- Each hook is independently testable
- Reduces complexity in screen files before decomposition

**Week 3-4: Phase 3 (Shared Components)**
- Requires careful testing of visual output
- GradientButton and FormInput are the highest value
- SVG extraction is tedious but safe

**Week 4-6: Phase 4 (File Decomposition)**
- Highest risk phase - must be done carefully
- Start with QuarterlyRewardsCard (isolated component, easier to verify)
- Then RewardsPromptModal (self-contained modal flow)
- Then ReportFormScreen (most complex, most impactful)
- Then ProfileScreen and PastReportsScreen
- Each decomposition should be its own PR with thorough testing

**Week 6-7: Phase 5 (Service Layer)**
- Moderate risk, requires regression testing of all data flows
- Supabase helper and cache factory provide the most value
- Service splitting should be done one service at a time

**Week 7-8: Phase 6 (Styles & Types)**
- Low risk cleanup pass
- Style changes must be visually verified screen-by-screen
- Type changes need full TypeScript compilation verification

**Week 8: Phase 7 (App Structure)**
- Should be done last as it touches initialization flow
- Each extracted hook should be tested independently

### Testing Strategy for Each Change

1. **Before any change:** Capture screenshots of every screen in both light and dark states
2. **After each phase:** Compare screenshots pixel-by-pixel to verify zero UI change
3. **For service changes:** Run the full app flow (report → submit → confirmation → past reports)
4. **For decompositions:** Verify all props are passed correctly by testing every interaction on the affected screen
5. **TypeScript compiler** must pass with zero errors after every change

### Risk Mitigation

- Make each Phase a separate branch/PR
- Within phases, each Step can be a separate commit
- Never refactor more than one screen at a time in Phase 4
- Keep the old code commented out (not deleted) until verified, then clean up in a follow-up commit
- Run the app on both iOS and Android after each step

---

## Part 4: Expected Outcomes

### Quantitative Impact

| Metric | Before | After (Estimated) |
|--------|--------|-------------------|
| Largest file (ReportFormScreen) | 4,493 lines | ~1,500 lines |
| Duplicated code lines | ~600+ lines | ~50 lines |
| Files >1,000 lines | 8 files | 2-3 files |
| Custom hooks | 3 | 10+ |
| Shared components | 26 | 32+ |
| Avg screen complexity | Complex | Medium |

### Qualitative Impact

- **New developer onboarding:** A developer can understand any single file in under 10 minutes (vs. 30+ for ReportFormScreen today)
- **Bug fixes:** Changes to shared patterns (modals, forms, loading states) happen in one place
- **Feature additions:** New screens can compose from existing hooks and components
- **Testing:** Extracted hooks and components are independently unit-testable
- **Code review:** Smaller, focused files are easier to review

---

## Appendix: File Inventory

### Screens (9 files, ~14,900 lines total)
| File | Lines | Phase |
|------|-------|-------|
| ReportFormScreen.tsx | 4,493 | Phase 4.1 |
| ProfileScreen.tsx | 2,762 | Phase 4.2 |
| PastReportsScreen.tsx | 1,853 | Phase 4.5 |
| CatchFeedScreen.tsx | 1,336 | Phase 2 |
| ConfirmationScreen.tsx | 1,139 | Phase 2 |
| HomeScreen.tsx | 1,132 | Phase 1-2 |
| SpeciesInfoScreen.tsx | 1,040 | Phase 2 |
| FishingLicenseScreen.tsx | 782 | Phase 3 |
| LegalDocumentScreen.tsx | 375 | No changes needed |

### Components (26 files, ~10,900 lines total)
| File | Lines | Phase |
|------|-------|-------|
| QuarterlyRewardsCard.tsx | 1,202 | Phase 4.3 |
| RewardsPromptModal.tsx | 936 | Phase 4.4 |
| DrawerMenu.tsx | 784 | Phase 3.3 |
| MandatoryHarvestCard.tsx | 511 | Phase 1.8 |
| CatchCard.tsx | 505 | No changes needed |
| AdvertisementBanner.tsx | 501 | No changes needed |
| AnglerProfileModal.tsx | 474 | Phase 3.4 |
| CardBadges.tsx | 411 | No changes needed |
| SkeletonLoader.tsx | 367 | Phase 2.3 |
| TopAnglersSection.tsx | 367 | Phase 3.3 |
| FeedbackModal.tsx | 364 | Phase 3.4 |
| Footer.tsx | 362 | Phase 1.8 |
| AchievementModal.tsx | 321 | No changes needed |
| SpeciesPlaceholder.tsx | 305 | No changes needed |
| ScreenLayout.tsx | 257 | No changes needed |
| BottomDrawer.tsx | 227 | No changes needed |
| QuickActionCard.tsx | 221 | No changes needed |
| LicenseTypePicker.tsx | 214 | No changes needed |
| QuickActionGrid.tsx | 206 | No changes needed |
| CatchInfoBadge.tsx | 190 | No changes needed |
| AnimatedModal.tsx | 180 | No changes needed |
| WrcIdInfoModal.tsx | 129 | Phase 3.4 |
| TestModeBadge.tsx | 127 | No changes needed |
| NCFlagIcon.tsx | 118 | No changes needed |
| WaveBackground.tsx | 46 | No changes needed |
| WavyMenuIcon.tsx | 43 | No changes needed |

### Services (15 files, ~8,500 lines total)
| File | Lines | Phase |
|------|-------|-------|
| userService.ts | 1,100 | Phase 5.4 |
| reportsService.ts | 829 | Phase 5 |
| catchFeedService.ts | 810 | Phase 5 |
| statsService.ts | 774 | Phase 5 |
| rewardsService.ts | 710 | Phase 5 |
| offlineQueue.ts | 611 | Phase 5.5 |
| anonymousUserService.ts | 458 | Phase 1.4 |
| harvestReportService.ts | 400 | Phase 5 |
| pendingSubmissionService.ts | 386 | No changes needed |
| authService.ts | 372 | No changes needed |
| fishSpeciesService.ts | 348 | Phase 5 |
| advertisementsService.ts | 233 | Phase 5 |
| photoUploadService.ts | 220 | No changes needed |
| zipCodeService.ts | 191 | No changes needed |
| feedbackService.ts | 171 | No changes needed |

### New Files to Create
```
src/constants/achievementMappings.ts
src/constants/ui.ts
src/constants/storageKeys.ts
src/constants/faqData.ts
src/constants/sponsorsData.ts
src/constants/speciesAliases.ts

src/utils/deviceId.ts
src/utils/dateUtils.ts
src/utils/speciesUtils.ts
src/utils/transforms.ts
src/utils/cache.ts
src/utils/rewards/rewardsCalculations.ts

src/hooks/useFloatingHeaderAnimation.ts
src/hooks/usePulseAnimation.ts
src/hooks/useSkeletonAnimation.ts
src/hooks/useToast.ts
src/hooks/useFormValidation.ts
src/hooks/useAutoSave.ts
src/hooks/useInitializeData.ts
src/hooks/useDeepLinkHandler.ts

src/components/GradientButton.tsx
src/components/FormInput.tsx
src/components/Toast.tsx
src/components/icons/index.ts
src/components/icons/DrawerIcons.tsx
src/components/icons/TopAnglerIcons.tsx
src/components/icons/MandatoryHarvestIcons.tsx

src/screens/reportForm/FishEntryForm.tsx
src/screens/reportForm/AnglerInfoSection.tsx
src/screens/reportForm/RaffleEntrySection.tsx
src/screens/reportForm/useReportForm.ts
src/screens/reportForm/useReportFormAutoSave.ts

src/screens/profile/ProfileForm.tsx
src/screens/profile/ProfileAchievements.tsx
src/screens/profile/ProfileStats.tsx
src/screens/profile/useProfileForm.ts

src/screens/pastReports/ReportCard.tsx
src/screens/pastReports/ReportTabs.tsx
src/screens/pastReports/usePastReports.ts

src/components/quarterlyRewards/RewardsDetailModal.tsx
src/components/quarterlyRewards/RewardsIllustrations.tsx
src/components/quarterlyRewards/RewardsSkeleton.tsx
src/components/quarterlyRewards/useRewardsCard.ts

src/components/rewardsPrompt/RewardsFormStep.tsx
src/components/rewardsPrompt/EmailSentStep.tsx
src/components/rewardsPrompt/LoginStep.tsx
src/components/rewardsPrompt/useRewardsMagicLink.ts

src/services/base/supabaseHelper.ts
src/services/transformers/index.ts
src/services/userProfileService.ts
src/services/rewardsConversionService.ts
```
