// screens/HomeScreen.tsx

import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
  StatusBar,
  Linking,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import styles, { menuWidth } from "../styles/homeScreenStyles";
import { RootStackParamList } from "../types";
import { colors } from "../styles/common";
import PrizesComponent from "../components/PrizesComponent";
import Footer from "../components/Footer";
import AdvertisementBanner from "../components/AdvertisementBanner";
import { NCFlagIcon } from "../components/NCFlagIcon";
import FeedbackModal from "../components/FeedbackModal";
import QuickActionGrid from "../components/QuickActionGrid";
import WaveBackground from "../components/WaveBackground";
import { FeedbackType } from "../types/feedback";
import { devConfig } from "../config/devConfig";
import {
  isTestMode,
  setAppModeWithWarning,
  AppMode,
} from "../config/appConfig";
import { getPendingAuth, PendingAuth } from "../services/authService";
import { isRewardsMember, getCurrentUser } from "../services/userService";

// Update the navigation type to be compatible with React Navigation v7
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
  route: { name: string; params?: any };
}

const { width } = Dimensions.get("window");

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
  const slideAnim = useRef<Animated.Value>(new Animated.Value(width)).current;
  const overlayOpacity = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Scroll animation for collapsing header
  const scrollY = useRef(new Animated.Value(0)).current;

  // Ref for menu ScrollView to reset scroll position
  const menuScrollRef = useRef<ScrollView>(null);

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
    const toValue = menuOpen ? width : width - menuWidth;
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
          toValue: width,
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

      // Reset menu scroll position to top
      menuScrollRef.current?.scrollTo({ y: 0, animated: false });

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

  const MenuItem: React.FC<{
    icon: string;
    label: string;
    onPress: () => void;
    iconBgColor?: string;
    iconColor?: string;
    showBadge?: boolean;
  }> = ({ icon, label, onPress, iconBgColor, iconColor, showBadge }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuItemIcon, iconBgColor && { backgroundColor: iconBgColor }, { overflow: 'visible' }]}>
        <Feather name={icon as any} size={20} color={iconColor || colors.white} />
        {showBadge && (
          <Animated.View style={[
            localStyles.menuBadge,
            { transform: [{ scale: badgeScale }] }
          ]}>
            <Animated.View style={[
              localStyles.menuBadgeDot,
              { borderColor: badgeBorderColor }
            ]} />
          </Animated.View>
        )}
      </View>
      <Text style={styles.menuItemText} numberOfLines={2} ellipsizeMode="tail">
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{flex: 1, backgroundColor: colors.primary}}>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />
      
      {/* Hamburger Menu */}
      <Animated.View
        style={[styles.menu, { transform: [{ translateX: slideAnim }] }]}
      >
        <SafeAreaView style={styles.menuContent} edges={["left", "right"]}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Fish Report</Text>
            <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
              <Feather name="x" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={menuScrollRef}
            style={styles.menuItems}
            contentContainerStyle={styles.menuItemsContent}
            showsVerticalScrollIndicator={false}
          >
            <MenuItem
              icon="user"
              label="Profile"
              onPress={() => navigateToScreen("Profile")}
              iconBgColor={colors.primary}
              iconColor={colors.white}
              showBadge={!!pendingAuth}
            />

            <MenuItem
              icon="camera"
              label="Report Catch"
              onPress={() => navigateToScreen("ReportForm")}
              iconBgColor="#E8F1FA"
              iconColor="#1A5F8A"
            />

            <MenuItem
              icon="credit-card"
              label="My Fishing License"
              onPress={() => navigateToScreen("LicenseDetails")}
              iconBgColor="#E0F0E8"
              iconColor="#4A9B6B"
            />

            <MenuItem
              icon="clock"
              label="My Reports"
              onPress={() => navigateToScreen("PastReports")}
              iconBgColor="#EDF1F9"
              iconColor="#3D5A99"
            />

            <MenuItem
              icon="activity"
              label="Catch Feed"
              onPress={() => navigateToScreen("CatchFeed")}
              iconBgColor="#FDF6E3"
              iconColor="#A68B00"
            />

            <MenuItem
              icon="book-open"
              label="Species Guide"
              onPress={() => navigateToScreen("SpeciesInfo")}
              iconBgColor="#EAF7EC"
              iconColor="#2D7A3F"
            />

            <View style={styles.menuDivider} />

            <Text style={styles.menuSectionTitle}>External Links</Text>
            
            <MenuItem
              icon="anchor"
              label="Boating Info"
              onPress={() => {
                closeMenu();
                Linking.openURL("https://www.ncwildlife.org/boating");
              }}
              iconBgColor="#E0EBF5"
              iconColor="#4A7EB0"
            />

            <MenuItem
              icon="compass"
              label="Fishing Resources"
              onPress={() => {
                closeMenu();
                Linking.openURL("https://www.ncwildlife.org/fishing");
              }}
              iconBgColor="#D4EDDA"
              iconColor={colors.seaweedGreen}
            />

            <View style={styles.menuDivider} />

            <MenuItem
              icon="help-circle"
              label="Help"
              onPress={() => { Alert.alert("Help", "Help would open here"); }}
              iconBgColor="#F0F0F0"
              iconColor="#666666"
            />

            <View style={styles.menuDivider} />

            <Text style={styles.menuSectionTitle}>Feedback</Text>

            <MenuItem
              icon="message-square"
              label="Send Feedback"
              onPress={() => {
                closeMenu();
                setFeedbackType('feedback');
                setFeedbackModalVisible(true);
              }}
              iconBgColor={colors.primaryLight}
              iconColor={colors.primary}
            />

            <MenuItem
              icon="star"
              label="Rate This App"
              onPress={() => {
                closeMenu();
                Alert.alert(
                  "Rate Fish Report",
                  "Enjoying the app? Please consider leaving a rating on the App Store!",
                  [
                    { text: "Not Now", style: "cancel" },
                    {
                      text: "Rate App",
                      onPress: () => {
                        // Replace with actual App Store URL when available
                        Linking.openURL("https://apps.apple.com/app/fish-report");
                      }
                    }
                  ]
                );
              }}
              iconBgColor={colors.warningLight}
              iconColor="#D4940A"
            />

            <MenuItem
              icon="flag"
              label="Report a Problem"
              onPress={() => {
                closeMenu();
                setFeedbackType('bug_report');
                setFeedbackModalVisible(true);
              }}
            />

            {devConfig.SHOW_DEVELOPER_OPTIONS && (
              <>
                <View style={styles.menuDivider} />

                <Text style={styles.menuSectionTitle}>Developer Tools</Text>

                <MenuItem
                  icon="trash-2"
                  label="Clear All Data"
                  onPress={() => {
                    Alert.alert(
                      "Clear All Data",
                      "This will clear all app data and reset to initial state. Sample data will be hidden.",
                      [
                        {
                          text: "Cancel",
                          style: "cancel"
                        },
                        {
                          text: "Clear Data",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              // Clear all AsyncStorage data
                              await AsyncStorage.clear();

                              // Set flag to suppress sample data from showing
                              await AsyncStorage.setItem("sampleDataSuppressed", "true");

                              // Clear SecureStore data (for non-web platforms)
                              if (Platform.OS !== 'web') {
                                const secureStoreKeys = [
                                  'userProfile',
                                  'fishingLicense',
                                  'fishReports',
                                  'authToken',
                                ];
                                for (const key of secureStoreKeys) {
                                  try {
                                    await SecureStore.deleteItemAsync(key);
                                  } catch {
                                    // Ignore errors for keys that don't exist
                                  }
                                }
                              }

                              Alert.alert(
                                "Data Cleared",
                                "All app data has been cleared. Please restart the app to see the zero state.",
                                [
                                  {
                                    text: "OK",
                                    onPress: () => {
                                      // Reset local state
                                      setUserName("");
                                      setShowInfoCard(true);
                                      closeMenu();
                                    }
                                  }
                                ]
                              );
                            } catch (error) {
                              console.error("Error clearing data:", error);
                              Alert.alert("Error", "Failed to clear app data");
                            }
                          }
                        }
                      ]
                    );
                  }}
                />

                <MenuItem
                  icon="database"
                  label="Toggle Sample Data"
                  onPress={async () => {
                    try {
                      const suppressed = await AsyncStorage.getItem("sampleDataSuppressed");
                      const isCurrentlySuppressed = suppressed === "true";

                      Alert.alert(
                        "Sample Data",
                        `Sample data is currently ${isCurrentlySuppressed ? "HIDDEN" : "VISIBLE"}.\n\nWould you like to ${isCurrentlySuppressed ? "show" : "hide"} sample data in Past Reports?`,
                        [
                          {
                            text: "Cancel",
                            style: "cancel"
                          },
                          {
                            text: isCurrentlySuppressed ? "Show Sample Data" : "Hide Sample Data",
                            onPress: async () => {
                              try {
                                if (isCurrentlySuppressed) {
                                  await AsyncStorage.removeItem("sampleDataSuppressed");
                                } else {
                                  await AsyncStorage.setItem("sampleDataSuppressed", "true");
                                }
                                Alert.alert(
                                  "Success",
                                  `Sample data is now ${isCurrentlySuppressed ? "VISIBLE" : "HIDDEN"}. Navigate to Past Reports to see the change.`
                                );
                                closeMenu();
                              } catch (error) {
                                console.error("Error toggling sample data:", error);
                                Alert.alert("Error", "Failed to toggle sample data");
                              }
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error("Error checking sample data status:", error);
                      Alert.alert("Error", "Failed to check sample data status");
                    }
                  }}
                />

                <MenuItem
                  icon={currentMode === "mock" ? "toggle-left" : "toggle-right"}
                  label={`DMF Mode: ${currentMode === "mock" ? "TEST" : "PRODUCTION"}`}
                  onPress={() => {
                    const currentlyTestMode = currentMode === "mock";
                    const newMode: AppMode = currentlyTestMode ? "production" : "mock";

                    if (currentlyTestMode) {
                      // Switching to production - show warning
                      setAppModeWithWarning(newMode, (onConfirm) => {
                        Alert.alert(
                          "Switch to Production Mode?",
                          "⚠️ WARNING: This will send REAL data to NC DMF servers.\n\n" +
                            "All harvest reports submitted will be recorded in the official NC DMF database.\n\n" +
                            "Are you sure you want to enable production mode?",
                          [
                            {
                              text: "Cancel",
                              style: "cancel",
                              onPress: () => onConfirm(false),
                            },
                            {
                              text: "Yes, Enable Production",
                              style: "destructive",
                              onPress: () => {
                                onConfirm(true);
                                setCurrentMode("production");
                                Alert.alert(
                                  "Production Mode Enabled",
                                  "Submissions will now be sent to real NC DMF servers.",
                                  [{ text: "OK", onPress: closeMenu }]
                                );
                              },
                            },
                          ]
                        );
                      });
                    } else {
                      // Switching to test mode - no warning needed
                      setAppModeWithWarning(newMode, (onConfirm) => {
                        onConfirm(true);
                        setCurrentMode("mock");
                        Alert.alert(
                          "Test Mode Enabled",
                          "Submissions will be logged to console only.\nNo data will be sent to NC DMF.",
                          [{ text: "OK", onPress: closeMenu }]
                        );
                      });
                    }
                  }}
                />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

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
              <Feather name="menu" size={32} color="#fff" />
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
            <Feather name="menu" size={24} color={colors.white} />
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
                <Text style={styles.licenseTitle}>Fishing License</Text>
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
        
        {/* Prizes Component */}
        <PrizesComponent
          onReportPress={() => navigateToScreen("ReportForm")}
        />

        {/* Advertisement Banner */}
        <AdvertisementBanner />

        {showInfoCard && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Mandatory Harvest Reporting</Text>
            <Text style={styles.infoText}>
              Beginning December 1, 2025, NC state law requires anglers to report
              harvests of five finfish species from coastal, joint, or adjacent
              inland fishing waters.
            </Text>

            <Text style={styles.infoTitle}>Species Requiring Reporting:</Text>
            <View style={styles.checkListContainer}>
              <View style={styles.checkItem}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={styles.checkText}>Flounder</Text>
              </View>

              <View style={styles.checkItem}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={styles.checkText}>Red Drum</Text>
              </View>

              <View style={styles.checkItem}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={styles.checkText}>Spotted Seatrout</Text>
              </View>

              <View style={styles.checkItem}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={styles.checkText}>Striped Bass</Text>
              </View>

              <View style={styles.checkItem}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={styles.checkText}>Weakfish</Text>
              </View>
            </View>

            <Text style={styles.infoTitle}>When to Report:</Text>
            <Text style={styles.infoText}>
              Reports are due when your fishing trip ends (when your boat reaches
              shore or you stop actively fishing). Only report fish you keep —
              released fish should not be reported.
            </Text>

            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={() => Linking.openURL("https://www.deq.nc.gov/about/divisions/marine-fisheries/science-and-statistics/mandatory-harvest-reporting/mandatory-harvest-reporting-recreational")}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={16} color={colors.primary} />
              <Text style={styles.learnMoreButtonText}>Learn More at NC DEQ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={dismissInfoCard}
              activeOpacity={0.8}
            >
              <Feather name="thumbs-up" size={18} color={colors.white} />
              <Text style={styles.gotItButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 40,
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
  },
  footerBottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    height: 30,
  },
  menuBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  menuBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: colors.white,
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