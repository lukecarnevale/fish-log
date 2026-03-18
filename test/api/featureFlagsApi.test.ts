import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFeatureFlag } from '../../src/api/featureFlagsApi';
import { fetchFeatureFlags, clearFlagCache } from '../../src/services/featureFlagService';

jest.mock('../../src/services/featureFlagService', () => ({
  fetchFeatureFlags: jest.fn(),
  clearFlagCache: jest.fn(),
}));

const mockFetchFlags = fetchFeatureFlags as jest.MockedFunction<typeof fetchFeatureFlags>;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false while loading', () => {
    mockFetchFlags.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useFeatureFlag('promotions_hub'), {
      wrapper: createWrapper(),
    });

    expect(result.current.enabled).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns true when flag is enabled', async () => {
    mockFetchFlags.mockResolvedValue({ promotions_hub: true });

    const { result } = renderHook(() => useFeatureFlag('promotions_hub'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns false when flag is disabled', async () => {
    mockFetchFlags.mockResolvedValue({ promotions_hub: false });

    const { result } = renderHook(() => useFeatureFlag('promotions_hub'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.enabled).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
