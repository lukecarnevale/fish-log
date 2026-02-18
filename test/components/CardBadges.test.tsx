import React from 'react';
import { render } from '@testing-library/react-native';
import {
  CounterBubble,
  NewDotNotification,
  ActivityBadge,
  ActivityDots,
} from '../../src/components/CardBadges';

describe('CounterBubble', () => {
  it('renders count as text', () => {
    const { getByText } = render(
      <CounterBubble count={42} gradientColors={['#4dc9c9', '#3ba8a8']} shadowColor="rgba(0,0,0,0.3)" />
    );

    expect(getByText('42')).toBeTruthy();
  });

  it('renders 99+ for counts over 99', () => {
    const { getByText } = render(
      <CounterBubble count={150} gradientColors={['#4dc9c9', '#3ba8a8']} shadowColor="rgba(0,0,0,0.3)" />
    );

    expect(getByText('99+')).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { getByText } = render(
      <CounterBubble count={5} gradientColors={['#aaa', '#bbb']} shadowColor="rgba(0,0,0,0.3)" size={24} />
    );

    expect(getByText('5')).toBeTruthy();
  });
});

describe('NewDotNotification', () => {
  it('renders nothing when visible=false', () => {
    const { toJSON } = render(
      <NewDotNotification visible={false} />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders when visible=true', () => {
    const { toJSON } = render(
      <NewDotNotification visible={true} />
    );

    expect(toJSON()).not.toBeNull();
  });
});

describe('ActivityBadge', () => {
  it('renders nothing when count is 0', () => {
    const { toJSON } = render(
      <ActivityBadge count={0} gradientColors={['#48bb78', '#38a169']} shadowColor="rgba(0,0,0,0.3)" />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders "+N new" text', () => {
    const { getByText } = render(
      <ActivityBadge count={5} gradientColors={['#48bb78', '#38a169']} shadowColor="rgba(0,0,0,0.3)" />
    );

    expect(getByText('+5 new')).toBeTruthy();
  });

  it('caps display at +99', () => {
    const { getByText } = render(
      <ActivityBadge count={200} gradientColors={['#48bb78', '#38a169']} shadowColor="rgba(0,0,0,0.3)" />
    );

    expect(getByText('+99 new')).toBeTruthy();
  });
});

describe('ActivityDots', () => {
  it('renders nothing when visible=false', () => {
    const { toJSON } = render(
      <ActivityDots visible={false} />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders when visible=true', () => {
    const { toJSON } = render(
      <ActivityDots visible={true} />
    );

    expect(toJSON()).not.toBeNull();
  });
});
