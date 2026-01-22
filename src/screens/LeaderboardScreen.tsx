// screens/LeaderboardScreen.tsx

import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  ListRenderItem,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import { RootStackParamList } from "../types";
import { LeaderboardEntry, SpeciesLeaderboard, LeaderboardTimeframe } from "../types/leaderboard";
// Updated LeaderboardCategory type to include my_stats
type LeaderboardCategory = "most_fish" | "biggest_catch" | "species_specific" | "my_stats";
import styles from "../styles/leaderboardStyles";
import { colors, spacing } from "../styles/common";
import { sampleLeaderboardEntries, speciesLeaderboards } from "../data/leaderboardData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenLayout from "../components/ScreenLayout";

type LeaderboardScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Leaderboard"
>;

interface LeaderboardScreenProps {
  navigation: LeaderboardScreenNavigationProp;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [userSharesData, setUserSharesData] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>("all_time");
  const [category, setCategory] = useState<LeaderboardCategory>("most_fish");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("Red Drum");
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [speciesEntries, setSpeciesEntries] = useState<SpeciesLeaderboard["entries"]>([]);

  // Load leaderboard data and user privacy preferences
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user privacy setting
        const sharesData = await AsyncStorage.getItem("sharesLeaderboardData");
        if (sharesData !== null) {
          setUserSharesData(sharesData === "true");
        } else {
          // First-time user, show privacy modal
          setShowPrivacyModal(true);
        }

        // In a real app, you would fetch this data from an API
        // For now, we'll use sample data
        setLeaderboardEntries(sampleLeaderboardEntries);
        
