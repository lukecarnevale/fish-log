import React from 'react';
import { Text, TouchableOpacity, View as RNView } from 'react-native';
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

/**
 * Test consumer that exercises both the critical modal queue and the card bulletin list.
 */
function TestConsumer() {
  const {
    isShowingBulletin,
    criticalBulletinCount,
    cardBulletins,
    showBulletinDetail,
    dismissAllCardBulletins,
    permanentlyDismissBulletin,
    refreshBulletins,
  } = useBulletins();

  // Total count for backwards-compatible assertions
  const totalCount = criticalBulletinCount + cardBulletins.length;

  return (
    <>
      <Text testID="showing">{isShowingBulletin ? 'yes' : 'no'}</Text>
      <Text testID="count">{totalCount}</Text>
      <Text testID="critical-count">{criticalBulletinCount}</Text>
      <Text testID="card-count">{cardBulletins.length}</Text>
      <TouchableOpacity testID="refresh" onPress={refreshBulletins} />
      <TouchableOpacity
        testID="dismiss-all-cards"
        onPress={dismissAllCardBulletins}
      />
      {cardBulletins.map((b: any) => (
        <RNView key={b.id}>
          <Text testID={`card-title-${b.id}`}>{b.title}</Text>
          <TouchableOpacity
            testID={`card-detail-${b.id}`}
            onPress={() => showBulletinDetail(b)}
          />
          <TouchableOpacity
            testID={`card-perm-dismiss-${b.id}`}
            onPress={() => permanentlyDismissBulletin(b.id)}
          />
        </RNView>
      ))}
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

// Helper to make a non-critical bulletin (goes to card)
function makeInfoBulletin(id: string, title: string) {
  return {
    id,
    title,
    bulletinType: 'info',
    priority: 'normal',
    imageUrls: [],
  };
}

// Helper to make a critical bulletin (auto-shows as modal)
function makeCriticalBulletin(id: string, title: string) {
  return {
    id,
    title,
    bulletinType: 'closure',
    priority: 'urgent',
    imageUrls: [],
  };
}

describe('BulletinContext', () => {
  beforeEach(() => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([]);
  });

  // ===========================================================================
  // Non-critical bulletins → card
  // ===========================================================================

  it('loads non-critical bulletins into the card list', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeInfoBulletin('b1', 'Test Bulletin'),
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('card-count').props.children).toBe(1);
      expect(getByTestId('critical-count').props.children).toBe(0);
      // Non-critical bulletins don't auto-show a modal
      expect(getByTestId('showing').props.children).toBe('no');
    });
  });

  it('filters out dismissed bulletin IDs from AsyncStorage', async () => {
    await AsyncStorage.setItem(
      'dismissed_bulletin_ids',
      JSON.stringify(['b1'])
    );

    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeInfoBulletin('b1', 'Dismissed One'),
      makeInfoBulletin('b2', 'New One'),
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

  it('dismissAllCardBulletins clears the card list', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeInfoBulletin('b1', 'One'),
      makeInfoBulletin('b2', 'Two'),
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('card-count').props.children).toBe(2);
    });

    await fireEvent.press(getByTestId('dismiss-all-cards'));

    await waitFor(() => {
      expect(getByTestId('card-count').props.children).toBe(0);
    });
  });

  it('permanentlyDismissBulletin removes from card and persists to AsyncStorage', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeInfoBulletin('b1', 'Dismiss Me'),
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('card-count').props.children).toBe(1);
    });

    await fireEvent.press(getByTestId('card-perm-dismiss-b1'));

    await waitFor(() => {
      expect(getByTestId('card-count').props.children).toBe(0);
    });

    const stored = await AsyncStorage.getItem('dismissed_bulletin_ids');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain('b1');
  });

  // ===========================================================================
  // Critical bulletins → auto-show modal
  // ===========================================================================

  it('auto-shows critical bulletins as modal', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeCriticalBulletin('c1', 'Critical Closure'),
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('bulletin-title').props.children).toBe('Critical Closure');
      expect(getByTestId('critical-count').props.children).toBe(1);
      expect(getByTestId('showing').props.children).toBe('yes');
    });
  });

  it('handleClose advances the critical bulletin queue', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeCriticalBulletin('c1', 'First Critical'),
      makeCriticalBulletin('c2', 'Second Critical'),
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('bulletin-title').props.children).toBe('First Critical');
    });

    await fireEvent.press(getByTestId('bulletin-close'));

    await waitFor(() => {
      expect(getByTestId('bulletin-title').props.children).toBe('Second Critical');
      expect(getByTestId('critical-count').props.children).toBe(1);
    });
  });

  it('handleDismiss on critical bulletin persists ID and advances queue', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeCriticalBulletin('c1', 'Dismiss Me'),
    ]);

    const { getByTestId, queryByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('bulletin-modal')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('bulletin-dismiss'));

    await waitFor(() => {
      expect(getByTestId('critical-count').props.children).toBe(0);
    });

    const stored = await AsyncStorage.getItem('dismissed_bulletin_ids');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain('c1');
  });

  // ===========================================================================
  // Mixed bulletins — critical + non-critical
  // ===========================================================================

  it('splits mixed bulletins into critical modal and card', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeCriticalBulletin('c1', 'Urgent Closure'),
      makeInfoBulletin('b1', 'Info Bulletin'),
      makeInfoBulletin('b2', 'Another Info'),
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      // 1 critical in modal, 2 in card
      expect(getByTestId('critical-count').props.children).toBe(1);
      expect(getByTestId('card-count').props.children).toBe(2);
      expect(getByTestId('count').props.children).toBe(3);
      // Modal showing for the critical one
      expect(getByTestId('bulletin-title').props.children).toBe('Urgent Closure');
    });
  });

  // ===========================================================================
  // Refresh and error handling
  // ===========================================================================

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

    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeInfoBulletin('b-new', 'New'),
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

  // ===========================================================================
  // Detail view from card
  // ===========================================================================

  it('showBulletinDetail opens detail modal for a card bulletin', async () => {
    (fetchActiveBulletins as jest.Mock).mockResolvedValue([
      makeInfoBulletin('b1', 'Tap Me'),
    ]);

    const { getByTestId } = renderWithAchievementWrapper(
      <BulletinProvider>
        <TestConsumer />
      </BulletinProvider>
    );

    await waitFor(() => {
      expect(getByTestId('card-count').props.children).toBe(1);
    });

    // No modal initially (non-critical)
    expect(getByTestId('showing').props.children).toBe('no');

    // Tap the card bulletin to open detail
    await fireEvent.press(getByTestId('card-detail-b1'));

    await waitFor(() => {
      expect(getByTestId('showing').props.children).toBe('yes');
      expect(getByTestId('bulletin-title').props.children).toBe('Tap Me');
    });
  });
});
