import { renderHook } from '@testing-library/react-native';

jest.mock('../../src/store', () => ({
  store: {
    dispatch: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../src/store/slices/userSlice', () => ({
  fetchUserProfile: jest.fn(() => ({ type: 'user/fetchUserProfile' })),
}));

const mockUnsubscribe = jest.fn();
jest.mock('../../src/services/authService', () => ({
  onAuthStateChange: jest.fn(() => mockUnsubscribe),
}));

jest.mock('../../src/services/rewardsConversionService', () => ({
  createRewardsMemberFromAuthUser: jest.fn(() =>
    Promise.resolve({ success: true, user: { email: 'test@example.com' } })
  ),
}));

import { useAuthStateListener } from '../../src/hooks/useAuthStateListener';
import { onAuthStateChange } from '../../src/services/authService';
import { createRewardsMemberFromAuthUser } from '../../src/services/rewardsConversionService';
import { store } from '../../src/store';

describe('useAuthStateListener', () => {
  beforeEach(() => {
    mockUnsubscribe.mockClear();
  });

  it('subscribes to auth state changes on mount', () => {
    renderHook(() => useAuthStateListener());

    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(onAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuthStateListener());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('calls createRewardsMemberFromAuthUser on SIGNED_IN', async () => {
    renderHook(() => useAuthStateListener());

    const callback = (onAuthStateChange as jest.Mock).mock.calls[0][0];
    await callback('SIGNED_IN', { user: { id: '123' } });

    expect(createRewardsMemberFromAuthUser).toHaveBeenCalled();
  });

  it('dispatches fetchUserProfile on SIGNED_IN', async () => {
    renderHook(() => useAuthStateListener());

    const callback = (onAuthStateChange as jest.Mock).mock.calls[0][0];
    await callback('SIGNED_IN', { user: { id: '123' } });

    expect(store.dispatch).toHaveBeenCalled();
  });

  it('does not call createRewardsMemberFromAuthUser on SIGNED_OUT', async () => {
    (createRewardsMemberFromAuthUser as jest.Mock).mockClear();

    renderHook(() => useAuthStateListener());

    const callback = (onAuthStateChange as jest.Mock).mock.calls[0][0];
    await callback('SIGNED_OUT', null);

    expect(createRewardsMemberFromAuthUser).not.toHaveBeenCalled();
  });

  it('handles createRewardsMemberFromAuthUser failure gracefully', async () => {
    (createRewardsMemberFromAuthUser as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    renderHook(() => useAuthStateListener());

    const callback = (onAuthStateChange as jest.Mock).mock.calls[0][0];
    await callback('SIGNED_IN', { user: { id: '123' } });

    // Should not throw
    expect(store.dispatch).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
