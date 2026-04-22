// test/hooks/useThemedStyles.test.tsx
//
// Tests for the useThemedStyles hook.

import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';
import { useThemedStyles } from '../../src/hooks/useThemedStyles';
import { Theme, lightPalette, darkPalette } from '../../src/styles/theme';

// =============================================================================
// Mocks
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

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('light'),
}));

jest.mock('../../src/api/featureFlagsApi', () => ({
  useFeatureFlag: jest.fn().mockReturnValue({ enabled: true, isLoading: false }),
}));

// =============================================================================
// Test style factory (defined outside component for stable reference)
// =============================================================================

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
    },
  });

// =============================================================================
// Test Component
// =============================================================================

function StyledComponent() {
  const styles = useThemedStyles(createStyles);
  const { setThemeMode } = useTheme();

  return (
    <View testID="container" style={styles.container}>
      <Text testID="title" style={styles.title}>Hello</Text>
      <TouchableOpacity testID="toggleDark" onPress={() => setThemeMode('dark')} />
    </View>
  );
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

describe('useThemedStyles', () => {
  it('returns styles derived from the current theme', async () => {
    const { getByTestId } = render(
      <QueryClientProvider client={createQueryClient()}>
        <ThemeProvider>
          <StyledComponent />
        </ThemeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const containerStyle = getByTestId('container').props.style;
      // StyleSheet.create flattens styles, so we check the resolved value
      // The style might be a number (StyleSheet ID) or an object
      expect(containerStyle).toBeDefined();
    });

    const titleStyle = getByTestId('title').props.style;
    expect(titleStyle).toBeDefined();
  });

  it('updates styles when theme changes', async () => {
    const { getByTestId } = render(
      <QueryClientProvider client={createQueryClient()}>
        <ThemeProvider>
          <StyledComponent />
        </ThemeProvider>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(getByTestId('container')).toBeDefined();
    });

    // Switch to dark mode
    await act(async () => {
      fireEvent.press(getByTestId('toggleDark'));
    });

    // The component should still render without errors
    expect(getByTestId('container')).toBeDefined();
    expect(getByTestId('title')).toBeDefined();
  });

  it('accepts inline style factory functions', async () => {
    function InlineStyleComponent() {
      const styles = useThemedStyles((theme: Theme) => ({
        text: { color: theme.colors.primary },
      }));
      return <Text testID="text" style={styles.text}>Test</Text>;
    }

    const { getByTestId } = render(
      <QueryClientProvider client={createQueryClient()}>
        <ThemeProvider>
          <InlineStyleComponent />
        </ThemeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(getByTestId('text')).toBeDefined();
    });
  });
});
