import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../../src/screens/HomeScreen';

// ============================================================================
// MOCKS - Services
// ============================================================================

const mockFlushPendingAchievements = jest.fn();
jest.mock('../../src/contexts/AchievementContext', () => ({
  useAchievements: jest.fn(() => ({
    flushPendingAchievements: mockFlushPendingAchievements,
    showAchievements: jest.fn(),
    showAchievement: jest.fn(),
    queueAchievementsForLater: jest.fn(),
    isShowingAchievement: false,
    queueLength: 0,
    pendingCount: 0,
  })),
}));

const mockGetPendingAuth = jest.fn().mockResolvedValue(null);
const mockOnAuthStateChange = jest.fn(() => jest.fn());
jest.mock('../../src/services/authService', () => ({
  getPendingAuth: (...args: any[]) => (mockGetPendingAuth as any)(...args),
  onAuthStateChange: (...args: any[]) => (mockOnAuthStateChange as any)(...args),
}));

const mockGetCurrentUser = jest.fn().mockResolvedValue(null);
const mockGetUserStats = jest.fn().mockResolvedValue({ achievements: [] });
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: (...args: any[]) => (mockGetCurrentUser as any)(...args),
  getUserStats: (...args: any[]) => (mockGetUserStats as any)(...args),
}));

const mockIsRewardsMember = jest.fn().mockResolvedValue(false);
jest.mock('../../src/services/rewardsConversionService', () => ({
  isRewardsMember: (...args: any[]) => (mockIsRewardsMember as any)(...args),
}));

// ============================================================================
// MOCKS - Hooks
// ============================================================================

const mockLoadBadgeData = jest.fn().mockResolvedValue(undefined);
const mockUpdateBadgeData = jest.fn();
jest.mock('../../src/hooks/useBadgeData', () => ({
  useBadgeData: jest.fn(() => ({
    badgeData: {
      pastReportsCount: 0,
      hasNewReport: false,
      totalSpecies: 0,
      newCatchesCount: 0,
    },
    loadBadgeData: mockLoadBadgeData,
    updateBadgeData: mockUpdateBadgeData,
  })),
}));

jest.mock('../../src/hooks/useFloatingHeaderAnimation', () => {
  const { Animated } = require('react-native');
  const scrollY = new Animated.Value(0);
  return {
    useFloatingHeaderAnimation: jest.fn(() => ({
      scrollY,
      floatingOpacity: new Animated.Value(0),
      floatingTranslateXRight: new Animated.Value(60),
      floatingTranslateXLeft: new Animated.Value(-60),
    })),
  };
});

jest.mock('../../src/hooks/usePulseAnimation', () => {
  const { Animated } = require('react-native');
  return {
    usePulseAnimation: jest.fn(() => ({
      pulseValue: new Animated.Value(0),
    })),
  };
});

// ============================================================================
// MOCKS - Child Components (render as simple Views/Texts)
// ============================================================================

jest.mock('../../src/components/DrawerMenu', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onClose, onNavigate, onFeedbackPress }: any) => (
      <View testID="drawer-menu">
        {visible && <Text>Menu Open</Text>}
        <TouchableOpacity testID="drawer-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="drawer-nav-profile" onPress={() => onNavigate('Profile')}>
          <Text>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="drawer-nav-report" onPress={() => onNavigate('ReportForm')}>
          <Text>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="drawer-feedback"
          onPress={() => onFeedbackPress?.('feedback')}
        >
          <Text>Feedback</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('../../src/components/QuickActionGrid', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ onNavigate, isSignedIn, badgeData }: any) => (
      <View testID="quick-action-grid">
        <TouchableOpacity testID="action-report-form" onPress={() => onNavigate('ReportForm')}>
          <Text>Report Catch</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="action-past-reports" onPress={() => onNavigate('PastReports')}>
          <Text>Past Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="action-species-info" onPress={() => onNavigate('SpeciesInfo')}>
          <Text>Species Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="action-catch-feed" onPress={() => onNavigate('CatchFeed')}>
          <Text>Catch Feed</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('../../src/components/QuarterlyRewardsCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onReportPress, isSignedIn }: any) => (
      <View testID="quarterly-rewards-card">
        <Text>Quarterly Rewards</Text>
      </View>
    ),
  };
});

