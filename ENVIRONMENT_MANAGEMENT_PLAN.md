# Environment Management Plan for Fish Log

## Overview

This plan establishes a robust environment management strategy for the Fish Log app, ensuring:
- **Development**: Test mode DMF submissions, Developer Tools visible, sample data available
- **Production**: Real DMF submissions, no Developer Tools, no sample data

---

## Current State Analysis

### What You Have Now
| Configuration | Location | Current Value | Issue |
|--------------|----------|---------------|-------|
| DMF Mode | `appConfig.ts` | `'mock'` (hardcoded) | Must manually change before builds |
| Developer Tools | `devConfig.ts` | `true` (hardcoded) | Must manually change before builds |
| Sample Reports | `devConfig.ts` | `true` (hardcoded) | Must manually change before builds |
| Supabase URL | `supabase.ts` | Hardcoded | Same database for dev and production |

### The Problem
Configuration is hardcoded, requiring manual code changes before each build type. This is error-prone and could accidentally expose Developer Tools to users or send test data to DMF.

---

## Recommended Solution: EAS Build Profiles + Environment Variables

### Why This Approach?
1. **Expo/EAS Native Support**: Your app uses Expo, which has built-in support for environment-based builds
2. **No Manual Changes**: Configuration is automatic per build profile
3. **Type-Safe**: Environment variables can be typed with TypeScript
4. **Scalable**: Easy to add staging environment later
5. **Supabase Branching**: Optionally use database branches for isolated dev data

---

## Implementation Plan

### Phase 1: Environment Variables Setup

#### Step 1.1: Install Dependencies
```bash
npx expo install expo-constants
```

#### Step 1.2: Create Environment Files

**`.env.development`** (for local development)
```env
# Environment
EXPO_PUBLIC_APP_ENV=development

# DMF Configuration
EXPO_PUBLIC_DMF_MODE=mock
EXPO_PUBLIC_DMF_ENDPOINT=https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits

# Feature Flags
EXPO_PUBLIC_SHOW_DEVELOPER_TOOLS=true
EXPO_PUBLIC_SHOW_SAMPLE_REPORTS=true
EXPO_PUBLIC_SHOW_TEST_MODE_BADGE=true

# Supabase (Development - use branch later if needed)
EXPO_PUBLIC_SUPABASE_URL=https://qygvvgbateuorpxntdbq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**`.env.production`** (for production builds)
```env
# Environment
EXPO_PUBLIC_APP_ENV=production

# DMF Configuration
EXPO_PUBLIC_DMF_MODE=production
EXPO_PUBLIC_DMF_ENDPOINT=https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits

# Feature Flags
EXPO_PUBLIC_SHOW_DEVELOPER_TOOLS=false
EXPO_PUBLIC_SHOW_SAMPLE_REPORTS=false
EXPO_PUBLIC_SHOW_TEST_MODE_BADGE=false

# Supabase (Production)
EXPO_PUBLIC_SUPABASE_URL=https://qygvvgbateuorpxntdbq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Step 1.3: Add to `.gitignore`
```gitignore
# Environment files with secrets
.env.local
.env.*.local

# Keep .env.development and .env.production in git (they have EXPO_PUBLIC_ vars only)
# but never commit files with real secrets
```

---

### Phase 2: Refactor Configuration Files

#### Step 2.1: Create New Environment Config

