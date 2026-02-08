# NC Fish Log - Automated Testing Implementation Plan

> **Stack**: React Native 0.81 · Expo SDK 54 · TypeScript 5.9 · Redux Toolkit · React Query · Supabase
> **Created**: 2026-02-07

---

## Overview

This plan introduces automated testing across the NC Fish Log codebase in **5 phases**, ordered by impact and dependency. Each phase builds on the previous one.

**Current state**: 0 tests, 0 coverage, no test infrastructure configured.

---

## Phase 1: Foundation & Infrastructure

**Goal**: Install dependencies, configure Jest, set up global mocks, and establish testing conventions.

### 1.1 Install Dependencies

```bash
# Core test runner (use npx expo install for compatibility)
npx expo install jest-expo jest

# Testing library (React 19 compatible)
npm install --save-dev @testing-library/react-native @testing-library/jest-native

# Network-level API mocking
npm install --save-dev msw

# CI test reporting
npm install --save-dev jest-junit
```

| Package | Version | Purpose |
|---------|---------|---------|
| `jest-expo` | `~54.0.x` | Expo-aware Jest preset (handles Babel, assets, native stubs) |
| `jest` | `^29.x` | Test runner (peer of jest-expo) |
| `@testing-library/react-native` | `^13.3.x` | Component rendering & queries (replaces deprecated `react-test-renderer`) |
| `@testing-library/jest-native` | `^5.4.x` | Extended matchers (`toBeVisible()`, `toHaveStyle()`) |
| `msw` | `^2.x` | Mock Service Worker for intercepting Supabase REST calls |
| `jest-junit` | `^16.x` | JUnit XML reporter for CI pipelines |

> **Do NOT install**: `ts-jest` (unnecessary — `jest-expo` uses `babel-jest`), `react-test-renderer` (incompatible with React 19), `@testing-library/react-hooks` (deprecated — `renderHook` is built into RNTL v13+).

### 1.2 Jest Configuration

