import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share, BackHandler } from 'react-native';
import ConfirmationScreen from '../../src/screens/ConfirmationScreen';

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

// Mock offlineQueue
const mockSubmitWithQueueFallback = jest.fn();
jest.mock('../../src/services/offlineQueue', () => ({
  submitWithQueueFallback: (...args: any[]) => mockSubmitWithQueueFallback(...args),
}));

// Mock anonymousUserService
jest.mock('../../src/services/anonymousUserService', () => ({
  shouldShowRewardsPrompt: jest.fn().mockResolvedValue(false),
  getCurrentUserState: jest.fn().mockResolvedValue(null),
}));

// Mock badgeUtils
jest.mock('../../src/utils/badgeUtils', () => ({
  markNewReportSubmitted: jest.fn().mockResolvedValue(undefined),
  invalidateBadgeCache: jest.fn(),
  BADGE_STORAGE_KEYS: {},
}));

// Mock catchFeedService
jest.mock('../../src/services/catchFeedService', () => ({
  clearCatchFeedCache: jest.fn().mockResolvedValue(undefined),
}));

// Mock userProfileService
jest.mock('../../src/services/userProfileService', () => ({
  updateCurrentUser: jest.fn().mockResolvedValue(undefined),
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));

// Mock species constants
jest.mock('../../src/constants/species', () => ({
  aggregateFishEntries: jest.fn((entries: any[]) => ({
    redDrum: entries.filter((e: any) => e.species === 'Red Drum').reduce((s: number, e: any) => s + e.count, 0),
    flounder: entries.filter((e: any) => e.species === 'Southern Flounder').reduce((s: number, e: any) => s + e.count, 0),
    spottedSeatrout: entries.filter((e: any) => e.species === 'Spotted Seatrout').reduce((s: number, e: any) => s + e.count, 0),
    weakfish: entries.filter((e: any) => e.species === 'Weakfish').reduce((s: number, e: any) => s + e.count, 0),
    stripedBass: entries.filter((e: any) => e.species === 'Striped Bass').reduce((s: number, e: any) => s + e.count, 0),
  })),
}));

// Mock AchievementContext
jest.mock('../../src/contexts/AchievementContext', () => ({
  useAchievements: jest.fn(() => ({
    queueAchievementsForLater: jest.fn(),
    showAchievements: jest.fn(),
    showAchievement: jest.fn(),
    flushPendingAchievements: jest.fn(),
    isShowingAchievement: false,
    queueLength: 0,
    pendingCount: 0,
  })),
}));

// Mock RewardsPromptModal
jest.mock('../../src/components/RewardsPromptModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }: any) => visible ? <View testID="rewards-prompt-modal" /> : null,
  };
});

// Mock WaveAccent
jest.mock('../../src/components/WaveAccent', () => {
  const { View } = require('react-native');
  return {
    WaveAccent: () => <View testID="wave-accent" />,
    WAVE_PRESETS: { warning: {}, primary: {} },
  };
});

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
} as any;

const baseReportData = {
  fishEntries: [
    { species: 'Red Drum', count: 2 },
    { species: 'Southern Flounder', count: 1 },
  ],
  date: '2026-02-15',
  waterbody: 'Pamlico Sound',
  usedHookAndLine: true,
  areaCode: 'PS-01',
  hasLicense: true,
  wrcId: 'WRC123',
  angler: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-123-4567',
  },
  wantTextConfirmation: true,
  wantEmailConfirmation: true,
};

const createRoute = (reportData: any = baseReportData) => ({
  key: 'Confirmation-test',
  name: 'Confirmation' as const,
  params: { reportData },
});

