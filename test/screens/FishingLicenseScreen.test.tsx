import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FishingLicenseScreen from '../../src/screens/FishingLicenseScreen';

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="date-picker" {...props} />,
  };
});

// Mock services used by FishingLicenseScreen
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
  updateCurrentUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/authService', () => ({
  onAuthStateChange: jest.fn(() => jest.fn()),
}));

// Mock ScreenLayout to simplify rendering (avoid provider requirements)
jest.mock('../../src/components/ScreenLayout', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, title, subtitle, navigation, loading, loadingComponent, noScroll }: any) => (
      <View testID="screen-layout">
        <Text>{title}</Text>
        {subtitle && <Text>{subtitle}</Text>}
        <TouchableOpacity testID="back-button" onPress={() => navigation.goBack()}>
          <Text>Back</Text>
        </TouchableOpacity>
        {loading && loadingComponent ? loadingComponent : children}
      </View>
    ),
  };
});

// Mock LicenseTypePicker
jest.mock('../../src/components/LicenseTypePicker', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onClose, onSelect, options }: any) =>
      visible ? (
        <View testID="license-type-picker">
          {(options || []).map((opt: string, i: number) => (
            <TouchableOpacity key={i} onPress={() => { onSelect(opt); onClose(); }}>
              <Text>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null,
  };
});

// Mock NCFlagIcon
jest.mock('../../src/components/NCFlagIcon', () => {
  const { View } = require('react-native');
  return { NCFlagIcon: (props: any) => <View testID="nc-flag-icon" {...props} /> };
});

// Mock ExpandableSection — renders header + children always visible for easy testing
jest.mock('../../src/components/ExpandableSection', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ title, children }: any) => (
      <View testID={`expandable-section-${title}`}>
        <Text>{title}</Text>
        <View>{children}</View>
      </View>
    ),
  };
});

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
} as any;

