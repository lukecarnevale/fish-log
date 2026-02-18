import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AchievementModal, { AchievementData } from '../../src/components/AchievementModal';

// Mock AnimatedModal to render children directly for easier testing
jest.mock('../../src/components/AnimatedModal', () => {
  const { View, Modal } = require('react-native');
  return ({ visible, onClose, children }: any) => (
    <Modal visible={visible} onRequestClose={onClose}>
      <View>{children}</View>
    </Modal>
  );
});

describe('AchievementModal', () => {
  const baseAchievement: AchievementData = {
    id: 'ach-1',
    code: 'first_report',
    name: 'First Report',
    description: 'You submitted your first harvest report!',
    category: 'reporting',
  };

  it('renders achievement name and description when visible', () => {
    const { getByText } = render(
      <AchievementModal
        visible={true}
        achievement={baseAchievement}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Achievement Unlocked!')).toBeTruthy();
    expect(getByText('First Report')).toBeTruthy();
    expect(getByText('You submitted your first harvest report!')).toBeTruthy();
  });

  it('renders category badge', () => {
    const { getByText } = render(
      <AchievementModal
        visible={true}
        achievement={baseAchievement}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Reporting Achievement')).toBeTruthy();
  });

  it('renders "Awesome!" button that calls onClose', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <AchievementModal
        visible={true}
        achievement={baseAchievement}
        onClose={onClose}
      />
    );

    fireEvent.press(getByText('Awesome!'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns null when achievement is null', () => {
    const { queryByText } = render(
      <AchievementModal
        visible={true}
        achievement={null}
        onClose={jest.fn()}
      />
    );

    expect(queryByText('Achievement Unlocked!')).toBeNull();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <AchievementModal
        visible={false}
        achievement={baseAchievement}
        onClose={jest.fn()}
      />
    );

    expect(queryByText('Achievement Unlocked!')).toBeNull();
  });

  it('renders with different achievement categories', () => {
    const streakAchievement: AchievementData = {
      id: 'ach-2',
      code: 'streak_7',
      name: '7-Day Streak',
      description: 'Reported catches 7 days in a row!',
      category: 'streak',
    };

    const { getByText } = render(
      <AchievementModal
        visible={true}
        achievement={streakAchievement}
        onClose={jest.fn()}
      />
    );

    expect(getByText('7-Day Streak')).toBeTruthy();
    expect(getByText('Streak Achievement')).toBeTruthy();
  });
});
