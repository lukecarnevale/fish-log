import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { RewardsProvider, useRewards } from '../../src/contexts/RewardsContext';

// Mock all the services RewardsContext depends on
jest.mock('../../src/services/rewardsService', () => ({
  fetchRewardsData: jest.fn(() =>
    Promise.resolve({
      config: { quarter: 'Q1 2026', status: 'active' },
      currentDrawing: { id: 'drawing-1', name: 'Q1 Drawing' },
      userEntry: null,
    })
  ),
  enterRewardsDrawing: jest.fn(),
  recordDrawingEntry: jest.fn(),
  getEnteredDrawingIds: jest.fn(() => Promise.resolve([])),
  refreshRewardsData: jest.fn(),
  checkForNewQuarter: jest.fn(() => Promise.resolve({ isNewQuarter: false })),
  setLastSeenDrawingId: jest.fn(),
  getPendingDrawingEntry: jest.fn(() => Promise.resolve(null)),
  getRewardsStatusByDevice: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../src/services/reportsService', () => ({
  syncPendingReports: jest.fn(() => Promise.resolve({ synced: 0, failed: 0 })),
  retryFailedWebhooks: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn(() => Promise.resolve('mock-device-id')),
}));

jest.mock('../../src/services/pendingSubmissionService', () => ({
  updatePendingDrawingEntry: jest.fn(),
}));

jest.mock('../../src/data/rewardsFallbackData', () => ({
  FALLBACK_CONFIG: { quarter: 'FALLBACK', status: 'active' },
  FALLBACK_DRAWING: { id: 'fallback', name: 'Fallback Drawing' },
}));

jest.mock('../../src/services/anonymousUserService', () => ({
  getCurrentUserState: jest.fn(),
}));

jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../src/services/authService', () => ({
  onAuthStateChange: jest.fn(() => jest.fn()),
}));

jest.mock('../../src/utils/rewards', () => ({
  calculateDaysRemaining: jest.fn(() => 30),
  calculatePeriodProgress: jest.fn(() => 0.5),
  isWithinPeriod: jest.fn(() => true),
  formatDate: jest.fn(() => '2026-03-31'),
  calculateDerivedValues: jest.fn(() => ({
    daysRemaining: 30,
    isEligible: true,
    isPeriodActive: true,
    formattedDrawingDate: '2026-03-31',
    quarterDisplay: 'Q1 2026',
    periodProgress: 0.5,
  })),
}));

function TestConsumer() {
  const { config, isLoading, error, currentDrawing, calculated } = useRewards();

  if (isLoading) return <Text testID="loading">Loading</Text>;

  return (
    <>
      {error && <Text testID="error">{error}</Text>}
      <Text testID="quarter">{config?.quarter}</Text>
      <Text testID="drawing">{currentDrawing?.name}</Text>
      <Text testID="days">{calculated.daysRemaining}</Text>
    </>
  );
}

describe('RewardsContext', () => {
  it('provides rewards data to consumers after loading', async () => {
    const { getByTestId } = render(
      <RewardsProvider>
        <TestConsumer />
      </RewardsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('quarter')).toBeTruthy();
    });

    expect(getByTestId('quarter').props.children).toBe('Q1 2026');
    expect(getByTestId('drawing').props.children).toBe('Q1 Drawing');
  });

  it('shows loading state initially', async () => {
    const { getByTestId } = render(
      <RewardsProvider>
        <TestConsumer />
      </RewardsProvider>
    );

    // Should show loading initially
    expect(getByTestId('loading')).toBeTruthy();
  });

  it('provides calculated values', async () => {
    const { getByTestId } = render(
      <RewardsProvider>
        <TestConsumer />
      </RewardsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('days').props.children).toBe(30);
    });
  });

  it('uses fallback data on fetch error', async () => {
    const { fetchRewardsData } = require('../../src/services/rewardsService');
    fetchRewardsData.mockRejectedValueOnce(new Error('Network error'));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { getByTestId } = render(
      <RewardsProvider>
        <TestConsumer />
      </RewardsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('quarter').props.children).toBe('FALLBACK');
    });

    errorSpy.mockRestore();
  });
});
