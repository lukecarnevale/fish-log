// screens/CatchFeedScreen.tsx
//
// Catch Feed - a community catch-sharing feed where rewards-enrolled users
// can share their catches in a social feed format with tappable angler profiles.
//

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { CatchFeedEntry } from '../types/catchFeed';
import { fetchRecentCatches } from '../services/catchFeedService';
import { sampleCatchFeedEntries, getSampleAnglerProfile } from '../data/catchFeedData';
import { colors, spacing, borderRadius, typography } from '../styles/common';
import ScreenLayout from '../components/ScreenLayout';
import CatchCard from '../components/CatchCard';
import AnglerProfileModal from '../components/AnglerProfileModal';
import { SCREEN_LABELS } from '../constants/screenLabels';

// Use sample data for development (set to false when Supabase is ready)
const USE_SAMPLE_DATA = false;

type CatchFeedScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CatchFeed'
>;

interface CatchFeedScreenProps {
  navigation: CatchFeedScreenNavigationProp;
}

const CatchFeedScreen: React.FC<CatchFeedScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<CatchFeedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Angler profile modal state
  const [selectedAnglerId, setSelectedAnglerId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load catch feed data
  const loadFeed = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);

      let feedData: CatchFeedEntry[];

      if (USE_SAMPLE_DATA) {
        // Use sample data for development
        await new Promise<void>((resolve) => setTimeout(resolve, 500)); // Simulate delay
        feedData = sampleCatchFeedEntries;
      } else {
        // Use Supabase data
        feedData = await fetchRecentCatches({ forceRefresh });
      }

      setEntries(feedData);
    } catch (err) {
      console.error('Error loading catch feed:', err);
      setError('Unable to load catches. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed(true);
  }, [loadFeed]);

  // Handle angler tap
  const handleAnglerPress = useCallback((userId: string) => {
    setSelectedAnglerId(userId);
    setShowProfileModal(true);
  }, []);

  // Close profile modal
  const handleCloseProfile = useCallback(() => {
    setShowProfileModal(false);
    setSelectedAnglerId(null);
  }, []);

  // Render header actions
  const renderHeaderRight = () => (
    <TouchableOpacity
      style={styles.headerButton}
      onPress={handleRefresh}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="refresh-cw" size={20} color={colors.white} />
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Feather name="camera" size={48} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Catches Yet</Text>
      <Text style={styles.emptyText}>
        Be the first to share your catch! Submit a harvest report to appear in the feed.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('ReportForm')}
      >
        <Feather name="plus" size={18} color={colors.white} />
        <Text style={styles.emptyButtonText}>Report a Catch</Text>
      </TouchableOpacity>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="wifi-off" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>Connection Error</Text>
      <Text style={styles.emptyText}>{error}</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => loadFeed(true)}>
        <Feather name="refresh-cw" size={18} color={colors.white} />
        <Text style={styles.emptyButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render catch card item
  const renderItem = ({ item }: { item: CatchFeedEntry }) => (
    <CatchCard entry={item} onAnglerPress={handleAnglerPress} />
  );

  // Key extractor for FlatList
  const keyExtractor = (item: CatchFeedEntry) => item.id;

  // Render the feed content
  const renderFeedContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading catches...</Text>
        </View>
      );
    }

    if (error) {
      return renderErrorState();
    }

    if (entries.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Showing catches from rewards members
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenLayout
        navigation={navigation}
        title={SCREEN_LABELS.catchFeed.title}
        subtitle="Community catches from NC anglers"
        headerRight={renderHeaderRight()}
        noScroll
      >
        {renderFeedContent()}
      </ScreenLayout>

      {/* Angler Profile Modal */}
      <AnglerProfileModal
        visible={showProfileModal}
        userId={selectedAnglerId}
        onClose={handleCloseProfile}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: spacing.xs,
  },
});

export default CatchFeedScreen;
