// components/DrawerMenu.tsx
//
// Redesigned drawer menu with fish illustrations.
// Extracted from HomeScreen to reduce clutter.
//

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { colors } from '../styles/common';
import { RootStackParamList } from '../types';
import { devConfig } from '../config/devConfig';
import { setAppModeWithWarning, AppMode, APP_VERSION } from '../config/appConfig';
import { SCREEN_LABELS } from '../constants/screenLabels';
import { AppLogoIcon, JumpingFishIcon, StackedFishIcon, SwimmingFishIcon, MultipleFishIcon, LicenseCardIcon } from './icons/DrawerMenuIcons';
import DefaultAnglerAvatarIcon from './icons/DefaultAnglerAvatarIcon';

// ============================================
// TYPES
// ============================================

interface DrawerMenuProps {
  visible: boolean;
  slideAnim: Animated.Value;
  onClose: () => void;
  onNavigate: (screen: keyof RootStackParamList) => void;
  pendingAuth: any | null;
  badgeScale: Animated.AnimatedInterpolation<number>;
  badgeBorderColor: Animated.AnimatedInterpolation<string>;
  currentMode: AppMode;
  setCurrentMode: (mode: AppMode) => void;
  onFeedbackPress?: (type: 'feedback' | 'bug_report') => void;
  /** Whether the user is signed in (rewards member) */
  isSignedIn?: boolean;
  /** User's profile image URI */
  profileImage?: string | null;
  /** Whether the user has an email in their profile (to show "Sign In" vs "Join") */
  hasProfileEmail?: boolean;
}

// ============================================
// MENU ITEM COMPONENT
// ============================================

interface MenuItemProps {
  icon?: string;
  customIcon?: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  iconBgColor?: string;
  iconColor?: string;
  showBadge?: boolean;
  badgeScale?: Animated.AnimatedInterpolation<number>;
  badgeBorderColor?: Animated.AnimatedInterpolation<string>;
  isExternal?: boolean;
  /** If true, shows lock icon and grayed out state */
  disabled?: boolean;
  /** Callback when disabled item is pressed */
  onDisabledPress?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  customIcon,
  label,
  subtitle,
  onPress,
  iconBgColor = '#E8F5F4',
  iconColor = colors.primary,
  showBadge,
  badgeScale,
  badgeBorderColor,
  isExternal,
  disabled = false,
  onDisabledPress,
}) => (
  <TouchableOpacity
    style={[styles.menuItem, disabled && styles.menuItemDisabled]}
    onPress={disabled ? onDisabledPress : onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuItemIcon, { backgroundColor: disabled ? '#F0F0F0' : iconBgColor }]}>
      {customIcon || (
        <Feather name={icon as any} size={20} color={disabled ? '#999' : iconColor} />
      )}
      {showBadge && badgeScale && badgeBorderColor && (
        <Animated.View style={[styles.menuBadge, { transform: [{ scale: badgeScale }] }]}>
          <Animated.View style={[styles.menuBadgeDot, { borderColor: badgeBorderColor }]} />
        </Animated.View>
      )}
    </View>
    <View style={styles.menuItemContent}>
      <Text style={[styles.menuItemLabel, disabled && styles.menuItemLabelDisabled]}>{label}</Text>
      {subtitle && !disabled && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      {disabled && <Text style={styles.menuItemSubtitleDisabled}>Sign in to view</Text>}
    </View>
    {disabled ? (
      <Feather name="lock" size={14} color="#999" />
    ) : isExternal ? (
      <Feather name="external-link" size={14} color="#ccc" />
    ) : (
      <Feather name="chevron-right" size={16} color="#ccc" />
    )}
  </TouchableOpacity>
);

// ============================================
// MAIN COMPONENT
// ============================================

