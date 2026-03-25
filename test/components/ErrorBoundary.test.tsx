import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import ErrorBoundary from '../../src/components/ErrorBoundary';

// Component that throws on demand
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test crash');
  }
  return <Text>Hello</Text>;
}

// Suppress React's own console.error from error boundaries
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Hello</Text>
      </ErrorBoundary>
    );

    expect(getByText('Hello')).toBeTruthy();
  });

  it('catches child throw and renders fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText(/app ran into an unexpected error/i)).toBeTruthy();
  });

  it('shows a Restart App button in fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Restart App')).toBeTruthy();
  });

  it('restart button clears error state and re-renders children', async () => {
    // Use a ref-based approach: first render throws, after reset it doesn't
    let throwNow = true;
    function ConditionalThrow() {
      if (throwNow) throw new Error('crash');
      return <Text>Recovered</Text>;
    }

    const { getByText } = render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();

    // Fix the error condition before pressing restart
    throwNow = false;

    await fireEvent.press(getByText('Restart App'));

    expect(getByText('Recovered')).toBeTruthy();
  });

  it('reports error to Sentry', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        contexts: expect.objectContaining({
          react: expect.anything(),
        }),
      })
    );
  });
});
