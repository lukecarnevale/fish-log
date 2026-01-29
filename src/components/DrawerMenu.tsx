// components/DrawerMenu.tsx
//
// Redesigned drawer menu with fish illustrations.
// Extracted from HomeScreen to reduce clutter.
//

import React, { useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Svg, { Path, Ellipse, Circle, G, Rect, Line, Text as SvgText } from 'react-native-svg';

import { colors } from '../styles/common';
import { RootStackParamList } from '../types';
import { devConfig } from '../config/devConfig';
import { setAppModeWithWarning, AppMode } from '../config/appConfig';
import { SCREEN_LABELS } from '../constants/screenLabels';

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
}

// ============================================
// SVG ILLUSTRATIONS
// ============================================

/** App logo - Hook with fish */
const AppLogoIcon: React.FC = () => (
  <Svg width={46} height={46} viewBox="0 0 50 50">
    <Path
      d="M28 4 L28 18 Q28 26 20 26 Q12 26 12 18"
      stroke="white"
      strokeWidth={2.5}
      fill="none"
      strokeLinecap="round"
      opacity={0.9}
    />
    <G transform="translate(6, 24)">
      <Ellipse cx={18} cy={10} rx={16} ry={7} fill="#2D9596" />
      <Ellipse cx={18} cy={12} rx={12} ry={4} fill="#4DB6AC" />
      <Path d="M32 10 Q40 5 38 10 Q40 15 32 10" fill="#E57373" />
      <Circle cx={6} cy={8} r={2.5} fill="white" />
      <Circle cx={7} cy={8} r={1.5} fill="#1A1A1A" />
    </G>
  </Svg>
);

/** Profile avatar - Angler with fishing rod */
const AnglerAvatarIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 40 40">
    <Circle cx={12} cy={10} r={5} fill="white" opacity={0.9} />
    <Path d="M7 18 Q7 14 12 14 Q17 14 17 18 L17 28 L7 28 Z" fill="white" opacity={0.9} />
    <Path d="M16 16 L30 6" stroke="white" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.9} />
    <Path d="M30 6 L32 16" stroke="white" strokeWidth={1} fill="none" opacity={0.7} />
    <G transform="translate(28, 18)">
      <Ellipse cx={5} cy={4} rx={5} ry={3} fill="#FFB74D" />
      <Path d="M9 4 Q12 2 11 4 Q12 6 9 4" fill="#FF8F00" />
      <Circle cx={2} cy={3} r={1} fill="white" />
    </G>
  </Svg>
);

/** Report Catch - Jumping fish with splash */
const JumpingFishIcon: React.FC = () => (
  <Svg width={32} height={26} viewBox="0 0 50 40">
    <Ellipse cx={25} cy={36} rx={14} ry={3} fill="#64B5F6" opacity={0.3} />
    <Ellipse cx={12} cy={28} rx={2.5} ry={3.5} fill="#64B5F6" opacity={0.6} />
    <Ellipse cx={38} cy={26} rx={2} ry={3} fill="#64B5F6" opacity={0.5} />
    <G transform="translate(10, 4) rotate(-25)">
      <Ellipse cx={16} cy={10} rx={14} ry={6.5} fill="#2D9596" />
      <Ellipse cx={16} cy={12} rx={10} ry={3.5} fill="#4DB6AC" />
      <Path d="M29 10 Q36 5 34 10 Q36 15 29 10" fill="#E57373" />
      <Circle cx={6} cy={8} r={2} fill="white" />
      <Circle cx={6.5} cy={8} r={1.2} fill="#1A1A1A" />
    </G>
  </Svg>
);

/** My Reports - Stacked fish */
const StackedFishIcon: React.FC = () => (
  <Svg width={32} height={28} viewBox="0 0 50 45">
    <G transform="translate(5, 0)">
      <Ellipse cx={20} cy={10} rx={18} ry={7} fill="#90CAF9" opacity={0.5} />
      <Path d="M36 10 Q44 5 42 10 Q44 15 36 10" fill="#64B5F6" opacity={0.5} />
    </G>
    <G transform="translate(2, 10)">
      <Ellipse cx={20} cy={10} rx={18} ry={7} fill="#4DB6AC" opacity={0.7} />
      <Path d="M36 10 Q44 5 42 10 Q44 15 36 10" fill="#26A69A" opacity={0.7} />
    </G>
    <G transform="translate(0, 20)">
      <Ellipse cx={20} cy={10} rx={18} ry={7} fill="#2D9596" />
      <Ellipse cx={20} cy={12} rx={13} ry={4} fill="#4DB6AC" />
      <Path d="M36 10 Q44 5 42 10 Q44 15 36 10" fill="#E57373" />
      <Circle cx={7} cy={9} r={2.5} fill="white" />
      <Circle cx={7.5} cy={9} r={1.5} fill="#1A1A1A" />
    </G>
  </Svg>
);

/** Catch Feed - Swimming fish with motion lines */
const SwimmingFishIcon: React.FC = () => (
  <Svg width={32} height={26} viewBox="0 0 50 40">
    <G transform="translate(8, 10)">
      <Ellipse cx={18} cy={10} rx={16} ry={7} fill="#FFB74D" />
      <Ellipse cx={18} cy={12} rx={12} ry={4} fill="#FFE082" />
      <Path d="M32 10 Q40 5 38 10 Q40 15 32 10" fill="#FF8F00" />
      <Circle cx={6} cy={8} r={2.5} fill="white" />
      <Circle cx={6.5} cy={8} r={1.5} fill="#1A1A1A" />
    </G>
    <Path d="M2 12 L8 12" stroke="#FFB74D" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Path d="M0 20 L6 20" stroke="#FFB74D" strokeWidth={2} strokeLinecap="round" opacity={0.4} />
    <Path d="M3 28 L9 28" stroke="#FFB74D" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
  </Svg>
);