**`src/config/env.ts`** (new file)
```typescript
// config/env.ts
// Centralized environment configuration using Expo's environment variables

export type AppEnvironment = 'development' | 'production';
export type DMFMode = 'mock' | 'production';

/**
 * Environment configuration derived from build-time environment variables.
 *
 * Variables prefixed with EXPO_PUBLIC_ are embedded at build time and
 * accessible via process.env.
 */
export const env = {
  // App Environment
  APP_ENV: (process.env.EXPO_PUBLIC_APP_ENV || 'development') as AppEnvironment,

  // DMF Configuration
  DMF_MODE: (process.env.EXPO_PUBLIC_DMF_MODE || 'mock') as DMFMode,
  DMF_ENDPOINT: process.env.EXPO_PUBLIC_DMF_ENDPOINT ||
    'https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits',

  // Feature Flags
  SHOW_DEVELOPER_TOOLS: process.env.EXPO_PUBLIC_SHOW_DEVELOPER_TOOLS === 'true',
  SHOW_SAMPLE_REPORTS: process.env.EXPO_PUBLIC_SHOW_SAMPLE_REPORTS === 'true',
  SHOW_TEST_MODE_BADGE: process.env.EXPO_PUBLIC_SHOW_TEST_MODE_BADGE === 'true',

  // Supabase
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
} as const;

// Helper functions
export const isDevelopment = () => env.APP_ENV === 'development';
export const isProduction = () => env.APP_ENV === 'production';
export const isTestMode = () => env.DMF_MODE === 'mock';
export const isProductionMode = () => env.DMF_MODE === 'production';
```

#### Step 2.2: Update `appConfig.ts`

```typescript
// config/appConfig.ts
import { env, isTestMode, isProductionMode } from './env';

export type AppMode = 'mock' | 'production';

export const APP_CONFIG = {
  // Mode is now derived from environment
  get mode(): AppMode {
    return env.DMF_MODE;
  },

  features: {
    raffleEnabled: true,
    offlineQueueEnabled: true,
    photoCaptureEnabled: true,
    showTestModeBadge: env.SHOW_TEST_MODE_BADGE,
  },

  endpoints: {
    dmfProduction: env.DMF_ENDPOINT,
  },

  storageKeys: {
    harvestQueue: '@harvest_queue',
    harvestHistory: '@harvest_history',
    userProfile: 'userProfile',
    fishingLicense: 'fishingLicense',
    enteredRaffles: 'enteredRaffles',
    primaryHarvestArea: 'primaryHarvestArea',
    primaryFishingMethod: 'primaryFishingMethod',
  },

  limits: {
    maxHistoryEntries: 100,
    maxRetryAttempts: 3,
  },
};

// Re-export helper functions
export { isTestMode, isProductionMode } from './env';

// For backwards compatibility - but these now throw errors
// to prevent accidental runtime mode switching in production
export function setAppMode(mode: AppMode): void {
  if (isProduction()) {
    console.warn('Cannot change app mode at runtime in production builds');
    return;
  }
  console.log(`[DEV] Would switch mode to ${mode} - but this is now build-time configured`);
}
```

#### Step 2.3: Update `devConfig.ts`

```typescript
// config/devConfig.ts
import { env } from './env';

/**
 * Development configuration flags
 *
 * These are now derived from environment variables set at build time.
 * No manual changes needed before production release!
 */
export const devConfig = {
  get SHOW_SAMPLE_REPORTS(): boolean {
    return env.SHOW_SAMPLE_REPORTS;
  },

  get SHOW_DEVELOPER_OPTIONS(): boolean {
    return env.SHOW_DEVELOPER_TOOLS;
  },
};

export default devConfig;
```

#### Step 2.4: Update `supabase.ts`

```typescript
// config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Health check function
export async function isSupabaseConnected(): Promise<boolean> {
  try {
    const { error } = await supabase.from('rewards_config').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
```

---

### Phase 3: EAS Build Configuration

