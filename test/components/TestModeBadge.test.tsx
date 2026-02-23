import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TestModeBadge from '../../src/components/TestModeBadge';
import { isProductionMode } from '../../src/config/appConfig';

// appConfig is already mocked globally, isProductionMode returns false by default

describe('TestModeBadge', () => {
  it('renders TEST MODE text when not in production mode', () => {
    const { getByText } = render(<TestModeBadge />);

    expect(getByText('TEST MODE')).toBeTruthy();
  });

  it('renders with alert-triangle icon', () => {
    const { getByText } = render(<TestModeBadge />);

    // The Feather mock renders icon name as text
    expect(getByText('alert-triangle')).toBeTruthy();
  });

  it('renders nothing in production mode', () => {
    (isProductionMode as jest.Mock).mockReturnValueOnce(true);

    const { toJSON } = render(<TestModeBadge />);
    expect(toJSON()).toBeNull();
  });

  it('renders info icon when showInfo=true', () => {
    const { getByText } = render(<TestModeBadge showInfo />);

    expect(getByText('info')).toBeTruthy();
  });
});