const DrawerMenu: React.FC<DrawerMenuProps> = ({
  visible,
  slideAnim,
  onClose,
  onNavigate,
  pendingAuth,
  badgeScale,
  badgeBorderColor,
  currentMode,
  setCurrentMode,
  onFeedbackPress,
  isSignedIn = false,
  profileImage,
  hasProfileEmail = false,
}) => {
  const menuScrollRef = useRef<ScrollView>(null);

  // Reset scroll position when menu opens
  useEffect(() => {
    if (visible && menuScrollRef.current) {
      menuScrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [visible]);

  const handleNavigate = (screen: keyof RootStackParamList) => {
    onClose();
    setTimeout(() => onNavigate(screen), 0);
  };

  const handleExternalLink = (url: string) => {
    onClose();
    Linking.openURL(url);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will clear all app data and reset to initial state.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              if (Platform.OS !== 'web') {
                const keys = ['userProfile', 'fishingLicense', 'fishReports', 'authToken'];
                for (const key of keys) {
                  try { await SecureStore.deleteItemAsync(key); } catch {}
                }
              }
              Alert.alert("Data Cleared", "All app data has been cleared. Please restart the app.");
              onClose();
            } catch (error) {
              Alert.alert("Error", "Failed to clear app data");
            }
          }
        }
      ]
    );
  };

  const handleToggleDMFMode = () => {
    const currentlyTestMode = currentMode === "mock";
    const newMode: AppMode = currentlyTestMode ? "production" : "mock";

    if (currentlyTestMode) {
      setAppModeWithWarning(newMode, (onConfirm) => {
        Alert.alert(
          "Switch to Production Mode?",
          "WARNING: This will send REAL data to NC DMF servers.\n\nAre you sure?",
          [
            { text: "Cancel", style: "cancel", onPress: () => onConfirm(false) },
            {
              text: "Yes, Enable Production",
              style: "destructive",
              onPress: () => {
                onConfirm(true);
                setCurrentMode("production");
                Alert.alert("Production Mode Enabled", "Submissions will now be sent to real NC DMF servers.");
                onClose();
              }
            }
          ]
        );
      });
    } else {
      setAppModeWithWarning(newMode, (onConfirm) => {
        onConfirm(true);
        setCurrentMode("mock");
        Alert.alert("Test Mode Enabled", "Submissions will be logged to console only.");
        onClose();
      });
    }
  };

  return (
    <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={styles.menuSafeArea} edges={["left", "right"]}>

        {/* Header - Solid primary color */}
        <View style={styles.menuHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.appTitleText}>Fish Log Co.</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Content */}
        <ScrollView
          ref={menuScrollRef}
          style={styles.menuContent}
          contentContainerStyle={styles.menuContentContainer}
          showsVerticalScrollIndicator={false}
        >

          {/* Profile Card */}
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => handleNavigate("Profile")}
            activeOpacity={0.8}
          >
            <View style={styles.profileAvatarContainer}>
              <View style={styles.profileAvatar}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileAvatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                ) : (
                  <DefaultAnglerAvatarIcon size={44} />
                )}
              </View>
              {pendingAuth && (
                <Animated.View style={[styles.profileBadge, { transform: [{ scale: badgeScale }] }]}>
                  <Animated.View style={[styles.profileBadgeDot, { borderColor: badgeBorderColor }]} />
                </Animated.View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{SCREEN_LABELS.profile.title}</Text>
              <Text style={styles.profileSubtitle}>
                {isSignedIn ? SCREEN_LABELS.profile.subtitle : hasProfileEmail ? 'Sign In' : 'Join'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>Quick Actions</Text>

          <MenuItem
            customIcon={<JumpingFishIcon />}
            label={SCREEN_LABELS.reportCatch.title}
            subtitle={SCREEN_LABELS.reportCatch.subtitle}
            onPress={() => handleNavigate("ReportForm")}
            iconBgColor="#E8F5F4"
          />

          <MenuItem
            customIcon={<StackedFishIcon />}
            label={SCREEN_LABELS.pastReports.title}
            subtitle={SCREEN_LABELS.pastReports.subtitle}
            onPress={() => handleNavigate("PastReports")}
            iconBgColor="#E8F5F4"
            disabled={!isSignedIn}
            onDisabledPress={() => handleNavigate("Profile")}
          />

          <MenuItem
            customIcon={<SwimmingFishIcon />}
            label={SCREEN_LABELS.catchFeed.title}
            subtitle={SCREEN_LABELS.catchFeed.subtitle}
            onPress={() => handleNavigate("CatchFeed")}
            iconBgColor="#FFF3E0"
            disabled={!isSignedIn}
            onDisabledPress={() => handleNavigate("Profile")}
          />

          <MenuItem
            customIcon={<MultipleFishIcon />}
            label={SCREEN_LABELS.speciesGuide.title}
            subtitle={SCREEN_LABELS.speciesGuide.subtitle}
            onPress={() => handleNavigate("SpeciesInfo")}
            iconBgColor="#E8F5F4"
          />

          <View style={styles.divider} />

          <MenuItem
            customIcon={<LicenseCardIcon />}
            label={SCREEN_LABELS.fishingLicense.title}
            subtitle={SCREEN_LABELS.fishingLicense.subtitle}
            onPress={() => handleNavigate("LicenseDetails")}
            iconBgColor="#E3EBF6"
          />

          <View style={styles.divider} />

          <MenuItem
            icon="tag"
            label={SCREEN_LABELS.promotions.title}
            subtitle={SCREEN_LABELS.promotions.subtitle}
            onPress={() => handleNavigate("Promotions")}
            iconBgColor="#FFF3E0"
            iconColor="#FF7F25"
          />

          <Text style={styles.sectionHeader}>External Links</Text>

          <MenuItem
            icon="anchor"
            label="Boating Info"
            onPress={() => handleExternalLink("https://www.ncwildlife.org/boating")}
            iconBgColor="#E3EBF6"
            iconColor="#1E3A5F"
            isExternal
          />

          <MenuItem
            icon="compass"
            label="Fishing Resources"
            onPress={() => handleExternalLink("https://www.ncwildlife.org/fishing")}
            iconBgColor="#E8F5E9"
            iconColor="#4CAF50"
            isExternal
          />

          <View style={styles.divider} />

          <MenuItem
            icon="help-circle"
            label="Help & Feedback"
            subtitle="Questions, issues, or suggestions"
            onPress={() => {
              onClose();
              onFeedbackPress?.('feedback');
            }}
            iconBgColor="#E8F5F4"
            iconColor={colors.primary}
          />

          {devConfig.SHOW_DEVELOPER_OPTIONS && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionHeader}>Developer Tools</Text>

              <MenuItem
                icon="trash-2"
                label="Clear All Data"
                onPress={handleClearData}
                iconBgColor="#FFEBEE"
                iconColor="#D32F2F"
              />

              <MenuItem
                icon={currentMode === "mock" ? "toggle-left" : "toggle-right"}
                label={`DMF Mode: ${currentMode === "mock" ? "TEST" : "PRODUCTION"}`}
                onPress={handleToggleDMFMode}
                iconBgColor={currentMode === "mock" ? "#E8F5E9" : "#FFEBEE"}
                iconColor={currentMode === "mock" ? "#4CAF50" : "#D32F2F"}
              />
            </>
          )}

        </ScrollView>

        {/* Footer */}
        <View style={styles.menuFooter}>
          <Text style={styles.versionText}>Version {APP_VERSION}</Text>
        </View>

      </SafeAreaView>
    </Animated.View>
  );
};

