/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  transformIgnorePatterns: [
    // ESM-only packages must be transformed by Babel
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@supabase/.*|@tanstack/.*|uuid|@reduxjs/toolkit|immer|redux|redux-thunk|reselect|react-redux))',
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
    // Ratchet: prevent regression. Target: branches 70%, functions 75%, lines 80%, statements 80%
    global: {
      branches: 42,
      functions: 48,
      lines: 49,
      statements: 49,
    },
    // Critical path: DMF data integrity — government-facing report submission
    // Ratchet: prevent regression. Target: branches 90%, lines 95%
    './src/services/reportsService.ts': {
      branches: 65,
      lines: 63,
    },
    // Critical path: DMF payload transformation and submission
    // Ratchet: prevent regression. Target: branches 90%, lines 95%
    './src/services/harvestReportService.ts': {
      branches: 73,
      lines: 75,
    },
    // Critical path: Form validation guards data quality
    // Already at 100% — enforce it
    './src/utils/formValidation.ts': {
      branches: 95,
      lines: 95,
    },
    // Critical path: Offline queue handles retry and data persistence
    // Ratchet: prevent regression. Target: branches 85%, lines 90%
    './src/services/offlineQueue.ts': {
      branches: 28,
      lines: 76,
    },
    // Promotions Hub: URL validation utility
    './src/utils/urlValidation.ts': {
      branches: 80,
      lines: 90,
    },
  },

  testMatch: [
    '<rootDir>/test/**/*.{spec,test}.{ts,tsx}',
  ],

  clearMocks: true,
  restoreMocks: true,
};
