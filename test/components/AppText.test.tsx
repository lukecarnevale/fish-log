import React from 'react';
import { render } from '@testing-library/react-native';
import { AppText, TitleText, CaptionText, BadgeText } from '../../src/components/AppText';

describe('AppText wrappers', () => {
  it('renders children', () => {
    const { getByText } = render(<AppText>Hello</AppText>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies default maxFontSizeMultiplier of 1.3 to AppText', () => {
    const { getByText } = render(<AppText>Body</AppText>);
    expect(getByText('Body').props.maxFontSizeMultiplier).toBe(1.3);
  });

  it('applies 1.2 cap to TitleText', () => {
    const { getByText } = render(<TitleText>Title</TitleText>);
    expect(getByText('Title').props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('applies 1.15 cap to CaptionText', () => {
    const { getByText } = render(<CaptionText>Caption</CaptionText>);
    expect(getByText('Caption').props.maxFontSizeMultiplier).toBe(1.15);
  });

  it('applies 1.1 cap to BadgeText', () => {
    const { getByText } = render(<BadgeText>New</BadgeText>);
    expect(getByText('New').props.maxFontSizeMultiplier).toBe(1.1);
  });

  it('allows per-instance override', () => {
    const { getByText } = render(
      <AppText maxFontSizeMultiplier={2}>Override</AppText>
    );
    expect(getByText('Override').props.maxFontSizeMultiplier).toBe(2);
  });

  it('passes allowFontScaling true by default', () => {
    const { getByText } = render(<AppText>Scale</AppText>);
    expect(getByText('Scale').props.allowFontScaling).toBe(true);
  });
});