        if (speciesLeaderboards[selectedSpecies]) {
          setSpeciesEntries(speciesLeaderboards[selectedSpecies].entries);
        }
      } catch (error) {
        console.error("Error loading leaderboard data:", error);
        Alert.alert("Error", "Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedSpecies]);

  // Save user privacy preference
  const savePrivacyPreference = async (shares: boolean) => {
    try {
      await AsyncStorage.setItem("sharesLeaderboardData", shares ? "true" : "false");
      setUserSharesData(shares);
      setShowPrivacyModal(false);
    } catch (error) {
      console.error("Error saving privacy preference:", error);
      Alert.alert("Error", "Failed to save privacy setting");
    }
  };

  // Filter and sort entries based on category and timeframe
  const getFilteredEntries = (): LeaderboardEntry[] => {
    let filtered = [...leaderboardEntries];
    
    // Filter by timeframe
    if (timeframe !== "all_time") {
      const now = new Date();
      let cutoffDate = new Date();
      
      if (timeframe === "this_week") {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (timeframe === "this_month") {
        cutoffDate.setMonth(now.getMonth() - 1);
      } else if (timeframe === "this_year") {
        cutoffDate.setFullYear(now.getFullYear() - 1);
      }
      
      filtered = filtered.filter(entry => new Date(entry.lastCatch) >= cutoffDate);
    }
    
    // Sort by category
    if (category === "most_fish") {
      filtered.sort((a, b) => b.fishCount - a.fishCount);
    } else if (category === "biggest_catch") {
      filtered.sort((a, b) => {
        const weightA = a.biggestCatch?.weight ? parseFloat(a.biggestCatch.weight) : 0;
        const weightB = b.biggestCatch?.weight ? parseFloat(b.biggestCatch.weight) : 0;
        return weightB - weightA;
      });
    }
    
    return filtered;
  };

  // Render individual leaderboard entry
  const renderLeaderboardItem: ListRenderItem<LeaderboardEntry> = ({ item, index }) => (
    <View style={styles.leaderCard}>
      <View style={[styles.rankContainer, index < 3 && styles.rankTop3]}>
        <Text style={[styles.rankText, index < 3 && styles.rankTop3Text]}>
          {index + 1}
        </Text>
      </View>
      
      <View style={styles.userInfoContainer}>
        <Text style={styles.userName}>{item.userName}</Text>
        <View style={styles.userStatsRow}>
          <Text style={styles.userStat}>
            {category === "most_fish" 
              ? `${item.fishCount} fish caught` 
              : `${item.biggestCatch?.species}: ${item.biggestCatch?.weight} lbs`
            }
          </Text>
          <Text style={styles.userStat}>
            {item.badges.length > 0 && `${item.badges.length} badges`}
          </Text>
        </View>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>
          {category === "most_fish" 
            ? item.fishCount 
            : item.biggestCatch?.weight
          }
        </Text>
        <Text style={styles.scoreLabel}>
          {category === "most_fish" ? "Fish" : "Pounds"}
        </Text>
        
        {item.badges.length > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{item.badges.length}</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Render individual species leaderboard entry
  const renderSpeciesLeaderboardItem: ListRenderItem<SpeciesLeaderboard["entries"][0]> = ({ item, index }) => (
    <View style={styles.leaderCard}>
      <View style={[styles.rankContainer, index < 3 && styles.rankTop3]}>
        <Text style={[styles.rankText, index < 3 && styles.rankTop3Text]}>
          {index + 1}
        </Text>
      </View>
      
      <View style={styles.userInfoContainer}>
        <Text style={styles.userName}>{item.userName}</Text>
        <View style={styles.userStatsRow}>
          <Text style={styles.userStat}>
            {`${item.length}" length, ${item.weight} lbs`}
          </Text>
          <Text style={styles.userStat}>
            {new Date(item.date).toLocaleDateString("en-US", { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
        </View>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>
          {item.weight}
        </Text>
        <Text style={styles.scoreLabel}>
          Pounds
        </Text>
      </View>
    </View>
  );

  // Render privacy settings modal
  const renderPrivacyModal = () => (
    <Modal
      visible={showPrivacyModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPrivacyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Share Your Fishing Data</Text>
          <Text style={styles.modalText}>
            Would you like to share your fishing data on the leaderboard? Your name, catch details, and stats will be visible to other anglers.
            {"\n\n"}
            You can change this setting at any time.
          </Text>
          
          <View style={styles.modalButtonsRow}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSecondaryButton]}
              onPress={() => savePrivacyPreference(false)}
            >
              <Text style={[styles.modalButtonText, styles.modalSecondaryButtonText]}>
                No, Thanks
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalPrimaryButton]}
              onPress={() => savePrivacyPreference(true)}
            >
              <Text style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>
                Share My Data
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render user stats summary card
  const renderUserStats = () => {
    // In a real app, you would fetch and calculate these stats
    const userStats = {
      rank: 12,
      totalCatches: 32,
      biggestCatch: '18.5 lbs',
      species: 'Red Drum',
      monthlyRank: 8
    };
    
    return (
      <View style={styles.statsCard}>
        <Text style={styles.statsHeader}>Your Ranking</Text>
        
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Overall Rank</Text>
          <Text style={styles.statsValue}>#{userStats.rank}</Text>
        </View>
        
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Total Catches</Text>
          <Text style={styles.statsValue}>{userStats.totalCatches}</Text>
        </View>
        
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Biggest Catch</Text>
          <Text style={styles.statsValue}>{userStats.biggestCatch} ({userStats.species})</Text>
        </View>
        
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>This Month</Text>
          <Text style={styles.statsValue}>Rank #{userStats.monthlyRank}</Text>
        </View>
      </View>
    );
  };

  // Main render function
  if (loading) {
    return (
      <ScreenLayout
        navigation={navigation}
        title="Angler Leaderboard"
        noScroll
        loading={loading}
        loadingComponent={<ActivityIndicator size="large" color={colors.primary} />}
      />
    );
  }

  return (
    <ScreenLayout
      navigation={navigation}
      title="Angler Leaderboard"
      subtitle="See how you rank against other NC anglers"
      noScroll
    >
      {/* Main tabs: Leaderboard and Your Stats */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[
            styles.mainTab,
            category !== "my_stats" && styles.activeMainTab
          ]}
          onPress={() => setCategory(category === "my_stats" ? "most_fish" : category)}
        >
          <Text
            style={[
              styles.mainTabText,
              category !== "my_stats" && styles.activeMainTabText
            ]}
          >
            Leaderboard
          </Text>
        </TouchableOpacity>

        {userSharesData && (
          <TouchableOpacity
            style={[
              styles.mainTab,
              category === "my_stats" && styles.activeMainTab
            ]}
            onPress={() => setCategory("my_stats")}
          >
            <Text
              style={[
                styles.mainTabText,
                category === "my_stats" && styles.activeMainTabText
              ]}
            >
              Your Stats
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content based on selected main tab */}
      {category === "my_stats" ? (
        /* Your Stats View */
        <ScrollView style={styles.statsScrollView}>
          {renderUserStats()}
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ReportForm")}
            >
              <Feather name="file-plus" size={20} color={colors.white} style={styles.actionButtonIcon} />
              <Text style={styles.actionButtonText}>Report New Catch</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* Leaderboard View */
        <>
          {/* Category selector */}
          <View style={styles.segmentControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                category === "most_fish" && styles.activeSegment
              ]}
              onPress={() => setCategory("most_fish")}
            >
              <Text
                style={[
                  styles.segmentText,
                  category === "most_fish" && styles.activeSegmentText
                ]}
              >
                Most Fish
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                category === "biggest_catch" && styles.activeSegment
              ]}
              onPress={() => setCategory("biggest_catch")}
            >
              <Text
                style={[
                  styles.segmentText,
                  category === "biggest_catch" && styles.activeSegmentText
                ]}
              >
                Biggest Catch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                category === "species_specific" && styles.activeSegment
              ]}
              onPress={() => setCategory("species_specific")}
            >
              <Text
                style={[
                  styles.segmentText,
                  category === "species_specific" && styles.activeSegmentText
                ]}
              >
                By Species
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Time Period</Text>
            <View style={styles.filterButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  timeframe === "all_time" && styles.filterActiveButton
                ]}
                onPress={() => setTimeframe("all_time")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    timeframe === "all_time" && styles.filterActiveButtonText
                  ]}
                >
                  All Time
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  timeframe === "this_year" && styles.filterActiveButton
                ]}
                onPress={() => setTimeframe("this_year")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    timeframe === "this_year" && styles.filterActiveButtonText
                  ]}
                >
                  This Year
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  timeframe === "this_month" && styles.filterActiveButton
                ]}
                onPress={() => setTimeframe("this_month")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    timeframe === "this_month" && styles.filterActiveButtonText
                  ]}
                >
                  This Month
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  timeframe === "this_week" && styles.filterActiveButton
                ]}
                onPress={() => setTimeframe("this_week")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    timeframe === "this_week" && styles.filterActiveButtonText
                  ]}
                >
                  This Week
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Species selector (only shown when category is species_specific) */}
          {category === "species_specific" && (
            <View style={[styles.filterContainer, { marginBottom: spacing.xl }]}>
              <Text style={styles.filterLabel}>Fish Species</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.filterButtonsRow}>
                  {Object.keys(speciesLeaderboards).map((species) => (
                    <TouchableOpacity
                      key={species}
                      style={[
                        styles.filterButton,
                        selectedSpecies === species && styles.filterActiveButton
                      ]}
                      onPress={() => setSelectedSpecies(species)}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          selectedSpecies === species && styles.filterActiveButtonText
                        ]}
                      >
                        {species}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {/* Extra padding view to create more space for first item's badge */}
              <View style={{ height: 12 }} />
            </View>
          )}

          {/* Leaderboard list */}
          {category === "species_specific" ? (
            <FlatList
              data={speciesEntries}
              renderItem={renderSpeciesLeaderboardItem}
              keyExtractor={(item, index) => `species-${item.userId}-${index}`}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No data available for this species in the selected time period.
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={getFilteredEntries()}
              renderItem={renderLeaderboardItem}
              keyExtractor={(item) => `entry-${item.userId}`}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No data available for the selected filters.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Privacy settings modal */}
      {renderPrivacyModal()}
    </ScreenLayout>
  );
};

export default LeaderboardScreen;