// test/contexts/ThemeContext.test.tsx
//
// Tests for the ThemeContext provider and useTheme hook.

import React from 'react';
import { Text, TouchableOpacity, useColorScheme } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';
import { lightPalette, darkPalette } from '../../src/styles/theme';

// =============================================================================
// Mock feature flags API — dark_mode enabled by default for testing
// =============================================================================

jest.mock('../../src/api/featureFlagsApi', () => ({
  useFeatureFlag: jest.fn().mockReturnValue({ enabled: true, isLoading: false }),
}));

// =============================================================================
// Mock AsyncStorage
// =============================================================================

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

// =============================================================================
// Mock useColorScheme
// =============================================================================

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('light'),
}));

// =============================================================================
// Test Component
// =============================================================================

function TestConsumer() {
  const { theme, themeMode, setThemeMode, isLoading } = useTheme();
  return (
    <>
      <Text testID="mode">{theme.mode}</Text>
      <Text testID="isDark">{String(theme.isDark)}</Text>
      <Text testID="themeMode">{themeMode}</Text>
      <Text testID="isLoading">{String(isLoading)}</Text>
      <Text testID="primaryColor">{theme.colors.primary}</Text>
      <TouchableOpacity testID="setDark" onPress={() => setThemeMode('dark')} />
      <TouchableOpacity testID="setLight" onPress={() => setThemeMode('light')} />
      <TouchableOpacity testID="setSystem" onPress={() => setThemeMode('system')} />
    </>
  );
}

function renderWithTheme() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (useColorScheme as jest.Mock).mockReturnValue('light');
});

describe('ThemeContext', () => {
  it('defaults to system mode (resolves to light when OS is light)', async () => {
    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('false');
    });

    expect(getByTestId('themeMode').props.children).toBe('system');
    expect(getByTestId('mode').props.children).toBe('light');
    expect(getByTestId('isDark').props.children).toBe('false');
  });

  it('resolves to dark when OS is dark and mode is system', async () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('false');
    });

    expect(getByTestId('mode').props.children).toBe('dark');
    expect(getByTestId('isDark').props.children).toBe('true');
  });

  it('loads persisted preference from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('themeMode').props.children).toBe('dark');
    });

    expect(getByTestId('mode').props.children).toBe('dark');
    expect(getByTestId('isDark').props.children).toBe('true');
  });

  it('setThemeMode updates theme and persists to AsyncStorage', async () => {
    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('false');
    });

    await act(async () => {
      fireEvent.press(getByTestId('setDark'));
    });

    expect(getByTestId('mode').props.children).toBe('dark');
    expect(getByTestId('isDark').props.children).toBe('true');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@fish_log_theme_mode',
      'dark'
    );
  });

  it('explicit light mode overrides OS dark preference', async () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('false');
    });

    await act(async () => {
      fireEvent.press(getByTestId('setLight'));
    });

    expect(getByTestId('mode').props.children).toBe('light');
    expect(getByTestId('isDark').props.children).toBe('false');
  });

  it('provides correct palette colors for each mode', async () => {
    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('false');
    });

    // Light mode primary
    expect(getByTestId('primaryColor').props.children).toBe(lightPalette.primary);

    // Switch to dark
    await act(async () => {
      fireEvent.press(getByTestId('setDark'));
    });

    expect(getByTestId('primaryColor').props.children).toBe(darkPalette.primary);
  });

  it('gracefully handles AsyncStorage read errors', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('false');
    });

    // Should fall back to 'system'
    expect(getByTestId('themeMode').props.children).toBe('system');
  });

  it('forces light mode when dark_mode feature flag is disabled', async () => {
    const { useFeatureFlag } = require('../../src/api/featureFlagsApi');
    (useFeatureFlag as jest.Mock).mockReturnValue({ enabled: false, isLoading: false });
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('false');
    });

    // Even though user preference is dark AND OS is dark,
    // the feature flag forces light mode
    expect(getByTestId('mode').props.children).toBe('light');
    expect(getByTestId('isDark').props.children).toBe('false');

    // Restore mock for remaining tests
    (useFeatureFlag as jest.Mock).mockReturnValue({ enabled: true, isLoading: false });
  });

  it('ignores invalid persisted values', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid_value');

    const { getByTestId } = renderWithTheme();

    await waitFor(() => {
      expect(getByTestId('isLoading').props.children).toBe('false');
    });

    // Should stay on default 'system'
    expect(getByTestId('themeMode').props.children).toBe('system');
  });
});
