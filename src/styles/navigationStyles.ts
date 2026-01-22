// styles/navigationStyles.ts
import { StackNavigationOptions } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { colors, spacing, shadows } from './common';
import { Platform, Image } from 'react-native';

interface NavigationStyles {
  screenOptions: StackNavigationOptions;
  modalScreenOptions: StackNavigationOptions;
  modernHeaderOptions: StackNavigationOptions;
}

export const navigationStyles: NavigationStyles = {
  screenOptions: {
    headerStyle: {
      backgroundColor: colors.primary,
      elevation: 4,  // Android shadow
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      height: Platform.OS === 'ios' ? 96 : 56, // Taller header on iOS
      borderBottomWidth: 0,
    },
    headerTintColor: colors.white,
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
      letterSpacing: 0.5,
    },
    headerTitleAlign: 'center',
    // The following styles are for the screen content area
    cardStyle: {
      backgroundColor: colors.background,
    },
    // Add subtle animation between screens
    ...TransitionPresets.SlideFromRightIOS,
  },
  // Modern header style with consistent back button
  modernHeaderOptions: {
    headerStyle: {
      backgroundColor: colors.primary,
      elevation: 0, // Android
      shadowOpacity: 0, // iOS
      borderBottomWidth: 0,
      height: 110, // Taller header
    },
    headerTitleStyle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 0.5,
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    headerTitleAlign: 'center',
    headerBackTitleVisible: false,
    headerLeftContainerStyle: {
      paddingLeft: 8,
    },
  },
  // Special options for modals
  modalScreenOptions: {
    headerStyle: {
      backgroundColor: colors.white,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTintColor: colors.primary,
    headerTitleStyle: {
      fontWeight: '600',
      color: colors.black,
    },
    ...TransitionPresets.ModalPresentationIOS,
    cardStyle: {
      backgroundColor: colors.background,
    },
  },
};