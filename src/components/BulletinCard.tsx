// components/BulletinCard.tsx
//
// Non-blocking bulletin card for the HomeScreen.
// Displays a collapsible list of non-critical bulletins using a warm
// parchment aesthetic that differentiates it from the MHR card.

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
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { spacing } from '../styles/common';
import { formatBulletinDate } from '../utils/dateUtils';
import { BULLETIN_TYPE_CONFIG } from '../constants/bulletin';
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

  const subtitle = `${bulletins.length} active update${bulletins.length === 1 ? '' : 's'}`;

  return (
    <View style={styles.container}>
      {/* Parchment gradient background for the whole card */}
      <LinearGradient
        colors={['#FEF9F0', '#FDF6E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.8}>
        <View style={styles.headerWrapper}>
          {/* Amber gradient */}
          <LinearGradient
            colors={['#8B6331', '#44300A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Dot pattern overlay via react-native-svg */}
          <Svg
            width="100%"
            height="100%"
            style={[StyleSheet.absoluteFill, { opacity: 0.06 }]}
          >
            <Defs>
              <Pattern
                id="bulletinDots"
                x="0"
                y="0"
                width="12"
                height="12"
                patternUnits="userSpaceOnUse"
              >
                <Circle cx="6" cy="6" r="1" fill="#78350F" />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#bulletinDots)" />
          </Svg>

          {/* Content row — renders above the absolute layers */}
          <View style={styles.headerContent}>
            {/* Boxed bell icon */}
            <View style={styles.iconBox}>
              <Feather name="bell" size={22} color="#F5E6C8" />
            </View>

            {/* Title + subtitle */}
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>Bulletin Board</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>

            {/* Collapse chevron */}
            <Feather
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#E8C98A"
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Bulletin list ──────────────────────────────────────────────────── */}
      {expanded && (
        <>
          <View style={styles.bulletinList}>
            {bulletins.slice(0, MAX_VISIBLE).map((bulletin) => {
              const cfg = BULLETIN_TYPE_CONFIG[bulletin.bulletinType];

              return (
                <TouchableOpacity
                  key={bulletin.id}
                  style={styles.bulletinCard}
                  onPress={() => onBulletinPress(bulletin)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bulletinCardBody}>
                    {/* Category badge */}
                    <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
                      <Feather name={cfg.icon} size={10} color={cfg.color} style={styles.badgeIcon} />
                      <Text style={[styles.badgeText, { color: cfg.color }]}>
                        {cfg.label}
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

                  <Feather name="chevron-right" size={16} color="#C9B68E" />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Footer buttons ─────────────────────────────────────────────── */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.dismissButton, !onViewAll && { flex: 1 }]}
              onPress={onDismissAll}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissText}>Dismiss All</Text>
            </TouchableOpacity>
            {onViewAll && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={onViewAll}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All Bulletins</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // --- Card shell ---
  container: {
    borderRadius: 16,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  } as any,

  // --- Header ---
  headerWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(245,230,200,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FBF5EA',
    lineHeight: 24,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#E8C98A',
    marginTop: 2,
    textAlign: 'center',
  },

  // --- Bulletin items ---
  bulletinList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bulletinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE3D0',
    padding: 14,
    marginBottom: 8,
  },
  bulletinCardBody: {
    flex: 1,
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  badgeIcon: {
    marginRight: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bulletinTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#44300A',
    fontFamily: 'Georgia',
    lineHeight: 21,
    marginBottom: 4,
  },
  bulletinDate: {
    fontSize: 13,
    color: '#A3865A',
  },

  // --- Footer ---
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  viewAllButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EA580C',
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D4C5A9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355',
  },
});

export default BulletinCard;