jest.mock('../../src/components/AdvertisementBanner', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="advertisement-banner">
        <Text>Ad Banner</Text>
      </View>
    ),
  };
});

jest.mock('../../src/components/MandatoryHarvestCard', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ onDismiss, onFishPress }: any) => (
      <View testID="mandatory-harvest-card">
        <Text>Mandatory Harvest Info</Text>
        <TouchableOpacity testID="dismiss-harvest-card" onPress={onDismiss}>
          <Text>Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="harvest-fish-press" onPress={onFishPress}>
          <Text>View Fish</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('../../src/components/Footer', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ onPrivacyPress, onTermsPress, onLicensesPress, onContactPress, onInfoPress }: any) => (
      <View testID="footer">
        <Text>Footer</Text>
        <TouchableOpacity testID="footer-privacy" onPress={onPrivacyPress}>
          <Text>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="footer-terms" onPress={onTermsPress}>
          <Text>Terms of Use</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="footer-licenses" onPress={onLicensesPress}>
          <Text>Licenses</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="footer-contact" onPress={onContactPress}>
          <Text>Contact Us</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="footer-info" onPress={onInfoPress}>
          <Text>Info</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('../../src/components/WaveBackground', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="wave-background" />,
  };
});

jest.mock('../../src/components/WavyMenuIcon', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WavyMenuIcon = ({ size, color }: any) => <View testID="wavy-menu-icon" />;
  return {
    __esModule: true,
    default: WavyMenuIcon,
    WavyMenuIcon,
  };
});

jest.mock('../../src/components/FeedbackModal', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onClose, type }: any) =>
      visible ? (
        <View testID="feedback-modal">
          <Text>Feedback Modal</Text>
        </View>
      ) : null,
  };
});

jest.mock('../../src/components/AboutModal', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onClose }: any) =>
      visible ? (
        <View testID="about-modal">
          <Text>About Modal</Text>
        </View>
      ) : null,
  };
});

jest.mock('../../src/components/NCFlagIcon', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    NCFlagIcon: () => <View testID="nc-flag-icon" />,
  };
});

// ============================================================================
// MOCKS - Constants & Utils
// ============================================================================

jest.mock('../../src/screens/home/homeScreenConstants', () => ({
  BADGE_CACHE_TTL: 60000,
  badgeDataCache: { data: null, timestamp: 0 },
  PERSISTENT_CACHE_KEYS: {
    badgeData: 'homeScreen_badgeDataCache',
    rewardsMember: 'homeScreen_rewardsMemberCache',
    rewardsData: 'homeScreen_rewardsDataCache',
  },
  NAUTICAL_GREETINGS: {
    morning: ['Good morning', 'Morning ahoy', 'Fair winds', 'Clear skies'],
    afternoon: ['Good afternoon', 'Steady sailing', 'Tight lines', 'Afternoon ahoy'],
    evening: ['Good evening', 'Sunset fishing', 'Evening tides', 'Dusk on the horizon'],
    night: ['Good night', 'Night fishing', 'Starboard lights', 'Port lights'],
  },
}));

jest.mock('../../src/utils/badgeUtils', () => ({
  BADGE_STORAGE_KEYS: {
    lastViewedPastReports: '@badge_last_viewed_past_reports',
    lastViewedCatchFeed: '@badge_last_viewed_catch_feed',
    lastReportTimestamp: '@badge_last_report_timestamp',
  },
}));

jest.mock('../../src/constants/achievementMappings', () => ({
  getAchievementColor: jest.fn(() => '#4CAF50'),
  getAchievementIcon: jest.fn(() => 'award'),
}));

jest.mock('../../src/constants/ui', () => ({
  HEADER_HEIGHT: 100,
}));

// Mock react-native-svg (used by NCFlagIcon, WavyMenuIcon, etc.)
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Path: View,
    G: View,
    Circle: View,
    Rect: View,
    Text: View,
    Defs: View,
    ClipPath: View,
  };
});

jest.mock('../../src/components/icons/FooterIcons', () => {
  const { View } = require('react-native');
  return {
    GhostFish: () => <View testID="ghost-fish" />,
    WaveTransition: () => <View testID="wave-transition" />,
    FOOTER_BG: '#063A5D',
  };
});

