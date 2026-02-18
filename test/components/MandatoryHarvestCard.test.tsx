import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import MandatoryHarvestCard from '../../src/components/MandatoryHarvestCard';

jest.mock('../../src/constants/faqData', () => ({
  MANDATORY_HARVEST_FAQS: [
    { question: 'What is mandatory harvest reporting?', answer: 'NC law requires reporting.' },
    { question: 'Which species?', answer: 'Five species.' },
  ],
  FULL_FAQ_URL: 'https://example.com/faqs',
}));

jest.mock('../../src/components/icons/MandatoryHarvestIcons', () => {
  const { View } = require('react-native');
  return { FishIcon: (props: any) => <View testID="fish-icon" {...props} /> };
});

describe('MandatoryHarvestCard', () => {
  it('renders title and subtitle', () => {
    const { getByText } = render(<MandatoryHarvestCard />);

    expect(getByText('Mandatory Harvest Reporting')).toBeTruthy();
    expect(getByText('NC State Law')).toBeTruthy();
  });

  it('renders all five fish species names', () => {
    const { getByText } = render(<MandatoryHarvestCard />);

    expect(getByText('Flounder')).toBeTruthy();
    expect(getByText('Red Drum')).toBeTruthy();
    expect(getByText('Spotted Seatrout')).toBeTruthy();
    expect(getByText('Striped Bass')).toBeTruthy();
    expect(getByText('Weakfish')).toBeTruthy();
  });

  it('renders info cards with When/What labels', () => {
    const { getByText } = render(<MandatoryHarvestCard />);

    expect(getByText('When')).toBeTruthy();
    expect(getByText('What')).toBeTruthy();
    expect(getByText(/end of trip/i)).toBeTruthy();
    expect(getByText(/fish you keep/i)).toBeTruthy();
  });

  it('renders Learn More and Got It buttons', () => {
    const { getByText } = render(<MandatoryHarvestCard />);

    expect(getByText('Learn More')).toBeTruthy();
    expect(getByText('Got It')).toBeTruthy();
  });

  it('calls onLearnMore when Learn More is pressed', () => {
    const onLearnMore = jest.fn();
    const { getByText } = render(<MandatoryHarvestCard onLearnMore={onLearnMore} />);

    fireEvent.press(getByText('Learn More'));
    expect(onLearnMore).toHaveBeenCalledTimes(1);
  });

  it('opens external link when onLearnMore is not provided', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
    const { getByText } = render(<MandatoryHarvestCard />);

    fireEvent.press(getByText('Learn More'));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('deq.nc.gov'));
    openURL.mockRestore();
  });

  it('calls onDismiss when Got It is pressed', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(<MandatoryHarvestCard onDismiss={onDismiss} />);

    fireEvent.press(getByText('Got It'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('opens FAQ modal when help button is pressed', () => {
    const { getByText, queryByText } = render(<MandatoryHarvestCard />);

    // FAQ content should not be visible initially (modal not open)
    // Press the help button (question mark icon)
    const helpButton = getByText('help-circle'); // MockIcon renders name as text
    fireEvent.press(helpButton);

    // FAQ modal should now show content
    expect(getByText('FAQs')).toBeTruthy();
    expect(getByText('What is mandatory harvest reporting?')).toBeTruthy();
    expect(getByText('Which species?')).toBeTruthy();
  });

  it('closes FAQ modal when Close is pressed', () => {
    const { getByText, queryByText } = render(<MandatoryHarvestCard />);

    // Open FAQ modal
    fireEvent.press(getByText('help-circle'));
    expect(getByText('FAQs')).toBeTruthy();

    // Close FAQ modal
    fireEvent.press(getByText('Close'));

    // FAQ content should be gone
    expect(queryByText('FAQs')).toBeNull();
  });
});
