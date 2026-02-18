import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CatchFeedScreen from '../../src/screens/CatchFeedScreen';

// ============================================
// MOCKS
// ============================================

// react-native-svg (screen has inline SVG illustrations)
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

// --- Services ---

const mockFetchRecentCatches = jest.fn();
const mockFetchTopAnglers = jest.fn();
const mockLikeCatch = jest.fn();
const mockUnlikeCatch = jest.fn();
jest.mock('../../src/services/catchFeedService', () => ({
  fetchRecentCatches: (...args: any[]) => mockFetchRecentCatches(...args),
  fetchTopAnglers: (...args: any[]) => mockFetchTopAnglers(...args),
  likeCatch: (...args: any[]) => mockLikeCatch(...args),
  unlikeCatch: (...args: any[]) => mockUnlikeCatch(...args),
  enrichCatchesWithLikes: jest.fn((catches: any) => catches),
  clearCatchFeedCache: jest.fn(),
}));

jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
  isRewardsMember: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../src/services/authService', () => ({
  onAuthStateChange: jest.fn(() => jest.fn()),
}));

jest.mock('../../src/services/advertisementsService', () => ({
  fetchAdvertisements: jest.fn().mockResolvedValue({ advertisements: [] }),
}));

jest.mock('../../src/utils/feedAdPlacer', () => ({
  intersperseFeedAds: jest.fn((catches: any) =>
    catches.map((c: any) => ({ type: 'catch', data: c }))
  ),
}));

// --- API hooks ---

jest.mock('../../src/api/speciesApi', () => ({
  useAllFishSpecies: jest.fn(() => ({ data: [], isLoading: false })),
}));

// --- Constants ---

jest.mock('../../src/constants/speciesColors', () => ({
  getAllSpeciesThemes: jest.fn(() => [
    { id: 'red-drum', name: 'Red Drum', primary: '#C62828', light: '#FFCDD2', icon: '#B71C1C', gradient: ['#C62828', '#E53935'] },
    { id: 'flounder', name: 'Flounder', primary: '#2E7D32', light: '#C8E6C9', icon: '#1B5E20', gradient: ['#2E7D32', '#43A047'] },
  ]),
}));

jest.mock('../../src/constants/speciesAliases', () => ({
  SPECIES_ALIASES: {},
}));

// --- Hooks ---

jest.mock('../../src/hooks/useFloatingHeaderAnimation', () => ({
  useFloatingHeaderAnimation: () => {
    const { Animated } = require('react-native');
    const scrollY = new Animated.Value(0);
    return {
      scrollY,
      floatingOpacity: scrollY.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      floatingTranslateXLeft: scrollY.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }),
      floatingTranslateXRight: scrollY.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }),
    };
  },
}));

jest.mock('../../src/hooks/usePulseAnimation', () => ({
  usePulseAnimation: () => {
    const { Animated } = require('react-native');
    return { pulseValue: new Animated.Value(0) };
  },
}));

// --- Child components ---

jest.mock('../../src/components/CatchCard', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ entry }: any) => (
      <View testID="catch-card">
        <Text>{entry.anglerName}</Text>
        <Text>{entry.species}</Text>
      </View>
    ),
  };
});

jest.mock('../../src/components/FeedAdCard', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ ad }: any) => (
      <View testID="feed-ad-card">
        <Text>{ad.title}</Text>
      </View>
    ),
  };
});

jest.mock('../../src/components/TopAnglersSection', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ anglers }: any) => (
      <View testID="top-anglers-section">
        {anglers.map((a: any) => (
          <Text key={a.userId}>{a.displayName}</Text>
        ))}
      </View>
    ),
  };
});

jest.mock('../../src/components/AnglerProfileModal', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, userId }: any) =>
      visible ? (
        <View testID="angler-profile-modal">
          <Text>Profile: {userId}</Text>
        </View>
      ) : null,
  };
});

jest.mock('../../src/components/BottomDrawer', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, children }: any) =>
      visible ? <View testID="bottom-drawer">{children}</View> : null,
  };
});

jest.mock('../../src/components/WaveBackground', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="wave-background" />,
  };
});

jest.mock('../../src/components/SkeletonLoader', () => {
  const { View, Text } = require('react-native');
  return {
    CatchFeedSkeletonLoader: () => (
      <View testID="catch-feed-skeleton">
        <Text>Loading catches...</Text>
      </View>
    ),
  };
});

// ============================================
// TEST HELPERS
// ============================================

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
} as any;