#### Step 3.1: Update `eas.json`

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_APP_ENV": "development",
        "EXPO_PUBLIC_DMF_MODE": "mock",
        "EXPO_PUBLIC_SHOW_DEVELOPER_TOOLS": "true",
        "EXPO_PUBLIC_SHOW_SAMPLE_REPORTS": "true",
        "EXPO_PUBLIC_SHOW_TEST_MODE_BADGE": "true"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_APP_ENV": "development",
        "EXPO_PUBLIC_DMF_MODE": "mock",
        "EXPO_PUBLIC_SHOW_DEVELOPER_TOOLS": "true",
        "EXPO_PUBLIC_SHOW_SAMPLE_REPORTS": "true",
        "EXPO_PUBLIC_SHOW_TEST_MODE_BADGE": "true"
      }
    },
    "production": {
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_APP_ENV": "production",
        "EXPO_PUBLIC_DMF_MODE": "production",
        "EXPO_PUBLIC_SHOW_DEVELOPER_TOOLS": "false",
        "EXPO_PUBLIC_SHOW_SAMPLE_REPORTS": "false",
        "EXPO_PUBLIC_SHOW_TEST_MODE_BADGE": "false"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### Step 3.2: Update `app.json` (optional environment indicator)

Add a configuration plugin to show environment in app name during development:

```json
{
  "expo": {
    "name": "Fish Log",
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

---

### Phase 4: Database Environment Separation (Optional but Recommended)

You have two options for separating development and production data:

#### Option A: Supabase Branching (Recommended for Paid Plans)

Supabase branches create isolated database copies for development:

```bash
# Create a development branch (via Supabase MCP or dashboard)
# This gives you a separate database URL for development
```

Benefits:
- Completely isolated data
- Test migrations safely
- No risk of polluting production data

#### Option B: Environment Flag in Tables

Add an `environment` column to key tables:

```sql
-- Migration to add environment tracking
ALTER TABLE harvest_reports
ADD COLUMN environment TEXT DEFAULT 'production'
CHECK (environment IN ('development', 'production'));

-- Create index for efficient filtering
CREATE INDEX idx_harvest_reports_environment ON harvest_reports(environment);

-- Create a view for production-only reports
CREATE VIEW production_harvest_reports AS
SELECT * FROM harvest_reports WHERE environment = 'production';
```

Then in your app, set the environment when creating reports:

```typescript
// In reportsService.ts
const report = {
  ...reportData,
  environment: env.APP_ENV, // 'development' or 'production'
};
```

---

### Phase 5: Build & Deployment Workflow

#### Development Workflow
```bash
# Start local development (uses .env.development automatically)
npx expo start

# Create development build for testing
eas build --profile development --platform ios
eas build --profile development --platform android
```

#### Production Workflow
```bash
# Create production build (environment variables from eas.json)
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

---

## Environment Behavior Summary

| Feature | Development | Production |
|---------|-------------|------------|
| DMF Submissions | Mock (console only) | Real DMF server |
| Developer Tools Menu | ✅ Visible | ❌ Hidden |
| Sample Reports | ✅ Shown | ❌ Hidden |
| Test Mode Badge | ✅ Shown | ❌ Hidden |
| Database | Dev branch or flagged | Production |
| App Name | "Fish Log (Dev)" | "Fish Log" |

---

## Implementation Checklist

- [ ] Install `expo-constants` if not already present
- [ ] Create `.env.development` file
- [ ] Create `.env.production` file
- [ ] Create `src/config/env.ts`
- [ ] Update `src/config/appConfig.ts`
- [ ] Update `src/config/devConfig.ts`
- [ ] Update `src/config/supabase.ts`
- [ ] Update `eas.json` with build profiles
- [ ] Add `.env` files to `.gitignore` (keep templates)
- [ ] (Optional) Set up Supabase database branching
- [ ] (Optional) Add environment column to harvest_reports
- [ ] Test development build
- [ ] Test production build
- [ ] Update deployment documentation

---

## Security Considerations

1. **Never commit secrets**: Keep `EXPO_PUBLIC_SUPABASE_ANON_KEY` in EAS Secrets for production
2. **Use EAS Secrets**: Store sensitive values in EAS dashboard, not in code
3. **Anon key is safe**: The Supabase anon key is designed to be public (RLS protects data)
4. **Audit before release**: Always verify Developer Tools are hidden in production builds

---

## Next Steps

1. **Immediate**: I can implement Phase 1 and 2 for you now
2. **After Testing**: Configure EAS build profiles
3. **Optional**: Set up Supabase branching for database isolation

Would you like me to proceed with implementing this plan?
