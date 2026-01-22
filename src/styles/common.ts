// styles/common.ts - Modern UI style system for the app

import { StyleSheet, TextStyle, ViewStyle, ImageStyle, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Define interfaces for type safety
export interface Colors {
  // Primary brand colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Secondary colors
  secondary: string;
  secondaryLight: string;
  
  // Accent colors
  accent: string;
  
  // Status colors
  success: string;
  warning: string;
  warningLight: string;
  error: string;
  danger: string;
  dangerLight: string;
  info: string;
  
  // Neutrals
  white: string;
  background: string;
  card: string;
  lightGray: string;
  lightestGray: string;
  mediumGray: string;
  darkGray: string;
  black: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  
  // Utility colors
  border: string;
  divider: string;
  overlay: string;
  shadow: string;
  transparent: string;
  
  // Ocean-specific colors
  oceanDeep: string;
  oceanSurface: string;
  sandyShore: string;
  coralAccent: string;
  seaweedGreen: string;
  pearlWhite: string;
  seafoamGreen: string;
}

export interface Spacing {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  screenHorizontal: number;
  screenVertical: number;
}

export interface BorderRadius {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  circle: number;
}

export interface Typography {
  largeTitle: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  heading: TextStyle;
  subheading: TextStyle;
  body: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  buttonText: TextStyle;
  buttonTextSmall: TextStyle;
  sectionTitle: TextStyle;
  // Additional typography styles used in screens
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  button: TextStyle;
}

export interface Shadows {
  none: ViewStyle;
  small: ViewStyle;
  medium: ViewStyle;
  large: ViewStyle;
}

export interface Layouts {
  container: ViewStyle;
  safeContainer: ViewStyle;
  section: ViewStyle;
  row: ViewStyle;
  column: ViewStyle;
  centered: ViewStyle;
  spaceBetween: ViewStyle;
}

export interface Buttons {
  primary: ViewStyle;
  secondary: ViewStyle;
  outline: ViewStyle;
  text: ViewStyle;
  success: ViewStyle;
  warning: ViewStyle;
  error: ViewStyle;
  disabled: ViewStyle;
  icon: ViewStyle;
  fab: ViewStyle;
  primaryText: TextStyle;
  secondaryText: TextStyle;
  outlineText: TextStyle;
  textButtonText: TextStyle;
  successText: TextStyle;
  warningText: TextStyle;
  errorText: TextStyle;
  disabledText: TextStyle;
}

export interface Forms {
  input: TextStyle;
  inputFocused: ViewStyle;
  inputError: ViewStyle;
  select: ViewStyle;
  label: TextStyle;
  errorText: TextStyle;
  helpText: TextStyle;
  formGroup: ViewStyle;
  switch: ViewStyle;
  checkbox: ViewStyle;
}

export interface Cards {
  basic: ViewStyle;
  elevated: ViewStyle;
  highlighted: ViewStyle;
  interactive: ViewStyle;
  info: ViewStyle;
  success: ViewStyle;
  warning: ViewStyle;
  error: ViewStyle;
}

// Define colors with realistic ocean-themed palette (enhanced skeuomorphic style)
export const colors: Colors = {
  // Primary brand colors - deep ocean blue shades
  primary: '#0B548B',     // Deep ocean blue (slightly more realistic)
  primaryDark: '#063A5D', // Deep sea blue (richer undertone)
  primaryLight: '#C3E0F7', // Light ocean surface blue (more natural)
  
  // Secondary colors - coastal water tones
  secondary: '#06747F',   // Deeper teal/aqua accent (like coastal waters)
  secondaryLight: '#A2E5EF', // Light aqua (with more saturation)
  
  // Accent color
  accent: '#FF7F25',      // Richer sunset orange/coral for highlights
  
  // Status colors
  success: '#2E7D4B',     // Natural seaweed green
  warning: '#F9A825',     // Life jacket yellow
  warningLight: '#FFF8E1', // Light amber background
  error: '#D32F2F',       // Buoy red
  danger: '#D32F2F',      // Same as error for compatibility
  dangerLight: '#FFEBEE', // Light red background
  info: '#1A7AAD',        // Natural ocean blue
  
  // Neutral colors
  white: '#FFFFFF',
  background: '#E5F4FF',  // Subtle watery background (slightly more blue)
  card: '#FFFFFF',
  lightGray: '#E1F5FE',   // Light blue-gray
  lightestGray: '#F0F8FF', // Lightest blue tint
  mediumGray: '#B0BEC5',  // Blue-gray
  darkGray: '#546E7A',    // Darker blue-gray
  black: '#263238',       // Nearly black with blue undertone
  
  // Text colors
  textPrimary: '#263238',    // Same as black
  textSecondary: '#546E7A',  // Same as darkGray
  textTertiary: '#78909C',   // Medium blue-gray for placeholders
  
  // Utility colors
  border: '#B2DEF9',        // Realistic water edge color
  divider: '#D6EBF7',       // Very light blue divider (more realistic)
  overlay: 'rgba(3, 37, 65, 0.5)', // Deep water overlay
  shadow: 'rgba(7, 52, 94, 0.22)', // Deeper blue-tinted shadow (more substantial)
  transparent: 'transparent',
  
  // Additional ocean-specific colors
  oceanDeep: '#042C5C',      // Deep ocean abyss color
  oceanSurface: '#85C5E5',   // Surface water blue
  sandyShore: '#F5DEB3',     // Sandy shore color
  coralAccent: '#FF7F50',    // Coral accent for highlights
  seaweedGreen: '#2E8B57',   // Seaweed green
  pearlWhite: '#F5F7F8',     // Pearl/shell white
  seafoamGreen: '#71EEB8',   // Seafoam green accent
};

// Define spacing scale
export const spacing: Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenHorizontal: 16,
  screenVertical: 24,
};

