import React from 'react';
import { render } from '@testing-library/react-native';
import { SpeciesAlertBadge } from '../../src/components/SpeciesAlertBadge';

describe('SpeciesAlertBadge', () => {
  it('renders nothing when no closures or advisories', () => {
    const { toJSON } = render(
      <SpeciesAlertBadge
        closureCount={0}
        advisoryCount={0}
        totalSpeciesCount={0}
      />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders with closure count', () => {
    const { getByText } = render(
      <SpeciesAlertBadge
        closureCount={2}
        advisoryCount={0}
        totalSpeciesCount={2}
      />
    );

    expect(getByText('2')).toBeTruthy();
    // Closure uses alert-octagon icon
    expect(getByText('alert-octagon')).toBeTruthy();
  });

  it('renders with advisory count when no closures', () => {
    const { getByText } = render(
      <SpeciesAlertBadge
        closureCount={0}
        advisoryCount={3}
        totalSpeciesCount={3}
      />
    );

    expect(getByText('3')).toBeTruthy();
    // Advisory uses alert-triangle icon
    expect(getByText('alert-triangle')).toBeTruthy();
  });

  it('prioritizes closure icon when both present', () => {
    const { getByText } = render(
      <SpeciesAlertBadge
        closureCount={1}
        advisoryCount={2}
        totalSpeciesCount={3}
      />
    );

    expect(getByText('3')).toBeTruthy();
    // Closure takes priority
    expect(getByText('alert-octagon')).toBeTruthy();
  });

  it('has correct accessibility label for closures', () => {
    const { getByLabelText } = render(
      <SpeciesAlertBadge
        closureCount={2}
        advisoryCount={0}
        totalSpeciesCount={2}
      />
    );

    expect(getByLabelText(/Species alert: 2 closures affecting 2 species/)).toBeTruthy();
  });

  it('has correct accessibility label for single advisory', () => {
    const { getByLabelText } = render(
      <SpeciesAlertBadge
        closureCount={0}
        advisoryCount={1}
        totalSpeciesCount={1}
      />
    );

    expect(getByLabelText(/Species alert: 1 advisory affecting 1 species/)).toBeTruthy();
  });
});
