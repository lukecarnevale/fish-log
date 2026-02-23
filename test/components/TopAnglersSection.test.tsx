import React from 'react';
import { render } from '@testing-library/react-native';
import TopAnglersSection from '../../src/components/TopAnglersSection';
import type { TopAngler } from '../../src/types/catchFeed';

// Mock the icon components
jest.mock('../../src/components/icons/TopAnglerIcons', () => {
  const { View } = require('react-native');
  return {
    TrophyIcon: (props: any) => <View testID="trophy-icon" />,
    FishIcon: (props: any) => <View testID="fish-icon" />,
    RulerIcon: (props: any) => <View testID="ruler-icon" />,
  };
});

const makeAngler = (overrides: Partial<TopAngler> = {}): TopAngler => ({
  type: 'catches',
  userId: 'user-1',
  displayName: 'John D.',
  value: 15,
  label: 'catches',
  ...overrides,
});

describe('TopAnglersSection', () => {
  it('renders nothing when anglers array is empty', () => {
    const { toJSON } = render(<TopAnglersSection anglers={[]} />);

    expect(toJSON()).toBeNull();
  });

  it('renders header title', () => {
    const anglers = [makeAngler()];
    const { getByText } = render(<TopAnglersSection anglers={anglers} />);

    expect(getByText("This Week's Top Anglers")).toBeTruthy();
  });

  it('renders angler display names', () => {
    const anglers = [
      makeAngler({ displayName: 'John D.', type: 'catches' }),
      makeAngler({ displayName: 'Jane S.', type: 'species', userId: 'user-2' }),
    ];
    const { getByText } = render(<TopAnglersSection anglers={anglers} />);

    expect(getByText('John D.')).toBeTruthy();
    expect(getByText('Jane S.')).toBeTruthy();
  });

  it('renders angler values', () => {
    const anglers = [
      makeAngler({ value: 25, label: 'catches', type: 'catches' }),
      makeAngler({ value: 8, label: 'species', type: 'species', userId: 'user-2' }),
    ];
    const { getByText } = render(<TopAnglersSection anglers={anglers} />);

    expect(getByText('25')).toBeTruthy();
    expect(getByText('8')).toBeTruthy();
  });

  it('formats length values with double-quote suffix', () => {
    const anglers = [
      makeAngler({ value: 32, label: 'longest', type: 'length' }),
    ];
    const { getByText } = render(<TopAnglersSection anglers={anglers} />);

    expect(getByText('32"')).toBeTruthy();
  });

  it('renders category titles', () => {
    const anglers = [
      makeAngler({ type: 'catches' }),
      makeAngler({ type: 'species', userId: 'user-2' }),
      makeAngler({ type: 'length', userId: 'user-3' }),
    ];
    const { getByText } = render(<TopAnglersSection anglers={anglers} />);

    expect(getByText('Most Catches')).toBeTruthy();
    expect(getByText('Most Species')).toBeTruthy();
    expect(getByText('Longest Catch')).toBeTruthy();
  });
});
