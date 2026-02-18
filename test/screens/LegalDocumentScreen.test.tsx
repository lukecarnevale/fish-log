import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import LegalDocumentScreen from '../../src/screens/LegalDocumentScreen';

// Create mock navigation and route
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
} as any;

const createRoute = (type: 'privacy' | 'terms' | 'licenses') => ({
  key: `LegalDocument-${type}`,
  name: 'LegalDocument' as const,
  params: { type },
});

describe('LegalDocumentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== Privacy Policy =====

  describe('Privacy Policy', () => {
    it('renders the privacy policy title', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );

      expect(getByText('Privacy Policy')).toBeTruthy();
    });

    it('renders all privacy policy sections', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );

      expect(getByText('Information We Collect')).toBeTruthy();
      expect(getByText('How We Use Your Information')).toBeTruthy();
      expect(getByText('Information Sharing')).toBeTruthy();
      expect(getByText('Data Retention & Deletion')).toBeTruthy();
      expect(getByText('Your Rights')).toBeTruthy();
      expect(getByText("Children's Privacy")).toBeTruthy();
      expect(getByText('Data Security')).toBeTruthy();
    });

    it('renders last updated date', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );

      expect(getByText('Last Updated: February 2026')).toBeTruthy();
    });

    it('renders View Full Privacy Policy link', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );

      expect(getByText('View Full Privacy Policy')).toBeTruthy();
    });

    it('opens full document URL when View Full link is pressed', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );

      fireEvent.press(getByText('View Full Privacy Policy'));
      expect(openURL).toHaveBeenCalledWith('https://fishlogco.github.io/privacy.html');
      openURL.mockRestore();
    });
  });

  // ===== Terms of Use =====

  describe('Terms of Use', () => {
    it('renders the terms of use title', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('terms')} />
      );

      expect(getByText('Terms of Use')).toBeTruthy();
    });

    it('renders all terms sections', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('terms')} />
      );

      expect(getByText('Agreement to Terms')).toBeTruthy();
      expect(getByText('Account Responsibilities')).toBeTruthy();
      expect(getByText('Harvest Reporting')).toBeTruthy();
      expect(getByText('Rewards Program')).toBeTruthy();
      expect(getByText('User Content')).toBeTruthy();
      expect(getByText('Disclaimers')).toBeTruthy();
      expect(getByText('Limitation of Liability')).toBeTruthy();
    });

    it('renders View Full Terms of Use link', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('terms')} />
      );

      expect(getByText('View Full Terms of Use')).toBeTruthy();
    });

    it('opens terms URL when View Full link is pressed', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('terms')} />
      );

      fireEvent.press(getByText('View Full Terms of Use'));
      expect(openURL).toHaveBeenCalledWith('https://fishlogco.github.io/terms.html');
      openURL.mockRestore();
    });
  });

  // ===== Open Source Licenses =====

  describe('Open Source Licenses', () => {
    it('renders the licenses title', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('licenses')} />
      );

      expect(getByText('Open Source Licenses')).toBeTruthy();
    });

    it('renders key license sections', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('licenses')} />
      );

      expect(getByText('About This App')).toBeTruthy();
      expect(getByText('Core Technologies')).toBeTruthy();
      expect(getByText('Backend & Storage')).toBeTruthy();
      expect(getByText('Navigation')).toBeTruthy();
      expect(getByText('UI Components')).toBeTruthy();
      expect(getByText('Utilities')).toBeTruthy();
      expect(getByText('MIT License')).toBeTruthy();
    });

    it('does not render View Full link (licenses has no fullDocumentUrl)', () => {
      const { queryByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('licenses')} />
      );

      expect(queryByText(/View Full/)).toBeNull();
    });
  });

  // ===== Navigation =====

  describe('Navigation', () => {
    it('navigates back when back button is pressed', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );

      // Back button renders the Feather icon as text "arrow-left" due to mock
      fireEvent.press(getByText('arrow-left'));
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  // ===== Contact Section =====

  describe('Contact Section', () => {
    it('renders Questions section with Contact Us button', () => {
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );

      expect(getByText('Questions?')).toBeTruthy();
      expect(getByText('Contact Us')).toBeTruthy();
    });

    it('opens email client when Contact Us is pressed', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
      const { getByText } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );

      fireEvent.press(getByText('Contact Us'));
      expect(openURL).toHaveBeenCalledWith('mailto:fishlogco@gmail.com');
      openURL.mockRestore();
    });

    it('renders contextual contact text for each document type', () => {
      const { getByText: getPrivacy } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('privacy')} />
      );
      expect(getPrivacy(/questions about this privacy policy/i)).toBeTruthy();

      const { getByText: getTerms } = render(
        <LegalDocumentScreen navigation={mockNavigation} route={createRoute('terms')} />
      );
      expect(getTerms(/questions about this terms of use/i)).toBeTruthy();
    });
  });
});
