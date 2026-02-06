// styles/homeScreenLocalStyles.ts

import { StyleSheet, ViewStyle, TextStyle, Platform, StatusBar, Dimensions } from 'react-native';
import { colors, spacing, borderRadius } from './common';

interface HomeScreenLocalStyles {
  fixedHeader: ViewStyle;
  scrollView: ViewStyle;
  scrollViewContent: ViewStyle;
  headerSpacer: ViewStyle;
  spacerMenuArea: ViewStyle;
  contentContainer: ViewStyle;
  floatingMenuButton: ViewStyle;
  floatingMenuTouchable: ViewStyle;
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
    fontSize: 10,
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
});