Create `jest.config.ts` at project root:

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],

  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@supabase/.*|@tanstack/.*))',
  ],

  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.ts',
  },

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/types/**',
    '!src/data/**',
    '!src/styles/**',
    '!src/assets/**',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },

  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],

  clearMocks: true,
  restoreMocks: true,
};

export default config;
```

### 1.3 Global Mock Setup

Create `jest.setup.ts` at project root:

```typescript
import '@testing-library/jest-native/extend-expect';

// Animated API
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// AsyncStorage
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View, ImageBackground: View };
});

// expo-secure-store
jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
  };
});

// expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

// expo-linking
jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  createURL: jest.fn((path: string) => `exp://localhost:8081/${path}`),
}));
```

### 1.4 Asset Mock

Create `__mocks__/fileMock.ts`:

```typescript
export default 'test-file-stub';
```

### 1.5 Supabase Mock (Direct — for unit tests)

Create `src/__tests__/mocks/supabase.ts`:

```typescript
export const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    then: jest.fn(),
  })),
  auth: {
    getSession: jest.fn(() =>
      Promise.resolve({ data: { session: null }, error: null })
    ),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(() => ({
        data: { publicUrl: 'https://example.com/photo.jpg' },
      })),
    })),
  },
};

export const mockIsSupabaseConnected = jest.fn(() => Promise.resolve(true));
```

### 1.6 MSW Handlers (Network-level — for integration tests)

Create `src/__tests__/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';

export const handlers = [
  http.get(`${SUPABASE_URL}/rest/v1/fish_species`, () => {
    return HttpResponse.json([
      { id: 1, common_name: 'Red Drum', scientific_name: 'Sciaenops ocellatus' },
      { id: 2, common_name: 'Flounder', scientific_name: 'Paralichthys dentatus' },
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/harvest_reports`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: 'mock-uuid' }, { status: 201 });
  }),
];
```

Create `src/__tests__/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

### 1.7 Custom Test Renderer with Providers

Create `src/test-utils.tsx`:

```typescript
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store';

const Stack = createStackNavigator();

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

interface WrapperOptions {
  initialRouteName?: string;
  routeParams?: Record<string, unknown>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRouteName = 'TestScreen',
    routeParams,
    ...renderOptions
  }: WrapperOptions & RenderOptions = {}
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName={initialRouteName}>
              <Stack.Screen name={initialRouteName} initialParams={routeParams}>
                {() => children}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}

export * from '@testing-library/react-native';
export { renderWithProviders as render };
```

### 1.8 NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --ci --reporters=default --reporters=jest-junit"
  }
}
```

### 1.9 File Structure

```
fish-log/
├── jest.config.ts
├── jest.setup.ts
├── __mocks__/
│   └── fileMock.ts
└── src/
    ├── test-utils.tsx
    └── __tests__/
        └── mocks/
            ├── supabase.ts
            ├── handlers.ts
            └── server.ts
```

### 1.10 Verification

Write a single smoke test to confirm the entire pipeline works:

```typescript
// src/__tests__/smoke.test.ts
describe('Test infrastructure', () => {
  it('runs a test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run `npm test` and confirm it passes before proceeding to Phase 2.

---

## Phase 2: Pure Functions & Utilities

**Goal**: Achieve high coverage on all pure, side-effect-free logic. These are the easiest to test and contain critical business rules.

### Priority Order

| # | File | Key Functions | Why |
|---|------|---------------|-----|
| 1 | `src/utils/validation.ts` | `validateHarvestReport()`, field validators | Core form validation — bugs here cause bad DMF submissions |
| 2 | `src/utils/formValidation.ts` | Email, phone, zip, license validators | User input boundary |
| 3 | `src/utils/rewards/rewardsCalculations.ts` | Days remaining, progress %, quarter dates | Rewards correctness |
| 4 | `src/utils/dateUtils.ts` | Date formatting, comparison helpers | Used across the app |
| 5 | `src/utils/badgeUtils.ts` | Badge state computation | Notification logic |
| 6 | `src/utils/debounce.ts` | Debounce implementation | Shared utility |
| 7 | `src/utils/cache.ts` | Cache TTL logic | Data freshness |
| 8 | `src/services/transformers/*.ts` | `advertisementTransformer`, `fishSpeciesTransformer`, `userTransformer` | Data shape contracts between DB and app |
| 9 | `src/constants/validationSchemas.ts` | Regex patterns, rules | Validation correctness |

### Testing Pattern

```typescript
// src/utils/__tests__/validation.test.ts
import { validateHarvestReport } from '../validation';

describe('validateHarvestReport', () => {
  it('rejects report with no species selected', () => {
    const result = validateHarvestReport({ species: '', weight: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'species' })
    );
  });

  it('accepts a complete valid report', () => {
    const result = validateHarvestReport({
      species: 'Red Drum',
      weight: 5.2,
      date: '2026-02-07',
      area: 'A1',
      gear: 'Hook and Line',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Edge cases
  it('handles null weight gracefully', () => { /* ... */ });
  it('rejects negative weight', () => { /* ... */ });
  it('validates date format', () => { /* ... */ });
});
```

### Coverage Target

- **Lines**: 90%+
- **Branches**: 85%+ (especially validation branching logic)

---

## Phase 3: Services & Redux Store

**Goal**: Test the core business logic layer that sits between the UI and Supabase.

### 3.1 Redux Slices

Test slices as a whole using a real store (official Redux recommendation):

| Slice | Key Behaviors to Test |
|-------|-----------------------|
| `fishReportsSlice` | `fetchFishReports` (async thunk), `addReport`, `updateReport`, `deleteReport`, entity selectors |
| `userSlice` | `setUser`, `clearUser`, `updateUser`, auth state transitions |
| `licenseSlice` | `setLicense`, `clearLicense`, validity checks |

```typescript
// src/store/__tests__/fishReportsSlice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import fishReportsReducer, { addReport, selectAllReports } from '../slices/fishReportsSlice';

