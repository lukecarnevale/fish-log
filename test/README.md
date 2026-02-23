# Test Suite

Automated tests for the NC Fish Log app. This folder contains **103 test files** covering utilities, services, Redux slices, hooks, contexts, components, and screens.

## Quick Reference

| Command | Use |
|---|---|
| `npm run test:watch` | **Daily driver** — auto-reruns on save |
| `npm test` | Full suite once — pre-commit check |
| `npm run test:coverage` | Coverage gaps + threshold check |
| `npx jest test/utils/formValidation.test.ts` | Single file |
| `npx jest test/services` | Folder |

**Watch mode keys:** `p` filter filename · `t` filter test name · `a` run all · `q` quit

**Quick factory usage:** `makeQueuedReport({ retryCount: 2 })` — override only what matters, defaults handle the rest. See `test/factories.ts`.

**Rendering screens:** `import { render } from '../test-utils'` wraps Redux, React Query, Navigation, and all context providers automatically.

**Key detail:** Supabase is globally mocked (no network), AsyncStorage auto-clears after every test.

---

## Running Tests

```bash
# Run all tests
npm test

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# CI mode (coverage + JUnit reporter)
npm run test:ci
```

### Running a subset of tests

```bash
# Run a single file
npx jest test/utils/formValidation.test.ts

# Run by folder
npx jest test/services

# Run by pattern
npx jest --testPathPattern="hooks"
```

## Folder Structure

```
test/
├── api/              # React Query hook tests
├── components/       # UI component tests (+ __snapshots__/)
├── constants/        # Validation schema tests
├── contexts/         # Context provider tests (Rewards, Achievements, Bulletin, SpeciesAlerts)
├── cross-cutting/    # Data integrity, migration, and state machine tests
├── hooks/            # Custom hook tests
├── mocks/            # Shared mock implementations (Supabase client, etc.)
├── models/           # Data model / schema tests
├── screens/          # Screen-level integration tests
├── services/         # Service layer tests (including transformers/)
├── store/            # Redux slice tests
├── types/            # Type guard / runtime type tests
├── utils/            # Utility function tests (including rewards/, storage/)
├── factories.ts      # Test data factories for building mock objects
├── test-utils.tsx    # renderWithProviders helper and re-exports from RNTL
└── smoke.test.ts     # Smoke test verifying Jest infrastructure works
```

## Test Infrastructure

### Configuration

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest config — preset, transform patterns, coverage thresholds, test matching |
| `jest.setup.ts` | Global mocks (AsyncStorage, NetInfo, Expo modules, Supabase, etc.) |
| `test/test-utils.tsx` | `renderWithProviders` wrapper with Redux, React Query, Navigation, and all context providers |
| `test/factories.ts` | Factory functions for building test data (`makeHarvestInput`, `makeQueuedReport`, `makeStoredReport`, etc.) |
| `test/mocks/supabase.ts` | Mock Supabase client (database, auth, storage) |

### Provider Wrapper

Use `renderWithProviders` (exported as `render`) for any component that needs Redux, React Query, Navigation, or context providers:

```typescript
import { render, screen } from '../test-utils';

const { store } = render(<MyComponent />, {
  preloadedState: { user: { /* ... */ } },
  routeParams: { id: '123' },
});
```

### Test Data Factories

Use factories instead of inline object literals for complex data shapes:

```typescript
import { makeHarvestInput, makeQueuedReport, makeStoredReport } from '../factories';

const input = makeHarvestInput({ redDrumCount: 3 });
const queued = makeQueuedReport({ retryCount: 2 });
const stored = makeStoredReport({ dmfStatus: 'submitted' });
```

### Global Mocks (jest.setup.ts)

The following are mocked globally and available in every test without manual setup:

- `@react-native-async-storage/async-storage` — in-memory mock, cleared after each test
- `@react-native-community/netinfo` — defaults to connected
- `expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-file-system`, `expo-splash-screen`, `expo-font`
- `@expo/vector-icons` — renders icon name as text
- `react-native-safe-area-context`
- `src/config/supabase` — uses mock client from `test/mocks/supabase.ts`
- `src/config/appConfig` — test mode enabled
- `src/config/env` — development environment
- `src/services/rewardsService`, `bulletinService`, `statsService` — auto-mocked to prevent side effects in context providers

### AsyncStorage

AsyncStorage is cleared automatically after each test via `afterEach` in `jest.setup.ts`. Use the `seedAsyncStorage` helper from `factories.ts` to prepopulate storage for a test:

```typescript
import { seedAsyncStorage } from '../factories';

beforeEach(async () => {
  await seedAsyncStorage({ '@harvest_queue': [makeQueuedReport()] });
});
```

## Coverage

Run `npm run test:coverage` to generate a coverage report. The project enforces coverage thresholds in `jest.config.js`:

| Scope | Lines | Branches |
|-------|-------|----------|
| Global (minimum) | 49% | 42% |
| `reportsService.ts` (critical) | 63% | 65% |
| `harvestReportService.ts` (critical) | 75% | 73% |
| `formValidation.ts` (critical) | 95% | 95% |
| `offlineQueue.ts` (critical) | 76% | 28% |

These thresholds act as a ratchet — they prevent regression and should be raised as coverage improves. The long-term targets for critical (government-facing) paths are 95% lines / 90% branches.

## Testing Plan

For the full testing strategy, phased implementation plan, and coverage targets by risk tier, see the [testing/TESTING_PLAN.md](../testing/TESTING_PLAN.md) document and its companion phase files in the `testing/` directory.

## Conventions

- **Test behavior, not implementation** — assert on what the user sees or what the function returns, not internal state
- **One assertion focus per test** — each `it()` block tests one specific behavior
- **Use fake timers for services with retry/backoff** — `jest.useFakeTimers()` and `jest.advanceTimersByTime()`
- **Mock at the Supabase level** — no MSW (incompatible with React Native); mock `supabase.from()` chains directly
- **Use factories for test data** — keeps tests readable and avoids duplicating large object literals
