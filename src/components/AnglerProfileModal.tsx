// components/AnglerProfileModal.tsx
//
// Modal that displays an angler's profile with their catch statistics
// and recent catches when tapping on an angler name in the Catch Feed.
//

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AnglerProfile, formatMemberSince } from '../types/catchFeed';
import { fetchAnglerProfile } from '../services/catchFeedService';
import { colors, spacing, borderRadius, typography } from '../styles/common';
import { getSpeciesTheme } from '../constants/speciesColors';
import { SPECIES_ALIASES } from '../constants/speciesAliases';
import { useAllFishSpecies } from '../api/speciesApi';
import CatchCard from './CatchCard';

interface AnglerProfileModalProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnglerProfileModal: React.FC<AnglerProfileModalProps> = ({
  visible,
  userId,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch species data for fallback images (same as CatchFeedScreen)
  const { data: allSpecies } = useAllFishSpecies();
  const speciesAliases = SPECIES_ALIASES;

  const speciesImageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (allSpecies) {
      allSpecies.forEach((species) => {
        if (species.images?.primary) {
          const imageUrl = species.images.primary;
          if (species.name) {
            const lowerName = species.name.toLowerCase();
            map.set(lowerName, imageUrl);
            const aliases = speciesAliases[lowerName];
            if (aliases) {
              aliases.forEach((alias) => map.set(alias, imageUrl));
            }
          }
          species.commonNames?.forEach((name) => {
            if (name) {
              const lowerName = name.toLowerCase();
              map.set(lowerName, imageUrl);
              const aliases = speciesAliases[lowerName];
              if (aliases) {
                aliases.forEach((alias) => map.set(alias, imageUrl));
              }
            }
          });
        }
      });
    }
    return map;
  }, [allSpecies]);

  const getSpeciesImageUrl = useCallback((speciesName: string | undefined): string | undefined => {
    if (!speciesName) return undefined;
    let lowerName = speciesName.toLowerCase().trim();
    const parenIndex = lowerName.indexOf('(');
    if (parenIndex > 0) {
      lowerName = lowerName.substring(0, parenIndex).trim();
    }
    let result = speciesImageMap.get(lowerName);
    if (!result) {
      for (const [key, url] of speciesImageMap.entries()) {
        if (key.includes(lowerName) || lowerName.includes(key)) {
          result = url;
          break;
        }
      }
    }
    return result;
  }, [speciesImageMap]);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      // Animate in: fade overlay and slide content
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();

      if (userId) {
        loadProfile(userId);
      }
    } else {
      // Reset animations
      overlayOpacity.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
      // Reset state when modal closes
      setProfile(null);
      setError(null);
    }
  }, [visible, userId, overlayOpacity, slideAnim]);

  const handleClose = () => {
    // Animate out before closing
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const loadProfile = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAnglerProfile(id);
      if (data) {
        setProfile(data);
      } else {
        setError('Unable to load angler profile');
      }
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading angler profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      );
    }

    if (error || !profile) {
      return (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            {profile.profileImage ? (
              <Image
                source={{ uri: profile.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitialLarge}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <Text style={styles.memberSince}>
            Member since {formatMemberSince(profile.memberSince)}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.totalCatches}</Text>
            <Text style={styles.statLabel}>
              {profile.totalCatches === 1 ? 'Catch' : 'Catches'}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.speciesCaught.length}</Text>
            <Text style={styles.statLabel}>
              {profile.speciesCaught.length === 1 ? 'Species' : 'Species'}
            </Text>
          </View>

          {profile.topSpecies && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValueSmall} numberOfLines={1}>
                  {profile.topSpecies}
                </Text>
                <Text style={styles.statLabel}>Top Catch</Text>
              </View>
            </>
          )}
        </View>

        {/* Species Tags */}
        {profile.speciesCaught.length > 0 && (
          <View style={styles.speciesSection}>
            <Text style={styles.sectionTitle}>Species Caught</Text>
            <View style={styles.speciesTagsContainer}>
              {profile.speciesCaught.map((species, index) => {
                const theme = getSpeciesTheme(species);
                return (
                  <View
                    key={index}
                    style={[styles.speciesTag, { backgroundColor: theme.light }]}
                  >
                    <View
                      style={[styles.speciesTagDot, { backgroundColor: theme.primary }]}
                    />
                    <Text style={[styles.speciesTagText, { color: theme.icon }]}>
                      {species}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Catches */}
        {profile.recentCatches.length > 0 && (
          <View style={styles.catchesSection}>
            <Text style={styles.sectionTitle}>Recent Catches</Text>
            {profile.recentCatches.map((entry) => (
              <CatchCard
                key={entry.id}
                entry={entry}
                compact
                speciesImageUrl={getSpeciesImageUrl(entry.species)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalWrapper}>
        {/* Animated overlay - fades in/out independently */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Animated content container - slides up/down */}
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom || spacing.lg,
            },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          {renderContent()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    minHeight: '50%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitialLarge: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
  },
  displayName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  memberSince: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  statValueSmall: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.sm,
  },
  speciesSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  speciesTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  speciesTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  speciesTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  speciesTagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  catchesSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});

export default AnglerProfileModal;
