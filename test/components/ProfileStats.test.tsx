import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../src/hooks/useSkeletonAnimation', () => ({
  useSkeletonAnimation: () => ({
    translateX: { interpolate: jest.fn(() => 0) },
  }),
}));

import ProfileStats from '../../src/screens/profile/ProfileStats';

describe('ProfileStats', () => {
  const defaultStats = {
    totalCatches: 42,
    uniqueSpecies: 5,
    largestFish: 22.5,
  };

  it('renders stat values when not loading', () => {
    const { getByText } = render(
      <ProfileStats fishingStats={defaultStats} statsLoading={false} />
    );

    expect(getByText('42')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('22.5"')).toBeTruthy();
  });

  it('renders stat labels', () => {
    const { getByText } = render(
      <ProfileStats fishingStats={defaultStats} statsLoading={false} />
    );

    expect(getByText('Catches')).toBeTruthy();
    expect(getByText('Species')).toBeTruthy();
    expect(getByText('Largest Fish')).toBeTruthy();
  });

  it('shows -- for largest fish when null', () => {
    const { getByText } = render(
      <ProfileStats
        fishingStats={{ totalCatches: 10, uniqueSpecies: 2, largestFish: null }}
        statsLoading={false}
      />
    );

    expect(getByText('--')).toBeTruthy();
  });

  it('renders section title', () => {
    const { getByText } = render(
      <ProfileStats fishingStats={defaultStats} statsLoading={false} />
    );

    expect(getByText('Fishing Statistics')).toBeTruthy();
  });

  it('renders skeletons when loading', () => {
    const { queryByText } = render(
      <ProfileStats fishingStats={defaultStats} statsLoading={true} />
    );

    // When loading, stat values should not be shown
    expect(queryByText('42')).toBeNull();
    expect(queryByText('5')).toBeNull();
  });
});