// ============================================================================
// HELPERS
// ============================================================================

const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
  removeListener: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
});

const createMockRoute = () => ({
  name: 'Home',
  params: undefined,
});

const renderHomeScreen = (overrides: { navigation?: any; route?: any } = {}) => {
  const navigation = overrides.navigation || createMockNavigation();
  const route = overrides.route || createMockRoute();
  return {
    ...render(<HomeScreen navigation={navigation} route={route} />),
    navigation,
    route,
  };
};

// ============================================================================
// TESTS
// ============================================================================

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default service mocks
    mockGetPendingAuth.mockResolvedValue(null);
    mockOnAuthStateChange.mockReturnValue(jest.fn());
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetUserStats.mockResolvedValue({ achievements: [] });
    mockIsRewardsMember.mockResolvedValue(false);
    mockLoadBadgeData.mockResolvedValue(undefined);
  });

  // --------------------------------------------------------------------------
  // Rendering
  // --------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders without crashing', async () => {
      const { toJSON } = renderHomeScreen();
      await waitFor(() => {
        expect(toJSON()).toBeTruthy();
      });
    });

    it('shows the app title "Fish Log Co."', async () => {
      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Fish Log Co.')).toBeTruthy();
      });
    });

    it('shows the subtitle "Catch. Report. Win."', async () => {
      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Catch. Report. Win.')).toBeTruthy();
      });
    });

    it('hides the default React Navigation header', async () => {
      const navigation = createMockNavigation();
      renderHomeScreen({ navigation });
      await waitFor(() => {
        expect(navigation.setOptions).toHaveBeenCalledWith({ headerShown: false });
      });
    });

    it('renders the fishing license card', async () => {
      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Fishing License')).toBeTruthy();
      });
    });

    it('shows "Tap to edit or view license details" when no license is stored', async () => {
      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Tap to edit or view license details')).toBeTruthy();
      });
    });

    it('shows license number when stored', async () => {
      await AsyncStorage.setItem(
        'fishingLicense',
        JSON.stringify({ licenseNumber: 'NC12345' })
      );

      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('License #NC12345')).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Child Components
  // --------------------------------------------------------------------------

  describe('child components', () => {
    it('renders the QuickActionGrid', async () => {
      const { getByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('quick-action-grid')).toBeTruthy();
      });
    });

    it('renders the QuarterlyRewardsCard', async () => {
      const { getByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('quarterly-rewards-card')).toBeTruthy();
      });
    });

    it('renders the AdvertisementBanner', async () => {
      const { getByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('advertisement-banner')).toBeTruthy();
      });
    });

    it('renders the Footer', async () => {
      const { getByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('footer')).toBeTruthy();
      });
    });

    it('renders the DrawerMenu', async () => {
      const { getByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('drawer-menu')).toBeTruthy();
      });
    });

    it('renders the MandatoryHarvestCard by default', async () => {
      const { getByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('mandatory-harvest-card')).toBeTruthy();
      });
    });

    it('does not render the FeedbackModal by default', async () => {
      const { queryByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(queryByTestId('feedback-modal')).toBeNull();
      });
    });

    it('does not render the AboutModal by default', async () => {
      const { queryByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(queryByTestId('about-modal')).toBeNull();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Hamburger Menu Toggle
  // --------------------------------------------------------------------------

  describe('hamburger menu toggle', () => {
    it('renders the hamburger menu icon', async () => {
      const { getAllByTestId } = renderHomeScreen();
      await waitFor(() => {
        const icons = getAllByTestId('wavy-menu-icon');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it('does not show "Menu Open" text initially', async () => {
      const { queryByText } = renderHomeScreen();
      await waitFor(() => {
        expect(queryByText('Menu Open')).toBeNull();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Quick Action Navigation
  // --------------------------------------------------------------------------

  describe('quick action navigation', () => {
    it('navigates to ReportForm when Report Catch is pressed', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('action-report-form')).toBeTruthy();
      });

      fireEvent.press(getByTestId('action-report-form'));

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('ReportForm');
      });
    });

    it('navigates to PastReports when Past Reports is pressed', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('action-past-reports')).toBeTruthy();
      });

      fireEvent.press(getByTestId('action-past-reports'));

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('PastReports');
      });
    });

    it('navigates to SpeciesInfo when Species Guide is pressed', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('action-species-info')).toBeTruthy();
      });

      fireEvent.press(getByTestId('action-species-info'));

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('SpeciesInfo');
      });
    });

    it('navigates to CatchFeed when Catch Feed is pressed', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('action-catch-feed')).toBeTruthy();
      });

      fireEvent.press(getByTestId('action-catch-feed'));

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('CatchFeed');
      });
    });

    it('navigates to LicenseDetails when license card is pressed', async () => {
      const { getByText, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Fishing License')).toBeTruthy();
      });

      fireEvent.press(getByText('Fishing License'));

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('LicenseDetails');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Footer Navigation
  // --------------------------------------------------------------------------

  describe('footer navigation', () => {
    it('navigates to Privacy Policy legal document', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('footer-privacy')).toBeTruthy();
      });

      fireEvent.press(getByTestId('footer-privacy'));

      expect(navigation.navigate).toHaveBeenCalledWith('LegalDocument', { type: 'privacy' });
    });

    it('navigates to Terms of Use legal document', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('footer-terms')).toBeTruthy();
      });

      fireEvent.press(getByTestId('footer-terms'));

      expect(navigation.navigate).toHaveBeenCalledWith('LegalDocument', { type: 'terms' });
    });

    it('navigates to Licenses legal document', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('footer-licenses')).toBeTruthy();
      });

      fireEvent.press(getByTestId('footer-licenses'));

      expect(navigation.navigate).toHaveBeenCalledWith('LegalDocument', { type: 'licenses' });
    });

    it('opens feedback modal when Contact Us is pressed', async () => {
      const { getByTestId, queryByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('footer-contact')).toBeTruthy();
      });

      expect(queryByTestId('feedback-modal')).toBeNull();
      fireEvent.press(getByTestId('footer-contact'));

      await waitFor(() => {
        expect(getByTestId('feedback-modal')).toBeTruthy();
      });
    });

    it('opens about modal when Info is pressed', async () => {
      const { getByTestId, queryByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('footer-info')).toBeTruthy();
      });

      expect(queryByTestId('about-modal')).toBeNull();
      fireEvent.press(getByTestId('footer-info'));

      await waitFor(() => {
        expect(getByTestId('about-modal')).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // User Data Loading
  // --------------------------------------------------------------------------

  describe('user data loading', () => {
    it('loads badge data on mount', async () => {
      renderHomeScreen();
      await waitFor(() => {
        expect(mockLoadBadgeData).toHaveBeenCalled();
      });
    });

    it('checks for pending auth on mount', async () => {
      renderHomeScreen();
      await waitFor(() => {
        expect(mockGetPendingAuth).toHaveBeenCalled();
      });
    });

    it('checks rewards membership on mount', async () => {
      renderHomeScreen();
      await waitFor(() => {
        expect(mockIsRewardsMember).toHaveBeenCalled();
      });
    });

    it('sets up auth state change listener', async () => {
      renderHomeScreen();
      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });
    });

    it('sets up navigation focus listener', async () => {
      const navigation = createMockNavigation();
      renderHomeScreen({ navigation });
      await waitFor(() => {
        expect(navigation.addListener).toHaveBeenCalledWith('focus', expect.any(Function));
      });
    });

    it('displays user name when stored in AsyncStorage', async () => {
      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ firstName: 'Captain', lastName: 'Hook' })
      );

      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Captain')).toBeTruthy();
      });
    });

    it('displays greeting text when user name is available', async () => {
      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ firstName: 'Mariner' })
      );

      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Enjoy your fishing today!')).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Rewards Member State
  // --------------------------------------------------------------------------

  describe('rewards member state', () => {
    it('shows Rewards Member section when user is a rewards member', async () => {
      mockIsRewardsMember.mockResolvedValue(true);
      mockGetCurrentUser.mockResolvedValue({ email: 'angler@example.com' });
      mockGetUserStats.mockResolvedValue({ achievements: [] });

      // Provide a user name so the welcome card renders
      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ firstName: 'TestUser' })
      );

      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Rewards Member')).toBeTruthy();
      });
    });

    it('shows member email when user is a rewards member', async () => {
      mockIsRewardsMember.mockResolvedValue(true);
      mockGetCurrentUser.mockResolvedValue({ email: 'captain@sea.com' });
      mockGetUserStats.mockResolvedValue({ achievements: [] });

      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ firstName: 'Captain' })
      );

      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('captain@sea.com')).toBeTruthy();
      });
    });

    it('shows "Join Rewards Program" for non-members with a name but no email', async () => {
      mockIsRewardsMember.mockResolvedValue(false);

      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ firstName: 'Sailor' })
      );

      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Join Rewards Program')).toBeTruthy();
      });
    });

    it('shows "Sign In to Rewards Program" for non-members with an email in profile', async () => {
      mockIsRewardsMember.mockResolvedValue(false);

      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ firstName: 'Sailor', email: 'sailor@sea.com' })
      );

      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Sign In to Rewards Program')).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // MandatoryHarvestCard Dismissal
  // --------------------------------------------------------------------------

  describe('info card dismissal', () => {
    it('hides harvest card when previously dismissed', async () => {
      await AsyncStorage.setItem('infoCardDismissed', 'true');

      const { queryByTestId } = renderHomeScreen();
      await waitFor(() => {
        expect(queryByTestId('mandatory-harvest-card')).toBeNull();
      });
    });

    it('dismisses harvest card and persists preference', async () => {
      const { getByTestId, queryByTestId } = renderHomeScreen();

      // Wait for initial data loading to complete before interacting
      await waitFor(() => {
        expect(getByTestId('mandatory-harvest-card')).toBeTruthy();
        expect(mockIsRewardsMember).toHaveBeenCalled();
      });

      fireEvent.press(getByTestId('dismiss-harvest-card'));

      // Verify AsyncStorage was updated (the dismissInfoCard function ran)
      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('infoCardDismissed', 'true');
      });

      // The card should be removed from the tree after state update
      await waitFor(() => {
        expect(queryByTestId('mandatory-harvest-card')).toBeNull();
      });
    });

    it('navigates to SpeciesInfo with showRequiredOnly when fish is pressed on harvest card', async () => {
      const { getByTestId, navigation } = renderHomeScreen();

      await waitFor(() => {
        expect(getByTestId('harvest-fish-press')).toBeTruthy();
      });

      fireEvent.press(getByTestId('harvest-fish-press'));

      expect(navigation.navigate).toHaveBeenCalledWith('SpeciesInfo', { showRequiredOnly: true });
    });
  });

  // --------------------------------------------------------------------------
  // Welcome Card Visibility
  // --------------------------------------------------------------------------

  describe('welcome card visibility', () => {
    it('does not show welcome card when no user name and not a rewards member', async () => {
      mockIsRewardsMember.mockResolvedValue(false);

      const { queryByText } = renderHomeScreen();
      await waitFor(() => {
        expect(mockIsRewardsMember).toHaveBeenCalled();
      });

      expect(queryByText('Enjoy your fishing today!')).toBeNull();
    });

    it('shows welcome card when user has a profile name', async () => {
      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ firstName: 'Skipper' })
      );

      const { getByText } = renderHomeScreen();
      await waitFor(() => {
        expect(getByText('Skipper')).toBeTruthy();
        expect(getByText('Enjoy your fishing today!')).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Drawer Menu Navigation
  // --------------------------------------------------------------------------

  describe('drawer menu navigation', () => {
    it('navigates to Profile from drawer menu', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('drawer-nav-profile')).toBeTruthy();
      });

      fireEvent.press(getByTestId('drawer-nav-profile'));

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('Profile');
      });
    });

    it('navigates to ReportForm from drawer menu', async () => {
      const { getByTestId, navigation } = renderHomeScreen();
      await waitFor(() => {
        expect(getByTestId('drawer-nav-report')).toBeTruthy();
      });

      fireEvent.press(getByTestId('drawer-nav-report'));

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('ReportForm');
      });
    });
  });
});
