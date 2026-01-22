import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default cache time: 5 minutes
      staleTime: 5 * 60 * 1000,
      // Don't retry on error by default
      retry: false,
      // Refetch when window regains focus after background
      refetchOnWindowFocus: true,
      // Refetch when network reconnects
      refetchOnReconnect: 'always',
      // Cache for 30 minutes
      gcTime: 30 * 60 * 1000,
    },
    mutations: {
      // Don't retry mutations
      retry: false,
      // No network connection retries
      networkMode: 'offlineFirst',
    },
  },
});