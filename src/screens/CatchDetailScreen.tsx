// screens/CatchDetailScreen.tsx
//
// Full-screen detail view for a single catch. Shows:
//   • Top app bar with back arrow + angler name
//   • Angler row (avatar + name, tappable → AnglerProfile)
//   • The catch photo at full width
//   • Species pills + location + date
//   • Like + comment counts
//   • Inline comment thread + composer
//
// This is the destination when a user taps a photo in the AnglerProfileScreen
// grid, and what we will eventually navigate to from any feed card tap.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CatchFeedEntry, CatchComment, formatRelativeTime } from '../types/catchFeed';
import { RootStackParamList } from '../types';
import {
  fetchCatchById,
  likeCatch,
  unlikeCatch,
} from '../services/catchFeedService';
import { spacing, borderRadius } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { getSpeciesTheme } from '../constants/speciesColors';
import { useCurrentRewardsUserId } from '../hooks/useCurrentRewardsUserId';
import {
  useComments,
  useAddComment,
  useDeleteComment,
  useReportComment,
} from '../api/commentsApi';

type Props = StackScreenProps<RootStackParamList, 'CatchDetail'>;

const COMMENT_MAX_LENGTH = 500;
const COMMENT_LENGTH_WARN_THRESHOLD = 450;

const CatchDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { reportId } = route.params;
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const currentUserId = useCurrentRewardsUserId();

  const [entry, setEntry] = useState<CatchFeedEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const commentsQuery = useComments(reportId, currentUserId ?? undefined);
  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();
  const reportCommentMutation = useReportComment();

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCatchById(reportId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError('Catch not found or no longer visible.');
        } else {
          setEntry(data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load catch:', err);
        setError('Unable to load this catch.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const handleAnglerPress = useCallback(() => {
    if (!entry) return;
    navigation.push('AnglerProfile', { userId: entry.userId });
  }, [entry, navigation]);

  const handleLikeToggle = useCallback(async () => {
    if (!entry || !currentUserId) return;
    const willLike = !entry.isLikedByCurrentUser;
    // Optimistic
    setEntry({
      ...entry,
      isLikedByCurrentUser: willLike,
      likeCount: Math.max(0, entry.likeCount + (willLike ? 1 : -1)),
    });
    try {
      if (willLike) {
        await likeCatch(entry.id, currentUserId);
      } else {
        await unlikeCatch(entry.id, currentUserId);
      }
    } catch (err) {
      // Roll back
      setEntry({
        ...entry,
        isLikedByCurrentUser: !willLike,
        likeCount: Math.max(0, entry.likeCount + (willLike ? -1 : 1)),
      });
      console.warn('Failed to update like:', err);
    }
  }, [entry, currentUserId]);

  // ===========================================================================
  // Comments
  // ===========================================================================

  const trimmedDraft = draft.trim();
  const canPost = !!currentUserId;
  const canSubmit = canPost && trimmedDraft.length > 0 && !submitting;
  const showCounter = draft.length >= COMMENT_LENGTH_WARN_THRESHOLD;

  // Bump entry.commentCount in local state when the user posts/deletes.
  const bumpCommentCount = useCallback((delta: number) => {
    setEntry((prev) =>
      prev
        ? { ...prev, commentCount: Math.max(0, (prev.commentCount ?? 0) + delta) }
        : prev,
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !entry || !currentUserId) return;
    setSubmitting(true);
    bumpCommentCount(1);
    try {
      // We don't know the current user's display name here without an extra
      // lookup; use a generic placeholder for the optimistic row. The server
      // response replaces it with the real angler name.
      await addCommentMutation.mutateAsync({
        reportId: entry.id,
        userId: currentUserId,
        anglerName: 'You',
        text: trimmedDraft,
      });
      setDraft('');
    } catch (err) {
      bumpCommentCount(-1);
      console.warn('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    entry,
    currentUserId,
    trimmedDraft,
    addCommentMutation,
    bumpCommentCount,
  ]);

  const handleCommentLongPress = useCallback(
    (comment: CatchComment) => {
      if (!entry) return;
      if (comment.isOwn) {
        Alert.alert('Delete comment?', 'This will permanently remove your comment.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              bumpCommentCount(-1);
              deleteCommentMutation.mutate(
                { reportId: entry.id, commentId: comment.id },
                {
                  onError: () => bumpCommentCount(1),
                },
              );
            },
          },
        ]);
      } else if (currentUserId) {
        Alert.alert('Report comment', 'Send this comment to moderation?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Report',
            style: 'destructive',
            onPress: () =>
              reportCommentMutation.mutate({
                commentId: comment.id,
                reporterId: currentUserId,
              }),
          },
        ]);
      }
    },
    [entry, currentUserId, deleteCommentMutation, reportCommentMutation, bumpCommentCount],
  );

  // ===========================================================================
  // Renderers
  // ===========================================================================

  const renderHeader = () => {
    if (!entry) return null;
    return (
      <View>
        {/* Angler row */}
        <TouchableOpacity
          style={styles.anglerRow}
          onPress={handleAnglerPress}
          activeOpacity={0.85}
        >
          {entry.anglerProfileImage ? (
            <Image
              source={{ uri: entry.anglerProfileImage }}
              style={styles.anglerAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.anglerAvatarPlaceholder}>
              <Text style={styles.anglerInitial}>
                {entry.anglerName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.anglerName}>{entry.anglerName}</Text>
            <Text style={styles.anglerMeta}>
              {formatRelativeTime(entry.createdAt)}
              {entry.location ? ` · ${entry.location}` : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Photo */}
        {entry.photoUrl ? (
          <Image
            source={{ uri: entry.photoUrl }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Feather name="image" size={48} color={theme.colors.textTertiary} />
          </View>
        )}

        {/* Species pills */}
        <View style={styles.speciesRow}>
          {entry.speciesList.map((s, i) => {
            const sTheme = getSpeciesTheme(s.species);
            const display =
              s.count > 1 ? `${s.count} ${s.species}` : s.species;
            const withLengths =
              s.lengths && s.lengths.length > 0
                ? `${display} • ${s.lengths.map((l) => `${l}"`).join(', ')}`
                : display;
            return (
              <View
                key={`${s.species}-${i}`}
                style={[styles.speciesPill, { backgroundColor: sTheme.light }]}
              >
                <View style={[styles.speciesDot, { backgroundColor: sTheme.primary }]} />
                <Text style={[styles.speciesPillText, { color: sTheme.icon }]}>
                  {withLengths}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Like / comment row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikeToggle}
            activeOpacity={0.7}
            disabled={!currentUserId}
          >
            <Ionicons
              name={entry.isLikedByCurrentUser ? 'heart' : 'heart-outline'}
              size={26}
              color={entry.isLikedByCurrentUser ? '#E53935' : theme.colors.textSecondary}
            />
            {entry.likeCount > 0 && (
              <Text style={styles.actionCount}>{entry.likeCount}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.actionButton}>
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={theme.colors.textSecondary}
            />
            {entry.commentCount !== undefined && entry.commentCount > 0 && (
              <Text style={styles.actionCount}>{entry.commentCount}</Text>
            )}
          </View>
        </View>

        <View style={styles.commentsSectionLabelRow}>
          <Text style={styles.commentsSectionLabel}>Comments</Text>
        </View>
      </View>
    );
  };

  const renderComment = ({ item }: { item: CatchComment }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={() => handleCommentLongPress(item)}
      delayLongPress={350}
      style={styles.commentRow}
    >
      {item.anglerProfileImage ? (
        <Image
          source={{ uri: item.anglerProfileImage }}
          style={styles.commentAvatar}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.commentAvatarPlaceholder}>
          <Text style={styles.commentInitial}>
            {item.anglerName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentName}>{item.anglerName}</Text>
          <Text style={styles.commentDot}> · </Text>
          <Text style={styles.commentTimestamp}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCommentsEmpty = () => (
    <View style={styles.emptyComments}>
      <Feather name="message-circle" size={28} color={theme.colors.textTertiary} />
      <Text style={styles.emptyCommentsText}>No comments yet</Text>
    </View>
  );

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.topBarIconButton}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {entry ? `Catch by ${entry.anglerName}` : 'Catch'}
        </Text>
        <View style={styles.topBarIconButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error || !entry ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.errorText}>{error ?? 'Catch unavailable.'}</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={commentsQuery.data ?? []}
            keyExtractor={(c) => c.id}
            renderItem={renderComment}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              commentsQuery.isLoading ? (
                <View style={styles.emptyComments}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : (
                renderCommentsEmpty()
              )
            }
            ItemSeparatorComponent={() => <View style={styles.commentDivider} />}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {/* Composer */}
          <View style={[styles.composer, { paddingBottom: insets.bottom || spacing.sm }]}>
            <View style={styles.composerInputWrap}>
              <TextInput
                value={draft}
                onChangeText={(t) => setDraft(t.slice(0, COMMENT_MAX_LENGTH))}
                placeholder={canPost ? 'Add a comment...' : 'Sign in to comment'}
                placeholderTextColor={theme.colors.textTertiary}
                style={styles.composerInput}
                multiline
                maxLength={COMMENT_MAX_LENGTH}
                editable={canPost && !submitting}
              />
              {showCounter && (
                <Text style={styles.composerCounter}>
                  {COMMENT_MAX_LENGTH - draft.length}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.composerSend}
            >
              <Feather
                name="send"
                size={22}
                color={canSubmit ? theme.colors.primary : theme.colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
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
    },

    // Angler row
    anglerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 10,
    },
    anglerAvatar: { width: 40, height: 40, borderRadius: 20 },
    anglerAvatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anglerInitial: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    anglerName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    anglerMeta: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },

    photo: {
      width: '100%',
      aspectRatio: 4 / 5,
      backgroundColor: theme.colors.surfaceMuted,
    },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    speciesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    speciesPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 4,
    },
    speciesDot: { width: 6, height: 6, borderRadius: 3 },
    speciesPillText: { fontSize: 12, fontWeight: '600' },

    // Actions
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 18,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionCount: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },

    commentsSectionLabelRow: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      marginTop: spacing.xs,
    },
    commentsSectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textTertiary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    // Comment list
    commentRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    commentAvatar: { width: 36, height: 36, borderRadius: 18 },
    commentAvatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentInitial: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    commentBody: {
      flex: 1,
      marginLeft: 12,
    },
    commentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    commentName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    commentDot: { fontSize: 14, color: theme.colors.textTertiary },
    commentTimestamp: { fontSize: 12, color: theme.colors.textTertiary },
    commentText: {
      fontSize: 15,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    commentDivider: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginLeft: spacing.md + 36 + 12,
    },
    emptyComments: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.xs,
    },
    emptyCommentsText: {
      fontSize: 14,
      color: theme.colors.textTertiary,
    },

    // Composer
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      gap: 6,
    },
    composerInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 22,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
      minHeight: 40,
      maxHeight: 120,
    },
    composerInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
      lineHeight: 20,
    },
    composerCounter: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginLeft: 6,
      marginBottom: 2,
    },
    composerSend: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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

export default CatchDetailScreen;
