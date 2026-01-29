// components/CatchCard.tsx
//
// Premium catch card for the community feed.
// Features clean design without accent bars, glassmorphism badges,
// and polished angler section matching the ultra-premium aesthetic.

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { CatchFeedEntry, formatRelativeTime } from '../types/catchFeed';
import { colors, spacing, borderRadius } from '../styles/common';
import { getSpeciesTheme } from '../constants/speciesColors';
import CatchInfoBadge from './CatchInfoBadge';
import SpeciesPlaceholder from './SpeciesPlaceholder';

interface CatchCardProps {
  entry: CatchFeedEntry;
  onAnglerPress?: (userId: string) => void;
  onCardPress?: (entry: CatchFeedEntry) => void;
  compact?: boolean;
}

const CatchCard: React.FC<CatchCardProps> = ({
  entry,
  onAnglerPress,
  onCardPress,
  compact = false,
}) => {
  const relativeTime = formatRelativeTime(entry.createdAt);
  const speciesTheme = getSpeciesTheme(entry.species);

  const handleCardPress = () => {
    if (onCardPress) {
      onCardPress(entry);
    } else if (onAnglerPress) {
      onAnglerPress(entry.userId);
    }
  };

  const handleAnglerPress = () => {
    onAnglerPress?.(entry.userId);
  };

  // Compact mode for AnglerProfileModal
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {/* Photo or placeholder */}
        <View style={styles.compactPhotoContainer}>
          {entry.photoUrl ? (
            <Image
              source={{ uri: entry.photoUrl }}
              style={styles.compactPhoto}
              resizeMode="cover"
            />
          ) : (
            <SpeciesPlaceholder species={entry.species} size="small" />
          )}

          {/* Compact info overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.5)']}
            style={styles.compactGradient}
          />
          <View style={styles.compactInfoOverlay}>
            <CatchInfoBadge
              text={entry.species}
              variant="species"
              speciesTheme={speciesTheme}
            />
            {entry.length && (
              <CatchInfoBadge text={entry.length} variant="size" />
            )}
          </View>
        </View>

        {/* Compact footer */}
        <View style={styles.compactFooter}>
          <View style={styles.compactFooterLeft}>
            {entry.location && (
              <View style={styles.compactLocation}>
                <Feather name="map-pin" size={10} color={colors.textTertiary} />
                <Text style={styles.compactLocationText} numberOfLines={1}>
                  {entry.location}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.compactTimestamp}>{relativeTime}</Text>
        </View>
      </View>
    );
  }

  // Full card for main feed - PREMIUM DESIGN
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleCardPress}
      activeOpacity={0.97}
      disabled={!onAnglerPress && !onCardPress}
    >
      {/* Photo section with glassmorphism overlay */}
      <View style={styles.photoContainer}>
        {entry.photoUrl ? (
          <Image
            source={{ uri: entry.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <SpeciesPlaceholder species={entry.species} size="large" />
        )}

        {/* Gradient overlay at bottom of photo */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.55)']}
          style={styles.photoGradient}
        />

        {/* Info badges with glassmorphism effect */}
        <View style={styles.infoOverlay}>
          <CatchInfoBadge
            text={entry.species}
            variant="species"
            speciesTheme={speciesTheme}
          />
          {entry.length && (
            <CatchInfoBadge text={entry.length} variant="size" />
          )}
          <View style={styles.infoSpacer} />
          {entry.location && (
            <CatchInfoBadge
              text={entry.location}
              variant="location"
            />
          )}
        </View>
      </View>

      {/* Angler section - premium styling */}
      <TouchableOpacity
        style={styles.anglerRow}
        onPress={handleAnglerPress}
        disabled={!onAnglerPress}
        activeOpacity={0.7}
      >
        {/* Avatar with species-themed background */}
        <View style={styles.avatarContainer}>
          {entry.anglerProfileImage ? (
            <Image
              source={{ uri: entry.anglerProfileImage }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: speciesTheme.primary }]}>
              <Text style={styles.avatarInitial}>
                {entry.anglerName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Angler info */}
        <View style={styles.anglerInfo}>
          <Text style={styles.anglerName}>{entry.anglerName}</Text>
          {onAnglerPress && (
            <Text style={styles.viewProfileText}>Tap to view profile</Text>
          )}
        </View>

        {/* Timestamp and chevron */}
        <View style={styles.anglerRight}>
          <Text style={styles.timestamp}>{relativeTime}</Text>
          {onAnglerPress && (
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textTertiary}
              style={styles.chevron}
            />
          )}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // =====================
  // FULL CARD STYLES - PREMIUM
  // =====================
  container: {
    backgroundColor: colors.white,
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginVertical: 8,
    // Premium shadow with blue tint
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },

  // Photo section - larger for premium feel
  photoContainer: {
    width: '100%',
    height: 220,
    backgroundColor: colors.lightestGray,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },

  // Info overlay with glassmorphism badges
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoSpacer: {
    flex: 1,
  },

  // Angler row - premium styling
  anglerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lightGray,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  anglerInfo: {
    flex: 1,
  },
  anglerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  viewProfileText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  anglerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  chevron: {
    marginLeft: 4,
  },

  // =====================
  // COMPACT CARD STYLES
  // =====================
  compactContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.xxs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  compactPhotoContainer: {
    width: '100%',
    height: 110,
    backgroundColor: colors.lightestGray,
    position: 'relative',
  },
  compactPhoto: {
    width: '100%',
    height: '100%',
  },
  compactGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  compactInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  compactFooterLeft: {
    flex: 1,
  },
  compactLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactLocationText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginLeft: 3,
    flexShrink: 1,
  },
  compactTimestamp: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});

export default CatchCard;
