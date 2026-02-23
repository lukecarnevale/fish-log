import { renderHook } from '@testing-library/react-native';

const mockUnsubscribe = jest.fn();
jest.mock('../../src/hooks/useOfflineStatus', () => ({
  startConnectivityListener: jest.fn(() => mockUnsubscribe),
}));

import { useConnectivityMonitoring } from '../../src/hooks/useConnectivityMonitoring';
import { startConnectivityListener } from '../../src/hooks/useOfflineStatus';

describe('useConnectivityMonitoring', () => {
  beforeEach(() => {
    mockUnsubscribe.mockClear();
    (startConnectivityListener as jest.Mock).mockClear();
    (startConnectivityListener as jest.Mock).mockReturnValue(mockUnsubscribe);
  });

  it('starts connectivity listener on mount', () => {
    renderHook(() => useConnectivityMonitoring());

    expect(startConnectivityListener).toHaveBeenCalledTimes(1);
    expect(startConnectivityListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useConnectivityMonitoring());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('passes a callback that logs sync results', () => {
    renderHook(() => useConnectivityMonitoring());

    const callback = (startConnectivityListener as jest.Mock).mock.calls[0][0];
    expect(typeof callback).toBe('function');

    // Should not throw when called
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    callback({ synced: 2, failed: 1, expired: 0 });
    consoleSpy.mockRestore();
  });
});
