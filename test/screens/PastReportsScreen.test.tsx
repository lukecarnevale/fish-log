import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PastReportsScreen from '../../src/screens/PastReportsScreen';

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="date-picker" {...props} />,
  };
});

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

// Mock offlineQueue
const mockGetHistory = jest.fn().mockResolvedValue([]);
const mockGetQueue = jest.fn().mockResolvedValue([]);
jest.mock('../../src/services/offlineQueue', () => ({
  getHistory: () => mockGetHistory(),
  getQueue: () => mockGetQueue(),
}));

// Mock speciesApi
jest.mock('../../src/api/speciesApi', () => ({
  useAllFishSpecies: jest.fn(() => ({ data: [], isLoading: false, error: null })),
}));

// Mock ScreenLayout
jest.mock('../../src/components/ScreenLayout', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, title, subtitle, navigation, noScroll }: any) => (
      <View testID="screen-layout">
        <Text>{title}</Text>
        {subtitle && <Text>{subtitle}</Text>}
        <TouchableOpacity testID="back-button" onPress={() => navigation.goBack()}>
          <Text>Back</Text>
        </TouchableOpacity>
        {children}
      </View>
    ),
  };
});

// Mock SkeletonLoader
jest.mock('../../src/components/SkeletonLoader', () => {
  const { View, Text } = require('react-native');
  return {
    PastReportsSkeletonLoader: () => <View testID="skeleton-loader"><Text>Loading...</Text></View>,
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

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Path: View,
    G: View,
    Circle: View,
    Rect: View,
    Ellipse: View,
  };
});

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
} as any;