// Define border radius
export const borderRadius: BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  circle: 9999,
};

// Define typography with modern sizing and weights
export const typography: Typography = {
  largeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.black,
    letterSpacing: 0.25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    letterSpacing: 0.15,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
    letterSpacing: 0.15,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    letterSpacing: 0.1,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal',
    color: colors.darkGray,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal',
    color: colors.darkGray,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.darkGray,
    letterSpacing: 0.4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonTextSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 0.75,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    letterSpacing: 0.1,
  },
  // Additional typography styles used in screens
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.black,
    letterSpacing: 0.25,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.black,
    letterSpacing: 0.15,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.15,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.1,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 0.75,
  },
};

// Define enhanced shadows for skeuomorphic depth
export const shadows: Shadows = {
  none: {},
  small: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 2.0,
    },
    android: {
      elevation: 3,
    },
    default: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 2.0,
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4.0,
    },
    android: {
      elevation: 5,
    },
    default: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4.0,
    },
  }),
  large: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 6.5,
    },
    android: {
      elevation: 10,
    },
    default: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 6.5,
    },
  }),
};

// Define layouts with enhanced ocean-themed styles
export const layout = StyleSheet.create<Layouts>({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenHorizontal,
  },
  section: {
    backgroundColor: colors.pearlWhite,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.oceanSurface, // Water-like border
    borderTopColor: 'rgba(255, 255, 255, 0.85)', // Pearl-like highlight
    borderRightColor: 'rgba(178, 222, 249, 0.7)', // Realistic water edge
    borderLeftColor: 'rgba(178, 222, 249, 0.7)', // Realistic water edge
    borderBottomColor: 'rgba(6, 58, 93, 0.15)', // Deep water shadow
    borderBottomWidth: 2,
    ...shadows.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  column: {
    flexDirection: 'column',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

// Define enhanced ocean-themed button styles
export const buttons = StyleSheet.create<Buttons>({
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderTopColor: 'rgba(195, 224, 247, 0.6)', // Light water highlight
    borderBottomWidth: 3,
    borderBottomColor: colors.oceanDeep, // Deep ocean color for depth
    ...shadows.small,
  },
  secondary: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#055963', // Deeper teal
    borderTopColor: 'rgba(162, 229, 239, 0.6)', // Light aqua highlight
    borderBottomWidth: 3,
    borderBottomColor: '#033E45', // Very deep teal for depth
    ...shadows.small,
  },
  outline: {
    backgroundColor: 'rgba(240, 248, 255, 0.7)', // Translucent water surface
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderTopColor: 'rgba(255, 255, 255, 0.8)', // Pearl-like highlight
    borderBottomColor: colors.oceanDeep, // Deep ocean color
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    ...shadows.small,
  },
  text: {
    backgroundColor: colors.transparent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  success: {
    backgroundColor: colors.seaweedGreen,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#1A693C', // Deeper seaweed green
    borderTopColor: 'rgba(113, 238, 184, 0.4)', // Light seafoam highlight
    borderBottomWidth: 3,
    borderBottomColor: '#0E4425', // Very deep seaweed green
    ...shadows.small,
  },
  warning: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#F57F17', // Darker amber
    borderTopColor: 'rgba(255, 236, 179, 0.7)', // Light sand highlight
    borderBottomWidth: 3,
    borderBottomColor: '#C26401', // Deep amber
    ...shadows.small,
  },
  error: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#B71C1C', // Darker red
    borderTopColor: 'rgba(255, 205, 210, 0.5)', // Light red highlight
    borderBottomWidth: 3,
    borderBottomColor: '#7F0000', // Very deep red
    ...shadows.small,
  },
  disabled: {
    backgroundColor: colors.mediumGray,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#90A4AE', // Blue-gray border
    borderTopColor: 'rgba(236, 239, 241, 0.6)', // Light highlight
    borderBottomWidth: 2,
    borderBottomColor: '#455A64', // Darker gray
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.pearlWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.oceanSurface,
    borderTopColor: 'rgba(255, 255, 255, 0.9)', // Pearl-like highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.2)', // Deep shadow
    ...shadows.small,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderTopColor: 'rgba(195, 224, 247, 0.6)', // Light highlight
    borderBottomColor: colors.oceanDeep, // Deep shadow
    ...shadows.medium,
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  secondaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  outlineText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  textButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  successText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  warningText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  disabledText: {
    color: colors.darkGray,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

// Define enhanced ocean-themed form styles
export const forms: Forms = {
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.oceanSurface,
    borderTopColor: 'rgba(255, 255, 255, 0.9)', // Pearl-like highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.15)', // Deep water shadow
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.pearlWhite,
    marginBottom: spacing.md,
    color: colors.black,
    fontSize: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  } as TextStyle,
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    borderTopColor: 'rgba(195, 224, 247, 0.8)', // Light water highlight
    borderBottomColor: colors.primary,
    backgroundColor: 'rgba(225, 245, 254, 0.25)', // Light blue water tint
    ...shadows.small,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
    borderTopColor: 'rgba(255, 205, 210, 0.5)', // Light red highlight
    borderBottomColor: '#7F0000', // Very deep red
    backgroundColor: 'rgba(255, 235, 238, 0.2)', // Very light red tint
  },
  select: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.oceanSurface,
    borderTopColor: 'rgba(255, 255, 255, 0.9)', // Pearl-like highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.15)', // Deep water shadow
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.pearlWhite,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: colors.darkGray,
    letterSpacing: 0.25,
    textShadowColor: 'rgba(255, 255, 255, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  } as TextStyle,
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  } as TextStyle,
  helpText: {
    fontSize: 13,
    color: colors.darkGray,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  } as TextStyle,
  formGroup: {
    marginBottom: spacing.lg,
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    padding: spacing.xs,
    backgroundColor: 'rgba(225, 245, 254, 0.2)', // Very light blue tint
    borderRadius: borderRadius.sm,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    padding: spacing.xs,
    backgroundColor: 'rgba(225, 245, 254, 0.15)', // Very light blue tint
    borderRadius: borderRadius.sm,
  }
};

// Define enhanced realistic ocean-themed card styles
export const cards = StyleSheet.create<Cards>({
  basic: {
    backgroundColor: colors.pearlWhite,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.oceanSurface, // Water-like border
    borderTopColor: 'rgba(255, 255, 255, 0.85)', // Pearl-like highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.15)', // Deep water shadow
    ...shadows.small,
  },
  elevated: {
    backgroundColor: colors.pearlWhite,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.oceanSurface, // Water-like border
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.9)', // Pearl-like highlight
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(6, 58, 93, 0.2)', // Deep water shadow
    ...shadows.medium,
  },
  highlighted: {
    backgroundColor: colors.pearlWhite,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.oceanSurface, // Water-like border
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderTopColor: 'rgba(255, 255, 255, 0.85)', // Pearl-like highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.15)', // Deep water shadow
    ...shadows.small,
  },
  interactive: {
    backgroundColor: colors.pearlWhite,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.oceanSurface, // Water-like border
    borderBottomWidth: 3,
    borderBottomColor: colors.oceanDeep,
    borderTopColor: 'rgba(255, 255, 255, 0.9)', // Pearl-like highlight
    ...shadows.small,
  },
  info: {
    backgroundColor: 'rgba(195, 224, 247, 0.7)', // Translucent ocean surface
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.oceanSurface, // Blue water border
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    borderTopColor: 'rgba(255, 255, 255, 0.7)', // Subtle highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.15)', // Deep water shadow
    ...shadows.small,
  },
  success: {
    backgroundColor: 'rgba(46, 125, 75, 0.1)', // Translucent seaweed green
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 75, 0.3)', // Seaweed green border
    borderLeftWidth: 4,
    borderLeftColor: colors.seaweedGreen,
    borderTopColor: 'rgba(255, 255, 255, 0.7)', // Subtle highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.12)', // Deep water shadow
    ...shadows.small,
  },
  warning: {
    backgroundColor: 'rgba(249, 168, 37, 0.08)', // Light amber/sand background
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(249, 168, 37, 0.25)', // Sand/amber border
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderTopColor: 'rgba(255, 255, 255, 0.7)', // Subtle highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.1)', // Subtle shadow
    ...shadows.small,
  },
  error: {
    backgroundColor: 'rgba(211, 47, 47, 0.08)', // Very light danger buoy red
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.25)', // Light red border
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    borderTopColor: 'rgba(255, 255, 255, 0.7)', // Subtle highlight
    borderBottomColor: 'rgba(6, 58, 93, 0.1)', // Subtle shadow
    ...shadows.small,
  },
});

// Export common styles
export const commonStyles = {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  layout,
  buttons,
  forms,
  cards,
};