describe('ConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== Loading State =====

  describe('Loading / Submitting State', () => {
    it('shows loading indicator while submitting', () => {
      mockSubmitWithQueueFallback.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { getByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(getByText('Submitting to NC DMF...')).toBeTruthy();
    });

    it('shows TEST MODE note when in test mode', () => {
      mockSubmitWithQueueFallback.mockImplementation(() => new Promise(() => {}));

      const { getByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(getByText(/TEST MODE/)).toBeTruthy();
    });
  });

  // ===== Success State =====

  describe('Success State', () => {
    beforeEach(() => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: true,
        queued: false,
        confirmationNumber: 'DMF-12345',
        savedToSupabase: true,
      });
    });

    it('shows Report Submitted header after successful submission', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('Report Submitted')).toBeTruthy();
    });

    it('shows confirmation number', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('DMF-12345')).toBeTruthy();
      expect(await findByText('CONFIRMATION NUMBER')).toBeTruthy();
    });

    it('shows Thank You message', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('Thank You!')).toBeTruthy();
    });

    it('shows report summary', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('Report Summary')).toBeTruthy();
      expect(await findByText('Pamlico Sound')).toBeTruthy();
      expect(await findByText('3')).toBeTruthy(); // totalFishCount
    });

    it('shows text confirmation notification', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText(/Text sent to 555-123-4567/)).toBeTruthy();
    });

    it('shows email confirmation notification', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText(/Email sent to john@example.com/)).toBeTruthy();
    });

    it('shows What happens next section', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('What happens next?')).toBeTruthy();
      expect(await findByText(/NC General Statute 113-170.3/)).toBeTruthy();
    });

    it('shows action buttons', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('Return to Home')).toBeTruthy();
      expect(await findByText('Submit Another Report')).toBeTruthy();
      expect(await findByText('Share')).toBeTruthy();
      expect(await findByText('Copy #')).toBeTruthy();
      expect(await findByText('Past Reports')).toBeTruthy();
    });
  });

  // ===== Navigation =====

  describe('Navigation', () => {
    beforeEach(() => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: true,
        queued: false,
        confirmationNumber: 'DMF-12345',
      });
    });

    it('navigates home when Return to Home is pressed', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      fireEvent.press(await findByText('Return to Home'));
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    });

    it('navigates to report form when Submit Another is pressed', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      fireEvent.press(await findByText('Submit Another Report'));
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'ReportForm' }],
      });
    });

    it('navigates home when close button is pressed', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      // Close button is the X icon
      await findByText('Report Submitted');
      fireEvent.press(await findByText('x'));

      expect(mockNavigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    });
  });

  // ===== Clipboard & Share =====

  describe('Clipboard & Share', () => {
    beforeEach(() => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: true,
        queued: false,
        confirmationNumber: 'DMF-12345',
      });
    });

    it('copies confirmation number when Copy button is pressed', async () => {
      const Clipboard = require('expo-clipboard');
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      fireEvent.press(await findByText('Copy #'));

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('DMF-12345');
      });
    });

    it('calls Share.share when Share button is pressed', async () => {
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      fireEvent.press(await findByText('Share'));

      await waitFor(() => {
        expect(shareSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('DMF-12345'),
          })
        );
      });
      shareSpy.mockRestore();
    });
  });

  // ===== Error State =====

  describe('Error State', () => {
    it('shows error UI when submission fails', async () => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: false,
        queued: false,
        error: 'Network timeout',
      });

      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('Submission Failed')).toBeTruthy();
      expect(await findByText('Network timeout')).toBeTruthy();
    });

    it('shows Try Again and Return Home buttons on error', async () => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: false,
        queued: false,
        error: 'Server error',
      });

      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('Try Again')).toBeTruthy();
      expect(await findByText('Return Home')).toBeTruthy();
    });

    it('retries submission when Try Again is pressed', async () => {
      mockSubmitWithQueueFallback
        .mockResolvedValueOnce({ success: false, queued: false, error: 'Fail' })
        .mockResolvedValueOnce({ success: true, queued: false, confirmationNumber: 'DMF-99999' });

      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      fireEvent.press(await findByText('Try Again'));

      expect(await findByText('Report Submitted')).toBeTruthy();
      expect(mockSubmitWithQueueFallback).toHaveBeenCalledTimes(2);
    });

    it('navigates home from error state when Return Home is pressed', async () => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: false,
        queued: false,
        error: 'Error',
      });

      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      fireEvent.press(await findByText('Return Home'));
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    });
  });

  // ===== Queued State =====

  describe('Queued State (Offline)', () => {
    beforeEach(() => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: false,
        queued: true,
        confirmationNumber: 'LOCAL-99999',
      });
    });

    it('shows Report Queued header when offline', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('Report Queued')).toBeTruthy();
    });

    it('shows Saved for Later message', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('Saved for Later')).toBeTruthy();
    });

    it('shows LOCAL CONFIRMATION # label', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText('LOCAL CONFIRMATION #')).toBeTruthy();
    });

    it('shows offline warning message', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText(/saved offline.*automatically submit/i)).toBeTruthy();
    });

    it('shows pending notification status for text/email', async () => {
      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute()} />
      );

      expect(await findByText(/Text will be sent.*when synced/)).toBeTruthy();
      expect(await findByText(/Email will be sent.*when synced/)).toBeTruthy();
    });
  });

  // ===== No Confirmations Requested =====

  describe('No Confirmations', () => {
    it('shows screenshot reminder when no confirmations are requested', async () => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: true,
        queued: false,
        confirmationNumber: 'DMF-88888',
      });

      const reportWithNoConfirmations = {
        ...baseReportData,
        wantTextConfirmation: false,
        wantEmailConfirmation: false,
      };

      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute(reportWithNoConfirmations)} />
      );

      expect(await findByText(/No confirmation requested.*Take a screenshot/i)).toBeTruthy();
    });
  });

  // ===== Raffle Entry =====

  describe('Raffle Entry', () => {
    it('shows raffle entry section when raffle was entered', async () => {
      mockSubmitWithQueueFallback.mockResolvedValue({
        success: true,
        queued: false,
        confirmationNumber: 'DMF-77777',
      });

      const reportWithRaffle = {
        ...baseReportData,
        enteredRaffle: true,
      };

      const { findByText } = render(
        <ConfirmationScreen navigation={mockNavigation} route={createRoute(reportWithRaffle)} />
      );

      expect(await findByText('Rewards Entry')).toBeTruthy();
      expect(await findByText(/entered into the quarterly rewards drawing/i)).toBeTruthy();
    });
  });
});
