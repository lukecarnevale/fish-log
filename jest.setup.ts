import '@testing-library/jest-native/extend-expect';

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

// react-native-gesture-handler (required for @react-navigation/stack)
import 'react-native-gesture-handler/jestSetup';

// expo-file-system (including the new File class used by photoUploadService)
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  readAsStringAsync: jest.fn(() => Promise.resolve('mock-file-content')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024, isDirectory: false })),
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
  })),
}));

// expo-splash-screen (used by AnimatedSplashScreen)
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

// expo-font (prevents expo-asset dependency issue)
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
  useFonts: jest.fn(() => [true, null]),
}));

// @expo/vector-icons (prevents font loading issues in tests)
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = (props: any) => React.createElement(Text, props, props.name);
  return {
    Feather: MockIcon,
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
    MaterialCommunityIcons: MockIcon,
    FontAwesome: MockIcon,
    AntDesign: MockIcon,
    createIconSet: () => MockIcon,
  };
});

// react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Global Supabase mock (prevents real HTTP connections on module import)
jest.mock('./src/config/supabase', () => ({
  supabase: require('./test/mocks/supabase').mockSupabase,
  isSupabaseConnected: require('./test/mocks/supabase').mockIsSupabaseConnected,
  isSupabaseConfigured: true,
}));

// Service-level mocks for context providers (prevents side effects on mount)
jest.mock('./src/services/rewardsService');
jest.mock('./src/services/bulletinService');
jest.mock('./src/services/statsService');

// App config mock (prevents env variable issues in tests)
jest.mock('./src/config/appConfig', () => ({
  APP_CONFIG: {
    mode: 'mock',
    features: {
      raffleEnabled: true,
      offlineQueueEnabled: true,
      photoCaptureEnabled: true,
      showTestModeBadge: false,
    },
    endpoints: {
      dmfProduction: 'https://mock-dmf-endpoint.example.com',
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
  },
  isTestMode: jest.fn(() => true),
  isProductionMode: jest.fn(() => false),
  isDevelopment: jest.fn(() => true),
  getDMFEndpoint: jest.fn(() => 'https://mock-dmf-endpoint.example.com'),
  APP_VERSION: '1.0.0',
}));

// Env mock
jest.mock('./src/config/env', () => ({
  env: {
    APP_ENV: 'development',
    DMF_MODE: 'mock',
    DMF_ENDPOINT: 'https://mock-dmf-endpoint.example.com',
    SHOW_DEVELOPER_TOOLS: false,
    SHOW_TEST_MODE_BADGE: false,
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_ANON_KEY: 'mock-anon-key',
  },
  isDevelopment: jest.fn(() => true),
  isProduction: jest.fn(() => false),
  isTestMode: jest.fn(() => true),
  isProductionMode: jest.fn(() => false),
}));

// Clear AsyncStorage between tests to prevent cross-contamination
afterEach(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.clear();
});
