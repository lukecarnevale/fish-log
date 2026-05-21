// screens/AnglerProfileScreen.tsx
//
// Full-screen angler profile (Instagram-style). Replaces the prior modal.
// Layout:
//   • Top app bar (back arrow, display name, more menu)
//   • Header: avatar, name, bio, member-since
//   • Follow / Edit Profile button + tappable follower/following stats
//   • Species pills + achievement badges row
//   • 3-column photo grid of the angler's catches (tap → CatchDetail)
//
// Block flow stays in the more menu. After blocking, we navigate back so the
// feed can refetch on the user's next pull-to-refresh.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import {
  AnglerProfile,
  CatchFeedEntry,
  formatMemberSince,
} from '../types/catchFeed';
import { RootStackParamList } from '../types';
import { fetchAnglerProfile } from '../services/catchFeedService';
import { spacing, borderRadius, typography } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { getSpeciesTheme } from '../constants/speciesColors';
import { useFollowProfile, useToggleFollow } from '../api/followsApi';
import { useBlockUser } from '../api/blocksApi';
import { useCurrentRewardsUserId } from '../hooks/useCurrentRewardsUserId';
import AchievementBadgesRow from '../components/AchievementBadgesRow';
import FollowListSheet from '../components/FollowListSheet';

type Props = StackScreenProps<RootStackParamList, 'AnglerProfile'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GUTTER = 2;
// Each tile is a perfect square — divide the screen width minus gutters.
const GRID_TILE_SIZE = (SCREEN_WIDTH - GRID_GUTTER * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

interface GridItem {
  reportId: string;
  photoUrl?: string;
  species: string;
  totalFish: number;
}

const AnglerProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId } = route.params;
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const currentUserId = useCurrentRewardsUserId();
  const isSelf = !!currentUserId && currentUserId === userId;
  const canInteract = !!currentUserId && !isSelf;

  const [profile, setProfile] = useState<AnglerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followSheet, setFollowSheet] = useState<'followers' | 'following' | null>(null);

  const followProfileQuery = useFollowProfile(userId, currentUserId);
  const toggleFollow = useToggleFollow();
  const blockMutation = useBlockUser();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAnglerProfile(userId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError('Profile not found.');
        } else {
          setProfile(data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load profile:', err);
        setError('Unable to load profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleToggleFollow = useCallback(() => {
    if (!canInteract || !userId || !currentUserId) return;
    const willFollow = !followProfileQuery.data?.isFollowing;
    toggleFollow.mutate({
      targetUserId: userId,
      viewerUserId: currentUserId,
      willFollow,
    });
  }, [canInteract, userId, currentUserId, followProfileQuery.data?.isFollowing, toggleFollow]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const handleOpenMoreMenu = useCallback(() => {
    if (!canInteract || !userId || !currentUserId) return;
    Alert.alert(
      profile?.displayName ?? 'This angler',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block this angler',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Block this angler?',
              'You will no longer see their catches or comments, and they will not see yours.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: () => {
                    blockMutation.mutate(
                      { targetUserId: userId, viewerUserId: currentUserId },
                      { onSuccess: () => navigation.goBack() },
                    );
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [canInteract, userId, currentUserId, profile?.displayName, blockMutation, navigation]);

  const gridItems = useMemo<GridItem[]>(() => {
    if (!profile) return [];
    return profile.recentCatches
      .filter((c) => !!c.photoUrl)
      .map((c) => ({
        reportId: c.id,
        photoUrl: c.photoUrl,
        species: c.species,
        totalFish: c.totalFish,
      }));
  }, [profile]);

  const handleOpenCatch = useCallback(
    (item: GridItem) => {
      navigation.navigate('CatchDetail', { reportId: item.reportId });
    },
    [navigation],
  );

  // ===========================================================================
  // Renderers
  // ===========================================================================

  const renderHeader = () => {
    if (!profile) return null;

    return (
      <View style={styles.headerWrap}>
        {/* Avatar + name + bio + member-since */}
        <View style={styles.identitySection}>
          <View style={styles.avatarLarge}>
            {profile.profileImage ? (
              <Image
                source={{ uri: profile.profileImage }}
                style={styles.avatarImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <Text style={styles.avatarInitial}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <Text style={styles.memberSince}>
            Member since {formatMemberSince(profile.memberSince)}
          </Text>
        </View>

        {/* Primary action button: Follow / Following / Edit Profile */}
        {(isSelf || canInteract) && (
          <View style={styles.primaryButtonRow}>
            {isSelf ? (
              <TouchableOpacity
                onPress={handleEditProfile}
                style={[styles.primaryButton, styles.primaryButtonOutline]}
                activeOpacity={0.85}
              >
                <Feather name="edit-2" size={14} color={theme.colors.primary} />
                <Text
                  style={[styles.primaryButtonText, styles.primaryButtonTextOutline]}
                >
                  Edit Profile
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleToggleFollow}
                disabled={toggleFollow.isPending || followProfileQuery.isLoading}
                style={[
                  styles.primaryButton,
                  followProfileQuery.data?.isFollowing && styles.primaryButtonOutline,
                  (toggleFollow.isPending || followProfileQuery.isLoading) &&
                    styles.primaryButtonDisabled,
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    followProfileQuery.data?.isFollowing && styles.primaryButtonTextOutline,
                  ]}
                >
                  {followProfileQuery.data?.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stats row — catches / followers / following */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.totalCatches}</Text>
            <Text style={styles.statLabel}>
              {profile.totalCatches === 1 ? 'Catch' : 'Catches'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => setFollowSheet('followers')}
          >
            <Text style={styles.statValue}>
              {followProfileQuery.data?.followersCount ?? profile.followersCount ?? 0}
            </Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={() => setFollowSheet('following')}
          >
            <Text style={styles.statValue}>
              {followProfileQuery.data?.followingCount ?? profile.followingCount ?? 0}
            </Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Achievement badges — only if any earned */}
        {profile.achievements && profile.achievements.length > 0 && (
          <AchievementBadgesRow achievements={profile.achievements} />
        )}

        {/* Species pills */}
        {profile.speciesCaught.length > 0 && (
          <View style={styles.speciesSection}>
            <Text style={styles.sectionLabel}>Species Caught</Text>
            <View style={styles.speciesPills}>
              {profile.speciesCaught.map((species, index) => {
                const sTheme = getSpeciesTheme(species);
                return (
                  <View
                    key={`${species}-${index}`}
                    style={[styles.speciesPill, { backgroundColor: sTheme.light }]}
                  >
                    <View style={[styles.speciesDot, { backgroundColor: sTheme.primary }]} />
                    <Text style={[styles.speciesPillText, { color: sTheme.icon }]}>
                      {species}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Grid section title */}
        <View style={styles.gridTitleRow}>
          <Feather name="grid" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.gridTitle}>Photos</Text>
        </View>
      </View>
    );
  };

  const renderGridItem = useCallback(
    ({ item, index }: { item: GridItem; index: number }) => {
      // 1px gap on left/top for all but first column / first row in column.
      const isFirstInRow = index % GRID_COLUMNS === 0;
      const isFirstRow = index < GRID_COLUMNS;
      return (
        <TouchableOpacity
          onPress={() => handleOpenCatch(item)}
          activeOpacity={0.85}
          style={[
            styles.gridTile,
            !isFirstInRow && { marginLeft: GRID_GUTTER },
            !isFirstRow && { marginTop: GRID_GUTTER },
          ]}
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.gridImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.gridImagePlaceholder}>
              <Feather name="image" size={20} color={theme.colors.textTertiary} />
            </View>
          )}
          {item.totalFish > 1 && (
            <View style={styles.gridTileBadge}>
              <Feather name="layers" size={10} color={theme.colors.textOnPrimary} />
              <Text style={styles.gridTileBadgeText}>{item.totalFish}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [styles, handleOpenCatch, theme.colors.textTertiary, theme.colors.textOnPrimary],
  );

  const renderEmpty = () => (
    <View style={styles.emptyGridContainer}>
      <Feather name="camera-off" size={32} color={theme.colors.textTertiary} />
      <Text style={styles.emptyGridText}>No photos to show yet</Text>
    </View>
  );

  // ===========================================================================
  // Screen shell
  // ===========================================================================

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top app bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.topBarIconButton}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {profile?.displayName ?? ''}
        </Text>
        {canInteract ? (
          <TouchableOpacity
            onPress={handleOpenMoreMenu}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.topBarIconButton}
            accessibilityLabel="More actions"
          >
            <Feather name="more-horizontal" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarIconButton} />
        )}
      </View>

      {/* Loading / error / content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error || !profile ? (
        <ScrollView contentContainerStyle={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.errorText}>{error ?? 'Profile unavailable.'}</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={gridItems}
          keyExtractor={(item) => item.reportId}
          renderItem={renderGridItem}
          numColumns={GRID_COLUMNS}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        />
      )}

      {/* Followers / Following list sheet */}
      <FollowListSheet
        visible={followSheet !== null}
        mode={followSheet ?? 'followers'}
        targetUserId={userId}
        onClose={() => setFollowSheet(null)}
        onSelectMember={(member) => {
          setFollowSheet(null);
          // Avoid pushing the same userId on top of itself.
          if (member.userId !== userId) {
            navigation.push('AnglerProfile', { userId: member.userId });
          }
        }}
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // Top bar
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
      backgroundColor: theme.colors.background,
    },
    topBarIconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      letterSpacing: 0.15,
    },

    // Header content
    headerWrap: {
      backgroundColor: theme.colors.background,
    },
    identitySection: {
      alignItems: 'center',
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    avatarLarge: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    avatarInitial: {
      color: theme.colors.textOnPrimary,
      fontSize: 40,
      fontWeight: '700',
    },
    displayName: {
      ...typography.h2,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    bio: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      marginBottom: 6,
    },
    memberSince: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      letterSpacing: 0.3,
    },

    // Primary action button
    primaryButtonRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.primary,
      gap: 6,
    },
    primaryButtonOutline: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    primaryButtonTextOutline: {
      color: theme.colors.primary,
    },

    // Stats row
    statsRow: {
      flexDirection: 'row',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      letterSpacing: 0.3,
      marginTop: 2,
    },

    // Species
    speciesSection: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textTertiary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    speciesPills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    speciesPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 4,
    },
    speciesDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    speciesPillText: {
      fontSize: 12,
      fontWeight: '600',
    },

    // Grid
    gridTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: 6,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      marginTop: spacing.sm,
    },
    gridTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    gridTile: {
      width: GRID_TILE_SIZE,
      height: GRID_TILE_SIZE,
      backgroundColor: theme.colors.surfaceMuted,
      position: 'relative',
    },
    gridImage: {
      width: '100%',
      height: '100%',
    },
    gridImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridTileBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    gridTileBadgeText: {
      color: theme.colors.textOnPrimary,
      fontSize: 11,
      fontWeight: '700',
    },

    // Empty / loading / error
    emptyGridContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      gap: spacing.sm,
    },
    emptyGridText: {
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

export default AnglerProfileScreen;