describe('fishReportsSlice', () => {
  const createStore = () =>
    configureStore({ reducer: { fishReports: fishReportsReducer } });

  it('adds a report to state', () => {
    const store = createStore();
    const report = { id: '1', species: 'Red Drum', weight: 5.2 };

    store.dispatch(addReport(report));

    expect(selectAllReports(store.getState())).toContainEqual(report);
  });
});
```

### 3.2 Services (Priority Order)

Services are tested by mocking the Supabase client and AsyncStorage. Use the direct mock from Phase 1.

| # | Service | Test Focus | Mock Strategy |
|---|---------|------------|---------------|
| 1 | `reportsService.ts` | Submit, fetch, sync, offline fallback | Supabase mock + AsyncStorage mock |
| 2 | `statsService.ts` | Stat calculations, achievement checks | Supabase mock |
| 3 | `offlineQueue.ts` | Enqueue, flush, retry, persistence | AsyncStorage + NetInfo mock |
| 4 | `rewardsService.ts` | Fetch config, enter drawing, caching | Supabase mock + AsyncStorage |
| 5 | `authService.ts` | Sign in, sign out, session management | Supabase auth mock |
| 6 | `pendingSubmissionService.ts` | Queue, recover, clear | AsyncStorage mock |
| 7 | `catchFeedService.ts` | Fetch feed, filter, top anglers | Supabase mock |
| 8 | `userProfileService.ts` | CRUD profile, image handling | Supabase mock + storage mock |
| 9 | `harvestReportService.ts` | DMF payload formatting, HTTP submission | Supabase mock |
| 10 | `anonymousUserService.ts` | Device tracking, user creation | AsyncStorage + Supabase mock |
| 11 | `photoUploadService.ts` | Upload, URL generation | Supabase storage mock |
| 12 | `fishSpeciesService.ts` | Species lookup, caching | Supabase mock |
| 13 | `rewardsConversionService.ts` | Membership logic, conversion | Supabase mock |

### Testing Pattern

```typescript
// src/services/__tests__/reportsService.test.ts
jest.mock('../../config/supabase', () => ({
  supabase: require('../../__tests__/mocks/supabase').mockSupabase,
  isSupabaseConnected: require('../../__tests__/mocks/supabase').mockIsSupabaseConnected,
}));

import { getLocalReports, submitReport } from '../reportsService';

describe('reportsService', () => {
  describe('submitReport', () => {
    it('submits to Supabase when connected', async () => { /* ... */ });
    it('queues to offline queue when disconnected', async () => { /* ... */ });
    it('handles Supabase errors gracefully', async () => { /* ... */ });
  });

  describe('getLocalReports', () => {
    it('returns reports from AsyncStorage', async () => { /* ... */ });
    it('returns empty array when no reports stored', async () => { /* ... */ });
  });
});
```

### 3.3 Data Flows to Test End-to-End (Integration)

These are the critical multi-service flows. Use MSW for network-level mocking:

1. **Report Submission Flow**: ReportForm input -> validation -> reportsService -> statsService -> achievement check
2. **Offline Sync Flow**: Enqueue offline -> detect connectivity -> flush queue -> confirm sync
3. **Rewards Entry Flow**: Submit report -> check eligibility -> enter drawing -> update context

### Coverage Target

- **Services**: 85%+ lines, 80%+ branches
- **Redux slices**: 90%+ (they're simple reducers)

---

## Phase 4: Hooks, Contexts & Components

**Goal**: Test stateful logic (hooks, contexts) and UI components.

### 4.1 Custom Hooks

Use `renderHook` from `@testing-library/react-native`:

| # | Hook | Test Focus |
|---|------|------------|
| 1 | `useBadgeData` | Badge state loading, refresh, error handling |
| 2 | `useOfflineStatus` | Connectivity state transitions |
| 3 | `useZipCodeLookup` | Debounced lookup, validation |
| 4 | `useInitializeData` | Data loading sequence, error recovery |
| 5 | `usePendingSubmissionRecovery` | Recovery on app resume |
| 6 | `useConnectivityMonitoring` | Online/offline state changes |
| 7 | `useAuthStateListener` | Auth state change callbacks |
| 8 | `usePartners` | Partner data fetching |
| 9 | `useDeepLinkHandler` | Deep link routing |

```typescript
// src/hooks/__tests__/useOfflineStatus.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStatus } from '../useOfflineStatus';

describe('useOfflineStatus', () => {
  it('reports online when connected', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => expect(result.current.isOffline).toBe(false));
  });

  it('reports offline when disconnected', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => expect(result.current.isOffline).toBe(true));
  });
});
```

### 4.2 Context Providers

| Context | Test Focus |
|---------|------------|
| `RewardsContext` | Provides config, handles drawing entry, refresh, quarter transitions |
| `AchievementContext` | Queues achievements, deferred display, flush |

```typescript
// src/contexts/__tests__/RewardsContext.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { RewardsProvider, useRewards } from '../RewardsContext';

function TestConsumer() {
  const { isLoading, config } = useRewards();
  if (isLoading) return <Text testID="loading">Loading</Text>;
  return <Text testID="quarter">{config?.quarter}</Text>;
}

