// components/LicenseCard.tsx
//
// License preview card for the HomeScreen. Shows license type, number,
// expiry date, and an "Active" pill when the license hasn't expired.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { NCFlagIcon } from './NCFlagIcon';
import { spacing, borderRadius, shadows } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { SCREEN_LABELS } from '../constants/screenLabels';

interface LicenseCardProps {
  licenseNumber: string | null;
  licenseType: string | null;
  expiryDate: string | null;
  onPress: () => void;
}

/**
 * Format an expiry date string (YYYY-MM-DD or ISO) to MM/YY.
 */
function formatExpiry(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}

/**
 * Strip "Fishing License" from a license type name for compact display.
 * e.g. "Annual Coastal Recreational Fishing License" → "Annual Coastal Recreational"
 */
function cleanLicenseType(type: string): string {
  return type.replace(/\s*fishing\s*license\s*/i, ' ').trim();
}

/**
 * Check if a license expiry date is still current (not expired).
 */
function isActive(expiryDate: string): boolean {
  return new Date(expiryDate + 'T23:59:59') >= new Date();
}

const LicenseCard: React.FC<LicenseCardProps> = ({
  licenseNumber,
  licenseType,
  expiryDate,
  onPress,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <NCFlagIcon width={56} height={36} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            {licenseNumber ? (
              <>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {licenseType
                    ? cleanLicenseType(licenseType)
                    : SCREEN_LABELS.fishingLicense.title}
                </Text>
                <Text style={styles.licenseNumber}>#{licenseNumber}</Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>{SCREEN_LABELS.fishingLicense.title}</Text>
                <Text style={styles.subtitle}>Tap to edit or view license details</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.rightSection}>
          <View style={styles.statusColumn}>
            {expiryDate && isActive(expiryDate) && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Active</Text>
              </View>
            )}
            {expiryDate && (
              <Text style={styles.expiry}>
                Exp. {formatExpiry(expiryDate)}
              </Text>
            )}
          </View>
          <Feather name="chevron-right" size={24} color={theme.colors.textOnPrimary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  gradient: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.textOnPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  // Matches the filled FishingLicenseScreen card: embossed monospace number
  // in champagne gold, with a subtle text shadow for a premium, tactile feel.
  // Dark mode bumps the gold slightly brighter to preserve contrast against
  // the lighter dark-mode gradient top.
  licenseNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.isDark ? '#F3D997' : '#E8D18C',
    letterSpacing: 2.5,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusColumn: {
    alignItems: 'center',
    marginRight: 8,
  },
  expiry: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
  activePill: {
    backgroundColor: 'hsla(142, 71%, 45%, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textOnPrimary,
    letterSpacing: 0.3,
  },
});

export default React.memo(LicenseCard);