describe('FishingLicenseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== Loading State =====

  it('shows loading indicator initially', () => {
    const { getByText } = render(
      <FishingLicenseScreen navigation={mockNavigation} />
    );

    // The ScreenLayout receives the title even while loading
    expect(getByText('Fishing License')).toBeTruthy();
  });

  // ===== Empty State (No License) =====

  describe('Empty State', () => {
    it('renders zero-state license card when no license is saved', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('NC COASTAL RECREATIONAL')).toBeTruthy();
      expect(await findByText('FISHING LICENSE')).toBeTruthy();
    });

    it('shows Add License pill button in empty state', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('Add License')).toBeTruthy();
    });

    it('shows License Requirements expandable section', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('License Requirements')).toBeTruthy();
    });

    it('shows requirements content inside expandable section', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      // ExpandableSection mock always renders children
      expect(await findByText(/Required for anglers 16/)).toBeTruthy();
    });

    it('shows Where to Get a License expandable section', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('Where to Get a License')).toBeTruthy();
    });

    it('renders NC Wildlife License Information external link', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('NC Wildlife License Information')).toBeTruthy();
    });

    it('opens NC Wildlife Licensing page when external link is pressed', async () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('NC Wildlife License Information'));

      expect(openURL).toHaveBeenCalledWith('https://www.ncwildlife.gov/fishing');
      openURL.mockRestore();
    });
  });

  // ===== License Display State =====

  describe('License Display', () => {
    const savedLicense = {
      firstName: 'John',
      lastName: 'Doe',
      licenseNumber: 'WRC123456',
      licenseType: 'Annual Coastal Recreational Fishing License',
      issueDate: '2026-01-15',
      expiryDate: '2027-01-15',
    };

    beforeEach(async () => {
      await AsyncStorage.setItem('fishingLicense', JSON.stringify(savedLicense));
    });

    it('renders license card with holder name', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('John Doe')).toBeTruthy();
    });

    it('renders license number', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('WRC123456')).toBeTruthy();
    });

    it('renders license type', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('Annual Coastal Recreational Fishing License')).toBeTruthy();
    });

    it('renders edit pencil button on the license card', async () => {
      const { findByTestId } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByTestId('license-edit-button')).toBeTruthy();
    });

    it('enters edit mode when pencil button is pressed', async () => {
      const { findByTestId, findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByTestId('license-edit-button'));
      expect(await findByText('Edit License', {}, { timeout: 2000 })).toBeTruthy();
    });

    it('shows License Information section header and expandable sections', async () => {
      const { findAllByText, findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      // 'License Information' appears twice: once in the card section title, once as the eyebrow header
      const matches = await findAllByText('License Information');
      expect(matches.length).toBeGreaterThanOrEqual(2);
      // Expandable sections are also present
      expect(await findByText('License Requirements')).toBeTruthy();
    });

    it('shows expandable sections below the filled license card', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('License Requirements')).toBeTruthy();
      expect(await findByText('Where to Get a License')).toBeTruthy();
    });

    it('shows NC Wildlife License Information external link', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText('NC Wildlife License Information')).toBeTruthy();
    });

    it('opens NC Wildlife when external link is pressed', async () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('NC Wildlife License Information'));
      expect(openURL).toHaveBeenCalledWith('https://www.ncwildlife.gov/fishing');
      openURL.mockRestore();
    });

    it('renders disclaimer text about official license', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      expect(await findByText(/This does not replace licensing from NC WRC/)).toBeTruthy();
    });
  });

  // ===== Edit Mode =====

  describe('Edit Mode', () => {
    it('enters edit mode when Add License pill is pressed (empty state)', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      const addButton = await findByText('Add License');
      fireEvent.press(addButton);

      expect(await findByText('Edit License', {}, { timeout: 2000 })).toBeTruthy();
    });

    it('shows form fields in edit mode', async () => {
      const { findByText, findByPlaceholderText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('Add License'));

      expect(await findByText('License Holder')).toBeTruthy();
      expect(await findByPlaceholderText('First')).toBeTruthy();
      expect(await findByPlaceholderText('Last')).toBeTruthy();
      expect(await findByPlaceholderText('Enter license number')).toBeTruthy();
    });

    it('shows Save License and Cancel buttons in edit mode', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('Add License'));

      expect(await findByText('Save License')).toBeTruthy();
      expect(await findByText('Cancel')).toBeTruthy();
    });

    it('does not show Profile Information card in edit mode', async () => {
      const { findByText, queryByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('Add License'));

      expect(queryByText('Profile Information')).toBeNull();
      expect(queryByText('Go to Profile')).toBeNull();
    });
  });

  // ===== Validation =====

  describe('Form Validation', () => {
    it('shows alert when saving without first and last name', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { findByText, findByPlaceholderText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('Add License'));

      // Fill only license number, skip name
      fireEvent.changeText(await findByPlaceholderText('Enter license number'), 'WRC123');

      fireEvent.press(await findByText('Save License'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Missing Information',
        'Please enter your first and last name.'
      );
      alertSpy.mockRestore();
    });

    it('shows alert when saving without license number', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { findByText, findByPlaceholderText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      fireEvent.press(await findByText('Add License'));

      // Fill name but not license number or type
      fireEvent.changeText(await findByPlaceholderText('First'), 'John');
      fireEvent.changeText(await findByPlaceholderText('Last'), 'Doe');

      fireEvent.press(await findByText('Save License'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Missing Information',
        'Please fill out all required fields.'
      );
      alertSpy.mockRestore();
    });
  });

  // ===== Navigation =====

  describe('Navigation', () => {
    it('calls goBack when back button is pressed', async () => {
      const { findByTestId, findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      // Wait for loading to complete (zero-state card is now rendered)
      await findByText('NC COASTAL RECREATIONAL');

      fireEvent.press(await findByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  // ===== Info Modal =====

  describe('Info Modal', () => {
    beforeEach(async () => {
      await AsyncStorage.setItem('fishingLicense', JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber: 'WRC123',
        licenseType: 'Annual Coastal Recreational Fishing License',
      }));
    });

    it('opens info modal when info button is pressed', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      // Wait for license to load, then press the info icon
      await findByText('John Doe');
      // Info button renders the Feather icon as text "info" due to mock
      fireEvent.press(await findByText('info'));

      expect(await findByText('About Your Fishing License')).toBeTruthy();
    });

    it('shows license lookup link in info modal', async () => {
      const { findByText } = render(
        <FishingLicenseScreen navigation={mockNavigation} />
      );

      await findByText('John Doe');
      fireEvent.press(await findByText('info'));

      expect(await findByText('Look Up My License')).toBeTruthy();
    });
  });
});
