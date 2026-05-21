/**
 * LogCatchSignInGate.test.tsx
 *
 * The sign-in gate shown in place of the catch_log form body when the current
 * user isn't a rewards member. Covers rendering + CTA wiring. Integration
 * behavior (when/where the gate appears inside ReportFormScreen) is exercised
 * by the ReportFormScreen suite once catch_logging is enabled in tests.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LogCatchSignInGate from '../../src/components/LogCatchSignInGate';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

describe('LogCatchSignInGate', () => {
  it('renders the gate title', () => {
    const { getByText } = render(
      <LogCatchSignInGate onSignInPress={jest.fn()} />
    );
    expect(getByText('Sign in to Log a Catch')).toBeTruthy();
  });

  it('renders the description explaining the social value prop', () => {
    const { getByText } = render(
      <LogCatchSignInGate onSignInPress={jest.fn()} />
    );
    // Partial match on a substring that's unlikely to change without intent.
    expect(getByText(/connects you to the community/)).toBeTruthy();
  });

  it('tells the user the DMF mandatory path is still available', () => {
    const { getByText } = render(
      <LogCatchSignInGate onSignInPress={jest.fn()} />
    );
    // Critical: users must not think signing in is required to submit a
    // mandatory harvest report (government obligation).
    expect(getByText(/Harvest Report tab/)).toBeTruthy();
  });

  it('fires onSignInPress when the Sign In button is pressed', () => {
    const onSignInPress = jest.fn();
    const { getByRole } = render(
      <LogCatchSignInGate onSignInPress={onSignInPress} />
    );

    fireEvent.press(getByRole('button', { name: /Sign in to unlock/ }));
    expect(onSignInPress).toHaveBeenCalledTimes(1);
  });
});
