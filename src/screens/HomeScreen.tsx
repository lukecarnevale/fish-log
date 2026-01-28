// screens/HomeScreen.tsx

import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
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
import QuickActionGrid from "../components/QuickActionGrid";
import WaveBackground from "../components/WaveBackground";
import WavyMenuIcon from "../components/WavyMenuIcon";
import DrawerMenu from "../components/DrawerMenu";
import { FeedbackType } from "../types/feedback";
import {
  isTestMode,
  AppMode,
} from "../config/appConfig";
import { getPendingAuth, PendingAuth } from "../services/authService";
import { isRewardsMember, getCurrentUser } from "../services/userService";
import { SCREEN_LABELS } from "../constants/screenLabels";

// Update the navigation type to be compatible with React Navigation v7
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
  route: { name: string; params?: any };
}

// Header height for scroll calculations
const HEADER_HEIGHT = 100;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
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
  const slideAnim = useRef<Animated.Value>(new Animated.Value(menuWidth)).current;
  const overlayOpacity = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Scroll animation for collapsing header
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Load user preferences and profile data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if info card has been dismissed
        const infoCardDismissed = await AsyncStorage.getItem("infoCardDismissed");
        if (infoCardDismissed === "true") {
          setShowInfoCard(false);
        }

        // Get name from user profile
        const savedProfile = await AsyncStorage.getItem("userProfile");

        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);

          // Use first name if available, otherwise use last name
          if (parsedProfile.firstName) {
            setUserName(parsedProfile.firstName);
          } else if (parsedProfile.lastName) {
            setUserName(parsedProfile.lastName);
          } else {
            // If profile exists but no names, clear the username
            setUserName("");
          }
        } else {
          // If no profile, don't set a default name
          setUserName("");
        }

        // Check the fishingLicense storage for license number
        const savedLicense = await AsyncStorage.getItem("fishingLicense");
        if (savedLicense) {
          const parsedLicense = JSON.parse(savedLicense);
          if (parsedLicense.licenseNumber) {
            setLicenseNumber(parsedLicense.licenseNumber);
          } else {
            setLicenseNumber(null);
          }
        } else {
          setLicenseNumber(null);
        }

        // Check for pending magic link auth
        const pending = await getPendingAuth();
        console.log('🔔 Pending auth loaded:', pending ? pending.email : 'none');
        setPendingAuth(pending);

        // Check if user is a rewards member
        const isMember = await isRewardsMember();
        setRewardsMember(isMember);
        if (isMember) {
          const user = await getCurrentUser();
          setRewardsMemberEmail(user?.email || null);
          console.log('🏆 Rewards member:', user?.email);
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
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });
    
    // Clean up the listener when component unmounts
    return unsubscribe;
  }, [navigation]);
  
  // Function to dismiss the info card
  const dismissInfoCard = async () => {
    try {
      await AsyncStorage.setItem("infoCardDismissed", "true");
      setShowInfoCard(false);
    } catch (error) {
      console.error("Error saving card preference:", error);
    }
  };
  
  // Get nautical greeting based on time of day
  const getNauticalGreeting = (): string => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      // Morning (5am - 11:59am)
      return [
        "Smooth sailing this morning",
        "Fair winds this morning",
        "Morning ahoy",
        "Clear skies ahead"
      ][Math.floor(Math.random() * 4)];
    } else if (hour >= 12 && hour < 17) {
      // Afternoon (12pm - 4:59pm)
      return [
        "Afternoon on the high seas",
        "Steady as she goes this afternoon",
        "Fisherman's afternoon",
        "Tight lines this afternoon"
      ][Math.floor(Math.random() * 4)];
    } else if (hour >= 17 && hour < 21) {
      // Evening (5pm - 8:59pm)
      return [
        "Evening tides",
        "Sunset fishing",
        "Evening on the water",
        "Dusk on the horizon"
      ][Math.floor(Math.random() * 4)];
    } else {
      // Night (9pm - 4:59am)
      return [
        "Starboard lights on",
        "Navigating by stars",
        "Night fishing",
        "Port lights on"
      ][Math.floor(Math.random() * 4)];
    }
  };

  // Setup to hide the default header and use our custom one
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

  const toggleMenu = (): void => {
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
  };

  const closeMenu = (): void => {
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
  };

  // Updated navigation function with debugging
  const navigateToScreen = (screenName: keyof RootStackParamList): void => {
    // Close the menu first if it's open
    closeMenu();

    console.log(`Navigating to: ${screenName}`);

    // To prevent any possible interference, use setTimeout to separate
    // the navigation action from the touch event handling
    setTimeout(() => {
      // Type assertion needed for dynamic screen names in React Navigation v7
      (navigation.navigate as (screen: keyof RootStackParamList) => void)(screenName);
    }, 0);
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.primary}}>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />
      
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
                NC Dept. of Environmental Quality
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
          { useNativeDriver: true }
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
                  <Text style={localStyles.welcomeGreetingLine}>{getNauticalGreeting()},</Text>
                  <Text style={localStyles.welcomeUserName}>{userName}</Text>
                  <Text style={localStyles.welcomeGreetingLine}>Enjoy your fishing today!</Text>
                </View>
              </View>
            )}

            {/* Rewards Status Section */}
            {rewardsMember ? (
              <View style={[
                localStyles.welcomeRewardsSection,
                userName && localStyles.welcomeRewardsSectionWithGreeting
              ]}>
                <View style={localStyles.welcomeRewardsIcon}>
                  <Feather name="award" size={18} color={colors.secondary} />
                </View>
                <View style={localStyles.welcomeRewardsContent}>
                  <Text style={localStyles.welcomeRewardsTitle}>Rewards Member</Text>
                  <Text style={localStyles.welcomeRewardsEmail}>{rewardsMemberEmail}</Text>
                </View>
                <Feather name="check-circle" size={18} color="#4CAF50" />
              </View>
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
                <Text style={localStyles.welcomeJoinText}>Join Rewards Program</Text>
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
          <View style={styles.licenseCard}>
            <View style={styles.licenseHeader}>
              <NCFlagIcon width={56} height={36} style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.licenseTitle}>{SCREEN_LABELS.fishingLicense.title}</Text>
                <Text style={styles.licenseSubtitle}>
                  {licenseNumber
                    ? `License #${licenseNumber}`
                    : "Tap to edit or view license details"}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Quick Action Cards Grid */}
        <QuickActionGrid onNavigate={navigateToScreen} />
        
        {/* Quarterly Rewards Card */}
        <QuarterlyRewardsCard
          onReportPress={() => navigateToScreen("ReportForm")}
        />

        {/* Advertisement Banner */}
        <AdvertisementBanner />

        {showInfoCard && (
          <MandatoryHarvestCard onDismiss={dismissInfoCard} />
        )}
        
        {/* Footer with sponsor logos - wrapped with dark blue behind it */}
        <View style={localStyles.footerContainer}>
          <View style={localStyles.footerBottomArea} />
          <Footer />
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
});

export default HomeScreen;