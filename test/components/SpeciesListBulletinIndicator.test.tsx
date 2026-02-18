import React from 'react';
import { render } from '@testing-library/react-native';
import { SpeciesListBulletinIndicator } from '../../src/components/SpeciesListBulletinIndicator';

describe('SpeciesListBulletinIndicator', () => {
  it('returns null for open harvest status', () => {
    const { toJSON } = render(
      <SpeciesListBulletinIndicator harvestStatus="open" />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders closure icon for closed status', () => {
    const { getByText, getByLabelText } = render(
      <SpeciesListBulletinIndicator harvestStatus="closed" />
    );

    expect(getByText('alert-octagon')).toBeTruthy();
    expect(getByLabelText('Harvest closed')).toBeTruthy();
  });

  it('renders advisory icon for restricted status', () => {
    const { getByText, getByLabelText } = render(
      <SpeciesListBulletinIndicator harvestStatus="restricted" />
    );

    expect(getByText('alert-triangle')).toBeTruthy();
    expect(getByLabelText('Harvest advisory')).toBeTruthy();
  });

  it('renders advisory icon for catch_and_release status', () => {
    const { getByLabelText } = render(
      <SpeciesListBulletinIndicator harvestStatus="catch_and_release" />
    );

    expect(getByLabelText('Catch and release only')).toBeTruthy();
  });

  it('shows CLOSED label text when showLabels=true', () => {
    const { getByText } = render(
      <SpeciesListBulletinIndicator harvestStatus="closed" showLabels={true} />
    );

    expect(getByText('CLOSED')).toBeTruthy();
  });

  it('shows ADVISORY label text when showLabels=true and restricted', () => {
    const { getByText } = render(
      <SpeciesListBulletinIndicator harvestStatus="restricted" showLabels={true} />
    );

    expect(getByText('ADVISORY')).toBeTruthy();
  });

  it('shows C&R ONLY label text when showLabels=true and catch_and_release', () => {
    const { getByText } = render(
      <SpeciesListBulletinIndicator harvestStatus="catch_and_release" showLabels={true} />
    );

    expect(getByText('C&R ONLY')).toBeTruthy();
  });

  it('does not show label text when showLabels=false (default)', () => {
    const { queryByText } = render(
      <SpeciesListBulletinIndicator harvestStatus="closed" />
    );

    expect(queryByText('CLOSED')).toBeNull();
  });
});
