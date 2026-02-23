import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import LicenseTypePicker from '../../src/components/LicenseTypePicker';

describe('LicenseTypePicker', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const options = ['Coastal Recreational', 'Unified Inland/Coastal', 'Lifetime'];

  it('renders header text when visible', () => {
    const { getByText } = render(
      <LicenseTypePicker
        visible={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        options={options}
      />
    );

    // Advance timers to allow the animation to set modalVisible
    act(() => { jest.advanceTimersByTime(500); });

    expect(getByText('Select License Type')).toBeTruthy();
  });

  it('renders all options', () => {
    const { getByText } = render(
      <LicenseTypePicker
        visible={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        options={options}
      />
    );

    act(() => { jest.advanceTimersByTime(500); });

    expect(getByText('Coastal Recreational')).toBeTruthy();
    expect(getByText('Unified Inland/Coastal')).toBeTruthy();
    expect(getByText('Lifetime')).toBeTruthy();
  });

  it('calls onSelect and onClose when an option is pressed', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <LicenseTypePicker
        visible={true}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
      />
    );

    act(() => { jest.advanceTimersByTime(500); });

    fireEvent.press(getByText('Lifetime'));
    expect(onSelect).toHaveBeenCalledWith('Lifetime');

    // Advance animation for close
    act(() => { jest.advanceTimersByTime(500); });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Cancel button', () => {
    const { getByText } = render(
      <LicenseTypePicker
        visible={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        options={options}
      />
    );

    act(() => { jest.advanceTimersByTime(500); });
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('highlights the selected value with a check icon', () => {
    const { getByText } = render(
      <LicenseTypePicker
        visible={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        selectedValue="Lifetime"
        options={options}
      />
    );

    act(() => { jest.advanceTimersByTime(500); });

    // The check icon (Feather mock renders name as text)
    expect(getByText('check')).toBeTruthy();
  });
});
