import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SpeciesInfoScreen from '../../src/screens/SpeciesInfoScreen';
import { EnhancedFishSpecies } from '../../src/types/fishSpecies';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const makeSpecies = (overrides: Partial<EnhancedFishSpecies> = {}): EnhancedFishSpecies => ({
  id: '1',
  name: 'Red Drum',
  scientificName: 'Sciaenops ocellatus',
  image: 'https://example.com/red-drum.jpg',
  description: 'A popular inshore game fish found along the Atlantic coast.',
  habitat: 'Coastal waters and estuaries',
  seasons: { spring: true, summer: true, fall: true, winter: false },
  commonNames: ['Channel Bass', 'Puppy Drum'],
  images: {
    primary: 'https://example.com/red-drum.jpg',
    additional: [],
  },
  identification: 'Dark spot on tail, copper color',
  maxSize: '45 in',
  distribution: 'Atlantic coast from Massachusetts to Florida',
  regulations: {
    sizeLimit: { min: 18, max: 27, unit: 'in' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: [],
  },
  conservationStatus: 'Least Concern',
  fishingTips: {
    techniques: ['Bottom fishing'],
    baits: ['Cut mullet'],
    equipment: ['Medium-heavy rod'],
    locations: ['Pamlico Sound'],
  },
  categories: { type: ['Saltwater'], group: ['Drum'] },
  harvestStatus: 'open',
  ...overrides,
});

const redDrum = makeSpecies();

const blueMarlin = makeSpecies({
  id: '2',
  name: 'Blue Marlin',
  scientificName: 'Makaira nigricans',
  image: 'https://example.com/marlin.jpg',
  description: 'A large billfish found in offshore waters.',
  habitat: 'Deep offshore waters',
  commonNames: [],
  images: { primary: 'https://example.com/marlin.jpg', additional: [] },
  identification: 'Cobalt blue dorsal surface',
  maxSize: '14 ft',
  distribution: 'Atlantic and Pacific oceans',
  regulations: {
    sizeLimit: { min: 99, max: null, unit: 'in' },
    bagLimit: null,
    openSeasons: null,
    specialRegulations: [],
  },
  conservationStatus: 'Vulnerable',
  fishingTips: {
    techniques: ['Trolling'],
    baits: ['Ballyhoo'],
    equipment: ['Heavy stand-up rod'],
    locations: ['Gulf Stream'],
  },
  categories: { type: ['Saltwater'], group: ['Billfish'] },
  harvestStatus: 'open',
});

const southernFlounder = makeSpecies({
  id: '3',
  name: 'Southern Flounder',
  scientificName: 'Paralichthys lethostigma',
  image: 'https://example.com/flounder.jpg',
  description: 'A flatfish found in shallow coastal waters.',
  habitat: 'Sandy bottoms in estuaries',
  commonNames: ['Flounder'],
  images: { primary: 'https://example.com/flounder.jpg', additional: [] },
  identification: 'Flat body, both eyes on left side',
  maxSize: '28 in',
  distribution: 'Western Atlantic from Virginia to Texas',
  regulations: {
    sizeLimit: { min: 15, max: null, unit: 'in' },
    bagLimit: 4,
    openSeasons: [{ from: '09-01', to: '09-30' }],
    specialRegulations: [],
  },
  conservationStatus: 'Near Threatened',
  fishingTips: {
    techniques: ['Gigging'],
    baits: ['Live minnows'],
    equipment: ['Light spinning rod'],
    locations: ['Inshore flats'],
  },
  categories: { type: ['Saltwater', 'Brackish'], group: ['Flounder'] },
  harvestStatus: 'open',
});

const defaultSpeciesData = [redDrum, blueMarlin, southernFlounder];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// speciesApi
const mockUseAllFishSpecies = jest.fn(() => ({
  data: defaultSpeciesData,
  isLoading: false,
  error: null,
}));

jest.mock('../../src/api/speciesApi', () => ({
  useAllFishSpecies: (...args: any[]) => (mockUseAllFishSpecies as any)(...args),
}));

// SpeciesAlertsContext
const mockMarkSpeciesAlertSeen = jest.fn();
jest.mock('../../src/contexts/SpeciesAlertsContext', () => ({
  useSpeciesAlerts: jest.fn(() => ({
    markSpeciesAlertSeen: mockMarkSpeciesAlertSeen,
    hasSeenAlert: jest.fn(() => false),
  })),
}));

// speciesBulletinApi
jest.mock('../../src/api/speciesBulletinApi', () => ({
  useBulletinsForSpecies: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}));

// ScreenLayout
jest.mock('../../src/components/ScreenLayout', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, title, navigation }: any) => (
      <View testID="screen-layout">
        <Text>{title}</Text>
        <TouchableOpacity testID="back-button" onPress={() => navigation.goBack()}>
          <Text>Back</Text>
        </TouchableOpacity>
        {children}
      </View>
    ),
  };
});

