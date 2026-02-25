import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AreaSelector from '../../../src/components/promotions/AreaSelector';

const regions = [
  { value: 'OBX', shortLabel: 'Outer Banks' },
  { value: 'CRC', shortLabel: 'Crystal Coast' },
  { value: 'WIL', shortLabel: 'Wilmington' },
];

describe('AreaSelector', () => {
  const defaultProps = {
    selectedArea: null as string | null,
    onSelectArea: jest.fn(),
    regions,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders All Areas pill', () => {
    const { getByText } = render(<AreaSelector {...defaultProps} />);
    expect(getByText('All Areas')).toBeTruthy();
  });

  it('renders all region pills', () => {
    const { getByText } = render(<AreaSelector {...defaultProps} />);
    expect(getByText('Outer Banks')).toBeTruthy();
    expect(getByText('Crystal Coast')).toBeTruthy();
    expect(getByText('Wilmington')).toBeTruthy();
  });

  it('calls onSelectArea with null when All Areas pressed', () => {
    const { getByLabelText } = render(<AreaSelector {...defaultProps} />);
    fireEvent.press(getByLabelText('All Areas'));
    expect(defaultProps.onSelectArea).toHaveBeenCalledWith(null);
  });

  it('calls onSelectArea with region value on press', () => {
    const { getByLabelText } = render(<AreaSelector {...defaultProps} />);
    fireEvent.press(getByLabelText('Outer Banks'));
    expect(defaultProps.onSelectArea).toHaveBeenCalledWith('OBX');
  });

  it('has accessibility role radio on each pill', () => {
    const { getAllByRole } = render(<AreaSelector {...defaultProps} />);
    const radios = getAllByRole('radio');
    expect(radios.length).toBe(4); // All + 3 regions
  });
});
