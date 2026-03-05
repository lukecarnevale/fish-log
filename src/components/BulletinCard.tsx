// components/BulletinCard.tsx
//
// Non-blocking bulletin card for the HomeScreen.
// Displays a collapsible list of non-critical bulletins that users can
// browse at their own pace, replacing the old sequential modal flow.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/common';
import { BULLETIN_TYPE_CONFIG } from '../constants/bulletin';
import { formatBulletinDate } from '../utils/dateUtils';
import type { Bulletin } from '../types/bulletin';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// Component
// =============================================================================

/** Maximum bulletins shown inline on the HomeScreen card. */
const MAX_VISIBLE = 3;

interface BulletinCardProps {
  bulletins: Bulletin[];
  onBulletinPress: (bulletin: Bulletin) => void;
  onDismissAll: () => void;
  /** Navigate to the full Bulletins page. */
  onViewAll?: () => void;
}

const BulletinCard: React.FC<BulletinCardProps> = ({
  bulletins,
  onBulletinPress,
  onDismissAll,
  onViewAll,
}) => {
  const [expanded, setExpanded] = useState(true);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  if (bulletins.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Gradient header */}
      <TouchableOpacity onPress={onViewAll} activeOpacity={0.8}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.iconBadge}>
              <Feather name="bell" size={18} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Bulletin Board</Text>
            <TouchableOpacity
              onPress={toggleExpanded}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="rgba(255,255,255,0.8)"
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Bulletin list */}
      {expanded && (
        <View style={styles.bulletinList}>
          {bulletins.slice(0, MAX_VISIBLE).map((bulletin, index) => {
            const config = BULLETIN_TYPE_CONFIG[bulletin.bulletinType] ?? BULLETIN_TYPE_CONFIG.info;
            const visibleCount = Math.min(bulletins.length, MAX_VISIBLE);
            const isLast = index === visibleCount - 1;

            return (
              <TouchableOpacity
                key={bulletin.id}
                style={[styles.bulletinRow, !isLast && styles.bulletinRowBorder]}
                onPress={() => onBulletinPress(bulletin)}
                activeOpacity={0.6}
              >
                {/* Colored left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: config.color }]} />

                <View style={styles.bulletinContent}>
                  <View style={styles.bulletinText}>
                    {/* Type badge */}
                    <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
                      <Feather name={config.icon} size={10} color={config.color} />
                      <Text style={[styles.typeBadgeText, { color: config.color }]}>
                        {config.label}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.bulletinTitle} numberOfLines={2}>
                      {bulletin.title}
                    </Text>

                    {/* Date range */}
                    {(bulletin.effectiveDate || bulletin.expirationDate) && (
                      <Text style={styles.bulletinDate}>
                        {bulletin.effectiveDate && bulletin.expirationDate
                          ? `${formatBulletinDate(bulletin.effectiveDate)} – ${formatBulletinDate(bulletin.expirationDate)}`
                          : bulletin.effectiveDate
                            ? `From ${formatBulletinDate(bulletin.effectiveDate)}`
                            : `Until ${formatBulletinDate(bulletin.expirationDate!)}`}
                      </Text>
                    )}
                  </View>

                  {/* Tap chevron */}
                  <Feather name="chevron-right" size={16} color={colors.lightGray} />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Footer actions row */}
          <View style={styles.footerRow}>
            {onViewAll && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={onViewAll}
                activeOpacity={0.7}
              >
                <Feather name="list" size={13} color={colors.primary} />
                <Text style={styles.viewAllText}>View All Bulletins</Text>
                <Feather name="chevron-right" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.dismissAllButton}
              onPress={onDismissAll}
              activeOpacity={0.7}
            >
              <Feather name="check-circle" size={13} color={colors.textTertiary} />
              <Text style={styles.dismissAllText}>Dismiss All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.pearlWhite,
    borderRadius: 16,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.medium,
    overflow: 'hidden',
  } as any,

  // --- Header ---
  headerGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.white,
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // --- Bulletin list ---
  bulletinList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  bulletinRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.sm,
  },
  bulletinRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  bulletinContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletinText: {
    flex: 1,
    marginRight: spacing.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.circle,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: 3,
  },
  bulletinTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 20,
  },
  bulletinDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // --- Footer actions ---
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  viewAllText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  dismissAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.textTertiary}10`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  dismissAllText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});

export default BulletinCard;
