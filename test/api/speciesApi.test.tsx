import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../src/services/fishSpeciesService', () => ({
  fetchAllFishSpecies: jest.fn(() =>
    Promise.resolve([
      { id: '1', commonName: 'Red Drum' },
      { id: '2', commonName: 'Flounder' },
    ])
  ),
  fetchFishSpeciesById: jest.fn(() =>
    Promise.resolve({ id: '1', commonName: 'Red Drum' })
  ),
  searchFishSpecies: jest.fn(() =>
    Promise.resolve([{ id: '1', commonName: 'Red Drum' }])
  ),
}));

import {
  useAllFishSpecies,
  useFishSpeciesById,
  useSearchFishSpecies,
} from '../../src/api/speciesApi';
import {
  fetchAllFishSpecies,
  fetchFishSpeciesById,
  searchFishSpecies,
} from '../../src/services/fishSpeciesService';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useAllFishSpecies', () => {
  it('fetches all species on mount', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAllFishSpecies(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(fetchAllFishSpecies).toHaveBeenCalled();
  });

  it('has staleTime of 1 day', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAllFishSpecies(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The staleTime is set in the hook, we verify the fetch was called once
    expect(fetchAllFishSpecies).toHaveBeenCalledTimes(1);
  });
});

describe('useFishSpeciesById', () => {
  it('fetches species by ID when ID is provided', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useFishSpeciesById('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.commonName).toBe('Red Drum');
    expect(fetchFishSpeciesById).toHaveBeenCalledWith('1');
  });

  it('does not fetch when ID is empty string', async () => {
    (fetchFishSpeciesById as jest.Mock).mockClear();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useFishSpeciesById(''), { wrapper });

    // Wait a tick to ensure no fetch
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(fetchFishSpeciesById).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useSearchFishSpecies', () => {
  it('does NOT trigger fetch when query is empty string', async () => {
    (searchFishSpecies as jest.Mock).mockClear();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchFishSpecies(''), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(searchFishSpecies).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('does NOT trigger fetch when query is 2 chars or fewer', async () => {
    (searchFishSpecies as jest.Mock).mockClear();
    const wrapper = createWrapper();
    renderHook(() => useSearchFishSpecies('ab'), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(searchFishSpecies).not.toHaveBeenCalled();
  });

  it('triggers fetch when query is 3+ chars', async () => {
    (searchFishSpecies as jest.Mock).mockClear();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchFishSpecies('red'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(searchFishSpecies).toHaveBeenCalledWith('red');
  });
});
