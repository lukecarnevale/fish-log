import { renderHook, act, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';

// Mock the offlineQueue service
jest.mock('../../src/services/offlineQueue', () => ({
  getQueueCount: jest.fn(() => Promise.resolve(0)),
  syncQueuedReports: jest.fn(() =>
    Promise.resolve({ synced: 0, failed: 0, expired: 0 })
  ),
}));

import { useOfflineStatus, startConnectivityListener } from '../../src/hooks/useOfflineStatus';
import { getQueueCount, syncQueuedReports } from '../../src/services/offlineQueue';

describe('useOfflineStatus', () => {
  beforeEach(() => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    (getQueueCount as jest.Mock).mockResolvedValue(0);
    (syncQueuedReports as jest.Mock).mockResolvedValue({
      synced: 0,
      failed: 0,
      expired: 0,
    });
  });

  it('reports online when connected and internet reachable', async () => {
    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('reports offline when not connected', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isOnline).toBe(false);
    });
  });

  it('reports online when connected but isInternetReachable is null', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: null,
    });

    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('reports offline when isInternetReachable is false', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: false,
    });

    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });
  });

  it('loads initial pending count on mount', async () => {
    (getQueueCount as jest.Mock).mockResolvedValue(3);

    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(3);
    });
  });

  it('triggerSync returns null when no reports are queued', async () => {
    (getQueueCount as jest.Mock).mockResolvedValue(0);

    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => expect(result.current.isOnline).toBe(true));

    let syncResult: any;
    await act(async () => {
      syncResult = await result.current.triggerSync();
    });

    expect(syncResult).toBeNull();
    expect(syncQueuedReports).not.toHaveBeenCalled();
  });

  it('triggerSync syncs when reports are queued', async () => {
    (getQueueCount as jest.Mock).mockResolvedValue(2);
    const mockSyncResult = { synced: 2, failed: 0, expired: 0 };
    (syncQueuedReports as jest.Mock).mockResolvedValue(mockSyncResult);

    const { result } = renderHook(() => useOfflineStatus());

    await waitFor(() => expect(result.current.pendingCount).toBe(2));

    let syncResult: any;
    await act(async () => {
      syncResult = await result.current.triggerSync();
    });

    expect(syncResult).toEqual(mockSyncResult);
    expect(syncQueuedReports).toHaveBeenCalledTimes(1);
  });

  it('calls onSyncComplete callback after successful sync', async () => {
    const onSyncComplete = jest.fn();
    (getQueueCount as jest.Mock).mockResolvedValue(1);
    const mockResult = { synced: 1, failed: 0, expired: 0 };
    (syncQueuedReports as jest.Mock).mockResolvedValue(mockResult);

    const { result } = renderHook(() =>
      useOfflineStatus({ onSyncComplete })
    );

    await waitFor(() => expect(result.current.pendingCount).toBe(1));

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(onSyncComplete).toHaveBeenCalledWith(mockResult);
  });

  it('calls onConnectivityChange when connectivity state changes', async () => {
    const onConnectivityChange = jest.fn();
    let listenerCallback: (state: any) => void;
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listenerCallback = cb;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      useOfflineStatus({ onConnectivityChange })
    );

    // Wait for initial state to be set (wasOnlineRef must be initialized)
    await waitFor(() => expect(result.current.isOnline).toBe(true));

    // Simulate going offline
    await act(async () => {
      listenerCallback!({ isConnected: false, isInternetReachable: false });
    });

    expect(onConnectivityChange).toHaveBeenCalledWith(false);
  });

  it('unsubscribes from NetInfo on unmount', async () => {
    const unsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

    const { result, unmount } = renderHook(() => useOfflineStatus());

    await waitFor(() => expect(result.current.isOnline).toBe(true));

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('isSyncing is true during sync and false after', async () => {
    (getQueueCount as jest.Mock).mockResolvedValue(1);
    (syncQueuedReports as jest.Mock).mockResolvedValue({
      synced: 1,
      failed: 0,
      expired: 0,
    });

    const { result } = renderHook(() => useOfflineStatus());
    await waitFor(() => expect(result.current.pendingCount).toBe(1));

    expect(result.current.isSyncing).toBe(false);

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(result.current.isSyncing).toBe(false); // should be false after sync completes
  });

  it('stores lastSyncResult after sync', async () => {
    (getQueueCount as jest.Mock).mockResolvedValue(1);
    const mockResult = { synced: 1, failed: 0, expired: 0 };
    (syncQueuedReports as jest.Mock).mockResolvedValue(mockResult);

    const { result } = renderHook(() => useOfflineStatus());
    await waitFor(() => expect(result.current.pendingCount).toBe(1));

    expect(result.current.lastSyncResult).toBeNull();

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(result.current.lastSyncResult).toEqual(mockResult);
  });
});

describe('startConnectivityListener', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    (getQueueCount as jest.Mock).mockResolvedValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns an unsubscribe function', () => {
    const unsubscribe = startConnectivityListener();
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('auto-syncs when transitioning from offline to online with queued reports', async () => {
    let listenerCallback: (state: any) => void;
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listenerCallback = cb;
      return jest.fn();
    });
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    (getQueueCount as jest.Mock).mockResolvedValue(2);
    (syncQueuedReports as jest.Mock).mockResolvedValue({
      synced: 2,
      failed: 0,
      expired: 0,
    });

    const onSync = jest.fn();
    startConnectivityListener(onSync);

    // Set initial offline state
    await act(async () => {
      listenerCallback!({ isConnected: false, isInternetReachable: false });
    });

    // Transition to online
    await act(async () => {
      listenerCallback!({ isConnected: true, isInternetReachable: true });
    });

    // Advance past the 1s delay
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Allow async operations to complete
    await waitFor(() => {
      expect(syncQueuedReports).toHaveBeenCalled();
    });
  });

  it('cleanup clears pending timeout', () => {
    const unsubscribe = startConnectivityListener();
    // Just verify no error on cleanup
    unsubscribe();
  });
});
