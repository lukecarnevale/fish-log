// components/FollowListSheet.tsx
//
// Bottom sheet that lists either followers or following for an angler.
// Reuses the slide-up + scrim pattern from CommentsSheet (no @gorhom dep).
//
// Tap a member → onSelectMember fires (parent navigates to that profile).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { spacing, borderRadius } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { useFollowersList, useFollowingList } from '../api/followsApi';
import { FollowListMember } from '../services/followsService';

const SHEET_HEIGHT_RATIO = 0.75;

interface FollowListSheetProps {
  visible: boolean;
  mode: 'followers' | 'following';
  /** The user whose list to show. */
  targetUserId: string;
  onClose: () => void;
  onSelectMember: (member: FollowListMember) => void;
}

const FollowListSheet: React.FC<FollowListSheetProps> = ({
  visible,
  mode,
  targetUserId,
  onClose,
  onSelectMember,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const screenHeight = Dimensions.get('window').height;
  const sheetHeight = screenHeight * SHEET_HEIGHT_RATIO;

  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  // Open/close animation — same shape as CommentsSheet.
  useEffect(() => {
    if (visible) {
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
        if (finished) setRendered(false);
      });
    }
  }, [visible, rendered, anim]);

  const overlayOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight, 0],
  });

  // Only mount the query when this sheet is visible to avoid wasted fetches.
  const followersQuery = useFollowersList(
    mode === 'followers' && visible ? targetUserId : null,
  );
  const followingQuery = useFollowingList(
    mode === 'following' && visible ? targetUserId : null,
  );

  const query = mode === 'followers' ? followersQuery : followingQuery;
  const data = query.data ?? [];
  const loading = query.isLoading;

  const title = useMemo(
    () => (mode === 'followers' ? 'Followers' : 'Following'),
    [mode],
  );

  const renderMember = ({ item }: { item: FollowListMember }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onSelectMember(item)}
      activeOpacity={0.85}
    >
      {item.profileImage ? (
        <Image
          source={{ uri: item.profileImage }}
          style={styles.avatar}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.name}>{item.displayName}</Text>
      <Feather name="chevron-right" size={18} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[styles.scrim, { opacity: overlayOpacity }]}
          pointerEvents="none"
        />
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrimTouchable} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.sheet, { height: sheetHeight, transform: [{ translateY }] }]}
        >
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.headerClose}
            >
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerRight}>
              {!loading && data.length > 0 && (
                <Text style={styles.headerCount}>{data.length}</Text>
              )}
            </View>
          </View>

          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : data.length === 0 ? (
              <View style={styles.centerState}>
                <Feather
                  name={mode === 'followers' ? 'users' : 'user-plus'}
                  size={36}
                  color={theme.colors.textTertiary}
                />
                <Text style={styles.emptyText}>
                  {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={data}
                keyExtractor={(m) => m.userId}
                renderItem={renderMember}
                ItemSeparatorComponent={() => <View style={styles.divider} />}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    scrimTouchable: { ...StyleSheet.absoluteFillObject },
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
    handleContainer: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
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
    headerRight: { minWidth: 40, alignItems: 'flex-end' },
    headerCount: { fontSize: 13, color: theme.colors.textTertiary, fontWeight: '600' },

    listContainer: { flex: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '700',
    },
    name: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginLeft: spacing.md + 44 + 12,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
  });

export default FollowListSheet;
