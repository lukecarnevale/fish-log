// components/CatchPhotoReorder.tsx
//
// Horizontal, drag-to-reorder thumbnail row used in the catch_log branch of
// ReportFormScreen. First photo is the "cover" that shows up in feed previews;
// users reorder with a long-press-and-drag gesture (iOS/Android-familiar), and
// can remove an individual photo with the X button.

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { spacing, borderRadius } from '../styles/common';

interface CatchPhotoReorderProps {
  photos: string[];
  onReorder: (photos: string[]) => void;
  onRemove: (index: number) => void;
  /** Disabled during uploads; prevents reorder/remove mid-submit. */
  disabled?: boolean;
}

const CatchPhotoReorder: React.FC<CatchPhotoReorderProps> = ({
  photos,
  onReorder,
  onRemove,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const handleDragEnd = useCallback(
    ({ data }: { data: string[] }) => {
      if (disabled) return;
      onReorder(data);
    },
    [onReorder, disabled],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<string>) => {
      const index = getIndex() ?? 0;
      const isCover = index === 0;

      return (
        <ScaleDecorator>
          <TouchableOpacity
            onLongPress={drag}
            disabled={disabled || isActive}
            style={[styles.thumb, isActive && styles.thumbActive]}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={
              isCover
                ? `Cover photo, position ${index + 1} of ${photos.length}. Long press to reorder.`
                : `Photo ${index + 1} of ${photos.length}. Long press to reorder.`
            }
          >
            <Image
              source={{ uri: item }}
              style={styles.thumbImage}
              contentFit="cover"
              transition={150}
              cachePolicy="memory"
              recyclingKey={`catch-photo-${item}`}
            />

            {/* Cover badge on the first photo so users know reordering affects
                which image shows on the feed preview. */}
            {isCover && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Cover</Text>
              </View>
            )}

            {/* Remove-photo button (top-right X). Larger hitSlop so it's easy
                to tap without accidentally triggering the drag long-press. */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                if (!disabled) onRemove(index);
              }}
              disabled={disabled}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${index + 1}`}
            >
              <Feather name="x" size={14} color={theme.colors.white} />
            </TouchableOpacity>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [styles, theme.colors.white, disabled, onRemove, photos.length],
  );

  if (photos.length === 0) {
    return null;
  }

  return (
    <DraggableFlatList
      horizontal
      data={photos}
      onDragEnd={handleDragEnd}
      keyExtractor={(uri) => uri}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsHorizontalScrollIndicator={false}
      activationDistance={12}
    />
  );
};

const THUMB_SIZE = 88;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    listContent: {
      paddingVertical: spacing.xs,
      gap: spacing.sm,
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.lightestGray,
      marginRight: spacing.sm,
      // Subtle shadow to differentiate the draggable item from the form bg.
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    thumbActive: {
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    thumbImage: {
      width: '100%',
      height: '100%',
    },
    coverBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    coverBadgeText: {
      color: theme.colors.textOnPrimary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default CatchPhotoReorder;
