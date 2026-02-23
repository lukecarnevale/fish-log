import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileScreen from '../../src/screens/ProfileScreen';

// ============================================================
// Mocks
// ============================================================

// DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="date-picker" {...props} />,
  };
});

// expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: 'Images' },
}));

// react-native-mask-input
jest.mock('react-native-mask-input', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => (
      <TextInput
        ref={ref}
        testID={props.testID}
        value={props.value}
        onChangeText={(text: string) => props.onChangeText?.(text, text.replace(/\D/g, ''))}
        placeholder={props.placeholder}
        placeholderTextColor={props.placeholderTextColor}
        keyboardType={props.keyboardType}
      />
    )),
  };
});

// react-native-svg (used by AnglerAvatarIcon)
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
    Ellipse: View,
  };
});

// SkeletonLoader (used by ProfileStats)
jest.mock('../../src/hooks/useSkeletonAnimation', () => ({
  useSkeletonAnimation: () => ({
    translateX: { interpolate: jest.fn(() => 0) },
  }),
}));

// RewardsContext
const mockUseRewards = jest.fn(() => ({
  hasEnteredCurrentRaffle: false,
  config: null,
  currentDrawing: null,
  isLoading: false,
  calculated: {},
}));
jest.mock('../../src/contexts/RewardsContext', () => ({
  useRewards: () => mockUseRewards(),
}));

// useFishingStats
const mockUseFishingStats = jest.fn(() => ({
  fishingStats: { totalCatches: 5, uniqueSpecies: 3, largestFish: 24 },
  statsLoading: false,
}));
jest.mock('../../src/hooks/useFishingStats', () => ({
  useFishingStats: () => mockUseFishingStats(),
}));

// useZipCodeLookup
jest.mock('../../src/hooks/useZipCodeLookup', () => ({
  useZipCodeLookup: jest.fn(() => ({ result: null, isLoading: false, error: null })),
}));

// useFloatingHeaderAnimation
jest.mock('../../src/hooks/useFloatingHeaderAnimation', () => ({
  useFloatingHeaderAnimation: jest.fn(() => {
    const { Animated } = require('react-native');
    const scrollY = new Animated.Value(0);
    return {
      scrollY,
      floatingOpacity: scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
      floatingTranslateXLeft: scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [-60, 0],
      }),
    };
  }),
}));

// authService
const mockGetPendingAuth = jest.fn().mockResolvedValue(null);
const mockClearPendingAuth = jest.fn();
const mockSendMagicLink = jest.fn();
const mockStorePendingAuth = jest.fn();
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
const mockOnAuthStateChange = jest.fn(() => jest.fn());
jest.mock('../../src/services/authService', () => ({
  getPendingAuth: (...args: any[]) => (mockGetPendingAuth as any)(...args),
  clearPendingAuth: (...args: any[]) => (mockClearPendingAuth as any)(...args),
  sendMagicLink: (...args: any[]) => (mockSendMagicLink as any)(...args),
  storePendingAuth: (...args: any[]) => (mockStorePendingAuth as any)(...args),
  signOut: (...args: any[]) => (mockSignOut as any)(...args),
  deleteAccount: (...args: any[]) => (mockDeleteAccount as any)(...args),
  onAuthStateChange: (...args: any[]) => (mockOnAuthStateChange as any)(...args),
}));

// userProfileService
const mockGetCurrentUser = jest.fn().mockResolvedValue(null);
const mockUpdateCurrentUser = jest.fn().mockResolvedValue(undefined);
const mockGetUserStats = jest.fn().mockResolvedValue({ achievements: [] });
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: (...args: any[]) => (mockGetCurrentUser as any)(...args),
  updateCurrentUser: (...args: any[]) => (mockUpdateCurrentUser as any)(...args),
  getUserStats: (...args: any[]) => (mockGetUserStats as any)(...args),
}));

// userService
jest.mock('../../src/services/userService', () => ({
  clearAllUserData: jest.fn().mockResolvedValue(undefined),
}));

