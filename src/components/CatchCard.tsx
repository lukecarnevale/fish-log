// components/CatchCard.tsx
//
// Displays a single catch entry in the Catch Feed.
// Shows photo, angler info, species, size, location, and time.
//

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CatchFeedEntry, formatRelativeTime } from '../types/catchFeed';
import { colors, spacing, borderRadius, typography } from '../styles/common';

interface CatchCardProps {
  entry: CatchFeedEntry;
  onAnglerPress?: (userId: string) => void;
  compact?: boolean;
}

/**
 * Get a placeholder icon for a species.
 */
function getSpeciesIcon(species: string): keyof typeof Feather.glyphMap {
  const speciesLower = species.toLowerCase();
  if (speciesLower.includes('drum')) return 'disc';
  if (speciesLower.includes('flounder')) return 'layers';
  if (speciesLower.includes('bass')) return 'anchor';
  if (speciesLower.includes('seatrout') || speciesLower.includes('trout')) return 'droplet';
  if (speciesLower.includes('weakfish')) return 'wind';
  return 'circle';
}

const CatchCard: React.FC<CatchCardProps> = ({ entry, onAnglerPress, compact = false }) => {
  const relativeTime = formatRelativeTime(entry.createdAt);

  // Build the catch details string
  const details: string[] = [entry.species];
  if (entry.length) details.push(entry.length);
  const detailsText = details.join(' • ');

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Photo section */}
      <View style={[styles.photoContainer, compact && styles.photoContainerCompact]}>
        {entry.photoUrl ? (
          <Image
            source={{ uri: entry.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Feather
              name={getSpeciesIcon(entry.species)}
              size={compact ? 28 : 40}
              color={colors.primary}
            />
          </View>
        )}
      </View>

      {/* Info section */}
      <View style={styles.infoContainer}>
        <View style={styles.topRow}>
          {/* Angler info - tappable */}
          <TouchableOpacity
            style={styles.anglerInfo}
            onPress={() => onAnglerPress?.(entry.userId)}
            disabled={!onAnglerPress}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              {entry.anglerProfileImage ? (
                <Image
                  source={{ uri: entry.anglerProfileImage }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {entry.anglerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.anglerName}>{entry.anglerName}</Text>
          </TouchableOpacity>

          {/* Timestamp */}
          <Text style={styles.timestamp}>{relativeTime}</Text>
        </View>

        {/* Catch details */}
        <Text style={styles.details} numberOfLines={1}>
          {detailsText}
        </Text>

        {/* Location and chevron */}
        <View style={styles.bottomRow}>
          {entry.location ? (
            <View style={styles.locationContainer}>
              <Feather name="map-pin" size={12} color={colors.textSecondary} />
              <Text style={styles.location} numberOfLines={1}>
                {entry.location}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {onAnglerPress && (
            <TouchableOpacity
              style={styles.chevronButton}
              onPress={() => onAnglerPress(entry.userId)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  containerCompact: {
    marginHorizontal: 0,
    marginVertical: spacing.xxs,
  },
  photoContainer: {
    width: '100%',
    height: 180,
    backgroundColor: colors.lightestGray,
  },
  photoContainerCompact: {
    height: 120,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  infoContainer: {
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  anglerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightGray,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  anglerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  details: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  location: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xxs,
  },
  chevronButton: {
    padding: spacing.xxs,
  },
});

export default CatchCard;
