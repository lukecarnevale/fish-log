import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FormInput from '../../src/components/FormInput';

describe('FormInput', () => {
  it('renders label when provided', () => {
    const { getByText } = render(
      <FormInput label="Email" placeholder="Enter email" />
    );

    expect(getByText('Email')).toBeTruthy();
  });

  it('does not render label when not provided', () => {
    const { queryByText } = render(
      <FormInput placeholder="Enter email" />
    );

    // No label should be present
    expect(queryByText('Email')).toBeNull();
  });

  it('renders error message when error prop is set', () => {
    const { getByText } = render(
      <FormInput label="Email" error="Invalid email address" />
    );

    expect(getByText('Invalid email address')).toBeTruthy();
  });

  it('does not render error when error prop is undefined', () => {
    const { queryByText } = render(
      <FormInput label="Email" />
    );

    expect(queryByText('Invalid email address')).toBeNull();
  });

  it('calls onChangeText when text is entered', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <FormInput placeholder="Enter name" onChangeText={onChangeText} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter name'), 'John');
    expect(onChangeText).toHaveBeenCalledWith('John');
  });

  it('renders placeholder text', () => {
    const { getByPlaceholderText } = render(
      <FormInput placeholder="Enter your email" />
    );

    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
  });

  it('renders with value prop', () => {
    const { getByDisplayValue } = render(
      <FormInput value="test@example.com" />
    );

    expect(getByDisplayValue('test@example.com')).toBeTruthy();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <FormInput label="Email" placeholder="Enter email" error="Required" />
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
