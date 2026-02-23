import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplashScreen from '../../src/components/AnimatedSplashScreen';

describe('AnimatedSplashScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does NOT render children when ready=false', () => {
    const { queryByText } = render(
      <AnimatedSplashScreen ready={false}>
        <Text>App Content</Text>
      </AnimatedSplashScreen>
    );

    expect(queryByText('App Content')).toBeNull();
  });

  it('renders the splash title text', () => {
    const { getByText } = render(
      <AnimatedSplashScreen ready={false}>
        <Text>App Content</Text>
      </AnimatedSplashScreen>
    );

    expect(getByText('Fish Log Co.')).toBeTruthy();
  });

  it('renders children after animation completes', async () => {
    const { queryByText } = render(
      <AnimatedSplashScreen ready={true}>
        <Text>App Content</Text>
      </AnimatedSplashScreen>
    );

    // Flush the awaited hideAsync promise, then advance timers for setTimeout(1800) + animation(500)
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    await act(async () => {
      jest.advanceTimersByTime(1900);
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(queryByText('App Content')).not.toBeNull();
    });
  });

  it('calls SplashScreen.hideAsync when ready becomes true', async () => {
    render(
      <AnimatedSplashScreen ready={true}>
        <Text>App Content</Text>
      </AnimatedSplashScreen>
    );

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('does not call SplashScreen.hideAsync when ready=false', async () => {
    (SplashScreen.hideAsync as jest.Mock).mockClear();

    render(
      <AnimatedSplashScreen ready={false}>
        <Text>App Content</Text>
      </AnimatedSplashScreen>
    );

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('splash overlay is visible before animation completes', () => {
    const { getByText, queryByText } = render(
      <AnimatedSplashScreen ready={false}>
        <Text>App Content</Text>
      </AnimatedSplashScreen>
    );

    // Before ready, splash should be visible, children should not
    expect(getByText('Fish Log Co.')).toBeTruthy();
    expect(queryByText('App Content')).toBeNull();
  });
});