// rewardsConversionService
const mockIsRewardsMember = jest.fn().mockResolvedValue(false);
jest.mock('../../src/services/rewardsConversionService', () => ({
  isRewardsMember: (...args: any[]) => (mockIsRewardsMember as any)(...args),
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
}));

// photoUploadService
jest.mock('../../src/services/photoUploadService', () => ({
  uploadProfilePhoto: jest.fn(),
  isLocalUri: jest.fn(() => false),
}));

// catchFeedService
jest.mock('../../src/services/catchFeedService', () => ({
  clearCatchFeedCache: jest.fn(),
}));

// Validation schemas
jest.mock('../../src/constants/validationSchemas', () => ({
  profileSchema: {
    validate: jest.fn().mockResolvedValue(true),
    validateAt: jest.fn().mockResolvedValue(true),
  },
}));

// Input masks
jest.mock('../../src/constants/inputMasks', () => ({
  PHONE_MASK: ['(', /\d/, /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/],
}));

// yup (used directly for ValidationError check in saveProfile)
jest.mock('yup', () => ({
  ValidationError: class ValidationError extends Error {
    inner: any[];
    constructor(msg: string) {
      super(msg);
      this.inner = [];
    }
  },
}));

// Mock child components to simplify rendering
jest.mock('../../src/screens/profile/ProfileStats', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ fishingStats, statsLoading }: any) => (
      <View testID="profile-stats">
        {statsLoading ? (
          <Text>Loading stats...</Text>
        ) : (
          <>
            <Text>Fishing Statistics</Text>
            <Text>{fishingStats.totalCatches} Catches</Text>
            <Text>{fishingStats.uniqueSpecies} Species</Text>
            {fishingStats.largestFish !== null && (
              <Text>{fishingStats.largestFish}" Largest Fish</Text>
            )}
          </>
        )}
      </View>
    ),
  };
});

jest.mock('../../src/screens/profile/ProfileAchievements', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ achievements }: any) => (
      <View testID="profile-achievements">
        <Text>Achievements</Text>
        {achievements.map((a: any) => (
          <Text key={a.id}>{a.achievement.name}</Text>
        ))}
      </View>
    ),
  };
});

jest.mock('../../src/components/FloatingBackButton', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onPress }: any) => (
      <View testID="floating-back-button">
        <TouchableOpacity onPress={onPress} testID="floating-back-press">
          <Text>FloatingBack</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('../../src/components/WrcIdInfoModal', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onClose }: any) =>
      visible ? (
        <View testID="wrc-id-info-modal">
          <Text>WRC ID Lookup</Text>
        </View>
      ) : null,
  };
});

jest.mock('../../src/components/icons/DefaultAnglerAvatarIcon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ size }: any) => <View testID="default-angler-avatar-icon" />,
  };
});

// AnimatedModal (used by WrcIdInfoModal, but we already mock WrcIdInfoModal directly)
jest.mock('../../src/components/AnimatedModal', () => {
  const React = require('react');
  return function MockAnimatedModal({ visible, children }: any) {
    if (!visible) return null;
    return children;
  };
});

// ============================================================
// Test navigation
// ============================================================

const createMockNavigation = () => ({
  goBack: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
  setParams: jest.fn(),
  removeListener: jest.fn(),
});

// ============================================================
// Test profile data
// ============================================================

const testProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-123-4567',
  zipCode: '28401',
};

const testProfileWithLicense = {
  ...testProfile,
  hasLicense: true,
  wrcId: 'WRC123456',
};

// ============================================================
// Tests
// ============================================================