describe('PastReportsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHistory.mockResolvedValue([]);
    mockGetQueue.mockResolvedValue([]);
  });

  // ===== Loading State =====

  it('renders the screen title', async () => {
    const { getByText } = render(
      <PastReportsScreen navigation={mockNavigation} />
    );

    expect(getByText('Past Reports')).toBeTruthy();
  });

  // ===== Empty State =====

  describe('Empty State', () => {
    it('shows empty state when no reports exist', async () => {
      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText('No Reports Yet')).toBeTruthy();
      expect(await findByText(/harvest reports will appear here/i)).toBeTruthy();
    });

    it('shows Submit a Report button in empty state', async () => {
      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText('Submit a Report')).toBeTruthy();
    });

    it('navigates to ReportForm when Submit a Report is pressed', async () => {
      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('Submit a Report'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ReportForm');
    });
  });

  // ===== Reports Display =====

  describe('Reports Display', () => {
    const submittedReport = {
      confirmationNumber: 'DMF-12345',
      harvestDate: '2026-01-15',
      areaLabel: 'Pamlico Sound',
      areaCode: 'PS-01',
      usedHookAndLine: true,
      redDrumCount: 2,
      flounderCount: 0,
      spottedSeatroutCount: 1,
      weakfishCount: 0,
      stripedBassCount: 0,
      submittedAt: '2026-01-15T10:30:00Z',
      firstName: 'John',
      lastName: 'Doe',
      fishEntries: [
        { species: 'Red Drum', count: 2, lengths: ['18', '22'] },
        { species: 'Spotted Seatrout', count: 1 },
      ],
    };

    const queuedReport = {
      localConfirmationNumber: 'LOCAL-99999',
      harvestDate: '2026-01-16',
      areaLabel: 'Neuse River',
      areaCode: 'NR-01',
      usedHookAndLine: false,
      gearLabel: 'Cast Net',
      redDrumCount: 0,
      flounderCount: 1,
      spottedSeatroutCount: 0,
      weakfishCount: 0,
      stripedBassCount: 0,
      queuedAt: '2026-01-16T08:00:00Z',
      retryCount: 2,
      fishEntries: [{ species: 'Flounder', count: 1 }],
    };

    it('renders submitted reports', async () => {
      mockGetHistory.mockResolvedValue([submittedReport]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText('#DMF-12345')).toBeTruthy();
      expect(await findByText('Pamlico Sound')).toBeTruthy();
    });

    it('renders species tags on report cards', async () => {
      mockGetHistory.mockResolvedValue([submittedReport]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText('Red Drum')).toBeTruthy();
      expect(await findByText('Seatrout')).toBeTruthy();
    });

    it('renders total fish count', async () => {
      mockGetHistory.mockResolvedValue([submittedReport]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText('3 fish')).toBeTruthy();
    });

    it('shows pending banner when queued reports exist', async () => {
      mockGetQueue.mockResolvedValue([queuedReport]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText(/1 report pending sync/)).toBeTruthy();
    });

    it('shows retry count on failed queued reports', async () => {
      mockGetQueue.mockResolvedValue([queuedReport]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText(/Sync failed \(2x\)/)).toBeTruthy();
    });

    it('renders subtitle with report counts', async () => {
      mockGetHistory.mockResolvedValue([submittedReport]);
      mockGetQueue.mockResolvedValue([queuedReport]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText('1 submitted • 1 pending')).toBeTruthy();
    });
  });

  // ===== Filter Tabs =====

  describe('Filter Tabs', () => {
    const submitted = {
      confirmationNumber: 'DMF-111',
      harvestDate: '2026-01-15',
      areaCode: 'A1',
      usedHookAndLine: true,
      redDrumCount: 1,
      flounderCount: 0,
      spottedSeatroutCount: 0,
      weakfishCount: 0,
      stripedBassCount: 0,
      submittedAt: '2026-01-15T10:00:00Z',
    };

    const queued = {
      localConfirmationNumber: 'LOCAL-222',
      harvestDate: '2026-01-16',
      areaCode: 'A2',
      usedHookAndLine: true,
      redDrumCount: 0,
      flounderCount: 1,
      spottedSeatroutCount: 0,
      weakfishCount: 0,
      stripedBassCount: 0,
      queuedAt: '2026-01-16T10:00:00Z',
    };

    it('renders filter tabs with correct counts', async () => {
      mockGetHistory.mockResolvedValue([submitted]);
      mockGetQueue.mockResolvedValue([queued]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText('All (2)')).toBeTruthy();
      expect(await findByText('Submitted (1)')).toBeTruthy();
      expect(await findByText('Pending (1)')).toBeTruthy();
    });

    it('filters to submitted only when Submitted tab is pressed', async () => {
      mockGetHistory.mockResolvedValue([submitted]);
      mockGetQueue.mockResolvedValue([queued]);

      const { findByText, queryByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      // Initially both are shown
      expect(await findByText('#DMF-111')).toBeTruthy();
      expect(await findByText('#LOCAL-222')).toBeTruthy();

      // Press Submitted filter
      fireEvent.press(await findByText('Submitted (1)'));

      // Only submitted should remain
      await waitFor(() => {
        expect(queryByText('#LOCAL-222')).toBeNull();
      });
      expect(await findByText('#DMF-111')).toBeTruthy();
    });

    it('filters to pending only when Pending tab is pressed', async () => {
      mockGetHistory.mockResolvedValue([submitted]);
      mockGetQueue.mockResolvedValue([queued]);

      const { findByText, queryByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      await findByText('#DMF-111');

      // Press Pending filter
      fireEvent.press(await findByText('Pending (1)'));

      await waitFor(() => {
        expect(queryByText('#DMF-111')).toBeNull();
      });
      expect(await findByText('#LOCAL-222')).toBeTruthy();
    });

    it('shows empty pending message when filtering to pending with none', async () => {
      mockGetHistory.mockResolvedValue([submitted]);
      mockGetQueue.mockResolvedValue([]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      await findByText('#DMF-111');

      fireEvent.press(await findByText('Pending (0)'));

      expect(await findByText('No Reports Pending')).toBeTruthy();
      expect(await findByText(/All your reports have been submitted/)).toBeTruthy();
    });
  });

  // ===== Report Detail Modal =====

  describe('Report Detail Modal', () => {
    const report = {
      confirmationNumber: 'DMF-55555',
      harvestDate: '2026-02-10',
      areaLabel: 'Neuse River',
      areaCode: 'NR-01',
      usedHookAndLine: true,
      redDrumCount: 3,
      flounderCount: 0,
      spottedSeatroutCount: 0,
      weakfishCount: 0,
      stripedBassCount: 0,
      submittedAt: '2026-02-10T12:00:00Z',
      firstName: 'Jane',
      lastName: 'Smith',
      wrcId: 'WRC789',
      objectId: 42,
      fishEntries: [
        { species: 'Red Drum', count: 3, lengths: ['20', '22', '25'], tagNumber: 'TAG-001' },
      ],
    };

    it('opens detail modal when report card is pressed', async () => {
      mockGetHistory.mockResolvedValue([report]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      // Press the report card
      fireEvent.press(await findByText('#DMF-55555'));

      // Modal should show detailed info
      expect(await findByText('Submitted to DMF')).toBeTruthy();
      expect(await findByText('DMF CONFIRMATION #')).toBeTruthy();
    });

    it('shows harvest details in modal', async () => {
      mockGetHistory.mockResolvedValue([report]);

      const { findByText, getAllByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('#DMF-55555'));

      expect(await findByText('Harvest Details')).toBeTruthy();
      // These texts appear on both card and modal, verify they're present
      await waitFor(() => {
        expect(getAllByText('Neuse River').length).toBeGreaterThanOrEqual(2);
        expect(getAllByText('Hook & Line').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('shows fish entries with lengths in modal', async () => {
      mockGetHistory.mockResolvedValue([report]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('#DMF-55555'));

      expect(await findByText('Fish Reported (3 total)')).toBeTruthy();
      expect(await findByText('Lengths:')).toBeTruthy();
      expect(await findByText('20", 22", 25"')).toBeTruthy();
    });

    it('shows tag number in modal when present', async () => {
      mockGetHistory.mockResolvedValue([report]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('#DMF-55555'));

      expect(await findByText('Tag #:')).toBeTruthy();
      expect(await findByText('TAG-001')).toBeTruthy();
    });

    it('shows angler information in modal', async () => {
      mockGetHistory.mockResolvedValue([report]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('#DMF-55555'));

      expect(await findByText('Angler Information')).toBeTruthy();
      expect(await findByText('Jane Smith')).toBeTruthy();
      expect(await findByText('WRC789')).toBeTruthy();
    });

    it('shows DMF reference (object ID) in modal', async () => {
      mockGetHistory.mockResolvedValue([report]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('#DMF-55555'));

      expect(await findByText('DMF Reference')).toBeTruthy();
      expect(await findByText('42')).toBeTruthy();
    });

    it('closes modal when Close button is pressed', async () => {
      mockGetHistory.mockResolvedValue([report]);

      const { findByText, queryByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('#DMF-55555'));
      expect(await findByText('Submitted to DMF')).toBeTruthy();

      fireEvent.press(await findByText('Close'));

      await waitFor(() => {
        expect(queryByText('Submitted to DMF')).toBeNull();
      });
    });

    it('copies confirmation number when tapped in modal', async () => {
      const Clipboard = require('expo-clipboard');
      mockGetHistory.mockResolvedValue([report]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('#DMF-55555'));

      // The confirmation box has "Tap to copy" hint
      fireEvent.press(await findByText('Tap to copy'));

      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('DMF-55555');
    });
  });

  // ===== Queued Report Display =====

  describe('Queued Reports', () => {
    const queuedReport = {
      localConfirmationNumber: 'LOCAL-77777',
      harvestDate: '2026-02-12',
      areaLabel: 'Cape Fear River',
      areaCode: 'CF-01',
      usedHookAndLine: true,
      redDrumCount: 1,
      flounderCount: 0,
      spottedSeatroutCount: 0,
      weakfishCount: 0,
      stripedBassCount: 0,
      queuedAt: '2026-02-12T09:00:00Z',
      retryCount: 0,
    };

    it('shows pending sync banner on queued report cards', async () => {
      mockGetQueue.mockResolvedValue([queuedReport]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      expect(await findByText('Pending sync to DMF')).toBeTruthy();
    });

    it('shows Pending Sync status in modal for queued reports', async () => {
      mockGetQueue.mockResolvedValue([queuedReport]);

      const { findByText } = render(
        <PastReportsScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('#LOCAL-77777'));

      expect(await findByText('Pending Sync')).toBeTruthy();
      expect(await findByText('LOCAL CONFIRMATION #')).toBeTruthy();
    });
  });
});
