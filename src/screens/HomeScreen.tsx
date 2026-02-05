// screens/HomeScreen.tsx

import React, { useState, useRef, useLayoutEffect, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import type { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles, { menuWidth } from "../styles/homeScreenStyles";
import { RootStackParamList } from "../types";
import { colors } from "../styles/common";
import QuarterlyRewardsCard from "../components/QuarterlyRewardsCard";
import Footer from "../components/Footer";
import AdvertisementBanner from "../components/AdvertisementBanner";
import MandatoryHarvestCard from "../components/MandatoryHarvestCard";
import { NCFlagIcon } from "../components/NCFlagIcon";
import FeedbackModal from "../components/FeedbackModal";
import QuickActionGrid, { CardBadgeData } from "../components/QuickActionGrid";
import WaveBackground from "../components/WaveBackground";
import WavyMenuIcon from "../components/WavyMenuIcon";
import DrawerMenu from "../components/DrawerMenu";
import { FeedbackType } from "../types/feedback";
import {
  isTestMode,
  AppMode,
} from "../config/appConfig";
import { getPendingAuth, PendingAuth, onAuthStateChange } from "../services/authService";
import { isRewardsMember, getCurrentUser, getUserStats } from "../services/userService";
import { UserAchievement } from "../types/user";
import { getReportsSummary } from "../services/reportsService";
import { fetchAllFishSpecies } from "../services/fishSpeciesService";
import { fetchRecentCatches } from "../services/catchFeedService";
import { BADGE_STORAGE_KEYS } from "../utils/badgeUtils";
import { SCREEN_LABELS } from "../constants/screenLabels";
import { useAchievements } from "../contexts/AchievementContext";
import { getAchievementColor, getAchievementIcon } from '../constants/achievementMappings';
import { HEADER_HEIGHT } from '../constants/ui';

// Update the navigation type to be compatible with React Navigation v7
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
  route: { name: string; params?: any };
}

// Cache for badge data to avoid refetching on every focus
const BADGE_CACHE_TTL = 60000; // 1 minute
let badgeDataCache: { data: CardBadgeData | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

// Persistent storage keys for cached data (faster initial render)
const PERSISTENT_CACHE_KEYS = {
  badgeData: 'homeScreen_badgeDataCache',
  rewardsMember: 'homeScreen_rewardsMemberCache',
  rewardsData: 'homeScreen_rewardsDataCache',
};

// Nautical greetings by time of day (moved outside component to avoid recreation)
const NAUTICAL_GREETINGS = {
  morning: ["Smooth sailing this morning", "Fair winds this morning", "Morning ahoy", "Clear skies ahead"],
  afternoon: ["Afternoon on the high seas", "Steady as she goes this afternoon", "Fisherman's afternoon", "Tight lines this afternoon"],
  evening: ["Evening tides", "Sunset fishing", "Evening on the water", "Dusk on the horizon"],
  night: ["Starboard lights on", "Navigating by stars", "Night fishing", "Port lights on"],
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  // Achievement notifications - flush any pending achievements when this screen gains focus
  const { flushPendingAchievements } = useAchievements();

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [showInfoCard, setShowInfoCard] = useState<boolean>(true);
  const [licenseNumber, setLicenseNumber] = useState<string | null>(null);
  // Track current DMF mode to force re-render when it changes
  const [currentMode, setCurrentMode] = useState<AppMode>(isTestMode() ? "mock" : "production");
  // Feedback modal state
  const [feedbackModalVisible, setFeedbackModalVisible] = useState<boolean>(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feedback');
  // Track pending magic link auth for badge indicator
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  // Track if user is a rewards member
  const [rewardsMember, setRewardsMember] = useState<boolean>(false);
  const [rewardsMemberEmail, setRewardsMemberEmail] = useState<string | null>(null);
  // Track if user has email in profile (to show "Sign In" vs "Join")
  const [hasProfileEmail, setHasProfileEmail] = useState<boolean>(false);
  // User profile image for drawer menu
  const [profileImage, setProfileImage] = useState<string | null>(null);
  // Badge data for quick action cards
  const [badgeData, setBadgeData] = useState<CardBadgeData>({
    pastReportsCount: 0,
    hasNewReport: false,
    totalSpecies: 0,
    newCatchesCount: 0,
  });
  // User achievements for display
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const slideAnim = useRef<Animated.Value>(new Animated.Value(menuWidth)).current;
  const overlayOpacity = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Scroll animation for collapsing header
  const scrollY = useRef(new Animated.Value(0)).current;

  // Track scroll position for dynamic status bar style
  const [statusBarStyle, setStatusBarStyle] = useState<'light-content' | 'dark-content'>('light-content');
  const statusBarStyleRef = useRef(statusBarStyle);
  statusBarStyleRef.current = statusBarStyle;

  // Floating menu button animation (snaps to side when scrolled)
  const floatingMenuOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.5, HEADER_HEIGHT],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // Pulsing animation for notification badge
  const badgePulse = useRef(new Animated.Value(0)).current;

  // Start pulsing animation when pendingAuth exists
  useEffect(() => {
    if (pendingAuth) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false, // Color interpolation requires native driver off
          }),
          Animated.timing(badgePulse, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [pendingAuth, badgePulse]);

  // Interpolate border color from white to red
  const badgeBorderColor = badgePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.white, '#FF6B6B'],
  });

  // Scale pulse effect (subtle grow/shrink)
  const badgeScale = badgePulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.15, 1],
  });

  // Load badge data with caching to avoid expensive refetches
  const loadBadgeData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Check memory cache first (fastest)
    if (!forceRefresh && badgeDataCache.data && (now - badgeDataCache.timestamp) < BADGE_CACHE_TTL) {
      setBadgeData(badgeDataCache.data);
      return;
    }

    // Load from persistent cache immediately for optimistic UI (don't await)
    if (!badgeDataCache.data) {
      AsyncStorage.getItem(PERSISTENT_CACHE_KEYS.badgeData).then(cached => {
        if (cached && !badgeDataCache.data) {
          try {
            const parsed = JSON.parse(cached);
            setBadgeData(parsed);
          } catch { /* ignore parse errors */ }
        }
      });
    }

    try {
      // Parallelize ALL badge data fetches including catch feed
      const [
        reportsSummary,
        lastViewedPastReports,
        lastReportTimestamp,
        speciesList,
        lastViewedCatchFeed,
        catchFeedResult,
      ] = await Promise.all([
        getReportsSummary(),
        AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastViewedPastReports),
        AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastReportTimestamp),
        fetchAllFishSpecies(),
        AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastViewedCatchFeed),
        fetchRecentCatches({ forceRefresh: false }).catch(() => ({ entries: [] })),
      ]);

      const pastReportsCount = reportsSummary.totalReports;
      const hasNewReport = lastReportTimestamp !== null &&
        (lastViewedPastReports === null || lastReportTimestamp > lastViewedPastReports);
      const totalSpecies = speciesList.length;

      // Calculate new catches count
      let newCatchesCount = 0;
      const recentCatches = catchFeedResult.entries || [];
      if (lastViewedCatchFeed) {
        const lastViewedDate = new Date(lastViewedCatchFeed);
        newCatchesCount = recentCatches.filter(
          (catch_: any) => new Date(catch_.createdAt) > lastViewedDate
        ).length;
      } else {
        newCatchesCount = Math.min(recentCatches.length, 10);
      }

      const newBadgeData = {
        pastReportsCount,
        hasNewReport,
        totalSpecies,
        newCatchesCount,
      };

      // Update memory cache
      badgeDataCache = { data: newBadgeData, timestamp: now };
      setBadgeData(newBadgeData);

      // Persist to storage for next app launch (don't await)
      AsyncStorage.setItem(PERSISTENT_CACHE_KEYS.badgeData, JSON.stringify(newBadgeData));
    } catch (error) {
      console.error('Error loading badge data:', error);
    }
  }, []);

  // Load user preferences and profile data
  useEffect(() => {
    const loadUserData = async () => {
      // PHASE 1: Load cached data immediately for instant UI (optimistic rendering)
      // This runs synchronously before any awaits
      AsyncStorage.getItem(PERSISTENT_CACHE_KEYS.rewardsData).then(cached => {
        if (cached) {
          try {
            const { isMember, email, achievements } = JSON.parse(cached);
            setRewardsMember(isMember);
            setRewardsMemberEmail(email);
            setUserAchievements(achievements || []);
          } catch { /* ignore parse errors */ }
        }
      });

      // Start badge data loading immediately (don't wait for other data)
      loadBadgeData();

      try {
        // PHASE 2: Load local storage data (fast) - parallelize all reads
        const [infoCardDismissed, savedProfile, savedLicense, pending] = await Promise.all([
          AsyncStorage.getItem("infoCardDismissed"),
          AsyncStorage.getItem("userProfile"),
          AsyncStorage.getItem("fishingLicense"),
          getPendingAuth(),
        ]);

        // Process and update UI immediately with local data
        if (infoCardDismissed === "true") {
          setShowInfoCard(false);
        }

        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          setUserName(parsedProfile.firstName || parsedProfile.lastName || "");
          setProfileImage(parsedProfile.profileImage || null);
          setHasProfileEmail(!!parsedProfile.email);
        } else {
          setUserName("");
          setProfileImage(null);
          setHasProfileEmail(false);
        }

        if (savedLicense) {
          const parsedLicense = JSON.parse(savedLicense);
          setLicenseNumber(parsedLicense.licenseNumber || null);
        } else {
          setLicenseNumber(null);
        }

        setPendingAuth(pending);

        // PHASE 3: Fetch fresh rewards data from network (slower, runs in background)
        // This updates the UI when network data arrives
        const isMember = await isRewardsMember();
        setRewardsMember(isMember);

        if (isMember) {
          // Parallelize user data and achievements fetch
          const [user, stats] = await Promise.all([
            getCurrentUser(),
            getUserStats().catch(() => ({ achievements: [] })),
          ]);
          const email = user?.email || null;
          const achievements = stats.achievements || [];
          setRewardsMemberEmail(email);
          setUserAchievements(achievements);

          // Cache for next app launch (don't await)
          AsyncStorage.setItem(PERSISTENT_CACHE_KEYS.rewardsData, JSON.stringify({
            isMember: true,
            email,
            achievements,
          }));
        } else {
          setRewardsMemberEmail(null);
          setUserAchievements([]);
          // Cache non-member status too
          AsyncStorage.setItem(PERSISTENT_CACHE_KEYS.rewardsData, JSON.stringify({
            isMember: false,
            email: null,
            achievements: [],
          }));
        }
      } catch (error) {
        console.error("Error retrieving user data:", error);
        setUserName("");
        setLicenseNumber(null);
        setPendingAuth(null);
      }
    };

    loadUserData();

    // Set up a focus listener to update the data when returning to this screen
    const focusUnsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      // Show any pending achievements that were queued (e.g., from ConfirmationScreen)
      flushPendingAchievements();
    });

    // Set up an auth state listener to refresh when user signs in
    const authUnsubscribe = onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        // Delay to allow createRewardsMemberFromAuthUser to complete
        // Then retry if still not showing as member (database operations can take time)
        const attemptReload = async (attempt: number) => {
          console.log(`🔄 HomeScreen - Reloading after sign in (attempt ${attempt})...`);
          await loadUserData();

          // Check if still not showing as member after reload
          const isMember = await isRewardsMember();
          if (!isMember && attempt < 3) {
            // Retry after another delay
            setTimeout(() => attemptReload(attempt + 1), 1000);
          }
        };

        // Initial delay to let createRewardsMemberFromAuthUser start
        setTimeout(() => attemptReload(1), 1500);
      }
    });

    // Clean up the listeners when component unmounts
    return () => {
      focusUnsubscribe();
      authUnsubscribe?.();
    };
  }, [navigation, flushPendingAchievements]);
  
  // Memoized function to dismiss the info card
  const dismissInfoCard = useCallback(async () => {
    try {
      await AsyncStorage.setItem("infoCardDismissed", "true");
      setShowInfoCard(false);
    } catch (error) {
      console.error("Error saving card preference:", error);
    }
  }, []);
  
  // Memoized nautical greeting - only changes when userName changes (triggers re-mount feel)
  // Uses a stable random index based on the current hour to avoid flickering
  const nauticalGreeting = useMemo((): string => {
    const hour = new Date().getHours();
    // Use hour as seed for consistent greeting within the same hour
    const index = hour % 4;

    if (hour >= 5 && hour < 12) {
      return NAUTICAL_GREETINGS.morning[index];
    } else if (hour >= 12 && hour < 17) {
      return NAUTICAL_GREETINGS.afternoon[index];
    } else if (hour >= 17 && hour < 21) {
      return NAUTICAL_GREETINGS.evening[index];
    } else {
      return NAUTICAL_GREETINGS.night[index];
    }
  }, []);

  // Setup to hide the default header and use our custom one
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

  const toggleMenu = useCallback((): void => {
    // When open: translateX = 0 (menu fully visible at right edge)
    // When closed: translateX = menuWidth (menu slides off to the right)
    const toValue = menuOpen ? menuWidth : 0;
    const overlayToValue = menuOpen ? 0 : 1;

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue,
        useNativeDriver: true,
        friction: 8,
        tension: 65,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      }),
      Animated.timing(overlayOpacity, {
        toValue: overlayToValue,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    setMenuOpen(!menuOpen);
  }, [menuOpen, slideAnim, overlayOpacity]);

  const closeMenu = useCallback((): void => {
    if (menuOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: menuWidth,
          useNativeDriver: true,
          friction: 8,
          tension: 65,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setMenuOpen(false);
    }
  }, [menuOpen, slideAnim, overlayOpacity]);

  // Memoized navigation function
  const navigateToScreen = useCallback((screenName: keyof RootStackParamList): void => {
    // Close the menu first if it's open
    closeMenu();

    // Clear "new" indicators when visiting those screens and invalidate cache
    if (screenName === 'PastReports') {
      AsyncStorage.setItem(BADGE_STORAGE_KEYS.lastViewedPastReports, new Date().toISOString());
      setBadgeData(prev => ({ ...prev, hasNewReport: false }));
      // Invalidate badge cache so it refreshes on return
      badgeDataCache.timestamp = 0;
    } else if (screenName === 'CatchFeed') {
      AsyncStorage.setItem(BADGE_STORAGE_KEYS.lastViewedCatchFeed, new Date().toISOString());
      setBadgeData(prev => ({ ...prev, newCatchesCount: 0 }));
      badgeDataCache.timestamp = 0;
    }

    // Use setTimeout to separate navigation from touch event handling
    setTimeout(() => {
      (navigation.navigate as (screen: keyof RootStackParamList) => void)(screenName);
    }, 0);
  }, [closeMenu, navigation]);

  return (
    <View style={{flex: 1, backgroundColor: colors.primary}}>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarStyle === 'light-content' ? colors.primary : colors.background} translucent animated />
      
      {/* Drawer Menu */}
      <DrawerMenu
        visible={menuOpen}
        slideAnim={slideAnim}
        onClose={closeMenu}
        onNavigate={navigateToScreen}
        pendingAuth={pendingAuth}
        badgeScale={badgeScale}
        badgeBorderColor={badgeBorderColor}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
        onFeedbackPress={(type) => {
          setFeedbackType(type);
          setFeedbackModalVisible(true);
        }}
        isSignedIn={rewardsMember}
        profileImage={profileImage}
        hasProfileEmail={hasProfileEmail}
      />

      {/* Overlay when menu is open */}
      <TouchableWithoutFeedback onPress={closeMenu}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
              pointerEvents: menuOpen ? 'auto' : 'none',
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Fixed Header - stays in place while content scrolls over it */}
      <View style={localStyles.fixedHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeftSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/adaptive-icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTextSection}>
              <Text style={styles.title}>Fish Report</Text>
              <Text style={styles.subtitle}>
                Catch. Report. Win.
              </Text>
            </View>
          </View>
          <View style={styles.headerRightSection}>
            <TouchableOpacity
              onPress={toggleMenu}
              style={{ padding: 12, position: 'relative' }}
              hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <WavyMenuIcon size={32} color="#fff" />
              {pendingAuth && (
                <Animated.View style={[
                  localStyles.hamburgerBadge,
                  { transform: [{ scale: badgeScale }] }
                ]}>
                  <Animated.View style={[
                    localStyles.hamburgerBadgeDot,
                    { borderColor: badgeBorderColor }
                  ]} />
                </Animated.View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Floating hamburger menu button - appears when header is covered, hidden when menu is open */}
      {!menuOpen && (
        <Animated.View
          style={[
            localStyles.floatingMenuButton,
            {
              opacity: floatingMenuOpacity,
              transform: [{
                translateX: floatingMenuOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                })
              }]
            },
          ]}
        >
          <TouchableOpacity
            onPress={toggleMenu}
            style={localStyles.floatingMenuTouchable}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <WavyMenuIcon size={24} color={colors.white} />
            {pendingAuth && (
              <Animated.View style={[
                localStyles.floatingBadge,
                { transform: [{ scale: badgeScale }] }
              ]}>
                <Animated.View style={[
                  localStyles.floatingBadgeDot,
                  { borderColor: badgeBorderColor }
                ]} />
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Scrollable content card that slides over the header */}
      <Animated.ScrollView
        style={[localStyles.scrollView, { backgroundColor: 'transparent' }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={localStyles.scrollViewContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              // Calculate threshold where light content covers the status bar area
              // headerSpacer height minus status bar height (with buffer for rounded corners)
              const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 50;
              const headerSpacerHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 100 : 130;
              const threshold = headerSpacerHeight - statusBarHeight - 24; // 24px buffer for rounded corners

              const scrollPosition = event.nativeEvent.contentOffset.y;
              const newStyle = scrollPosition > threshold ? 'dark-content' : 'light-content';
              if (newStyle !== statusBarStyleRef.current) {
                setStatusBarStyle(newStyle);
              }
            },
          }
        )}
        scrollEventThrottle={16}
      >
        {/* Touchable spacer area that allows interaction with the header behind it */}
        <View style={localStyles.headerSpacer}>
          {/* Invisible touchable area positioned over the header's menu button */}
          <View style={localStyles.spacerMenuArea}>
            <TouchableOpacity
              onPress={toggleMenu}
              style={{ padding: 12 }}
              hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              {/* Invisible - the visual icon is in the fixed header behind */}
              <View style={{ width: 32, height: 32 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content card with rounded top corners */}
        <View style={localStyles.contentContainer}>
        {/* Unified Welcome Card - shows greeting and/or rewards status */}
        {(userName || rewardsMember) && (
          <View style={localStyles.welcomeCard}>
            {/* Greeting Section - shows if user has a name */}
            {userName && (
              <View style={[localStyles.welcomeGreeting, { position: 'relative', overflow: 'hidden' }]}>
                <WaveBackground />
                <View style={localStyles.welcomeGreetingIcon}>
                  <Feather name="anchor" size={22} color={colors.white} />
                </View>
                <View style={[localStyles.welcomeGreetingText, { zIndex: 1 }]}>
                  <Text style={localStyles.welcomeGreetingLine}>{nauticalGreeting},</Text>
                  <Text style={localStyles.welcomeUserName}>{userName}</Text>
                  <Text style={localStyles.welcomeGreetingLine}>Enjoy your fishing today!</Text>
                </View>
              </View>
            )}

            {/* Rewards Status Section */}
            {rewardsMember ? (
              <TouchableOpacity
                style={[
                  localStyles.welcomeRewardsSection,
                  userName && localStyles.welcomeRewardsSectionWithGreeting
                ]}
                onPress={() => navigateToScreen("Profile")}
                activeOpacity={0.7}
              >
                <View style={localStyles.welcomeRewardsIcon}>
                  <Feather name="award" size={18} color={colors.secondary} />
                </View>
                <View style={localStyles.welcomeRewardsContent}>
                  <Text style={localStyles.welcomeRewardsTitle}>Rewards Member</Text>
                  <Text style={localStyles.welcomeRewardsEmail}>{rewardsMemberEmail}</Text>
                </View>
                {/* Achievement icons - show 3 most recent */}
                {userAchievements.length > 0 ? (
                  <View style={localStyles.achievementIconsRow}>
                    {[...userAchievements]
                      .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
                      .slice(0, 3)
                      .map((ua, index) => {
                        const category = ua.achievement.category || 'default';
                        const code = ua.achievement.code;
                        const iconName = getAchievementIcon(code, ua.achievement.iconName, category);
                        const bgColor = getAchievementColor(code, category);
                        return (
                          <View
                            key={ua.id}
                            style={[
                              localStyles.achievementIconBadge,
                              { backgroundColor: bgColor },
                              index > 0 && { marginLeft: -8 },
                            ]}
                          >
                            <Feather
                              name={iconName}
                              size={14}
                              color={colors.white}
                            />
                          </View>
                        );
                      })}
                    {userAchievements.length > 3 && (
                      <View style={[localStyles.achievementIconBadge, localStyles.achievementCountBadge, { marginLeft: -8 }]}>
                        <Text style={localStyles.achievementCountText}>+{userAchievements.length - 3}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            ) : userName ? (
              /* Subtle CTA for non-members who have a name */
              <TouchableOpacity
                style={localStyles.welcomeJoinRewards}
                onPress={() => navigateToScreen("Profile")}
                activeOpacity={0.7}
              >
                <View style={localStyles.welcomeJoinIcon}>
                  <Feather name="gift" size={16} color={colors.secondary} />
                </View>
                <Text style={localStyles.welcomeJoinText}>{hasProfileEmail ? 'Sign In to Rewards Program' : 'Join Rewards Program'}</Text>
                <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* License Card Preview */}
        <TouchableOpacity
          style={styles.licenseCardContainer}
          onPress={() => navigateToScreen("LicenseDetails")}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={localStyles.licenseCardGradient}
          >
            <View style={styles.licenseHeader}>
              <NCFlagIcon width={56} height={36} style={{ marginRight: 12 }} />
              <View>
                <Text style={localStyles.licenseTitleWhite}>{SCREEN_LABELS.fishingLicense.title}</Text>
                <Text style={localStyles.licenseSubtitleWhite}>
                  {licenseNumber
                    ? `License #${licenseNumber}`
                    : "Tap to edit or view license details"}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={24} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Action Cards Grid */}
        <QuickActionGrid onNavigate={navigateToScreen} isSignedIn={rewardsMember} badgeData={badgeData} />
        
        {/* Quarterly Rewards Card */}
        <QuarterlyRewardsCard
          onReportPress={() => navigateToScreen("ReportForm")}
          isSignedIn={rewardsMember}
        />

        {/* Advertisement Banner */}
        <AdvertisementBanner />

        {showInfoCard && (
          <MandatoryHarvestCard
            onDismiss={dismissInfoCard}
            onFishPress={() => navigation.navigate('SpeciesInfo', { showRequiredOnly: true })}
          />
        )}
        
        {/* Footer with sponsor logos - wrapped with dark blue behind it */}
        <View style={localStyles.footerContainer}>
          <View style={localStyles.footerBottomArea} />
          <Footer
            onPrivacyPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}
            onTermsPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}
            onLicensesPress={() => navigation.navigate('LegalDocument', { type: 'licenses' })}
          />
        </View>
        </View>
      </Animated.ScrollView>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        type={feedbackType}
      />
    </SafeAreaView>
    </View>
  );
};

// Local styles for the layered card effect
const localStyles = StyleSheet.create({
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 60,
    paddingBottom: 20,
    zIndex: 1, // Lower z-index so content can scroll over it
  },
  scrollView: {
    flex: 1,
    zIndex: 2, // Higher z-index so content scrolls over header
  },
  scrollViewContent: {
    paddingBottom: 0,
  },
  headerSpacer: {
    // Transparent spacer so the fixed header shows through
    height: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 100 : 130,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  spacerMenuArea: {
    // Position the touchable menu in the same spot as the fixed header's menu
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 60,
    paddingRight: 16,
  },
  contentContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    minHeight: Dimensions.get('window').height,
    // Shadow to make it look like it's floating above the header
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingMenuButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 54,
    right: 16,
    zIndex: 100,
    backgroundColor: colors.primary,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingMenuTouchable: {
    padding: 12,
  },
  footerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  footerBottomArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0B548B', // Match footer navy background
  },
  hamburgerBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  hamburgerBadgeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: colors.white,
  },
  floatingBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  floatingBadgeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: colors.white,
  },
  // Unified Welcome Card styles
  welcomeCard: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 0, // License card has its own marginTop
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  welcomeGreetingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeGreetingText: {
    flex: 1,
  },
  welcomeGreetingLine: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
    opacity: 0.9,
  },
  welcomeUserName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginVertical: 2,
  },
  welcomeRewardsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    paddingHorizontal: 16,
  },
  welcomeRewardsSectionWithGreeting: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  welcomeRewardsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  welcomeRewardsContent: {
    flex: 1,
  },
  welcomeRewardsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  welcomeRewardsEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  welcomeJoinRewards: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 245, 245, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  welcomeJoinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  welcomeJoinText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  // Achievement icons in rewards section
  achievementIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementCountBadge: {
    backgroundColor: colors.primary,
  },
  achievementCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  // License card gradient styles
  licenseCardGradient: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  licenseTitleWhite: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 2,
  },
  licenseSubtitleWhite: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
});

export default HomeScreen;