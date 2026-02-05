// config/env.ts
//
// Centralized environment configuration using Expo's build-time environment variables.
// All EXPO_PUBLIC_ prefixed variables are embedded at build time.

export type AppEnvironment = 'development' | 'production';
export type DMFMode = 'mock' | 'production';

const getEnv = (key: string, fallback: string): string =>
  process.env[key] || fallback;

const getBoolEnv = (key: string, fallback: boolean): boolean =>
  process.env[key] !== undefined ? process.env[key] === 'true' : fallback;

export const env = {
  APP_ENV: getEnv('EXPO_PUBLIC_APP_ENV', 'development') as AppEnvironment,
  DMF_MODE: getEnv('EXPO_PUBLIC_DMF_MODE', 'mock') as DMFMode,
  DMF_ENDPOINT: getEnv(
    'EXPO_PUBLIC_DMF_ENDPOINT',
    'https://services2.arcgis.com/kCu40SDxsCGcuUWO/arcgis/rest/services/MandReportingData/FeatureServer/applyEdits'
  ),
  // Default to true (safe fallback = dev mode) - production builds override via EAS
  SHOW_DEVELOPER_TOOLS: getBoolEnv('EXPO_PUBLIC_SHOW_DEVELOPER_TOOLS', true),
  SHOW_SAMPLE_REPORTS: getBoolEnv('EXPO_PUBLIC_SHOW_SAMPLE_REPORTS', true),
  SHOW_TEST_MODE_BADGE: getBoolEnv('EXPO_PUBLIC_SHOW_TEST_MODE_BADGE', true),
  SUPABASE_URL: getEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://qygvvgbateuorpxntdbq.supabase.co'),
  SUPABASE_ANON_KEY: getEnv(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Z3Z2Z2JhdGV1b3JweG50ZGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzY5NjMsImV4cCI6MjA4NDcxMjk2M30.L9bW1-qlVwEqm9IKBWinWXyXJ6LKsTFGa_hoUmQ8xKs'
  ),
} as const;

// Environment checks
export const isDevelopment = (): boolean => env.APP_ENV === 'development';
export const isProduction = (): boolean => env.APP_ENV === 'production';
export const isTestMode = (): boolean => env.DMF_MODE === 'mock';
export const isProductionMode = (): boolean => env.DMF_MODE === 'production';
