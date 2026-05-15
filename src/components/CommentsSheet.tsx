// components/CommentsSheet.tsx
//
// Instagram-style bottom sheet for catch comments.
// Slides up from the bottom, takes ~75% of screen height,
// hosts a scrollable comment list and a sticky composer.
//
// Currently wired to mock data — replace `comments` prop source once the
// catch_comments table and React Query hooks land.

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  StyleSheet,
  Modal,
  Animated,
  Keyboard,
  Platform,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { CatchComment, formatRelativeTime } from '../types/catchFeed';
import { spacing, borderRadius } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';

const SHEET_HEIGHT_RATIO = 0.75; // 75% of screen height
const COMMENT_MAX_LENGTH = 500;
const COMMENT_LENGTH_WARN_THRESHOLD = 450;

interface CommentsSheetProps {
  visible: boolean;
  onClose: () => void;
  comments: CatchComment[];
  reportId: string | null;
  // Called when the user submits a new comment. Parent is responsible for
  // optimistically prepending to the comments list and rolling back on error.
  onSubmit?: (text: string) => Promise<void> | void;
  // Called when the user confirms deletion of their own comment.
  onDelete?: (commentId: string) => Promise<void> | void;
  // Called when the user reports another user's comment.
  onReport?: (commentId: string) => void;
  // Called when the user taps an angler name/avatar inside a comment row.
  onAnglerPress?: (userId: string) => void;
  // Whether the user is signed in / a rewards member. Drives composer state.
  canPost?: boolean;
  loading?: boolean;
}

