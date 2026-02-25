import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PartnerInquiryScreen from '../../src/screens/PartnerInquiryScreen';

// ============================================================================
// MOCKS — Hook Layer
// ============================================================================

const mockMutateAsync = jest.fn();
jest.mock('../../src/api/promotionsApi', () => ({
  useSubmitPartnerInquiry: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

// ============================================================================
// MOCKS — Child Components
// ============================================================================

jest.mock('../../src/components/ScreenLayout', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: ({ children, title }: any) => (
      <RN.View testID="screen-layout">
        <RN.Text>{title}</RN.Text>
        {children}
      </RN.View>
    ),
  };
});

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Svg: View, Path: View, G: View, Circle: View, Rect: View, Defs: View, LinearGradient: View, Stop: View };
});

// ============================================================================
// TESTS
// ============================================================================

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
const route = {} as any;

describe('PartnerInquiryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    mockMutateAsync.mockResolvedValue({ success: true });
  });

  it('renders form fields', () => {
    const { getByPlaceholderText, getByText } = render(
      <PartnerInquiryScreen navigation={navigation} route={route} />
    );

    expect(getByText('Business Name *')).toBeTruthy();
    expect(getByText('Contact Name *')).toBeTruthy();
    expect(getByText('Email *')).toBeTruthy();
    expect(getByPlaceholderText("e.g. Captain Bob's Charters")).toBeTruthy();
  });

  it('renders all business type options', () => {
    const { getByText } = render(
      <PartnerInquiryScreen navigation={navigation} route={route} />
    );

    expect(getByText('Charter / Guide')).toBeTruthy();
    expect(getByText('Gear / Tackle Shop')).toBeTruthy();
    expect(getByText('Guide Service')).toBeTruthy();
  });

  it('shows validation errors on empty submit', async () => {
    const { getByText } = render(
      <PartnerInquiryScreen navigation={navigation} route={route} />
    );

    fireEvent.press(getByText('Submit Inquiry'));

    await waitFor(() => {
      expect(getByText('Business name is required')).toBeTruthy();
      expect(getByText('Contact name is required')).toBeTruthy();
      expect(getByText('Email is required')).toBeTruthy();
    });
  });

  it('shows email validation error for invalid email', async () => {
    const { getByText, getByPlaceholderText } = render(
      <PartnerInquiryScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText("e.g. Captain Bob's Charters"), 'Test Co');
    fireEvent.changeText(getByPlaceholderText('Your full name'), 'John');
    fireEvent.changeText(getByPlaceholderText('you@business.com'), 'not-an-email');
    fireEvent.press(getByText('Charter / Guide'));
    fireEvent.changeText(
      getByPlaceholderText("Tell us about your business and what you'd like to promote to NC anglers..."),
      'We want to advertise our charter service.'
    );
    fireEvent.press(getByText('Submit Inquiry'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email')).toBeTruthy();
    });
  });

  it('submits successfully and shows success state', async () => {
    const { getByText, getByPlaceholderText } = render(
      <PartnerInquiryScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText("e.g. Captain Bob's Charters"), 'Test Charters');
    fireEvent.changeText(getByPlaceholderText('Your full name'), 'Captain Bob');
    fireEvent.changeText(getByPlaceholderText('you@business.com'), 'bob@test.com');
    fireEvent.press(getByText('Charter / Guide'));
    fireEvent.changeText(
      getByPlaceholderText("Tell us about your business and what you'd like to promote to NC anglers..."),
      'We offer the best charter fishing on the Outer Banks.'
    );
    fireEvent.press(getByText('Submit Inquiry'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(getByText('Inquiry Submitted!')).toBeTruthy();
    });
  });

  it('shows error alert on failed submission', async () => {
    mockMutateAsync.mockResolvedValue({ success: false, error: 'Rate limit exceeded' });

    const { getByText, getByPlaceholderText } = render(
      <PartnerInquiryScreen navigation={navigation} route={route} />
    );

    fireEvent.changeText(getByPlaceholderText("e.g. Captain Bob's Charters"), 'Test Co');
    fireEvent.changeText(getByPlaceholderText('Your full name'), 'John');
    fireEvent.changeText(getByPlaceholderText('you@business.com'), 'john@test.com');
    fireEvent.press(getByText('Charter / Guide'));
    fireEvent.changeText(
      getByPlaceholderText("Tell us about your business and what you'd like to promote to NC anglers..."),
      'We want to advertise our charter service.'
    );
    fireEvent.press(getByText('Submit Inquiry'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Submission Failed', 'Rate limit exceeded');
    });
  });

  it('renders submit button', () => {
    const { getByText } = render(
      <PartnerInquiryScreen navigation={navigation} route={route} />
    );

    expect(getByText('Submit Inquiry')).toBeTruthy();
  });
});
