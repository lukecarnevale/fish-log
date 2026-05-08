// components/LogCatchSignInGate.tsx
//
// Sign-in gate shown in place of the catch_log form body when the current user
// is not a rewards member. Mirrors the gating pattern used by CatchFeedScreen
// and PastReportsScreen (QuickActionCard lock overlay on the home screen),
// but because ReportFormScreen is reachable via the unlocked DMF "Report
// Catch" action, the gate has to live inside the screen rather than at the
// home grid level.
//
// The DMF harvest_report mode remains accessible to anonymous users — this
// component is only rendered when the user has explicitly toggled to the
// catch_log tab without being signed in.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { spacing, borderRadius, typography } from '../styles/common';

interface LogCatchSignInGateProps {
  /** Invoked when the user taps the Sign In CTA. Should navigate to Profile. */
  onSignInPress: () => void;
}

const LogCatchSignInGate: React.FC<LogCatchSignInGateProps> = ({ onSignInPress }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.iconCircle}>
        <Feather name="lock" size={28} color={theme.colors.primary} />
      </View>

      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        Sign in to Log a Catch
      </Text>

      <Text style={styles.description} maxFontSizeMultiplier={1.4}>
        Log a Catch connects you to the community — sign in to share your
        catches with other anglers and see them on the Catch Feed.
      </Text>

      <Text style={styles.hint} maxFontSizeMultiplier={1.4}>
        You can still submit a mandatory harvest report without signing in —
        switch to the Harvest Report tab above.
      </Text>

      <TouchableOpacity
        style={styles.buttonWrap}
        onPress={onSignInPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Sign in to unlock Log a Catch"
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Feather name="log-in" size={18} color={theme.colors.textOnPrimary} />
          <Text style={styles.buttonText} maxFontSizeMultiplier={1.2}>
            Sign In
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.white,
      borderRadius: borderRadius.lg,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.lg,
      alignItems: 'center',
      // Match the ocean-themed card style used elsewhere in the form.
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primaryLight ?? 'rgba(11, 84, 139, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: typography.title.fontSize,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    description: {
      fontSize: typography.body.fontSize,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    hint: {
      fontSize: typography.caption.fontSize,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: spacing.lg,
      fontStyle: 'italic',
    },
    buttonWrap: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: spacing.lg,
      gap: 8,
      minWidth: 160,
    },
    buttonText: {
      color: theme.colors.textOnPrimary,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });

export default LogCatchSignInGate;
