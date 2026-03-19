// components/promotions/PartnerCTACard.tsx
//
// "Partner With Us" call-to-action card displayed at the bottom
// of the Promotions Hub list. Invites businesses to inquire about
// advertising on NC Fish Log.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../styles/common';

interface PartnerCTACardProps {
  onPress: () => void;
}

const PartnerCTACard: React.FC<PartnerCTACardProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Partner With Us. Reach thousands of NC anglers through the app."
      accessibilityHint="Double tap to open the partner inquiry form"
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="briefcase" size={24} color={colors.white} />
        </View>

        <View style={styles.textContent}>
          <Text style={styles.title}>Partner With Us</Text>
          <Text style={styles.subtitle}>
            Own a charter, bait shop, or fishing brand? Reach thousands of NC anglers through the app.
          </Text>
        </View>

        <View style={styles.arrowContainer}>
          <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.6)" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 17,
  },
  arrowContainer: {
    padding: 4,
  },
});

export default PartnerCTACard;
