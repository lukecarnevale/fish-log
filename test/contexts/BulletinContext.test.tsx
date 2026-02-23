import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AchievementProvider } from '../../src/contexts/AchievementContext';
import { BulletinProvider, useBulletins } from '../../src/contexts/BulletinContext';

// Mock AnimatedModal to simplify rendering
jest.mock('../../src/components/AnimatedModal', () => {
  const { View } = require('react-native');
  return function MockAnimatedModal({ visible, children }: any) {
    if (!visible) return null;
    return <View testID="animated-modal">{children}</View>;
  };
});

jest.mock('../../src/constants/achievementMappings', () => ({
  getAchievementIcon: jest.fn(() => 'award'),
  getAchievementColor: jest.fn(() => '#FFD700'),
}));

// BulletinModal renders within BulletinProvider - mock it
jest.mock('../../src/components/BulletinModal', () => {
  const { View, Text: RNText } = require('react-native');
  return function MockBulletinModal({ visible, bulletin, onClose, onDismiss }: any) {
    if (!visible || !bulletin) return null;
    return (
      <View testID="bulletin-modal">
        <RNText testID="bulletin-title">{bulletin.title}</RNText>
        <RNText testID="bulletin-close" onPress={onClose}>Close</RNText>
        <RNText testID="bulletin-dismiss" onPress={() => onDismiss(bulletin.id)}>Dismiss</RNText>
      </View>
    );
  };
});

// AchievementModal is rendered in AchievementProvider
jest.mock('../../src/components/AchievementModal', () => {
  return function MockAchievementModal() { return null; };
});

const { fetchActiveBulletins } = require('../../src/services/bulletinService');

function TestConsumer() {
  const { isShowingBulletin, bulletinCount, refreshBulletins } = useBulletins();

  return (
    <>
      <Text testID="showing">{isShowingBulletin ? 'yes' : 'no'}</Text>
      <Text testID="count">{bulletinCount}</Text>
      <TouchableOpacity testID="refresh" onPress={refreshBulletins} />
    </>
  );
}

function renderWithAchievementWrapper(ui: React.ReactElement) {
  return render(
    <AchievementProvider>
      {ui}
    </AchievementProvider>
  );
}

describe('BulletinContext', () => {
  beforeEach(() => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([]);
  });

  it('loads bulletins on mount', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      { id: 'b1', title: 'Test Bulletin', type: 'info' },
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(1);
    });
  });

  it('filters out dismissed bulletin IDs from AsyncStorage', async () => {
    await AsyncStorage.setItem(
      'dismissed_bulletin_ids',
      JSON.stringify(['b1'])
    );

    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      { id: 'b1', title: 'Dismissed One', type: 'info' },
      { id: 'b2', title: 'New One', type: 'info' },
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(1);
    });
  });

  it('handleClose advances the bulletin queue', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      { id: 'b1', title: 'First', type: 'info' },
      { id: 'b2', title: 'Second', type: 'info' },
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('bulletin-title').props.children).toBe('First');
    });

    // Close first bulletin
    await fireEvent.press(getByTestId('bulletin-close'));

    await waitFor(() => {
      expect(getByTestId('bulletin-title').props.children).toBe('Second');
      expect(getByTestId('count').props.children).toBe(1);
    });
  });

  it('handleDismiss persists ID to AsyncStorage and advances queue', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      { id: 'b1', title: 'Dismiss Me', type: 'info' },
    ]);

    const { getByTestId, queryByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('bulletin-modal')).toBeTruthy();
    });

    // Dismiss the bulletin
    await fireEvent.press(getByTestId('bulletin-dismiss'));

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(0);
    });

    // Check persistence
    const stored = await AsyncStorage.getItem('dismissed_bulletin_ids');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain('b1');
  });

  it('refreshBulletins resets hasFetched and reloads', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(0);
    });

    // Now add a new bulletin and refresh
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      { id: 'b-new', title: 'New', type: 'advisory' },
    ]);

    await fireEvent.press(getByTestId('refresh'));

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(1);
    });
  });

  it('does not show bulletin when no bulletins available', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('showing').props.children).toBe('no');
      expect(getByTestId('count').props.children).toBe(0);
    });
  });

  it('handles fetch failure gracefully', async () => {
    (fetchActiveBulletins as jest.Mock).mockRejectedValue(new Error('Network error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('count').props.children).toBe(0);
    });

    warnSpy.mockRestore();
  });
});
