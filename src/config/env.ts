// config/env.ts
//
// Centralized environment configuration using Expo's build-time environment variables.
// All EXPO_PUBLIC_ prefixed variables are embedded at build time.
//
// IMPORTANT: Expo's Metro bundler replaces EXPO_PUBLIC_* vars via static text replacement.
// You MUST use literal dot notation (process.env.EXPO_PUBLIC_X) for each variable.
// Dynamic access like process.env[key] will NOT be replaced in EAS builds.

export type AppEnvironment = 'development' | 'production';
export type DMFMode = 'mock' | 'production';

export const env = {
  APP_ENV: (process.env.EXPO_PUBLIC_APP_ENV || 'development') as AppEnvironment,
  DMF_MODE: (process.env.EXPO_PUBLIC_DMF_MODE || 'mock') as DMFMode,
  DMF_ENDPOINT: process.env.EXPO_PUBLIC_DMF_ENDPOINT ||
    'https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits',
  // Default to false (safe fallback = production mode) - development builds override via EAS
  SHOW_DEVELOPER_TOOLS: process.env.EXPO_PUBLIC_SHOW_DEVELOPER_TOOLS === 'true',
  SHOW_SAMPLE_REPORTS: process.env.EXPO_PUBLIC_SHOW_SAMPLE_REPORTS === 'true',
  SHOW_TEST_MODE_BADGE: process.env.EXPO_PUBLIC_SHOW_TEST_MODE_BADGE === 'true',
  // Provided by EAS Secrets at build time — no hardcoded fallbacks
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
} as const;

// Environment checks
export const isDevelopment = (): boolean => env.APP_ENV === 'development';
export const isProduction = (): boolean => env.APP_ENV === 'production';
export const isTestMode = (): boolean => env.DMF_MODE === 'mock';
export const isProductionMode = (): boolean => env.DMF_MODE === 'production';