/** Species Guide - Multiple fish species */
const MultipleFishIcon: React.FC = () => (
  <Svg width={34} height={28} viewBox="0 0 55 45">
    <G transform="translate(25, 2)">
      <Ellipse cx={12} cy={8} rx={11} ry={5} fill="#FFB74D" opacity={0.8} />
      <Path d="M22 8 Q28 4 26 8 Q28 12 22 8" fill="#FF8F00" opacity={0.8} />
      <Circle cx={5} cy={7} r={1.5} fill="white" />
    </G>
    <G transform="translate(0, 12)">
      <Ellipse cx={16} cy={10} rx={14} ry={6} fill="#2D9596" />
      <Ellipse cx={16} cy={12} rx={10} ry={3.5} fill="#4DB6AC" />
      <Path d="M28 10 Q36 5 34 10 Q36 15 28 10" fill="#E57373" />
      <Circle cx={6} cy={8} r={2} fill="white" />
      <Circle cx={6.5} cy={8} r={1.2} fill="#1A1A1A" />
    </G>
    <G transform="translate(22, 26)">
      <Ellipse cx={14} cy={8} rx={12} ry={5.5} fill="#81C784" opacity={0.8} />
      <Path d="M25 8 Q32 4 30 8 Q32 12 25 8" fill="#4CAF50" opacity={0.8} />
      <Circle cx={5} cy={7} r={1.8} fill="white" />
    </G>
  </Svg>
);

/** Fishing License - License card with NC flag */
const LicenseCardIcon: React.FC = () => (
  <Svg width={30} height={22} viewBox="0 0 50 36">
    <Rect x={2} y={4} width={46} height={28} rx={4} fill="#E3EBF6" />
    <Rect x={2} y={4} width={46} height={10} fill={colors.primary} />
    <Rect x={6} y={18} width={14} height={10} fill="#CC0000" />
    <Rect x={13} y={18} width={7} height={10} fill="white" />
    <SvgText x={8} y={26} fontSize={6} fill="white" fontWeight="bold">NC</SvgText>
    <Line x1={24} y1={20} x2={42} y2={20} stroke={colors.primary} strokeWidth={2} strokeLinecap="round" opacity={0.3} />
    <Line x1={24} y1={26} x2={38} y2={26} stroke={colors.primary} strokeWidth={2} strokeLinecap="round" opacity={0.3} />
  </Svg>
);

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
}) => {
  const menuScrollRef = useRef<ScrollView>(null);

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
      "This will clear all app data and reset to initial state. Sample data will be hidden.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await AsyncStorage.setItem("sampleDataSuppressed", "true");
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

  const handleToggleSampleData = async () => {
    try {
      const suppressed = await AsyncStorage.getItem("sampleDataSuppressed");
      const isCurrentlySuppressed = suppressed === "true";
      Alert.alert(
        "Sample Data",
        `Sample data is currently ${isCurrentlySuppressed ? "HIDDEN" : "VISIBLE"}.\n\nWould you like to ${isCurrentlySuppressed ? "show" : "hide"} sample data?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: isCurrentlySuppressed ? "Show Sample Data" : "Hide Sample Data",
            onPress: async () => {
              if (isCurrentlySuppressed) {
                await AsyncStorage.removeItem("sampleDataSuppressed");
              } else {
                await AsyncStorage.setItem("sampleDataSuppressed", "true");
              }
              Alert.alert("Success", `Sample data is now ${isCurrentlySuppressed ? "VISIBLE" : "HIDDEN"}.`);
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to toggle sample data");
    }
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
            <Text style={styles.appTitleText}>Fish Report</Text>
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
            <View style={styles.profileAvatar}>
              <AnglerAvatarIcon />
              {pendingAuth && (
                <Animated.View style={[styles.profileBadge, { transform: [{ scale: badgeScale }] }]}>
                  <Animated.View style={[styles.profileBadgeDot, { borderColor: badgeBorderColor }]} />
                </Animated.View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{SCREEN_LABELS.profile.title}</Text>
              <Text style={styles.profileSubtitle}>
                {isSignedIn ? SCREEN_LABELS.profile.subtitle : 'Sign in'}
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
            label="Help"
            onPress={() => Alert.alert("Help", "Help would open here")}
            iconBgColor="#E8F5F4"
            iconColor={colors.primary}
          />

          <MenuItem
            icon="message-square"
            label="Send Feedback"
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
                icon="database"
                label="Toggle Sample Data"
                onPress={handleToggleSampleData}
                iconBgColor="#E3F2FD"
                iconColor="#1976D2"
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
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Privacy</Text>
            <Text style={styles.footerLink}>Terms</Text>
            <Text style={styles.footerLink}>About</Text>
          </View>
          <Text style={styles.versionText}>Version 1.0.0</Text>
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
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  footerLink: {
    fontSize: 11,
    color: '#888888',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#bbbbbb',
    marginTop: 6,
  },
});

export default DrawerMenu;