const CommentsSheet: React.FC<CommentsSheetProps> = ({
  visible,
  onClose,
  comments,
  reportId,
  onSubmit,
  onDelete,
  onReport,
  onAnglerPress,
  canPost = true,
  loading = false,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const screenHeight = Dimensions.get('window').height;
  const baseSheetHeight = screenHeight * SHEET_HEIGHT_RATIO;

  // Animation: scrim opacity + sheet translateY driven by the same value.
  // `rendered` decouples the Modal's lifetime from `visible` so we can run
  // a slide-down animation before unmounting on close.
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Track the live keyboard height so the sheet can shrink (top stays fixed,
  // bottom rises) when the keyboard appears. Instagram-style — much less
  // jarring than translating the whole sheet up.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // iOS fires `will*` events with animation duration; Android only fires
    // `did*` after the layout has already shifted. Both fire end coordinates.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // While keyboard is open, the sheet shrinks from the bottom (so its top
  // stays put) and floats above the keyboard via marginBottom.
  // Clamp to a sensible minimum so an unusually tall keyboard never wipes
  // out the sheet entirely.
  const adjustedSheetHeight = Math.max(220, baseSheetHeight - keyboardHeight);

  // Use the base sheet height for the slide-in distance so the entry
  // animation is consistent regardless of whether the keyboard happened to
  // be open before the sheet was triggered.
  const sheetHeight = baseSheetHeight;

  useEffect(() => {
    if (visible) {
      // First-time open: snap to closed position before mounting so the slide-up
      // is visible. Reopening mid-close skips the snap so it springs from
      // wherever the exit animation got to — avoids a hard reset flash.
      if (!rendered) {
        anim.setValue(0);
        setRendered(true);
      }
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else if (rendered) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Only unmount if the close animation completed — if the user reopened
        // mid-close, a new open animation has started and we want to keep
        // the Modal mounted.
        if (finished) setRendered(false);
      });
    }
  }, [visible, rendered, anim]);

  // Reset draft whenever the sheet is opened for a different report.
  useEffect(() => {
    if (visible) setDraft('');
  }, [visible, reportId]);

  // Wrap parent's onClose so we proactively dismiss the keyboard. Without this,
  // the keyboard would stay up during the slide-down animation and reappear
  // briefly until the sheet finishes unmounting.
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight, 0],
  });

  const trimmedDraft = draft.trim();
  const canSubmit = canPost && trimmedDraft.length > 0 && !submitting;
  const showCounter = draft.length >= COMMENT_LENGTH_WARN_THRESHOLD;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmedDraft);
      setDraft('');
    } catch {
      // Parent handles user-facing error toast; we just leave the draft so
      // the user can retry without retyping.
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, onSubmit, trimmedDraft]);

  const handleLongPress = useCallback(
    (comment: CatchComment) => {
      if (comment.isOwn) {
        Alert.alert(
          'Delete comment?',
          'This will permanently remove your comment.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => onDelete?.(comment.id),
            },
          ],
        );
      } else {
        Alert.alert(
          'Report comment',
          'Report this comment for review by our moderation team.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Report',
              style: 'destructive',
              onPress: () => onReport?.(comment.id),
            },
          ],
        );
      }
    },
    [onDelete, onReport],
  );

  const renderComment = useCallback(
    ({ item }: { item: CatchComment }) => (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={350}
        style={styles.commentRow}
      >
        <TouchableOpacity
          onPress={() => onAnglerPress?.(item.userId)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          disabled={!onAnglerPress}
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
              <Text style={styles.commentAvatarInitial}>
                {item.anglerName
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n.charAt(0).toUpperCase())
                  .slice(0, 2)
                  .join('')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.commentBody}>
          <View style={styles.commentMetaRow}>
            <TouchableOpacity
              onPress={() => onAnglerPress?.(item.userId)}
              disabled={!onAnglerPress}
              hitSlop={{ top: 4, bottom: 4 }}
            >
              <Text style={styles.commentName}>{item.anglerName}</Text>
            </TouchableOpacity>
            <Text style={styles.commentDot}>·</Text>
            <Text style={styles.commentTimestamp}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>
      </TouchableOpacity>
    ),
    [styles, onAnglerPress, handleLongPress],
  );

  const ItemSeparator = useCallback(
    () => <View style={styles.commentDivider} />,
    [styles],
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Feather
          name="message-circle"
          size={48}
          color={theme.colors.textTertiary}
        />
        <Text style={styles.emptyTitle}>No comments yet</Text>
        <Text style={styles.emptySubtitle}>Be the first to comment</Text>
      </View>
    ),
    [styles, theme.colors.textTertiary],
  );

  const renderLoading = useCallback(
    () => (
      <View style={styles.skeletonContainer}>
        {[0, 1, 2].map((i) => (
          <View key={`skeleton-${i}`} style={styles.skeletonRow}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonBody}>
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineLong} />
            </View>
          </View>
        ))}
      </View>
    ),
    [styles],
  );

  const headerCount = useMemo(() => {
    if (loading) return '';
    const n = comments.length;
    if (n === 0) return '';
    return `${n} ${n === 1 ? 'comment' : 'comments'}`;
  }, [comments.length, loading]);

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        {/* Animated background scrim */}
        <Animated.View
          style={[styles.scrim, { opacity: overlayOpacity }]}
          pointerEvents="none"
        />

        {/* Tap-outside-to-dismiss layer */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.scrimTouchable} />
        </TouchableWithoutFeedback>

        {/* Sheet container — no KeyboardAvoidingView wrapper. Instead, we
            shrink the sheet itself when the keyboard appears so its top edge
            doesn't move, and float it above the keyboard via marginBottom. */}
        <View style={styles.keyboardAvoid} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              {
                height: adjustedSheetHeight,
                marginBottom: keyboardHeight,
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.headerClose}
              >
                <Feather name="x" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Comments</Text>
              <View style={styles.headerRight}>
                {headerCount.length > 0 && (
                  <Text style={styles.headerCount}>{headerCount}</Text>
                )}
              </View>
            </View>

            {/* List or empty/loading state */}
            <View style={styles.listContainer}>
              {loading ? (
                renderLoading()
              ) : comments.length === 0 ? (
                renderEmpty()
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(c) => c.id}
                  renderItem={renderComment}
                  ItemSeparatorComponent={ItemSeparator}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            {/* Composer */}
            <View style={styles.composer}>
              <View style={styles.composerAvatarPlaceholder}>
                <Feather name="user" size={16} color={theme.colors.textTertiary} />
              </View>
              {/* Pressable wraps the entire pill so taps anywhere inside
                  the wrap focus the input — the bare TextInput's hit area
                  was just the text line, so taps in the surrounding padding
                  used to miss. */}
              <Pressable
                style={styles.composerInputWrap}
                onPress={() => inputRef.current?.focus()}
              >
                <TextInput
                  ref={inputRef}
                  value={draft}
                  onChangeText={(t) =>
                    setDraft(t.slice(0, COMMENT_MAX_LENGTH))
                  }
                  placeholder={
                    canPost
                      ? 'Add a comment...'
                      : 'Sign in as a rewards member to comment'
                  }
                  placeholderTextColor={theme.colors.textTertiary}
                  style={styles.composerInput}
                  multiline
                  maxLength={COMMENT_MAX_LENGTH}
                  editable={canPost && !submitting}
                  returnKeyType="default"
                />
                {showCounter && (
                  <Text style={styles.composerCounter}>
                    {COMMENT_MAX_LENGTH - draft.length}
                  </Text>
                )}
              </Pressable>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.composerSend}
              >
                <Feather
                  name="send"
                  size={22}
                  color={
                    canSubmit
                      ? theme.colors.primary
                      : theme.colors.textTertiary
                  }
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    scrimTouchable: {
      ...StyleSheet.absoluteFillObject,
    },
    keyboardAvoid: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 16,
    },
    handleContainer: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 4,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.textTertiary,
      opacity: 0.4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    headerClose: {
      width: 32,
      height: 32,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      letterSpacing: 0.15,
    },
    headerRight: {
      minWidth: 80,
      alignItems: 'flex-end',
    },
    headerCount: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    listContainer: {
      flex: 1,
    },
    listContent: {
      paddingVertical: spacing.xs,
    },

    // Comment row
    commentRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    commentAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    commentAvatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentAvatarInitial: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    commentBody: {
      flex: 1,
      marginLeft: 12,
    },
    commentMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    commentName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    commentDot: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      marginHorizontal: 6,
    },
    commentTimestamp: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    commentText: {
      fontSize: 15,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    commentDivider: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginLeft: spacing.md + 36 + 12, // align under text column
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      marginTop: 4,
    },

    // Skeleton
    skeletonContainer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    skeletonRow: {
      flexDirection: 'row',
      paddingVertical: 10,
    },
    skeletonAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
    },
    skeletonBody: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    skeletonLineShort: {
      width: '40%',
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.surfaceMuted,
      marginBottom: 6,
    },
    skeletonLineLong: {
      width: '90%',
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.surfaceMuted,
    },

    // Composer
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.sm,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    composerAvatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      marginBottom: 4,
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
      marginLeft: 6,
      marginBottom: 0,
    },
  });

export default memo(CommentsSheet);
