import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: jest.fn(() => Promise.resolve()),
}));

import { useAnonymousUserInitialization } from '../../src/hooks/useAnonymousUserInitialization';
import { getOrCreateAnonymousUser } from '../../src/services/anonymousUserService';

describe('useAnonymousUserInitialization', () => {
  it('calls getOrCreateAnonymousUser on mount', async () => {
    renderHook(() => useAnonymousUserInitialization());

    await waitFor(() => {
      expect(getOrCreateAnonymousUser).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call again on re-render', async () => {
    const { rerender } = renderHook(() => useAnonymousUserInitialization());

    await waitFor(() => {
      expect(getOrCreateAnonymousUser).toHaveBeenCalledTimes(1);
    });

    rerender({});

    expect(getOrCreateAnonymousUser).toHaveBeenCalledTimes(1);
  });

  it('handles initialization failure gracefully', async () => {
    (getOrCreateAnonymousUser as jest.Mock).mockRejectedValueOnce(
      new Error('Supabase error')
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    renderHook(() => useAnonymousUserInitialization());

    await waitFor(() => {
      expect(getOrCreateAnonymousUser).toHaveBeenCalled();
    });

    // Should not throw
    warnSpy.mockRestore();
  });
});
