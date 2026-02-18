import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../src/services/speciesBulletinService', () => ({
  fetchBulletinsForSpecies: jest.fn(() =>
    Promise.resolve([{ id: 'b1', title: 'Closure Alert', type: 'closure' }])
  ),
}));

import { useBulletinsForSpecies } from '../../src/api/speciesBulletinApi';
import { fetchBulletinsForSpecies } from '../../src/services/speciesBulletinService';

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

describe('useBulletinsForSpecies', () => {
  it('fetches bulletins when speciesId is provided', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useBulletinsForSpecies('species-1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(fetchBulletinsForSpecies).toHaveBeenCalledWith('species-1');
  });

  it('does NOT fetch when speciesId is null', async () => {
    (fetchBulletinsForSpecies as jest.Mock).mockClear();
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useBulletinsForSpecies(null),
      { wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(fetchBulletinsForSpecies).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});
