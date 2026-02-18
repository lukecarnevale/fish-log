import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SpeciesAlertsProvider,
  useSpeciesAlerts,
} from '../../src/contexts/SpeciesAlertsContext';

function TestConsumer() {
  const {
    markSpeciesAlertSeen,
    markAllSpeciesAlertsSeen,
    hasSeenAlert,
    acknowledgeBadgeAlerts,
    isBadgeAlertAcknowledged,
  } = useSpeciesAlerts();

  return (
    <>
      <Text testID="seen-1">{hasSeenAlert('species-1') ? 'yes' : 'no'}</Text>
      <Text testID="seen-2">{hasSeenAlert('species-2') ? 'yes' : 'no'}</Text>
      <Text testID="badge-1">{isBadgeAlertAcknowledged('species-1') ? 'yes' : 'no'}</Text>
      <TouchableOpacity
        testID="mark-seen"
        onPress={() => markSpeciesAlertSeen('species-1')}
      />
      <TouchableOpacity
        testID="mark-all-seen"
        onPress={() => markAllSpeciesAlertsSeen(['species-1', 'species-2'])}
      />
      <TouchableOpacity
        testID="acknowledge-badges"
        onPress={() => acknowledgeBadgeAlerts(['species-1'])}
      />
    </>
  );
}

describe('SpeciesAlertsContext', () => {
  it('starts with no alerts seen', async () => {
    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    expect(getByTestId('seen-1').props.children).toBe('no');
    expect(getByTestId('seen-2').props.children).toBe('no');
  });

  it('markSpeciesAlertSeen marks a species as seen', async () => {
    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    await fireEvent.press(getByTestId('mark-seen'));

    await waitFor(() => {
      expect(getByTestId('seen-1').props.children).toBe('yes');
      expect(getByTestId('seen-2').props.children).toBe('no');
    });
  });

  it('markSpeciesAlertSeen persists to AsyncStorage', async () => {
    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    await fireEvent.press(getByTestId('mark-seen'));

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('@species_seen_alert_ids');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toContain('species-1');
    });
  });

  it('markAllSpeciesAlertsSeen batch-marks and persists', async () => {
    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    await fireEvent.press(getByTestId('mark-all-seen'));

    await waitFor(() => {
      expect(getByTestId('seen-1').props.children).toBe('yes');
      expect(getByTestId('seen-2').props.children).toBe('yes');
    });
  });

  it('acknowledgeBadgeAlerts persists to separate storage key', async () => {
    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    await fireEvent.press(getByTestId('acknowledge-badges'));

    await waitFor(() => {
      expect(getByTestId('badge-1').props.children).toBe('yes');
    });

    const stored = await AsyncStorage.getItem('@species_badge_acknowledged_ids');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain('species-1');
  });

  it('loads seenAlertIds from AsyncStorage on mount', async () => {
    await AsyncStorage.setItem(
      '@species_seen_alert_ids',
      JSON.stringify(['species-1'])
    );

    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('seen-1').props.children).toBe('yes');
    });
  });

  it('loads badgeAcknowledgedIds from AsyncStorage on mount', async () => {
    await AsyncStorage.setItem(
      '@species_badge_acknowledged_ids',
      JSON.stringify(['species-1'])
    );

    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('badge-1').props.children).toBe('yes');
    });
  });

  it('handles corrupted AsyncStorage data gracefully', async () => {
    await AsyncStorage.setItem('@species_seen_alert_ids', 'not-valid-json');
    await AsyncStorage.setItem('@species_badge_acknowledged_ids', '{bad}');

    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    // Should not throw, should initialize with empty sets
    await waitFor(() => {
      expect(getByTestId('seen-1').props.children).toBe('no');
      expect(getByTestId('badge-1').props.children).toBe('no');
    });
  });

  it('handles non-array JSON data gracefully', async () => {
    await AsyncStorage.setItem('@species_seen_alert_ids', '"string"');

    const { getByTestId } = render(
      <SpeciesAlertsProvider>
        <TestConsumer />
      </SpeciesAlertsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('seen-1').props.children).toBe('no');
    });
  });
});
