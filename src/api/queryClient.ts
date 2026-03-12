import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 2 minutes (must be ≤ gcTime)
      staleTime: 2 * 60 * 1000,
      // Don't retry on error by default
      retry: false,
      // Refetch when window regains focus after background
      refetchOnWindowFocus: true,
      // Refetch when network reconnects
      refetchOnReconnect: 'always',
      // Garbage-collect unused queries after 3 minutes (frees memory aggressively)
      gcTime: 3 * 60 * 1000,
    },
    mutations: {
      // Don't retry mutations
      retry: false,
      // No network connection retries
      networkMode: 'offlineFirst',
    },
  },
});