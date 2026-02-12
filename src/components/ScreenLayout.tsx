// components/ScreenLayout.tsx
//
// Reusable screen layout component that provides consistent UI patterns:
// - SafeAreaView with edges=["left", "right"] (no bottom bar issues)
// - Header with dark blue background, back button, centered title, optional subtitle
// - ScrollView with proper bounce colors (dark blue top, light background bottom)
// - Content container with flexGrow: 1

import React, { ReactNode, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  RefreshControl,
  ScrollViewProps,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../styles/common';

interface ScreenLayoutProps {
  // Navigation (required for back button)
  navigation: { goBack: () => void };

  // Header content
  title: string;
  subtitle?: string;

  // Optional header customization
  showBackButton?: boolean;
  headerRight?: ReactNode;

  // Content - use children for ScrollView content, or renderContent for non-scrollable
  children?: ReactNode;

  // If true, uses FlatList-style layout (no ScrollView wrapper)
  noScroll?: boolean;

  // Pull to refresh support
  refreshing?: boolean;
  onRefresh?: () => void;

  // Custom styles
  contentContainerStyle?: ViewStyle;
  headerStyle?: ViewStyle;

  // Loading state
  loading?: boolean;
  loadingComponent?: ReactNode;

  // ScrollView ref for programmatic scrolling
  scrollViewRef?: React.RefObject<ScrollView | null>;

  // Additional ScrollView props
  scrollViewProps?: ScrollViewProps;
}

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  navigation,
  title,
  subtitle,
  showBackButton = true,
  headerRight,
  children,
  noScroll = false,
  refreshing,
  onRefresh,
  contentContainerStyle,
  headerStyle,
  loading = false,
  loadingComponent,
  scrollViewRef,
  scrollViewProps,
}) => {
  const internalScrollRef = useRef<ScrollView>(null);
  const activeScrollRef = scrollViewRef || internalScrollRef;

  // Loading state render
  if (loading && loadingComponent) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />
        <View style={styles.loadingContainer}>
          {loadingComponent}
        </View>
      </SafeAreaView>
    );
  }

  // Header component
  const renderHeader = () => (
    <View style={[styles.header, headerStyle]}>
      <View style={styles.headerRow}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <Text style={styles.headerTitle}>{title}</Text>

        {headerRight || <View style={styles.headerSpacer} />}
      </View>

      {subtitle && (
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      )}
    </View>
  );

  // Non-scrollable layout (for screens using FlatList)
  if (noScroll) {
    return (
      <SafeAreaView style={styles.noScrollContainer} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />
        {renderHeader()}
        <View style={styles.noScrollContentWrapper}>
          <View style={[styles.noScrollContent, contentContainerStyle]}>
            {children}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Scrollable layout with bounce areas
  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />
      <ScrollView
        ref={activeScrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing || false}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        {...scrollViewProps}
      >
        {/* Top bounce area - dark blue for overscroll at top */}
        <View style={styles.topBounceArea} />

        {/* Header */}
        {renderHeader()}

        {/* Content area */}
        <View style={styles.contentArea}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, // Dark background for status bar visibility
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  topBounceArea: {
    position: 'absolute',
    top: -500,
    left: 0,
    right: 0,
    height: 500,
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    fontSize: 20,
    textAlign: 'center',
    flex: 1,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  noScrollContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  noScrollContentWrapper: {
    flex: 1,
    zIndex: 20,
    elevation: 20,
  },
  noScrollContent: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },
});

export default ScreenLayout;
