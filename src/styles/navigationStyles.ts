// styles/navigationStyles.ts
//
// Theme-aware navigation style factories.
// Used by App.tsx to configure React Navigation stack headers.

import { StackNavigationOptions } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { spacing } from './common';
import { Theme } from './theme';
import { Platform } from 'react-native';

interface NavigationStyles {
  screenOptions: StackNavigationOptions;
  modalScreenOptions: StackNavigationOptions;
  modernHeaderOptions: StackNavigationOptions;
}

/**
 * Build theme-aware navigation styles.
 * Called inside a component that has access to useTheme().
 */
export function buildNavigationStyles(theme: Theme): NavigationStyles {
  return {
    screenOptions: {
      headerStyle: {
        backgroundColor: theme.colors.primary,
        elevation: 4,  // Android shadow
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        height: Platform.OS === 'ios' ? 96 : 56,
        borderBottomWidth: 0,
      },
      headerTintColor: theme.colors.textOnPrimary,
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
        letterSpacing: 0.5,
      },
      headerTitleAlign: 'center',
      cardStyle: {
        backgroundColor: theme.colors.background,
      },
      ...TransitionPresets.SlideFromRightIOS,
    },
    modernHeaderOptions: {
      headerStyle: {
        backgroundColor: theme.colors.primary,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
        height: 110,
      },
      headerTitleStyle: {
        fontSize: 26,
        fontWeight: '800',
        color: theme.colors.textOnPrimary,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      headerTitleAlign: 'center',
      headerBackButtonDisplayMode: 'minimal',
      headerLeftContainerStyle: {
        paddingLeft: 8,
      },
    },
    modalScreenOptions: {
      headerStyle: {
        backgroundColor: theme.colors.surfaceElevated,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      headerTintColor: theme.colors.primary,
      headerTitleStyle: {
        fontWeight: '600',
        color: theme.colors.textPrimary,
      },
      ...TransitionPresets.ModalPresentationIOS,
      cardStyle: {
        backgroundColor: theme.colors.background,
      },
    },
  };
}

// Legacy static export — kept for backward compatibility during migration.
// Components should migrate to buildNavigationStyles(theme) over time.
import { colors, shadows } from './common';

export const navigationStyles: NavigationStyles = {
  screenOptions: {
    headerStyle: {
      backgroundColor: colors.primary,
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      height: Platform.OS === 'ios' ? 96 : 56,
      borderBottomWidth: 0,
    },
    headerTintColor: colors.white,
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
      letterSpacing: 0.5,
    },
    headerTitleAlign: 'center',
    cardStyle: {
      backgroundColor: colors.background,
    },
    ...TransitionPresets.SlideFromRightIOS,
  },
  modernHeaderOptions: {
    headerStyle: {
      backgroundColor: colors.primary,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
      height: 110,
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
    headerBackButtonDisplayMode: 'minimal',
    headerLeftContainerStyle: {
      paddingLeft: 8,
    },
  },
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
