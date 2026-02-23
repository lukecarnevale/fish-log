import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeedbackModal } from '../../src/components/FeedbackModal';

jest.mock('../../src/services/feedbackService', () => ({
  submitFeedback: jest.fn(() => Promise.resolve({ success: true })),
}));

describe('FeedbackModal', () => {
  it('renders feedback type title and subtitle', () => {
    const { getByText } = render(
      <FeedbackModal
        visible={true}
        onClose={jest.fn()}
        type="feedback"
      />
    );

    expect(getByText('Help & Feedback')).toBeTruthy();
    expect(getByText("We're here to help and value your input")).toBeTruthy();
  });

  it('renders bug report type with correct title', () => {
    const { getByText } = render(
      <FeedbackModal
        visible={true}
        onClose={jest.fn()}
        type="bug_report"
      />
    );

    expect(getByText('Report a Problem')).toBeTruthy();
  });

  it('renders feature request type with correct title', () => {
    const { getByText } = render(
      <FeedbackModal
        visible={true}
        onClose={jest.fn()}
        type="feature_request"
      />
    );

    expect(getByText('Request a Feature')).toBeTruthy();
  });

  it('uses custom title when provided', () => {
    const { getByText } = render(
      <FeedbackModal
        visible={true}
        onClose={jest.fn()}
        type="feedback"
        title="Custom Title"
      />
    );

    expect(getByText('Custom Title')).toBeTruthy();
  });

  it('renders message input and email input', () => {
    const { getByText } = render(
      <FeedbackModal
        visible={true}
        onClose={jest.fn()}
        type="feedback"
      />
    );

    expect(getByText('Your Message *')).toBeTruthy();
    expect(getByText('Email (optional)')).toBeTruthy();
  });

  it('renders Submit and Cancel buttons', () => {
    const { getByText } = render(
      <FeedbackModal
        visible={true}
        onClose={jest.fn()}
        type="feedback"
      />
    );

    expect(getByText('Submit')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('shows character count for message', () => {
    const { getByText } = render(
      <FeedbackModal
        visible={true}
        onClose={jest.fn()}
        type="feedback"
      />
    );

    expect(getByText('0/2000')).toBeTruthy();
  });

  it('shows privacy note', () => {
    const { getByText } = render(
      <FeedbackModal
        visible={true}
        onClose={jest.fn()}
        type="feedback"
      />
    );

    expect(getByText(/feedback is private/i)).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <FeedbackModal
        visible={false}
        onClose={jest.fn()}
        type="feedback"
      />
    );

    expect(queryByText('Help & Feedback')).toBeNull();
  });
});
