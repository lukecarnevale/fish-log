// screens/HomeScreen.tsx

import React, { useState, useRef, useLayoutEffect, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles, { menuWidth } from "../styles/homeScreenStyles";
import { localStyles } from "../styles/homeScreenLocalStyles";
import { RootStackParamList } from "../types";
import { colors } from "../styles/common";
import QuarterlyRewardsCard from "../components/QuarterlyRewardsCard";
import Footer from "../components/Footer";
import AdvertisementBanner from "../components/AdvertisementBanner";
import MandatoryHarvestCard from "../components/MandatoryHarvestCard";
import LicenseCard from "../components/LicenseCard";
import FeedbackModal from "../components/FeedbackModal";
import AboutModal from "../components/AboutModal";
import QuickActionGrid from "../components/QuickActionGrid";
import WelcomeCard from "../components/WelcomeCard";
import WavyMenuIcon from "../components/WavyMenuIcon";
import DrawerMenu from "../components/DrawerMenu";
import { FeedbackType } from "../types/feedback";
import {
  isTestMode,
  AppMode,
} from "../config/appConfig";
import { getPendingAuth, PendingAuth, onAuthStateChange } from "../services/authService";
import { getCurrentUser, getUserStats } from "../services/userProfileService";
import { isRewardsMember } from "../services/rewardsConversionService";
import { UserAchievement } from "../types/user";
import { BADGE_STORAGE_KEYS } from "../utils/badgeUtils";
import { useAchievements } from "../contexts/AchievementContext";
import { HEADER_HEIGHT } from '../constants/ui';
import { useFloatingHeaderAnimation } from '../hooks/useFloatingHeaderAnimation';
import { usePulseAnimation } from '../hooks/usePulseAnimation';
import { useBadgeData } from '../hooks/useBadgeData';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import OfflineBanner from '../components/OfflineBanner';
import { useBulletins } from '../contexts/BulletinContext';
import BulletinCard from '../components/BulletinCard';
import { BADGE_CACHE_TTL, badgeDataCache, PERSISTENT_CACHE_KEYS, NAUTICAL_GREETINGS } from './home/homeScreenConstants';

// Update the navigation type to be compatible with React Navigation v7
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
  route: { name: string; params?: any };
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  // Achievement notifications - flush any pending achievements when this screen gains focus
  const { flushPendingAchievements } = useAchievements();
  // Bulletin card — non-critical bulletins shown inline on HomeScreen
  const {
    allBulletins,
    cardBulletins,
    showBulletinDetail,
    dismissAllCardBulletins,
    permanentlyDismissBulletin,
  } = useBulletins();

  // Network connectivity — drives the offline banner.
  // autoSync is disabled here because the global listener in App.tsx
  // (useConnectivityMonitoring) is the single owner of auto-sync.
  const { isOnline, pendingCount, refreshPendingCount } = useOfflineStatus({ autoSync: false });

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [showInfoCard, setShowInfoCard] = useState<boolean>(true);
  const [licenseNumber, setLicenseNumber] = useState<string | null>(null);
  const [licenseType, setLicenseType] = useState<string | null>(null);
  const [licenseExpiry, setLicenseExpiry] = useState<string | null>(null);
  // Track current DMF mode to force re-render when it changes
  const [currentMode, setCurrentMode] = useState<AppMode>(isTestMode() ? "mock" : "production");
  // Feedback modal state
  const [feedbackModalVisible, setFeedbackModalVisible] = useState<boolean>(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feedback');
  const [aboutModalVisible, setAboutModalVisible] = useState<boolean>(false);
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
  const { badgeData, loadBadgeData, updateBadgeData } = useBadgeData();
  // User achievements for display
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const slideAnim = useRef<Animated.Value>(new Animated.Value(menuWidth)).current;
  const overlayOpacity = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Scroll animation for collapsing header
  const { scrollY, floatingOpacity: floatingMenuOpacity, floatingTranslateXRight: floatingMenuTranslateX } = useFloatingHeaderAnimation();

  // Track scroll position for dynamic status bar style
  const [statusBarStyle, setStatusBarStyle] = useState<'light-content' | 'dark-content'>('light-content');
  const statusBarStyleRef = useRef(statusBarStyle);
  statusBarStyleRef.current = statusBarStyle;

  // Pulsing animation for notification badge — native driver for smooth 60fps
  const { pulseValue: badgePulse } = usePulseAnimation({
    duration: 1000,
    enabled: !!pendingAuth,
    useNativeDriver: true,
  });

  // Opacity pulse for badge glow effect (replaces JS-thread color interpolation)
  const badgeOpacity = badgePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  // Scale pulse effect (subtle grow/shrink)
  const badgeScale = badgePulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.15, 1],
  });

  // Load user preferences and profile data — extracted so it can be called
  // from the initial mount effect, focus listener, auth listener, AND pull-to-refresh.
  const loadUserData = useCallback(async () => {
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
        setLicenseType(parsedLicense.licenseType || null);
        setLicenseExpiry(parsedLicense.expiryDate || null);
      } else {
        setLicenseNumber(null);
        setLicenseType(null);
        setLicenseExpiry(null);
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
  }, [loadBadgeData]);

  // Pull-to-refresh state and handler
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
    await refreshPendingCount();
    setRefreshing(false);
  }, [loadUserData, refreshPendingCount]);

  useEffect(() => {
    loadUserData();

    // Set up a focus listener to update the data when returning to this screen
    const focusUnsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      // Show any pending achievements that were queued (e.g., from ConfirmationScreen)
      flushPendingAchievements();
    });

    // Set up an auth state listener to refresh when user signs in
    // Track all timeout IDs so we can clean them up on unmount
    const authTimeoutIds: ReturnType<typeof setTimeout>[] = [];

    const authUnsubscribe = onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        // Clear any pending timeouts from a previous auth event
        authTimeoutIds.forEach(id => clearTimeout(id));
        authTimeoutIds.length = 0;

        // Delay to allow createRewardsMemberFromAuthUser to complete
        // Then retry if still not showing as member (database operations can take time)
        const attemptReload = async (attempt: number) => {
          console.log(`🔄 HomeScreen - Reloading after sign in (attempt ${attempt})...`);
          await loadUserData();

          // Check if still not showing as member after reload
          const isMember = await isRewardsMember();
          if (!isMember && attempt < 3) {
            // Retry after another delay
            const id = setTimeout(() => attemptReload(attempt + 1), 1000);
            authTimeoutIds.push(id);
          }
        };

        // Initial delay to let createRewardsMemberFromAuthUser start
        const initialId = setTimeout(() => attemptReload(1), 1500);
        authTimeoutIds.push(initialId);
      }
    });

    // Clean up the listeners and all pending timeouts when component unmounts
    return () => {
      authTimeoutIds.forEach(id => clearTimeout(id));
      focusUnsubscribe();
      authUnsubscribe?.();
    };
  }, [navigation, flushPendingAchievements, loadUserData]);
  
  // Memoized callback for DrawerMenu feedback (avoids defeating React.memo)
  const handleFeedbackPress = useCallback((type: FeedbackType) => {
    setFeedbackType(type);
    setFeedbackModalVisible(true);
  }, []);

  // Memoized callbacks for Footer (avoids defeating React.memo)
  const handlePrivacyPress = useCallback(() => navigation.navigate('LegalDocument', { type: 'privacy' } as any), [navigation]);
  const handleTermsPress = useCallback(() => navigation.navigate('LegalDocument', { type: 'terms' } as any), [navigation]);
  const handleLicensesPress = useCallback(() => navigation.navigate('LegalDocument', { type: 'licenses' } as any), [navigation]);
  const handleContactPress = useCallback(() => {
    setFeedbackType('feedback');
    setFeedbackModalVisible(true);
  }, []);
  const handleInfoPress = useCallback(() => setAboutModalVisible(true), []);

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

  // Memoized navigation function.
  // NOTE: Does NOT call closeMenu() — the DrawerMenu handles its own close
  // animation and delays navigation until the animation settles (280ms).
  // Calling closeMenu() here would cause a redundant state update + animation.
  const navigateToScreen = useCallback((screenName: keyof RootStackParamList, params?: Record<string, any>): void => {
    // Clear "new" indicators when visiting those screens and invalidate cache
    if (screenName === 'PastReports') {
      AsyncStorage.setItem(BADGE_STORAGE_KEYS.lastViewedPastReports, new Date().toISOString());
      updateBadgeData({ hasNewReport: false });
      // Invalidate badge cache so it refreshes on return
      badgeDataCache.timestamp = 0;
    } else if (screenName === 'CatchFeed') {
      AsyncStorage.setItem(BADGE_STORAGE_KEYS.lastViewedCatchFeed, new Date().toISOString());
      updateBadgeData({ newCatchesCount: 0 });
      badgeDataCache.timestamp = 0;
    }

    if (params) {
      (navigation.navigate as any)(screenName, params);
    } else {
      (navigation.navigate as (screen: keyof RootStackParamList) => void)(screenName);
    }
  }, [navigation, updateBadgeData]);

  // Memoized callbacks that depend on navigateToScreen (must be declared after it)
  const handleViewAllBulletins = useCallback(() => navigateToScreen('Bulletins'), [navigateToScreen]);
  const handleReportPress = useCallback(() => navigateToScreen("ReportForm"), [navigateToScreen]);

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
        badgeOpacity={badgeOpacity}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
        onFeedbackPress={handleFeedbackPress}
        isSignedIn={rewardsMember}
        profileImage={profileImage}
        hasProfileEmail={hasProfileEmail}
        bulletins={allBulletins}
        onBulletinPress={showBulletinDetail}
        onViewAllBulletins={handleViewAllBulletins}
        onDismissBulletin={permanentlyDismissBulletin}
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
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
            <View style={styles.headerTextSection}>
              <Text style={styles.title}>Fish Log Co.</Text>
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
                  { opacity: badgeOpacity, transform: [{ scale: badgeScale }] }
                ]}>
                  <View style={localStyles.hamburgerBadgeDot} />
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
                translateX: floatingMenuTranslateX,
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
                { opacity: badgeOpacity, transform: [{ scale: badgeScale }] }
              ]}>
                <View style={localStyles.floatingBadgeDot} />
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Pull-to-refresh spinner — sits behind the scrollable card (z-index between header and content) */}
      {refreshing && (
        <ActivityIndicator
          size="large"
          color={colors.white}
          style={localStyles.refreshSpinner}
        />
      )}

      {/* Wrapper View ensures proper z-ordering on Android (Animated.ScrollView
           does not reliably support elevation for z-ordering on Android) */}
      <View style={localStyles.scrollWrapper}>
      <Animated.ScrollView
        style={[localStyles.scrollView, { backgroundColor: 'transparent' }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!menuOpen}
        contentContainerStyle={localStyles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
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
        {/* Offline Banner — slides in when device loses connectivity */}
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />

        {/* Welcome Card - greeting, rewards status, achievements */}
        <WelcomeCard
          userName={userName}
          profileImage={profileImage}
          nauticalGreeting={nauticalGreeting}
          rewardsMember={rewardsMember}
          rewardsMemberEmail={rewardsMemberEmail}
          userAchievements={userAchievements}
          hasProfileEmail={hasProfileEmail}
          onProfilePress={() => navigateToScreen("Profile")}
        />

        {/* License Card Preview */}
        <LicenseCard
          licenseNumber={licenseNumber}
          licenseType={licenseType}
          expiryDate={licenseExpiry}
          onPress={() => navigateToScreen("LicenseDetails")}
        />

        {/* Quick Action Cards Grid */}
        <QuickActionGrid onNavigate={navigateToScreen} isSignedIn={rewardsMember} badgeData={badgeData} />

        {/* Quarterly Rewards Card */}
        <QuarterlyRewardsCard
          onReportPress={handleReportPress}
          isSignedIn={rewardsMember}
          hasProfileEmail={hasProfileEmail}
        />

        {/* Advertisement Banner */}
        <AdvertisementBanner placement="home" />

        {/* Bulletin Card — non-critical bulletins shown inline */}
        {cardBulletins.length > 0 && (
          <BulletinCard
            bulletins={cardBulletins}
            onBulletinPress={showBulletinDetail}
            onDismissAll={dismissAllCardBulletins}
            onViewAll={() => navigation.navigate('Bulletins')}
          />
        )}

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
            onPrivacyPress={handlePrivacyPress}
            onTermsPress={handleTermsPress}
            onLicensesPress={handleLicensesPress}
            onContactPress={handleContactPress}
            onInfoPress={handleInfoPress}
          />
        </View>
        </View>
      </Animated.ScrollView>
      </View>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        type={feedbackType}
      />

      {/* About Modal */}
      <AboutModal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
      />
    </SafeAreaView>
    </View>
  );
};

export default HomeScreen;