describe('RewardsContext', () => {
  it('provides rewards data to consumers', async () => {
    const { getByTestId } = render(
      <RewardsProvider><TestConsumer /></RewardsProvider>
    );
    await waitFor(() => expect(getByTestId('quarter')).toBeTruthy());
  });
});
```

### 4.3 UI Components

Test in order of reuse frequency and complexity:

| Tier | Components | Strategy |
|------|-----------|----------|
| **Tier 1: Core** | `ScreenLayout`, `GradientButton`, `FormInput`, `Footer` | Render + interaction tests |
| **Tier 2: Feature** | `QuarterlyRewardsCard`, `CatchCard`, `MandatoryHarvestCard`, `DrawerMenu` | Render + prop variations + interaction |
| **Tier 3: Modals** | `AchievementModal`, `RewardsPromptModal`, `FeedbackModal`, `AnimatedModal` | Visibility toggling, form submission |
| **Tier 4: Simple** | `SkeletonLoader`, `CatchInfoBadge`, `TestModeBadge`, `WaveBackground` | Render-only smoke tests |

```typescript
// src/components/__tests__/GradientButton.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GradientButton from '../GradientButton';

describe('GradientButton', () => {
  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <GradientButton title="Submit" onPress={onPress} />
    );
    await fireEvent.press(getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <GradientButton title="Submit" onPress={onPress} disabled />
    );
    await fireEvent.press(getByText('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', async () => {
    const { getByTestId } = await render(
      <GradientButton title="Submit" onPress={jest.fn()} loading />
    );
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
```

### Coverage Target

- **Hooks**: 80%+
- **Contexts**: 80%+
- **Components**: 75%+ (focus on logic, not layout pixels)

---

## Phase 5: Screen Tests & E2E

**Goal**: Validate full user flows at the screen level and with end-to-end testing.

### 5.1 Screen Component Tests

Use the `renderWithProviders` helper from `src/test-utils.tsx`. Focus on **user-visible behavior**, not implementation details.

| # | Screen | Key Scenarios |
|---|--------|---------------|
| 1 | `HomeScreen` | Renders dashboard, shows notifications, navigates to report form |
| 2 | `ReportFormScreen` | Form field interaction, validation errors, photo attachment, submission |
| 3 | `ConfirmationScreen` | Displays confirmation data, raffle entry, navigation back |
| 4 | `ProfileScreen` | Loads profile, displays achievements, edit mode |
| 5 | `PastReportsScreen` | Renders report list, filtering, sorting |
| 6 | `CatchFeedScreen` | Loads feed, displays leaderboard, species filter |
| 7 | `FishingLicenseScreen` | WRC ID input, validation, lookup |
| 8 | `SpeciesInfoScreen` | Species list rendering, detail view |
| 9 | `LegalDocumentScreen` | Renders static content |

```typescript
// src/screens/__tests__/HomeScreen.test.tsx
import React from 'react';
import { render, waitFor } from '../../test-utils';
import HomeScreen from '../HomeScreen';

describe('HomeScreen', () => {
  it('renders the main dashboard', async () => {
    const { findByText } = render(<HomeScreen />, {
      initialRouteName: 'Home',
    });
    expect(await findByText(/new report/i)).toBeTruthy();
  });
});
```

### 5.2 E2E Testing with Maestro

Maestro is recommended over Detox for Expo apps due to first-class Expo support, simpler YAML-based tests, and native EAS Workflows integration.

#### Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

#### EAS Build Profile

Add to `eas.json`:

```json
{
  "build": {
    "development-sim": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    }
  }
}
```

#### E2E Test Flows

Create `.maestro/` directory with YAML flows:

| # | Flow | File | What It Validates |
|---|------|------|-------------------|
| 1 | Submit a report | `submit-report.yaml` | Full report submission from home to confirmation |
| 2 | View past reports | `view-past-reports.yaml` | Navigate to past reports, verify list renders |
| 3 | Profile & achievements | `profile-achievements.yaml` | Open profile, view stats and badges |
| 4 | Species info | `browse-species.yaml` | Browse species catalog, view details |
| 5 | Catch feed | `catch-feed.yaml` | View public feed, filter by species |

```yaml
# .maestro/submit-report.yaml
appId: com.yourcompany.fishlog
---
- launchApp
- tapOn: "New Report"
- tapOn: "Select Species"
- tapOn: "Red Drum"
- tapOn: "Weight"
- inputText: "5.2"
- tapOn: "Area"
- tapOn: "A1"
- tapOn: "Submit Report"
- assertVisible: "Report Submitted"
```

#### EAS Workflow for CI

```yaml
# eas-workflows/e2e.yml
name: E2E Tests
on:
  push:
    branches: [main]

jobs:
  e2e_tests:
    name: Run Maestro E2E tests
    type: maestro
    params:
      build_profile: development-sim
      flow_path: .maestro/
```

### 5.3 File Structure (Final)

```
fish-log/
├── jest.config.ts
├── jest.setup.ts
├── __mocks__/
│   └── fileMock.ts
├── .maestro/
│   ├── submit-report.yaml
│   ├── view-past-reports.yaml
│   ├── profile-achievements.yaml
│   ├── browse-species.yaml
│   └── catch-feed.yaml
├── .github/workflows/
│   └── test.yml
└── src/
    ├── test-utils.tsx
    ├── __tests__/
    │   ├── smoke.test.ts
    │   └── mocks/
    │       ├── supabase.ts
    │       ├── handlers.ts
    │       └── server.ts
    ├── utils/__tests__/
    │   ├── validation.test.ts
    │   ├── formValidation.test.ts
    │   ├── rewardsCalculations.test.ts
    │   ├── dateUtils.test.ts
    │   ├── badgeUtils.test.ts
    │   ├── debounce.test.ts
    │   └── cache.test.ts
    ├── services/__tests__/
    │   ├── reportsService.test.ts
    │   ├── statsService.test.ts
    │   ├── offlineQueue.test.ts
    │   ├── rewardsService.test.ts
    │   ├── authService.test.ts
    │   └── ...
    ├── services/transformers/__tests__/
    │   ├── advertisementTransformer.test.ts
    │   ├── fishSpeciesTransformer.test.ts
    │   └── userTransformer.test.ts
    ├── store/__tests__/
    │   ├── fishReportsSlice.test.ts
    │   ├── userSlice.test.ts
    │   └── licenseSlice.test.ts
    ├── hooks/__tests__/
    │   ├── useBadgeData.test.ts
    │   ├── useOfflineStatus.test.ts
    │   ├── useZipCodeLookup.test.ts
    │   └── ...
    ├── contexts/__tests__/
    │   ├── RewardsContext.test.tsx
    │   └── AchievementContext.test.tsx
    ├── components/__tests__/
    │   ├── GradientButton.test.tsx
    │   ├── FormInput.test.tsx
    │   ├── Footer.test.tsx
    │   ├── CatchCard.test.tsx
    │   └── ...
    └── screens/__tests__/
        ├── HomeScreen.test.tsx
        ├── ReportFormScreen.test.tsx
        ├── ProfileScreen.test.tsx
        └── ...
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    needs: typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx jest --coverage --ci --reporters=default --reporters=jest-junit
        env:
          JEST_JUNIT_OUTPUT_DIR: ./reports
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit-report
          path: reports/
```

---

## Phase Summary

| Phase | Scope | Files to Create | Tests Written | Coverage Target |
|-------|-------|-----------------|---------------|-----------------|
| **1** | Infrastructure | 7 config/mock files | 1 smoke test | N/A (setup only) |
| **2** | Pure functions & utils | 7-9 test files | ~50-80 tests | 90% lines |
| **3** | Services & Redux | 15-18 test files | ~100-150 tests | 85% lines |
| **4** | Hooks, contexts, components | 20-25 test files | ~80-120 tests | 75-80% lines |
| **5** | Screens & E2E | 9 screen tests + 5 Maestro flows | ~40-60 unit + 5 E2E | 70% lines |

### Recommended Execution Order

1. **Phase 1** first — nothing else works without it
2. **Phase 2** next — fast wins, high value, builds confidence in the test setup
3. **Phase 3** in parallel with Phase 2 if multiple contributors — this is the highest-impact phase
4. **Phase 4** after services are covered — hooks/components depend on tested services
5. **Phase 5** last — screen tests are the most complex and E2E requires a simulator build

### Key Principles

- **Test behavior, not implementation** — assert on what the user sees, not internal state
- **Await everything in RNTL v13+** — `render()`, `fireEvent.*()`, and `act()` return Promises with React 19
- **Mock at the right level** — direct mocks for unit tests, MSW for integration tests
- **Co-locate tests** — `__tests__/` directories next to the code they test
- **One assertion focus per test** — each `it()` block tests one specific behavior
