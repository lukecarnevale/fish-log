// components/BulletinModal.tsx
//
// Modal for displaying app bulletins (closures, advisories, educational content).
// Uses AnimatedModal for consistent slide-up animation.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import { colors, spacing, borderRadius, typography } from '../styles/common';
import type { Bulletin, BulletinType } from '../types/bulletin';
import { WaveAccent, WAVE_PRESETS } from './WaveAccent';

const BULLETIN_WAVE_MAP: Record<BulletinType, typeof WAVE_PRESETS[keyof typeof WAVE_PRESETS]> = {
  closure: WAVE_PRESETS.error,
  advisory: WAVE_PRESETS.warning,
  educational: WAVE_PRESETS.primary,
  info: WAVE_PRESETS.info,
};

// =============================================================================
// Type-based styling
// =============================================================================

const BULLETIN_CONFIG: Record<
  BulletinType,
  { color: string; icon: keyof typeof Feather.glyphMap; label: string }
> = {
  closure: { color: colors.error, icon: 'alert-octagon', label: 'CLOSURE' },
  advisory: { color: colors.warning, icon: 'alert-triangle', label: 'ADVISORY' },
  educational: { color: colors.primary, icon: 'book-open', label: 'EDUCATIONAL' },
  info: { color: colors.secondary, icon: 'info', label: 'INFO' },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - spacing.lg * 4; // Modal padding + content padding

// =============================================================================
// Component
// =============================================================================

interface BulletinModalProps {
  visible: boolean;
  bulletin: Bulletin | null;
  onClose: () => void;
  onDismiss: (bulletinId: string) => void;
}

/**
 * Parses text and returns Text elements with tappable phone numbers and emails.
 */
const renderLinkedText = (text: string, baseStyle: object) => {
  // Match phone numbers (e.g. 252-515-5638) and emails
  const linkPattern = /([\w.-]+@[\w.-]+\.\w+|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g;
  const parts = text.split(linkPattern);

  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        const isEmail = /^[\w.-]+@[\w.-]+\.\w+$/.test(part);
        const isPhone = /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(part);

        if (isEmail) {
          return (
            <Text
              key={i}
              style={{ color: colors.primary, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(`mailto:${part}`)}
            >
              {part}
            </Text>
          );
        }
        if (isPhone) {
          const digits = part.replace(/\D/g, '');
          return (
            <Text
              key={i}
              style={{ color: colors.primary, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(`tel:${digits}`)}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
};

const BulletinModal: React.FC<BulletinModalProps> = ({
  visible,
  bulletin,
  onClose,
  onDismiss,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!bulletin) return null;

  const config = BULLETIN_CONFIG[bulletin.bulletinType] ?? BULLETIN_CONFIG.info;
  const hasImages = bulletin.imageUrls.length > 0;
  const hasMultipleImages = bulletin.imageUrls.length > 1;

  const handleSourcePress = () => {
    if (bulletin.sourceUrl) {
      Linking.openURL(bulletin.sourceUrl);
    }
  };

  const handleDismiss = () => {
    onDismiss(bulletin.id);
  };

  const handleImageScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / IMAGE_WIDTH);
    setActiveImageIndex(index);
  };

  /**
   * Format a date range for display.
   */
  const formatDateRange = (): string | null => {
    if (!bulletin.effectiveDate && !bulletin.expirationDate) return null;

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    if (bulletin.effectiveDate && bulletin.expirationDate) {
      return `${formatDate(bulletin.effectiveDate)} \u2013 ${formatDate(bulletin.expirationDate)}`;
    }
    if (bulletin.effectiveDate) {
      return `Effective ${formatDate(bulletin.effectiveDate)}`;
    }
    return `Until ${formatDate(bulletin.expirationDate!)}`;
  };

  const dateRange = formatDateRange();

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      scrollable={true}
      avoidKeyboard={false}
      closeOnOverlayPress={false}
    >
      {/* Type Badge */}
      <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
        <Feather name={config.icon} size={14} color={config.color} />
        <Text style={[styles.typeBadgeText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{bulletin.title}</Text>

      {/* Date Range */}
      {dateRange && (
        <View style={styles.dateContainer}>
          <Feather name="calendar" size={14} color={config.color} />
          <Text style={[styles.dateText, { color: config.color }]}>
            {dateRange}
          </Text>
        </View>
      )}

      {/* Images */}
      {hasImages && (
        <View style={styles.imageSection}>
          {hasMultipleImages ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleImageScroll}
                style={styles.imageCarousel}
              >
                {bulletin.imageUrls.map((url, index) => (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    style={styles.carouselImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ))}
              </ScrollView>
              {/* Pagination dots */}
              <View style={styles.paginationDots}>
                {bulletin.imageUrls.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === activeImageIndex && [
                        styles.dotActive,
                        { backgroundColor: config.color },
                      ],
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <Image
              source={{ uri: bulletin.imageUrls[0] }}
              style={styles.singleImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          )}
        </View>
      )}

      {/* Description */}
      {bulletin.description && renderLinkedText(bulletin.description, styles.description)}

      {/* Notes callout */}
      {bulletin.notes && (
        <View style={styles.notesContainer}>
          <Feather
            name="info"
            size={16}
            color={config.color}
            style={styles.notesIcon}
          />
          {renderLinkedText(bulletin.notes, styles.notesText)}
          <WaveAccent {...(BULLETIN_WAVE_MAP[bulletin.bulletinType] ?? WAVE_PRESETS.primary)} height={20} />
        </View>
      )}

      {/* Source link */}
      {bulletin.sourceUrl && (
        <TouchableOpacity
          style={styles.sourceLink}
          onPress={handleSourcePress}
          activeOpacity={0.7}
        >
          <Feather name="external-link" size={14} color={colors.primary} />
          <Text style={styles.sourceLinkText}>
            {bulletin.sourceLabel ?? 'Read more'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: config.color }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Got It</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissButtonText}>Don't show again</Text>
        </TouchableOpacity>
      </View>
    </AnimatedModal>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.circle,
    marginBottom: spacing.md,
  },
  typeBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: spacing.xxs,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightestGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  dateText: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  imageSection: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  imageCarousel: {
    borderRadius: borderRadius.md,
  },
  carouselImage: {
    width: IMAGE_WIDTH,
    height: 180,
    borderRadius: borderRadius.md,
  },
  singleImage: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lightGray,
    marginHorizontal: 3,
  },
  dotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  description: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  notesContainer: {
    flexDirection: 'row',
    backgroundColor: colors.lightestGray,
    padding: spacing.md,
    paddingBottom: spacing.md + 20,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  notesIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  notesText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sourceLinkText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xxs,
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
  },
  dismissButtonText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});

export default BulletinModal;
