// styles/homeScreenStyles.ts
import { StyleSheet, Dimensions, ViewStyle, TextStyle, ImageStyle, Platform, StatusBar } from 'react-native';
import { colors, spacing, borderRadius, shadows, typography } from './common';

const { width } = Dimensions.get('window');
export const menuWidth = width * 0.85; // Increased menu width for better text fit

interface HomeScreenStyles {
  container: ViewStyle;
  header: ViewStyle;
  menuButton: ViewStyle;
  logo: ImageStyle;
  title: TextStyle;
  subtitle: TextStyle;
  content: ViewStyle;
  licenseCardContainer: ViewStyle;
  licenseCard: ViewStyle;
  licenseHeader: ViewStyle;
  licenseIcon: ImageStyle;
  licenseTitle: TextStyle;
  licenseSubtitle: TextStyle;
  buttonContainer: ViewStyle;
  button: ViewStyle;
  buttonText: TextStyle;
  actionButton: ViewStyle;
  actionIconContainer: ViewStyle;
  actionButtonText: TextStyle;
  infoContainer: ViewStyle;
  infoTitle: TextStyle;
  infoText: TextStyle;
  checkListContainer: ViewStyle;
  checkItem: ViewStyle;
  checkIcon: ViewStyle;
  checkImage: ImageStyle;
  checkText: TextStyle;
  gotItButton: ViewStyle;
  gotItButtonText: TextStyle;
  menu: ViewStyle;
  menuContent: ViewStyle;
  menuHeader: ViewStyle;
  closeButton: ViewStyle;
  menuTitle: TextStyle;
  menuItems: ViewStyle;
  menuItemsContent: ViewStyle;
  menuItem: ViewStyle;
  menuItemIcon: ViewStyle;
  menuItemText: TextStyle;
  menuSectionTitle: TextStyle;
  menuDivider: ViewStyle;
  overlay: ViewStyle;
}

const homeScreenStyles = StyleSheet.create<HomeScreenStyles>({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingTop: 0,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 
      (StatusBar.currentHeight || 0) + spacing.xxl : 
      spacing.xxl + spacing.lg, // iOS needs more padding to avoid notch area
    paddingBottom: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    ...shadows.none,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRightSection: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  headerTextSection: {
    marginLeft: spacing.sm,
  },
  greetingContainer: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    ...shadows.medium,
  },
  greetingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  userNameText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.white,
  },
  menuButton: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.md,
    zIndex: 10,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    opacity: 0.9,
    borderRadius: 22, // Make the logo itself rounded
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
    paddingBottom: 0,
  },
  licenseCardContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  licenseCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.medium,
  },
  licenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licenseIcon: {
    width: 44,
    height: 44,
    marginRight: spacing.sm,
  },
  licenseTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: spacing.xxs,
  },
  licenseSubtitle: {
    fontSize: 14,
    color: colors.darkGray,
  },
  buttonContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.medium,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
    padding: spacing.sm,
  },
  actionIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  infoContainer: {
    backgroundColor: colors.card,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...shadows.small,
  },
  infoTitle: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.darkGray,
    marginBottom: spacing.md,
  },
  checkListContainer: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    paddingVertical: 2,
  },
  checkIcon: {
    width: 24,
    height: 24,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkImage: {
    width: 24,
    height: 24,
    marginRight: spacing.sm,
  },
  checkText: {
    ...typography.body,
    color: colors.darkGray,
    marginLeft: spacing.sm,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  learnMoreButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  gotItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    ...shadows.small,
  },
  gotItButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: menuWidth,
    zIndex: 100,
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 15,
  },
  menuContent: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingTop: 0,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 
      (StatusBar.currentHeight || 0) + spacing.xxl : 
      spacing.xxl + spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0,
    backgroundColor: colors.primary,
    ...shadows.medium,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  menuItems: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  menuItemsContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl + 34, // Extra padding for bottom safe area
    paddingTop: spacing.md,
    alignItems: 'center', // Center menu items horizontally
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0,
    marginHorizontal: spacing.sm,
    marginVertical: 4, // Increased vertical spacing
    borderRadius: borderRadius.md,
    width: '92%', // Slightly reduced width for better centering
    height: 56, // Fixed height for consistent look
    backgroundColor: 'rgba(0,0,0,0.02)', // Very subtle background for better visibility
  },
  menuItemIcon: {
    width: 32, // Slightly smaller icons
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // Prevent icon from shrinking
  },
  menuItemText: {
    fontSize: 15.5, // Increased font size for better readability
    fontWeight: '500', // Slightly bolder to make text more prominent
    marginLeft: spacing.md,
    color: colors.textPrimary,
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap', // Allow text to wrap if needed
    maxWidth: '75%', // Limit text width to ensure it doesn't overflow
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start', // Align to left edge
    paddingHorizontal: spacing.md, // Match menu item padding
    marginLeft: spacing.md, // Align with menu items
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: spacing.md,
    marginHorizontal: spacing.xl,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    zIndex: 50,
  },
});

export default homeScreenStyles;