import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// AchievementModal renders AnimatedModal which needs mocking
jest.mock('../../src/components/AnimatedModal', () => {
  const { View, Text: RNText } = require('react-native');
  return function MockAnimatedModal({ visible, children }: any) {
    if (!visible) return null;
    return <View testID="animated-modal">{children}</View>;
  };
});

jest.mock('../../src/constants/achievementMappings', () => ({
  getAchievementIcon: jest.fn(() => 'award'),
  getAchievementColor: jest.fn(() => '#FFD700'),
}));

import {
  AchievementProvider,
  useAchievements,
} from '../../src/contexts/AchievementContext';

function TestConsumer() {
  const {
    showAchievement,
    showAchievements,
    queueAchievementsForLater,
    flushPendingAchievements,
    isShowingAchievement,
    queueLength,
    pendingCount,
  } = useAchievements();

  return (
    <>
      <Text testID="showing">{isShowingAchievement ? 'yes' : 'no'}</Text>
      <Text testID="queueLength">{queueLength}</Text>
      <Text testID="pendingCount">{pendingCount}</Text>
      <TouchableOpacity
        testID="show-one"
        onPress={() =>
          showAchievement({
            id: '1',
            name: 'First Catch',
            description: 'Caught your first fish',
            category: 'fishing',
          })
        }
      />
      <TouchableOpacity
        testID="show-many"
        onPress={() =>
          showAchievements([
            { id: '1', name: 'First Catch', description: 'Caught first fish', category: 'fishing' },
            { id: '2', name: 'Second Catch', description: 'Caught second fish', category: 'fishing' },
          ])
        }
      />
      <TouchableOpacity
        testID="queue-later"
        onPress={() =>
          queueAchievementsForLater([
            { id: '3', name: 'Deferred', description: 'Queued for later', category: 'fishing' },
          ])
        }
      />
      <TouchableOpacity testID="flush" onPress={flushPendingAchievements} />
    </>
  );
}

describe('AchievementContext', () => {
  it('starts with no achievements showing', async () => {
    const { getByTestId } = render(
      <AchievementProvider>
        <TestConsumer />
      </AchievementProvider>
    );

    expect(getByTestId('showing').props.children).toBe('no');
    expect(getByTestId('queueLength').props.children).toBe(0);
  });

  it('showAchievement adds to queue and shows modal', async () => {
    const { getByTestId } = render(
      <AchievementProvider>
        <TestConsumer />
      </AchievementProvider>
    );

    await fireEvent.press(getByTestId('show-one'));

    await waitFor(() => {
      expect(getByTestId('showing').props.children).toBe('yes');
      expect(getByTestId('queueLength').props.children).toBe(1);
    });
  });

  it('showAchievements adds multiple to queue', async () => {
    const { getByTestId } = render(
      <AchievementProvider>
        <TestConsumer />
      </AchievementProvider>
    );

    await fireEvent.press(getByTestId('show-many'));

    await waitFor(() => {
      expect(getByTestId('queueLength').props.children).toBe(2);
    });
  });

  it('showAchievements with empty array does nothing', async () => {
    const { getByTestId } = render(
      <AchievementProvider>
        <TestConsumer />
      </AchievementProvider>
    );

    expect(getByTestId('queueLength').props.children).toBe(0);
  });

  it('queueAchievementsForLater queues without showing', async () => {
    const { getByTestId } = render(
      <AchievementProvider>
        <TestConsumer />
      </AchievementProvider>
    );

    await fireEvent.press(getByTestId('queue-later'));

    await waitFor(() => {
      expect(getByTestId('pendingCount').props.children).toBe(1);
      expect(getByTestId('showing').props.children).toBe('no');
    });
  });

  it('flushPendingAchievements moves pending to display queue', async () => {
    const { getByTestId } = render(
      <AchievementProvider>
        <TestConsumer />
      </AchievementProvider>
    );

    // Queue for later
    await fireEvent.press(getByTestId('queue-later'));

    await waitFor(() => {
      expect(getByTestId('pendingCount').props.children).toBe(1);
    });

    // Flush
    await fireEvent.press(getByTestId('flush'));

    await waitFor(() => {
      expect(getByTestId('pendingCount').props.children).toBe(0);
      expect(getByTestId('queueLength').props.children).toBe(1);
      expect(getByTestId('showing').props.children).toBe('yes');
    });
  });
});
