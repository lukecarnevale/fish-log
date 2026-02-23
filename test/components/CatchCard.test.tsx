import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CatchCard from '../../src/components/CatchCard';
import type { CatchFeedEntry } from '../../src/types/catchFeed';

// Mock the CatchInfoBadge and SpeciesPlaceholder
jest.mock('../../src/components/CatchInfoBadge', () => {
  const { Text } = require('react-native');
  return (props: any) => <Text testID="catch-info-badge">{props.text}</Text>;
});

jest.mock('../../src/components/SpeciesPlaceholder', () => {
  const { View } = require('react-native');
  return (props: any) => <View testID="species-placeholder" />;
});

jest.mock('../../src/constants/speciesColors', () => ({
  getSpeciesTheme: () => ({
    id: 'default',
    name: 'Fish',
    primary: '#0B548B',
    light: '#C3E0F7',
    icon: '#0B548B',
    gradient: ['#0B548B', '#1976D2'],
  }),
}));

// Mock the date utils
jest.mock('../../src/utils/dateUtils', () => ({
  formatRelativeTime: () => '2h ago',
  formatMemberSince: () => 'Jan 2025',
}));

const makeEntry = (overrides: Partial<CatchFeedEntry> = {}): CatchFeedEntry => ({
  id: 'catch-1',
  userId: 'user-1',
  anglerName: 'John D.',
  species: 'Red Drum',
  speciesList: [{ species: 'Red Drum', count: 1 }],
  totalFish: 1,
  catchDate: '2026-01-15',
  createdAt: '2026-01-15T12:00:00Z',
  likeCount: 0,
  isLikedByCurrentUser: false,
  ...overrides,
});

describe('CatchCard', () => {
  it('renders angler name', () => {
    const { getByText } = render(<CatchCard entry={makeEntry()} />);

    expect(getByText('John D.')).toBeTruthy();
  });

  it('renders relative time', () => {
    const { getByText } = render(<CatchCard entry={makeEntry()} />);

    expect(getByText('2h ago')).toBeTruthy();
  });

  it('renders species name as badge text', () => {
    const { getByText } = render(<CatchCard entry={makeEntry()} />);

    expect(getByText('Red Drum')).toBeTruthy();
  });

  it('renders location when provided', () => {
    const { getByText } = render(
      <CatchCard entry={makeEntry({ location: 'Pamlico Sound' })} />
    );

    expect(getByText('Pamlico Sound')).toBeTruthy();
  });

  it('renders total fish count badge when multiple fish', () => {
    const { getByText } = render(
      <CatchCard entry={makeEntry({ totalFish: 5 })} />
    );

    expect(getByText('5 fish')).toBeTruthy();
  });

  it('does not render fish count badge for single fish', () => {
    const { queryByText } = render(
      <CatchCard entry={makeEntry({ totalFish: 1 })} />
    );

    expect(queryByText('1 fish')).toBeNull();
  });

  it('renders like count when > 0', () => {
    const { getByText } = render(
      <CatchCard entry={makeEntry({ likeCount: 12 })} />
    );

    expect(getByText('12')).toBeTruthy();
  });

  it('calls onCardPress when card is pressed', () => {
    const onCardPress = jest.fn();
    const entry = makeEntry();
    const { getByText } = render(
      <CatchCard entry={entry} onCardPress={onCardPress} />
    );

    fireEvent.press(getByText('John D.'));
    expect(onCardPress).toHaveBeenCalledWith(entry);
  });

  it('calls onLikePress when like button is pressed', () => {
    const onLikePress = jest.fn();
    const entry = makeEntry();
    const { getByText } = render(
      <CatchCard entry={entry} onLikePress={onLikePress} />
    );

    // The heart icon is rendered by the Ionicons mock
    fireEvent.press(getByText('heart-outline'));
    expect(onLikePress).toHaveBeenCalledWith(entry);
  });

  it('renders compact mode', () => {
    const { queryByText } = render(
      <CatchCard entry={makeEntry({ location: 'Outer Banks' })} compact={true} />
    );

    // In compact mode, the location is rendered differently (smaller)
    // but the text should still be there
    expect(queryByText('Outer Banks')).toBeTruthy();
  });

  it('renders placeholder when no photo or species image', () => {
    const { getByTestId } = render(
      <CatchCard entry={makeEntry()} compact={true} />
    );

    expect(getByTestId('species-placeholder')).toBeTruthy();
  });

  it('renders multiple species badges when speciesList has multiple entries', () => {
    const entry = makeEntry({
      speciesList: [
        { species: 'Red Drum', count: 2 },
        { species: 'Flounder', count: 1 },
      ],
      totalFish: 3,
    });

    const { getByText } = render(<CatchCard entry={entry} />);

    expect(getByText(/Red Drum/)).toBeTruthy();
    expect(getByText(/Flounder/)).toBeTruthy();
  });
});
