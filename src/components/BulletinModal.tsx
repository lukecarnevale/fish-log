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
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import { colors, spacing, borderRadius, typography } from '../styles/common';
import { safeOpenURL } from '../utils/openURL';
import type { Bulletin } from '../types/bulletin';
import { BULLETIN_TYPE_CONFIG } from '../constants/bulletin';
import { formatBulletinDateLong } from '../utils/dateUtils';
import { WaveAccent, WAVE_PRESETS } from './WaveAccent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - spacing.lg * 4; // Modal padding + content padding

// =============================================================================
// Component
// =============================================================================

interface BulletinModalProps {
  visible: boolean;
  bulletin: Bulletin | null;
  onClose: () => void;
  onDismiss?: (bulletinId: string) => void;
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
              onPress={() => safeOpenURL(`mailto:${part}`)}
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
              onPress={() => safeOpenURL(`tel:${digits}`)}
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
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  if (!bulletin) return null;

  const config = BULLETIN_TYPE_CONFIG[bulletin.bulletinType];
  const hasImages = bulletin.imageUrls.length > 0;
  const hasMultipleImages = bulletin.imageUrls.length > 1;

  const handleSourcePress = () => {
    if (bulletin.sourceUrl) {
      safeOpenURL(bulletin.sourceUrl);
    }
  };

  const handleDismiss = () => {
    onDismiss?.(bulletin.id);
  };

  const handleImageScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / IMAGE_WIDTH);
    setActiveImageIndex(index);
  };

  const dateRange = bulletin.effectiveDate || bulletin.expirationDate
    ? bulletin.effectiveDate && bulletin.expirationDate
      ? `${formatBulletinDateLong(bulletin.effectiveDate)} \u2013 ${formatBulletinDateLong(bulletin.expirationDate)}`
      : bulletin.effectiveDate
        ? `Effective ${formatBulletinDateLong(bulletin.effectiveDate)}`
        : `Until ${formatBulletinDateLong(bulletin.expirationDate!)}`
    : null;

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      scrollable={true}
      avoidKeyboard={false}
      closeOnOverlayPress={false}
      containerStyle={styles.modalContainer}
    >
      {/* Type Badge */}
      <View style={[styles.typeBadge, { backgroundColor: config.badgeBg }]}>
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
                  <Pressable key={index} onPress={() => setFullscreenImageUrl(url)}>
                    <Image
                      source={{ uri: url }}
                      style={styles.carouselImage}
                      contentFit="contain"
                      cachePolicy="disk"
                    />
                  </Pressable>
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
            <Pressable onPress={() => setFullscreenImageUrl(bulletin.imageUrls[0])}>
              <Image
                source={{ uri: bulletin.imageUrls[0] }}
                style={styles.singleImage}
                contentFit="contain"
                cachePolicy="disk"
              />
            </Pressable>
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
          <WaveAccent {...WAVE_PRESETS.primary} height={20} />
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

        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissButtonText}>Don't show again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Fullscreen image viewer — rendered inside AnimatedModal so it presents
          on top of the existing native Modal (sibling Modals can't present when
          another Modal already owns the root view controller on iOS). */}
      <Modal
        visible={!!fullscreenImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImageUrl(null)}
      >
        <Pressable
          style={styles.fullscreenOverlay}
          onPress={() => setFullscreenImageUrl(null)}
        >
          <View style={styles.fullscreenCloseRow}>
            <TouchableOpacity
              onPress={() => setFullscreenImageUrl(null)}
              style={styles.fullscreenCloseButton}
              activeOpacity={0.7}
            >
              <Feather name="x" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          {fullscreenImageUrl && (
            <Image
              source={{ uri: fullscreenImageUrl }}
              style={styles.fullscreenImage}
              contentFit="contain"
              cachePolicy="disk"
            />
          )}
        </Pressable>
      </Modal>

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
    fontFamily: 'Georgia',
    color: '#44300A',
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
    color: '#A3865A',
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
    color: '#44300A',
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
    color: '#000000',
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
    color: '#8B7355',
  },
  modalContainer: {
    backgroundColor: '#FFFDF8',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseRow: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  fullscreenCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: '70%',
  },
});

export default BulletinModal;
