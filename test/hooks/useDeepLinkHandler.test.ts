import { renderHook, waitFor } from '@testing-library/react-native';
import { Linking, Alert } from 'react-native';

jest.mock('../../src/store', () => ({
  store: {
    dispatch: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../src/store/slices/userSlice', () => ({
  fetchUserProfile: jest.fn(() => ({ type: 'user/fetchUserProfile' })),
}));

jest.mock('../../src/services/authService', () => ({
  isMagicLinkCallback: jest.fn(() => false),
  handleMagicLinkCallback: jest.fn(() =>
    Promise.resolve({ success: true })
  ),
  clearStalePendingAuth: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/rewardsConversionService', () => ({
  createRewardsMemberFromAuthUser: jest.fn(() =>
    Promise.resolve({
      success: true,
      user: { email: 'test@example.com' },
      claimedCatches: 0,
    })
  ),
}));

jest.mock('../../src/services/pendingSubmissionService', () => ({
  completePendingSubmissionByEmail: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/deepLinkBuffer', () => ({
  consumeBufferedUrl: jest.fn(() => null),
  stopBuffering: jest.fn(),
}));

import { useDeepLinkHandler } from '../../src/hooks/useDeepLinkHandler';
import {
  isMagicLinkCallback,
  handleMagicLinkCallback,
} from '../../src/services/authService';
import { createRewardsMemberFromAuthUser } from '../../src/services/rewardsConversionService';

describe('useDeepLinkHandler', () => {
  beforeEach(() => {
    (Linking.getInitialURL as jest.Mock) = jest.fn(() => Promise.resolve(null));
    (Linking.addEventListener as jest.Mock) = jest.fn(() => ({
      remove: jest.fn(),
    }));
    jest.spyOn(Alert, 'alert').mockImplementation();
  });

  it('checks for initial URL on mount', async () => {
    renderHook(() => useDeepLinkHandler());

    await waitFor(() => {
      expect(Linking.getInitialURL).toHaveBeenCalled();
    });
  });

  it('registers a URL event listener', () => {
    renderHook(() => useDeepLinkHandler());

    expect(Linking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function));
  });

  it('removes the URL listener on unmount', () => {
    const mockRemove = jest.fn();
    (Linking.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });

    const { unmount } = renderHook(() => useDeepLinkHandler());

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('processes magic link when initial URL is a magic link', async () => {
    const testUrl = 'exp://localhost/auth/callback#access_token=abc';
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(testUrl);
    (isMagicLinkCallback as jest.Mock).mockReturnValue(true);

    renderHook(() => useDeepLinkHandler());

    await waitFor(() => {
      expect(isMagicLinkCallback).toHaveBeenCalledWith(testUrl);
      expect(handleMagicLinkCallback).toHaveBeenCalledWith(testUrl);
    });
  });

  it('shows welcome alert on successful magic link auth', async () => {
    const testUrl = 'exp://localhost/auth/callback#access_token=abc';
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(testUrl);
    (isMagicLinkCallback as jest.Mock).mockReturnValue(true);

    renderHook(() => useDeepLinkHandler());

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Welcome to Rewards! 🎉',
        expect.stringContaining('test@example.com'),
        expect.any(Array)
      );
    });
  });

  it('shows claimed catches info when catches are linked', async () => {
    const testUrl = 'exp://localhost/auth/callback#access_token=abc';
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(testUrl);
    (isMagicLinkCallback as jest.Mock).mockReturnValue(true);
    (createRewardsMemberFromAuthUser as jest.Mock).mockResolvedValue({
      success: true,
      user: { email: 'test@example.com' },
      claimedCatches: 3,
    });

    renderHook(() => useDeepLinkHandler());

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Welcome to Rewards! 🎉',
        expect.stringContaining('3 previous catches'),
        expect.any(Array)
      );
    });
  });

  it('ignores non-magic-link URLs', async () => {
    const testUrl = 'exp://localhost/some-other-path';
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(testUrl);
    (isMagicLinkCallback as jest.Mock).mockReturnValue(false);

    renderHook(() => useDeepLinkHandler());

    await waitFor(() => {
      expect(handleMagicLinkCallback).not.toHaveBeenCalled();
    });
  });

  it('shows error alert on magic link failure', async () => {
    const testUrl = 'exp://localhost/auth/callback#access_token=abc';
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(testUrl);
    (isMagicLinkCallback as jest.Mock).mockReturnValue(true);
    (handleMagicLinkCallback as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Link expired',
    });

    renderHook(() => useDeepLinkHandler());

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign In Failed',
        expect.stringContaining('Link expired'),
        expect.any(Array)
      );
    });
  });
});
