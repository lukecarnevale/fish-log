import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../src/hooks/useSkeletonAnimation', () => ({
  useSkeletonAnimation: () => ({
    translateX: { interpolate: jest.fn(() => 0) },
  }),
}));

import { default as Skeleton } from '../../src/components/SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom dimensions', () => {
    const { toJSON } = render(<Skeleton width={200} height={24} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom borderRadius', () => {
    const { toJSON } = render(<Skeleton borderRadius={8} />);
    expect(toJSON()).toBeTruthy();
  });
});