describe('ProfileScreen', () => {
  let mockNavigation: ReturnType<typeof createMockNavigation>;

  beforeEach(async () => {
    mockNavigation = createMockNavigation();
    jest.clearAllMocks();

    // Reset service mocks to defaults
    mockGetPendingAuth.mockResolvedValue(null);
    mockIsRewardsMember.mockResolvedValue(false);
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetUserStats.mockResolvedValue({ achievements: [] });
    mockOnAuthStateChange.mockReturnValue(jest.fn());

    // Pre-seed profile in AsyncStorage
    await AsyncStorage.setItem('userProfile', JSON.stringify(testProfile));
  });

  // ==========================================================
  // 1. Renders without crash
  // ==========================================================

  describe('Initial Render', () => {
    it('renders without crashing', async () => {
      const { getByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      // The header title is rendered immediately (before loading finishes)
      await waitFor(() => {
        expect(getByText('My Profile')).toBeTruthy();
      });
    });

    it('shows profile content after loading completes', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      // After loading, the combined name appears in the header
      expect(await findByText('John Doe')).toBeTruthy();
    });

    it('registers a focus listener on navigation', () => {
      render(<ProfileScreen navigation={mockNavigation as any} />);

      expect(mockNavigation.addListener).toHaveBeenCalledWith(
        'focus',
        expect.any(Function)
      );
    });

    it('subscribes to auth state changes', () => {
      render(<ProfileScreen navigation={mockNavigation as any} />);

      expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // ==========================================================
  // 2. Shows profile information with pre-seeded data
  // ==========================================================

  describe('Profile Information Display', () => {
    it('displays the user name in the header', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('John Doe')).toBeTruthy();
    });

    it('displays the email address', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('john@example.com')).toBeTruthy();
    });

    it('displays the phone number', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('555-123-4567')).toBeTruthy();
    });

    it('displays the ZIP code', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('28401')).toBeTruthy();
    });

    it('displays license status section', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('License Status')).toBeTruthy();
      expect(await findByText('NC Fishing License')).toBeTruthy();
    });

    it('displays personal information section', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Personal Information')).toBeTruthy();
    });

    it('shows license status as "Not specified" when hasLicense is undefined', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Not specified')).toBeTruthy();
    });

    it('shows WRC ID when user has a license', async () => {
      await AsyncStorage.setItem('userProfile', JSON.stringify(testProfileWithLicense));

      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('WRC123456')).toBeTruthy();
      expect(await findByText('Yes')).toBeTruthy();
    });

    it('shows "No" when hasLicense is false', async () => {
      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ ...testProfile, hasLicense: false })
      );

      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('No')).toBeTruthy();
    });

    it('merges license data when profile has no name but license does', async () => {
      // Profile without name, license with name
      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ email: 'test@example.com' })
      );
      await AsyncStorage.setItem(
        'fishingLicense',
        JSON.stringify({
          licenseNumber: 'WRC999',
          firstName: 'Jane',
          lastName: 'Smith',
        })
      );

      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Jane Smith')).toBeTruthy();
    });
  });

  // ==========================================================
  // 3. Default/anonymous state
  // ==========================================================

  describe('Default/Anonymous State', () => {
    beforeEach(async () => {
      await AsyncStorage.removeItem('userProfile');
    });

    it('shows "Not provided" when no name exists', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      // The name field shows "Not provided " (with trailing space) when firstName is missing
      expect(await findByText(/Not provided/)).toBeTruthy();
    });

    it('shows Quarterly Rewards sign-in section for non-members', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Quarterly Rewards')).toBeTruthy();
    });

    it('shows Join Rewards Program button when no email is stored', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Join Rewards Program')).toBeTruthy();
    });

    it('shows "Sign In to Rewards Program" when email exists in profile', async () => {
      await AsyncStorage.setItem(
        'userProfile',
        JSON.stringify({ email: 'someone@test.com' })
      );

      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Sign In to Rewards Program')).toBeTruthy();
    });
  });

  // ==========================================================
  // 4. Profile stats section
  // ==========================================================

  describe('Profile Stats', () => {
    it('renders the ProfileStats component', async () => {
      const { findByTestId } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByTestId('profile-stats')).toBeTruthy();
    });

    it('displays fishing statistics from useFishingStats hook', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Fishing Statistics')).toBeTruthy();
      expect(await findByText('5 Catches')).toBeTruthy();
      expect(await findByText('3 Species')).toBeTruthy();
      expect(await findByText('24" Largest Fish')).toBeTruthy();
    });

    it('shows loading state when stats are loading', async () => {
      mockUseFishingStats.mockReturnValue({
        fishingStats: { totalCatches: 0, uniqueSpecies: 0, largestFish: 0 },
        statsLoading: true,
      });

      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Loading stats...')).toBeTruthy();
    });
  });

  // ==========================================================
  // 5. Achievements section
  // ==========================================================

  describe('Profile Achievements', () => {
    it('does not show achievements section when user is not a rewards member', async () => {
      const { queryByTestId } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(queryByTestId('profile-achievements')).toBeNull();
      });
    });

    it('does not show achievements section when achievements list is empty', async () => {
      mockIsRewardsMember.mockResolvedValue(true);
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-1',
        email: 'member@test.com',
      });
      mockGetUserStats.mockResolvedValue({ achievements: [] });

      const { queryByTestId } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(queryByTestId('profile-achievements')).toBeNull();
      });
    });

    it('shows achievements section for rewards members with achievements', async () => {
      mockIsRewardsMember.mockResolvedValue(true);
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-1',
        email: 'member@test.com',
      });
      mockGetUserStats.mockResolvedValue({
        achievements: [
          {
            id: 'ua-1',
            achievementId: 'ach-1',
            achievement: {
              id: 'ach-1',
              code: 'first_report',
              name: 'First Catch',
              description: 'Submit your first harvest report',
              iconName: 'award',
              category: 'milestone',
              isActive: true,
            },
            earnedAt: '2026-01-15T00:00:00Z',
            progress: null,
          },
        ],
      });

      const { findByTestId, findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByTestId('profile-achievements')).toBeTruthy();
      expect(await findByText('Achievements')).toBeTruthy();
      expect(await findByText('First Catch')).toBeTruthy();
    });
  });

  // ==========================================================
  // 6. Back button navigation
  // ==========================================================

  describe('Navigation', () => {
    it('calls goBack when the static back button is pressed', async () => {
      const { findAllByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      // Wait for profile to load, then find the arrow-left icon text
      // (Feather icons render as Text with the icon name due to the jest.setup mock)
      const arrowLeftIcons = await findAllByText('arrow-left');
      // The first one is the static header back button
      fireEvent.press(arrowLeftIcons[0]);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('calls goBack when the FloatingBackButton is pressed', async () => {
      const { findByTestId } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      const floatingButton = await findByTestId('floating-back-press');
      fireEvent.press(floatingButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('renders the Fishing License section with View License link', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Fishing License')).toBeTruthy();
      expect(await findByText('View License')).toBeTruthy();
    });

    it('navigates to LicenseDetails when View License is pressed', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      const viewLicense = await findByText('View License');
      fireEvent.press(viewLicense);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('LicenseDetails');
    });
  });

  // ==========================================================
  // 7. Edit mode
  // ==========================================================

  describe('Edit Mode', () => {
    it('shows the Edit Profile button on the profile view', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Edit Profile')).toBeTruthy();
    });

    it('enters edit mode when Edit Profile is pressed', async () => {
      const { findByText, findAllByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      const editButton = await findByText('Edit Profile');
      fireEvent.press(editButton);

      // Both the button and form header contain "Edit Profile"
      const editTexts = await findAllByText('Edit Profile');
      expect(editTexts.length).toBeGreaterThanOrEqual(2);
      // Save and Cancel buttons should appear in the form
      expect(await findByText('Save Profile')).toBeTruthy();
      expect(await findByText('Cancel')).toBeTruthy();
    });

    it('shows license information section in edit form', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      fireEvent.press(await findByText('Edit Profile'));

      expect(
        await findByText('License Information')
      ).toBeTruthy();
      expect(
        await findByText('Do you have a NC Fishing License? *')
      ).toBeTruthy();
    });

    it('shows personal information fields in edit form', async () => {
      const { findByText, findAllByText, findByPlaceholderText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      fireEvent.press(await findByText('Edit Profile'));

      // Wait for edit mode to fully render
      await findAllByText('Edit Profile');

      // "Personal Information" appears in both profile view and edit form
      const personalInfoTexts = await findAllByText('Personal Information');
      expect(personalInfoTexts.length).toBeGreaterThanOrEqual(1);
      expect(await findByPlaceholderText('First name')).toBeTruthy();
      expect(await findByPlaceholderText('Last name')).toBeTruthy();
      expect(await findByPlaceholderText('Enter your email')).toBeTruthy();
      expect(await findByPlaceholderText('(555) 123-4567')).toBeTruthy();
      expect(await findByPlaceholderText('12345')).toBeTruthy();
    });

    it('pre-populates form fields with existing profile data', async () => {
      const { findByText, findByDisplayValue } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      fireEvent.press(await findByText('Edit Profile'));

      expect(await findByDisplayValue('John')).toBeTruthy();
      expect(await findByDisplayValue('Doe')).toBeTruthy();
      expect(await findByDisplayValue('john@example.com')).toBeTruthy();
      expect(await findByDisplayValue('28401')).toBeTruthy();
    });

    it('shows Yes/No toggle for license question', async () => {
      const { findByText, findAllByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      fireEvent.press(await findByText('Edit Profile'));

      const yesButtons = await findAllByText('Yes');
      const noButtons = await findAllByText('No');
      // At least one Yes and one No toggle button in the form
      expect(yesButtons.length).toBeGreaterThanOrEqual(1);
      expect(noButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('shows date of birth field with Select date placeholder', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      fireEvent.press(await findByText('Edit Profile'));

      expect(await findByText('Date of Birth')).toBeTruthy();
      expect(await findByText('Select date')).toBeTruthy();
    });

    it('shows photo change help text in edit mode', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      fireEvent.press(await findByText('Edit Profile'));

      expect(await findByText('Tap to change profile photo')).toBeTruthy();
    });
  });

  // ==========================================================
  // Rewards Member State
  // ==========================================================

  describe('Rewards Member State', () => {
    beforeEach(() => {
      mockIsRewardsMember.mockResolvedValue(true);
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-1',
        email: 'member@test.com',
      });
      mockGetUserStats.mockResolvedValue({ achievements: [] });
    });

    it('shows Rewards Member badge and email for signed-in members', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Rewards Member')).toBeTruthy();
      expect(await findByText('member@test.com')).toBeTruthy();
    });

    it('shows encouragement text when not entered in raffle', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(
        await findByText(
          'Submit a catch report and enter the quarterly drawing for a chance to win prizes!'
        )
      ).toBeTruthy();
    });

    it('shows entry confirmation text when entered in raffle', async () => {
      mockUseRewards.mockReturnValue({
        hasEnteredCurrentRaffle: true,
        config: null,
        currentDrawing: null,
        isLoading: false,
        calculated: {},
      });

      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(
        await findByText(
          "You're entered in the quarterly drawing! Keep reporting your catches to earn more entries."
        )
      ).toBeTruthy();
    });

    it('shows Sign Out button for rewards members', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Sign Out')).toBeTruthy();
    });
  });

  // ==========================================================
  // Pending Auth State
  // ==========================================================

  describe('Pending Auth State', () => {
    beforeEach(() => {
      mockGetPendingAuth.mockResolvedValue({
        email: 'pending@test.com',
        firstName: 'Test',
        lastName: 'User',
        sentAt: '2026-01-15T12:00:00Z',
      });
    });

    it('shows pending auth section when magic link is pending', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Rewards Sign Up Pending')).toBeTruthy();
      expect(await findByText('pending@test.com')).toBeTruthy();
    });

    it('shows Resend Link button in pending auth state', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      expect(await findByText('Resend Link')).toBeTruthy();
    });

    it('shows Cancel button in pending auth state', async () => {
      const { findByText } = render(
        <ProfileScreen navigation={mockNavigation as any} />
      );

      // The "Cancel" text in the pending auth section
      const cancelButton = await findByText('Cancel');
      expect(cancelButton).toBeTruthy();
    });
  });

  // ==========================================================
  // Error Handling
  // ==========================================================

  describe('Error Handling', () => {
    it('shows error alert if profile loading fails', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      // Make AsyncStorage.getItem throw
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage failure')
      );

      render(<ProfileScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'Failed to load your profile'
        );
      });

      alertSpy.mockRestore();
    });
  });
});
