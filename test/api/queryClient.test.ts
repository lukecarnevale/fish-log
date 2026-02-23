import { queryClient } from '../../src/api/queryClient';

describe('queryClient defaults', () => {
  it('has retry disabled for queries', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
  });

  it('has retry disabled for mutations', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('has offlineFirst networkMode for mutations', () => {
    expect(queryClient.getDefaultOptions().mutations?.networkMode).toBe('offlineFirst');
  });

  it('refetches on reconnect with always strategy', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnReconnect).toBe('always');
  });

  it('has staleTime of 5 minutes', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('has gcTime of 30 minutes', () => {
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(30 * 60 * 1000);
  });

  it('refetches on window focus', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
  });
});