// ============================================
// STYLES
// ============================================

const MENU_WIDTH = 320;

// Extra width to hide spring bounce overshoot
const BOUNCE_BUFFER = 30;

const styles = StyleSheet.create({
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: -BOUNCE_BUFFER, // Extend past screen edge to hide bounce
    width: MENU_WIDTH + BOUNCE_BUFFER,
    height: '100%',
    backgroundColor: colors.primary, // Match header so rounded corner shows correctly
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  menuSafeArea: {
    flex: 1,
  },

  // Header
  menuHeader: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'android' ? 74 : 60, // Match HomeScreen header position
    paddingBottom: 32, // Larger header area to match HomeScreen
    paddingLeft: 20,
    paddingRight: 20 + BOUNCE_BUFFER, // Extra padding for bounce buffer
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitleText: {
    fontSize: 20, // Match HomeScreen title
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appSubtitleText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  closeButton: {
    padding: 8,
  },

  // Profile Card
  profileCard: {
    margin: 14,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarContainer: {
    marginRight: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  profileBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  profileBadgeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
  },

  // Menu Content
  menuContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    marginTop: -12, // Overlap header slightly for card effect
  },
  menuContentContainer: {
    paddingTop: 8, // Extra top padding for border radius
    paddingBottom: 20,
    paddingRight: BOUNCE_BUFFER, // Extra padding for bounce buffer
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Menu Item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: '#888888',
    marginTop: 1,
  },
  menuItemDisabled: {
    opacity: 0.7,
  },
  menuItemLabelDisabled: {
    color: '#999',
  },
  menuItemSubtitleDisabled: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 1,
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
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 6,
    marginHorizontal: 14,
  },

  // Footer
  menuFooter: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 14 + BOUNCE_BUFFER, // Extra padding for bounce buffer
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#bbbbbb',
    marginTop: 6,
  },
});

export default DrawerMenu;
