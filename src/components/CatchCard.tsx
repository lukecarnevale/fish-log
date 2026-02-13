// components/CatchCard.tsx
//
// Premium catch card for the community feed.
// Features clean design without accent bars, glassmorphism badges,
// and polished angler section matching the ultra-premium aesthetic.
// Now supports displaying multiple species from a single submission.

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CatchFeedEntry, SpeciesCatch, formatRelativeTime } from '../types/catchFeed';
import { colors, spacing, borderRadius } from '../styles/common';
import { getSpeciesTheme } from '../constants/speciesColors';
import CatchInfoBadge from './CatchInfoBadge';
import SpeciesPlaceholder from './SpeciesPlaceholder';

interface CatchCardProps {
  entry: CatchFeedEntry;
  onAnglerPress?: (userId: string) => void;
  onCardPress?: (entry: CatchFeedEntry) => void;
  onLikePress?: (entry: CatchFeedEntry) => void;
  compact?: boolean;
  // Species image URL to show when user hasn't submitted their own photo
  speciesImageUrl?: string;
}

const CatchCard: React.FC<CatchCardProps> = ({
  entry,
  onAnglerPress,
  onCardPress,
  onLikePress,
  compact = false,
  speciesImageUrl,
}) => {
  const relativeTime = formatRelativeTime(entry.createdAt);
  const speciesTheme = getSpeciesTheme(entry.species);

  // Get species list - fallback to single species for backwards compatibility
  const speciesList: SpeciesCatch[] = entry.speciesList || [{ species: entry.species, count: 1 }];
  const totalFish = entry.totalFish || speciesList.reduce((sum, s) => sum + s.count, 0);
  const hasMultipleSpecies = speciesList.length > 1;

  // Memoized handlers to prevent unnecessary re-renders
  const handleCardPress = useCallback(() => {
    if (onCardPress) {
      onCardPress(entry);
    } else if (onAnglerPress) {
      onAnglerPress(entry.userId);
    }
  }, [onCardPress, onAnglerPress, entry]);

  const handleLikePress = useCallback(() => {
    onLikePress?.(entry);
  }, [onLikePress, entry]);


  // Compact mode for AnglerProfileModal
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {/* Photo, species image, or placeholder */}
        <View style={styles.compactPhotoContainer}>
          {entry.photoUrl ? (
            <Image
              source={{ uri: entry.photoUrl }}
              style={styles.compactPhoto}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : speciesImageUrl ? (
            <Image
              source={{ uri: speciesImageUrl }}
              style={styles.compactPhoto}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
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
            {/* Show total fish count badge if multiple */}
            {totalFish > 1 && (
              <CatchInfoBadge
                text={`${totalFish} fish`}
                variant="size"
              />
            )}
            {/* Primary species badge */}
            <CatchInfoBadge
              text={hasMultipleSpecies ? `${speciesList.length} species` : entry.species}
              variant="species"
              speciesTheme={speciesTheme}
            />
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

  // Helper to format species with count and lengths integrated
  // Format: "2 Red Drum • 18", 20"" or "Red Drum • 18"" (single fish)
  const formatSpeciesDisplay = (s: SpeciesCatch): string => {
    // Put count first if more than 1
    let display = s.count > 1 ? `${s.count} ${s.species}` : s.species;

    // Add lengths inline if available
    if (s.lengths && s.lengths.length > 0) {
      const lengthsStr = s.lengths.map(l => `${l}"`).join(', ');
      display += ` • ${lengthsStr}`;
    }

    return display;
  };

  // Full card for main feed - PREMIUM DESIGN
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleCardPress}
      activeOpacity={0.97}
      disabled={!onAnglerPress && !onCardPress}
    >
      {/* Photo section with overlays */}
      <View style={styles.photoContainer}>
        {entry.photoUrl ? (
          <Image
            source={{ uri: entry.photoUrl }}
            style={styles.photo}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
          />
        ) : speciesImageUrl ? (
          <Image
            source={{ uri: speciesImageUrl }}
            style={styles.photo}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
          />
        ) : (
          <SpeciesPlaceholder species={entry.species} size="large" />
        )}

        {/* Top gradient overlay for profile info */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.45)', 'transparent']}
          style={styles.topGradient}
        />

        {/* Profile and timestamp overlay at top */}
        <View style={styles.topOverlay}>
          {/* Avatar - not clickable */}
          <View style={styles.topAvatarContainer}>
            {entry.anglerProfileImage ? (
              <Image
                source={{ uri: entry.anglerProfileImage }}
                style={styles.topAvatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View style={[styles.topAvatarPlaceholder, { backgroundColor: speciesTheme.primary }]}>
                <Text style={styles.topAvatarInitial}>
                  {entry.anglerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.topAnglerInfo}>
            <Text style={styles.topAnglerName}>{entry.anglerName}</Text>
            <Text style={styles.topTimestamp}>{relativeTime}</Text>
          </View>
        </View>

        {/* Gradient overlay at bottom of photo */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.55)']}
          style={styles.photoGradient}
        />

        {/* Info badges with glassmorphism effect */}
        <View style={styles.infoOverlay}>
          {/* Total fish count badge - shown when multiple fish */}
          {totalFish > 1 && (
            <CatchInfoBadge
              text={`${totalFish} fish`}
              variant="size"
            />
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

      {/* Bottom section - species badges with integrated lengths and like button */}
      <View style={styles.bottomSection}>
        {/* Species list - shows all caught species with lengths integrated */}
        <View style={styles.speciesRow}>
          {speciesList.map((s, index) => {
            const theme = getSpeciesTheme(s.species);
            return (
              <CatchInfoBadge
                key={`${s.species}-${index}`}
                text={formatSpeciesDisplay(s)}
                variant="species"
                speciesTheme={theme}
              />
            );
          })}
        </View>

        {/* Like button */}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={handleLikePress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={entry.isLikedByCurrentUser ? 'heart' : 'heart-outline'}
            size={22}
            color={entry.isLikedByCurrentUser ? '#E53935' : colors.textTertiary}
          />
          {entry.likeCount > 0 && (
            <Text style={[
              styles.likeCount,
              entry.isLikedByCurrentUser && styles.likeCountActive
            ]}>
              {entry.likeCount}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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

  // Top gradient and profile overlay
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topAvatarContainer: {
    marginRight: 10,
  },
  topAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  topAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  topAvatarInitial: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  topAnglerInfo: {
    flex: 1,
  },
  topAnglerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  topTimestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Bottom section - species badges and like button
  bottomSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speciesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  likedHeart: {
    // Filled heart effect - we use color change instead
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary,
    marginLeft: 5,
  },
  likeCountActive: {
    color: '#E53935',
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

// Custom comparison to prevent unnecessary re-renders
// Only re-render if the entry data or like status actually changed
const arePropsEqual = (prevProps: CatchCardProps, nextProps: CatchCardProps): boolean => {
  return (
    prevProps.entry.id === nextProps.entry.id &&
    prevProps.entry.likeCount === nextProps.entry.likeCount &&
    prevProps.entry.isLikedByCurrentUser === nextProps.entry.isLikedByCurrentUser &&
    prevProps.compact === nextProps.compact &&
    prevProps.speciesImageUrl === nextProps.speciesImageUrl
  );
};

export default memo(CatchCard, arePropsEqual);
