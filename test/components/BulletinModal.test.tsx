import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BulletinModal from '../../src/components/BulletinModal';
import type { Bulletin } from '../../src/types/bulletin';

// Mock AnimatedModal
jest.mock('../../src/components/AnimatedModal', () => {
  const { View, Modal } = require('react-native');
  return ({ visible, onClose, children }: any) => (
    <Modal visible={visible} onRequestClose={onClose}>
      <View>{children}</View>
    </Modal>
  );
});

// Mock WaveAccent
jest.mock('../../src/components/WaveAccent', () => {
  const { View } = require('react-native');
  return {
    WaveAccent: (props: any) => <View testID="wave-accent" />,
    WAVE_PRESETS: {
      error: { color1: 'red', color2: 'pink' },
      warning: { color1: 'orange', color2: 'yellow' },
      primary: { color1: 'blue', color2: 'lightblue' },
      info: { color1: 'teal', color2: 'cyan' },
    },
  };
});

const makeBulletin = (overrides: Partial<Bulletin> = {}): Bulletin => ({
  id: 'b-1',
  title: 'Red Drum Closure',
  description: 'Harvest of Red Drum is prohibited.',
  bulletinType: 'closure',
  imageUrls: [],
  speciesIds: ['sp-1'],
  effectiveDate: '2026-01-01',
  expirationDate: '2026-03-31',
  sourceUrl: null,
  sourceLabel: null,
  notes: null,
  priority: 1,
  ...overrides,
});

describe('BulletinModal', () => {
  it('renders bulletin title and description', () => {
    const { getByText } = render(
      <BulletinModal
        visible={true}
        bulletin={makeBulletin()}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText('Red Drum Closure')).toBeTruthy();
    expect(getByText(/Harvest of Red Drum is prohibited/)).toBeTruthy();
  });

  it('renders type badge for closure', () => {
    const { getByText } = render(
      <BulletinModal
        visible={true}
        bulletin={makeBulletin({ bulletinType: 'closure' })}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText('CLOSURE')).toBeTruthy();
  });

  it('renders type badge for advisory', () => {
    const { getByText } = render(
      <BulletinModal
        visible={true}
        bulletin={makeBulletin({ bulletinType: 'advisory', title: 'Advisory Title' })}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText('ADVISORY')).toBeTruthy();
  });

  it('renders date range when both dates present', () => {
    const { getByText } = render(
      <BulletinModal
        visible={true}
        bulletin={makeBulletin({
          effectiveDate: '2026-01-15',
          expirationDate: '2026-03-15',
        })}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    // Should display formatted dates
    expect(getByText(/Jan 15, 2026/)).toBeTruthy();
    expect(getByText(/Mar 15, 2026/)).toBeTruthy();
  });

  it('renders "Got It" button that calls onClose', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <BulletinModal
        visible={true}
        bulletin={makeBulletin()}
        onClose={onClose}
        onDismiss={jest.fn()}
      />
    );

    fireEvent.press(getByText('Got It'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders "Don\'t show again" button that calls onDismiss with bulletin id', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <BulletinModal
        visible={true}
        bulletin={makeBulletin({ id: 'bulletin-42' })}
        onClose={jest.fn()}
        onDismiss={onDismiss}
      />
    );

    fireEvent.press(getByText("Don't show again"));
    expect(onDismiss).toHaveBeenCalledWith('bulletin-42');
  });

  it('returns null when bulletin is null', () => {
    const { queryByText } = render(
      <BulletinModal
        visible={true}
        bulletin={null}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(queryByText('Got It')).toBeNull();
  });

  it('renders notes section when notes are present', () => {
    const { getByText } = render(
      <BulletinModal
        visible={true}
        bulletin={makeBulletin({ notes: 'Contact 252-515-5638 for info' })}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText(/252-515-5638/)).toBeTruthy();
  });

  it('renders source link when sourceUrl is present', () => {
    const { getByText } = render(
      <BulletinModal
        visible={true}
        bulletin={makeBulletin({
          sourceUrl: 'https://example.com',
          sourceLabel: 'NC DEQ',
        })}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText('NC DEQ')).toBeTruthy();
  });
});
