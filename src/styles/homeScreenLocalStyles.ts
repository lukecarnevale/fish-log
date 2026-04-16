// styles/homeScreenLocalStyles.ts

import { StyleSheet, ViewStyle, TextStyle, Platform, StatusBar, Dimensions } from 'react-native';
import { colors, spacing, borderRadius } from './common';
import { Theme } from './theme';

interface HomeScreenLocalStyles {
  fixedHeader: ViewStyle;
  refreshSpinner: ViewStyle;
  scrollWrapper: ViewStyle;
  scrollView: ViewStyle;
  scrollViewContent: ViewStyle;
  headerSpacer: ViewStyle;
  spacerMenuArea: ViewStyle;
  contentContainer: ViewStyle;
  floatingMenuButton: ViewStyle;
  floatingMenuTouchable: ViewStyle;
  menuBulletinBadge: ViewStyle;
  menuBulletinBadgeText: TextStyle;
  floatingBulletinBadge: ViewStyle;
  floatingBulletinBadgeText: TextStyle;
  footerContainer: ViewStyle;
  footerBottomArea: ViewStyle;
  hamburgerBadge: ViewStyle;
  hamburgerBadgeDot: ViewStyle;
  floatingBadge: ViewStyle;
  floatingBadgeDot: ViewStyle;
  welcomeCard: ViewStyle;
  welcomeGreeting: ViewStyle;
  welcomeGreetingIcon: ViewStyle;
  welcomeGreetingText: ViewStyle;
  welcomeGreetingLine: TextStyle;
  welcomeUserName: TextStyle;
  welcomeRewardsSection: ViewStyle;
  welcomeRewardsSectionWithGreeting: ViewStyle;
  welcomeRewardsIcon: ViewStyle;
  welcomeRewardsContent: ViewStyle;
  welcomeRewardsTitle: TextStyle;
  welcomeRewardsEmail: TextStyle;
  welcomeJoinRewards: ViewStyle;
  welcomeJoinIcon: ViewStyle;
  welcomeJoinText: TextStyle;
  achievementIconsRow: ViewStyle;
  achievementIconBadge: ViewStyle;
  achievementCountBadge: ViewStyle;
  achievementCountText: TextStyle;
  licenseCardGradient: ViewStyle;
  licenseTitleWhite: TextStyle;
  licenseSubtitleWhite: TextStyle;
  licenseActivePill: ViewStyle;
  licenseActivePillText: TextStyle;
}

export const localStyles = StyleSheet.create<HomeScreenLocalStyles>({
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
  refreshSpinner: {
    position: 'absolute',
    // Position just above where the content card sits at rest
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 130 : 160,
    alignSelf: 'center',
    zIndex: 1, // Behind the scrollable content (z-index 2)
  },
  scrollWrapper: {
    flex: 1,
    zIndex: 2, // Higher z-index so content scrolls over header
    elevation: 3, // Android: elevation on a regular View controls z-ordering
  },
  scrollView: {
    flex: 1,
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
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingMenuTouchable: {
    padding: spacing.sm,
  },
  // Bulletin count badge on the hamburger menu icon in the fixed header
  menuBulletinBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.error,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  menuBulletinBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  // Bulletin count badge on the floating hamburger button
  floatingBulletinBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    backgroundColor: colors.error,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  floatingBulletinBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: colors.primary, // Match footer navy background
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
    backgroundColor: colors.badgeRed,
    borderWidth: 2,
    borderColor: colors.badgeRed,
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
    backgroundColor: colors.badgeRed,
    borderWidth: 2,
    borderColor: colors.badgeRed,
  },
  // Unified Welcome Card styles
  welcomeCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
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
    padding: spacing.md,
  },
  welcomeGreetingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
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
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
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
    marginRight: spacing.xs,
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  // License card gradient styles
  licenseCardGradient: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
  licenseActivePill: {
    backgroundColor: 'hsla(142, 71%, 45%, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  licenseActivePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
});

// Theme-aware factory function
export const createHomeScreenStyles = (theme: Theme) =>
  StyleSheet.create<HomeScreenLocalStyles>({
    fixedHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.primary,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 60,
      paddingBottom: 20,
      zIndex: 1,
    },
    refreshSpinner: {
      position: 'absolute',
      top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 130 : 160,
      alignSelf: 'center',
      zIndex: 1,
    },
    scrollWrapper: {
      flex: 1,
      zIndex: 2,
      elevation: 3,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 0,
    },
    headerSpacer: {
      height: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 100 : 130,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      backgroundColor: 'transparent',
    },
    spacerMenuArea: {
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 24 : 60,
      paddingRight: 16,
    },
    contentContainer: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 16,
      minHeight: Dimensions.get('window').height,
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
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    floatingMenuTouchable: {
      padding: spacing.sm,
    },
    menuBulletinBadge: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: theme.colors.error,
      borderRadius: 11,
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    menuBulletinBadgeText: {
      color: theme.colors.white,
      fontSize: 12,
      fontWeight: '700',
    },
    floatingBulletinBadge: {
      position: 'absolute',
      top: -2,
      left: -2,
      backgroundColor: theme.colors.error,
      borderRadius: 11,
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    floatingBulletinBadgeText: {
      color: theme.colors.white,
      fontSize: 12,
      fontWeight: '700',
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
      backgroundColor: theme.colors.primary,
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
      backgroundColor: theme.colors.badgeRed,
      borderWidth: 2,
      borderColor: theme.colors.badgeRed,
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
      backgroundColor: theme.colors.badgeRed,
      borderWidth: 2,
      borderColor: theme.colors.badgeRed,
    },
    welcomeCard: {
      backgroundColor: theme.colors.secondary,
      borderRadius: borderRadius.lg,
      marginHorizontal: spacing.md,
      marginBottom: 0,
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
      padding: spacing.md,
    },
    welcomeGreetingIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    welcomeGreetingText: {
      flex: 1,
    },
    welcomeGreetingLine: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.white,
      opacity: 0.9,
    },
    welcomeUserName: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.white,
      marginVertical: 2,
    },
    welcomeRewardsSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.95)',
      padding: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    welcomeRewardsSectionWithGreeting: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.3)',
    },
    welcomeRewardsIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.secondaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.xs,
    },
    welcomeRewardsContent: {
      flex: 1,
    },
    welcomeRewardsTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    welcomeRewardsEmail: {
      fontSize: 11,
      color: theme.colors.textSecondary,
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
      color: theme.colors.white,
    },
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
      backgroundColor: theme.colors.primary,
    },
    achievementCountText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.white,
    },
    licenseCardGradient: {
      borderRadius: borderRadius.md,
      padding: spacing.md,
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
      color: theme.colors.white,
      marginBottom: 2,
    },
    licenseSubtitleWhite: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.85)',
    },
    licenseActivePill: {
      backgroundColor: 'hsla(142, 71%, 45%, 0.5)',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      marginRight: 8,
    },
    licenseActivePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.white,
      letterSpacing: 0.3,
    },
  });
