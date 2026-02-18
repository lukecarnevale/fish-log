import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AbandonConfirmModal from '../../src/screens/reportForm/AbandonConfirmModal';

describe('AbandonConfirmModal', () => {
  it('renders title and description when visible', () => {
    const { getByText } = render(
      <AbandonConfirmModal
        visible={true}
        onKeepEditing={jest.fn()}
        onDiscard={jest.fn()}
      />
    );

    expect(getByText('Discard Report?')).toBeTruthy();
    expect(getByText(/unsaved information/i)).toBeTruthy();
  });

  it('calls onKeepEditing when Keep Editing is pressed', async () => {
    const onKeepEditing = jest.fn();
    const { getByText } = render(
      <AbandonConfirmModal
        visible={true}
        onKeepEditing={onKeepEditing}
        onDiscard={jest.fn()}
      />
    );

    await fireEvent.press(getByText('Keep Editing'));
    expect(onKeepEditing).toHaveBeenCalledTimes(1);
  });

  it('calls onDiscard when Discard is pressed', async () => {
    const onDiscard = jest.fn();
    const { getByText } = render(
      <AbandonConfirmModal
        visible={true}
        onKeepEditing={jest.fn()}
        onDiscard={onDiscard}
      />
    );

    await fireEvent.press(getByText('Discard'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('does not render when visible=false', () => {
    const { queryByText } = render(
      <AbandonConfirmModal
        visible={false}
        onKeepEditing={jest.fn()}
        onDiscard={jest.fn()}
      />
    );

    // React Native Modal with visible=false still renders but is hidden
    // The content should not be accessible
    expect(queryByText('Discard Report?')).toBeNull();
  });
});