function makeCatchEntry(overrides: Partial<any> = {}): any {
  return {
    id: 'catch-1',
    userId: 'user-1',
    anglerName: 'John D.',
    species: 'Red Drum',
    speciesList: [{ species: 'Red Drum', count: 2 }],
    totalFish: 2,
    catchDate: '2026-02-10',
    createdAt: '2026-02-10T12:00:00Z',
    location: 'Pamlico Sound',
    likeCount: 5,
    isLikedByCurrentUser: false,
    ...overrides,
  };
}

function makeTopAngler(overrides: Partial<any> = {}): any {
  return {
    type: 'catches',
    userId: 'angler-1',
    displayName: 'Jane S.',
    value: 12,
    label: 'catches',
    ...overrides,
  };
}

// ============================================
// TESTS
// ============================================

describe('CatchFeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRecentCatches.mockResolvedValue({
      entries: [],
      hasMore: false,
      nextOffset: 0,
    });
    mockFetchTopAnglers.mockResolvedValue([]);
  });

  // ===== Rendering =====

  it('renders without crashing', async () => {
    const { toJSON } = render(
      <CatchFeedScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
  });

  it('renders the screen title', async () => {
    const { findByText } = render(
      <CatchFeedScreen navigation={mockNavigation} />
    );

    expect(await findByText('Catch Feed')).toBeTruthy();
  });

  it('renders the header subtitle', async () => {
    const { findByText } = render(
      <CatchFeedScreen navigation={mockNavigation} />
    );

    expect(await findByText('Community catches from NC anglers')).toBeTruthy();
  });

  it('renders the Live badge', async () => {
    const { findByText } = render(
      <CatchFeedScreen navigation={mockNavigation} />
    );

    expect(await findByText('Live')).toBeTruthy();
  });

  // ===== Loading State =====

  describe('Loading State', () => {
    it('shows skeleton loader while data is loading', () => {
      // fetchRecentCatches returns a pending promise (never resolves during this test)
      mockFetchRecentCatches.mockReturnValue(new Promise(() => {}));
      mockFetchTopAnglers.mockReturnValue(new Promise(() => {}));

      const { getByTestId } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(getByTestId('catch-feed-skeleton')).toBeTruthy();
    });
  });

  // ===== Empty State =====

  describe('Empty State', () => {
    it('shows empty state when no catches are returned', async () => {
      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByText('No Catches Yet')).toBeTruthy();
    });

    it('shows call-to-action text in empty state', async () => {
      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(
        await findByText(/Be the first to share your catch today/)
      ).toBeTruthy();
    });

    it('shows Report Your Catch button in empty state', async () => {
      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByText('Report Your Catch')).toBeTruthy();
    });

    it('navigates to ReportForm when Report Your Catch is pressed', async () => {
      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('Report Your Catch'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ReportForm');
    });
  });

  // ===== Catch Cards =====

  describe('Catch Cards', () => {
    it('renders catch cards when data is returned', async () => {
      const entries = [
        makeCatchEntry({ id: 'c1', anglerName: 'Alice M.' }),
        makeCatchEntry({ id: 'c2', anglerName: 'Bob T.', species: 'Flounder' }),
      ];

      mockFetchRecentCatches.mockResolvedValue({
        entries,
        hasMore: false,
        nextOffset: 2,
      });

      const { findByText, getAllByTestId } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByText('Alice M.')).toBeTruthy();
      expect(await findByText('Bob T.')).toBeTruthy();

      const cards = getAllByTestId('catch-card');
      expect(cards).toHaveLength(2);
    });

    it('renders species name on catch cards', async () => {
      mockFetchRecentCatches.mockResolvedValue({
        entries: [makeCatchEntry({ species: 'Flounder' })],
        hasMore: false,
        nextOffset: 1,
      });

      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByText('Flounder')).toBeTruthy();
    });
  });

  // ===== Top Anglers =====

  describe('Top Anglers Section', () => {
    it('renders top anglers section', async () => {
      mockFetchTopAnglers.mockResolvedValue([
        makeTopAngler({ userId: 'a1', displayName: 'Top Angler Joe' }),
      ]);

      const { findByTestId, findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByTestId('top-anglers-section')).toBeTruthy();
      expect(await findByText('Top Angler Joe')).toBeTruthy();
    });

    it('renders multiple top anglers', async () => {
      mockFetchTopAnglers.mockResolvedValue([
        makeTopAngler({ userId: 'a1', displayName: 'Angler One' }),
        makeTopAngler({ userId: 'a2', displayName: 'Angler Two', type: 'species' }),
      ]);

      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByText('Angler One')).toBeTruthy();
      expect(await findByText('Angler Two')).toBeTruthy();
    });
  });

  // ===== Filter Pills =====

  describe('Filters', () => {
    it('renders filter pills for areas, species, and photos', async () => {
      mockFetchRecentCatches.mockResolvedValue({
        entries: [makeCatchEntry()],
        hasMore: false,
        nextOffset: 1,
      });

      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByText('All Areas')).toBeTruthy();
      expect(await findByText('All Species')).toBeTruthy();
      expect(await findByText('Photos')).toBeTruthy();
    });

    it('shows "No Matches Found" when filters exclude all entries', async () => {
      mockFetchRecentCatches.mockResolvedValue({
        entries: [makeCatchEntry({ photoUrl: undefined })],
        hasMore: false,
        nextOffset: 1,
      });

      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      // Wait for entries to load first
      await findByText('John D.');

      // Press Photos filter to enable it - only entries with photos should show
      fireEvent.press(await findByText('Photos'));

      // Since our entry has no photoUrl, it should be filtered out
      expect(await findByText('No Matches Found')).toBeTruthy();
    });

    it('shows filter-specific empty message when filters are active', async () => {
      mockFetchRecentCatches.mockResolvedValue({
        entries: [makeCatchEntry({ photoUrl: undefined })],
        hasMore: false,
        nextOffset: 1,
      });

      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      await findByText('John D.');
      fireEvent.press(await findByText('Photos'));

      expect(
        await findByText('Try adjusting your filters to see more catches.')
      ).toBeTruthy();
    });

    it('does not show Report Your Catch button when filters are active with no results', async () => {
      mockFetchRecentCatches.mockResolvedValue({
        entries: [makeCatchEntry({ photoUrl: undefined })],
        hasMore: false,
        nextOffset: 1,
      });

      const { findByText, queryByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      await findByText('John D.');
      fireEvent.press(await findByText('Photos'));

      await findByText('No Matches Found');
      expect(queryByText('Report Your Catch')).toBeNull();
    });
  });

  // ===== Pull-to-Refresh =====

  describe('Pull-to-Refresh', () => {
    it('calls fetchRecentCatches on initial load', async () => {
      render(<CatchFeedScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockFetchRecentCatches).toHaveBeenCalled();
      });
    });

    it('calls fetchTopAnglers on initial load', async () => {
      render(<CatchFeedScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockFetchTopAnglers).toHaveBeenCalled();
      });
    });

    it('fetches data in parallel (catches and top anglers together)', async () => {
      render(<CatchFeedScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockFetchRecentCatches).toHaveBeenCalledTimes(1);
        expect(mockFetchTopAnglers).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ===== Error State =====

  describe('Error State', () => {
    it('shows error state when data fetching fails', async () => {
      mockFetchRecentCatches.mockRejectedValue(new Error('Network error'));

      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByText('Connection Issue')).toBeTruthy();
      expect(
        await findByText('Unable to load catches. Pull down to refresh.')
      ).toBeTruthy();
    });

    it('shows Try Again button on error', async () => {
      mockFetchRecentCatches.mockRejectedValue(new Error('Network error'));

      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      expect(await findByText('Try Again')).toBeTruthy();
    });

    it('retries loading when Try Again is pressed', async () => {
      mockFetchRecentCatches.mockRejectedValueOnce(new Error('Network error'));
      mockFetchRecentCatches.mockResolvedValue({
        entries: [makeCatchEntry()],
        hasMore: false,
        nextOffset: 1,
      });

      const { findByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('Try Again'));

      await waitFor(() => {
        expect(mockFetchRecentCatches).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ===== Navigation =====

  describe('Navigation', () => {
    it('calls goBack when back button in header is pressed', async () => {
      const { findAllByText } = render(
        <CatchFeedScreen navigation={mockNavigation} />
      );

      // The header has a back button that renders a Feather icon with name="arrow-left"
      // The mock renders icon names as text. There are two: scrolling header + floating.
      // Press the first one (scrolling header back button).
      const arrowLeftButtons = await findAllByText('arrow-left');
      expect(arrowLeftButtons.length).toBeGreaterThanOrEqual(1);
      fireEvent.press(arrowLeftButtons[0]);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