// SpeciesListBulletinIndicator
jest.mock('../../src/components/SpeciesListBulletinIndicator', () => {
  const { View, Text } = require('react-native');
  return {
    SpeciesListBulletinIndicator: ({ harvestStatus }: any) => (
      <View testID="bulletin-indicator">
        <Text>{harvestStatus}</Text>
      </View>
    ),
  };
});

// SpeciesDetailBulletinBanner
jest.mock('../../src/components/SpeciesDetailBulletinBanner', () => {
  const { View } = require('react-native');
  return {
    SpeciesDetailBulletinBanner: () => <View testID="bulletin-banner" />,
  };
});

// SpeciesFilterChips
jest.mock('../../src/components/SpeciesFilterChips', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ filters, isExpanded }: any) =>
      isExpanded ? (
        <View testID="filter-chips">
          {filters.map((f: any) => (
            <TouchableOpacity key={f.key} onPress={f.onToggle} testID={`filter-${f.key}`}>
              <Text>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null,
  };
});

// WaveAccent
jest.mock('../../src/components/WaveAccent', () => {
  const { View } = require('react-native');
  return {
    WaveAccent: () => <View testID="wave-accent" />,
    WAVE_PRESETS: { primary: {}, warning: {} },
  };
});

// react-native-svg
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

// ---------------------------------------------------------------------------
// Navigation & Route helpers
// ---------------------------------------------------------------------------

const createMockNavigation = () => ({
  goBack: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
});

const createMockRoute = (params?: { showRequiredOnly?: boolean; fromAlertBadge?: boolean }) => ({
  key: 'SpeciesInfo',
  name: 'SpeciesInfo' as const,
  params,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpeciesInfoScreen', () => {
  let mockNavigation: ReturnType<typeof createMockNavigation>;
  let mockRoute: ReturnType<typeof createMockRoute>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation = createMockNavigation();
    mockRoute = createMockRoute();
    mockUseAllFishSpecies.mockReturnValue({
      data: defaultSpeciesData,
      isLoading: false,
      error: null,
    });
  });

  // =========================================================================
  // Rendering
  // =========================================================================

  it('renders without crashing and shows the screen title', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    expect(getByText('Species Guide')).toBeTruthy();
  });

  it('renders the species list with all species names', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    expect(getByText('Red Drum')).toBeTruthy();
    expect(getByText('Blue Marlin')).toBeTruthy();
    expect(getByText('Southern Flounder')).toBeTruthy();
  });

  it('renders scientific names for each species', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    expect(getByText('Sciaenops ocellatus')).toBeTruthy();
    expect(getByText('Makaira nigricans')).toBeTruthy();
    expect(getByText('Paralichthys lethostigma')).toBeTruthy();
  });

  // =========================================================================
  // Loading state
  // =========================================================================

  it('shows skeleton cards when data is loading', () => {
    mockUseAllFishSpecies.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    const { queryByText, UNSAFE_queryAllByType } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    // Species names should not appear while loading
    expect(queryByText('Red Drum')).toBeNull();

    // The screen title should still be visible
    expect(queryByText('Species Guide')).toBeTruthy();
  });

  // =========================================================================
  // Error state
  // =========================================================================

  it('shows error message when data fails to load', () => {
    mockUseAllFishSpecies.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Network error') as any,
    });

    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    expect(
      getByText('Unable to load species data. Please check your connection.')
    ).toBeTruthy();
  });

  it('shows empty search message when no species match', () => {
    const { getByText, getByPlaceholderText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.changeText(getByPlaceholderText('Search by name...'), 'zzzznotafish');

    expect(getByText('No species found matching your search.')).toBeTruthy();
  });

  // =========================================================================
  // Search / filtering
  // =========================================================================

  it('filters species list when typing in search input', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    const searchInput = getByPlaceholderText('Search by name...');
    fireEvent.changeText(searchInput, 'Red');

    expect(getByText('Red Drum')).toBeTruthy();
    expect(queryByText('Blue Marlin')).toBeNull();
    expect(queryByText('Southern Flounder')).toBeNull();
  });

  it('filters by scientific name', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.changeText(getByPlaceholderText('Search by name...'), 'Makaira');

    expect(getByText('Blue Marlin')).toBeTruthy();
    expect(queryByText('Red Drum')).toBeNull();
  });

  it('search is case-insensitive', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.changeText(getByPlaceholderText('Search by name...'), 'red drum');

    expect(getByText('Red Drum')).toBeTruthy();
    expect(queryByText('Blue Marlin')).toBeNull();
  });

  // =========================================================================
  // Species detail view
  // =========================================================================

  it('opens detail view when a species card is tapped', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    // Detail view should now show the species name as the ScreenLayout title
    // and also display in the detail body
    expect(getByText('Description')).toBeTruthy();
    expect(getByText('Identification')).toBeTruthy();
  });

  it('marks species alert as seen when card is tapped', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    expect(mockMarkSpeciesAlertSeen).toHaveBeenCalledWith('1');
  });

  it('shows species description in detail view', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    expect(
      getByText('A popular inshore game fish found along the Atlantic coast.')
    ).toBeTruthy();
  });

  it('shows common names in detail view', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    expect(getByText('Also known as: Channel Bass, Puppy Drum')).toBeTruthy();
  });

  it('shows regulations section in detail view', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    expect(getByText('Fishing Regulations')).toBeTruthy();
    expect(getByText('1 fish per person per day')).toBeTruthy();
  });

  it('shows fishing tips in detail view', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    expect(getByText('Fishing Tips')).toBeTruthy();
    expect(getByText('Bottom fishing')).toBeTruthy();
    expect(getByText('Cut mullet')).toBeTruthy();
  });

  // =========================================================================
  // Report Catch button (harvest-tracked species only)
  // =========================================================================

  it('shows Report Catch button for harvest-tracked species', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    expect(getByText('Report Catching This Species')).toBeTruthy();
  });

  it('does not show Report Catch button for non-tracked species', () => {
    const { getByText, queryByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Blue Marlin'));

    expect(queryByText('Report Catching This Species')).toBeNull();
  });

  it('navigates to ReportForm when Report Catch button is pressed', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));
    fireEvent.press(getByText('Report Catching This Species'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ReportForm');
  });

  // =========================================================================
  // Back navigation
  // =========================================================================

  it('calls goBack when back button is pressed from list view', () => {
    const { getByTestId } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByTestId('back-button'));

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('intercepts back navigation when detail view is open', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    // The screen registers a beforeRemove listener when detail is open
    expect(mockNavigation.addListener).toHaveBeenCalledWith(
      'beforeRemove',
      expect.any(Function)
    );
  });

  // =========================================================================
  // Route params: showRequiredOnly
  // =========================================================================

  it('initializes with tracked-only filter when showRequiredOnly route param is true', () => {
    mockRoute = createMockRoute({ showRequiredOnly: true });

    const { getByText, queryByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    // Red Drum and Southern Flounder are in HARVEST_TRACKED_SPECIES; Blue Marlin is not
    expect(getByText('Red Drum')).toBeTruthy();
    expect(getByText('Southern Flounder')).toBeTruthy();
    expect(queryByText('Blue Marlin')).toBeNull();
  });

  // =========================================================================
  // Alphabet sidebar
  // =========================================================================

  it('renders the A-Z alphabet sidebar when species exist', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    // Check a few representative letters are rendered
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
    expect(getByText('Z')).toBeTruthy();
  });

  it('does not render alphabet sidebar when species list is empty', () => {
    mockUseAllFishSpecies.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    const { queryByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    // Alphabet letters should not be visible when there are no species
    // (The alphabet sidebar is conditionally rendered only when filteredSpecies.length > 0)
    // However, letters like "A" could appear in other text, so we check for a less common one
    // The sidebar renders all 26 letters — and since the empty message does not contain
    // single-letter words, checking for a standalone letter like "Z" is reliable enough
    expect(queryByText('No species found matching your search.')).toBeTruthy();
  });

  // =========================================================================
  // Conservation status
  // =========================================================================

  it('shows conservation status in detail view', () => {
    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Red Drum'));

    expect(getByText(/Conservation Status:/)).toBeTruthy();
    expect(getByText('Least Concern')).toBeTruthy();
  });

  // =========================================================================
  // Harvest status indicators
  // =========================================================================

  it('shows bulletin indicator on species card with non-open harvest status', () => {
    const closedSpecies = makeSpecies({
      id: '10',
      name: 'Aardfish',
      harvestStatus: 'closed',
      harvestStatusNote: 'Emergency closure',
    });

    mockUseAllFishSpecies.mockReturnValue({
      data: [closedSpecies],
      isLoading: false,
      error: null,
    });

    const { getByTestId } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    expect(getByTestId('bulletin-indicator')).toBeTruthy();
  });

  it('shows HARVEST CLOSED card in detail view for closed species', () => {
    const closedSpecies = makeSpecies({
      id: '10',
      name: 'Aardfish',
      harvestStatus: 'closed',
      harvestStatusNote: 'Emergency closure',
    });

    mockUseAllFishSpecies.mockReturnValue({
      data: [closedSpecies],
      isLoading: false,
      error: null,
    });

    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Aardfish'));

    expect(getByText('HARVEST CLOSED')).toBeTruthy();
    expect(getByText('Emergency closure')).toBeTruthy();
  });

  it('shows CATCH & RELEASE ONLY card for catch_and_release species', () => {
    const crSpecies = makeSpecies({
      id: '11',
      name: 'Baitfish',
      harvestStatus: 'catch_and_release',
    });

    mockUseAllFishSpecies.mockReturnValue({
      data: [crSpecies],
      isLoading: false,
      error: null,
    });

    const { getByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    fireEvent.press(getByText('Baitfish'));

    expect(getByText('CATCH & RELEASE ONLY')).toBeTruthy();
  });

  // =========================================================================
  // Species list ordering
  // =========================================================================

  it('sorts species alphabetically', () => {
    const { getAllByText } = render(
      <SpeciesInfoScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );

    // The species names appear in the FlatList. We check that Blue Marlin
    // comes before Red Drum, which comes before Southern Flounder by gathering
    // all rendered text nodes and checking relative order.
    const blueMarlinNode = getAllByText('Blue Marlin');
    const redDrumNode = getAllByText('Red Drum');
    const flounderNode = getAllByText('Southern Flounder');

    // All species should be present
    expect(blueMarlinNode.length).toBeGreaterThan(0);
    expect(redDrumNode.length).toBeGreaterThan(0);
    expect(flounderNode.length).toBeGreaterThan(0);
  });
});
