// components/PrizesComponent.tsx
//
// Displays the Quarterly Rewards program information on the home screen.
// Uses centralized RewardsContext for data management.
//

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { colors } from '../styles/common';
import styles from '../styles/prizeComponentStyles';
import { RootStackParamList } from '../types';
import { Prize, PrizeCategory } from '../types/rewards';
import { useRewards } from '../contexts/RewardsContext';

type PrizesComponentNavigationProp = StackNavigationProp<RootStackParamList>;

interface PrizesComponentProps {
  onReportPress?: () => void;
}

/**
 * Map prize category to Feather icon name.
 */
const CATEGORY_ICONS: Record<PrizeCategory, keyof typeof Feather.glyphMap> = {
  license: 'credit-card',
  gear: 'anchor',
  apparel: 'shopping-bag',
  experience: 'compass',
  other: 'gift',
};

/**
 * Get icon name for a prize category.
 */
function getPrizeIcon(category: PrizeCategory): keyof typeof Feather.glyphMap {
  return CATEGORY_ICONS[category] || 'gift';
}

/**
 * Format a date string for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const PrizesComponent: React.FC<PrizesComponentProps> = ({ onReportPress }) => {
  const navigation = useNavigation<PrizesComponentNavigationProp>();
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Get rewards data from centralized context
  const {
    currentDrawing,
    config,
    isLoading,
    error,
    calculated,
    hasEnteredCurrentRaffle,
  } = useRewards();

  // Handle loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', minHeight: 200 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading rewards...</Text>
      </View>
    );
  }

  // Handle error or no drawing state
  if (error || !currentDrawing) {
    return (
      <View style={[styles.container, { padding: 20 }]}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {error || 'No active rewards program at this time.'}
        </Text>
      </View>
    );
  }

  // Handle navigation to report form
  const handleReportPress = () => {
    if (onReportPress) {
      onReportPress();
    } else {
      navigation.navigate('ReportForm');
    }
  };

  // Render individual prize card
  const renderPrizeCard = (prize: Prize) => (
    <View key={prize.id} style={styles.prizeCard}>
      <View style={styles.prizeImage}>
        <Feather
          name={getPrizeIcon(prize.category)}
          size={40}
          color={colors.primary}
          style={{ alignSelf: 'center', marginTop: 24 }}
        />
      </View>
      <View style={styles.prizeContent}>
        <Text style={styles.prizeName}>{prize.name}</Text>
        <Text style={styles.prizeValue}>Value: {prize.value}</Text>
      </View>
    </View>
  );

  // Render the details modal
  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.modalHeader}>{currentDrawing.name}</Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalText}>{currentDrawing.description}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Entry Period</Text>
              <Text style={styles.modalText}>
                Start: {formatDate(currentDrawing.startDate)}
              </Text>
              <Text style={styles.modalText}>
                End: {formatDate(currentDrawing.endDate)}
              </Text>
              <Text style={styles.modalText}>
                Drawing Date: {formatDate(currentDrawing.drawingDate)}
              </Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Prize List</Text>
              <View style={styles.modalPrizeList}>
                {currentDrawing.prizes.map((prize) => (
                  <View key={prize.id} style={styles.modalPrizeItem}>
                    <Feather
                      name={getPrizeIcon(prize.category)}
                      size={20}
                      color={colors.primary}
                      style={styles.modalPrizeIcon}
                    />
                    <Text style={styles.modalPrizeText}>
                      {prize.name} ({prize.value})
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Eligibility Requirements</Text>
              {currentDrawing.eligibilityRequirements.map((requirement, index) => (
                <Text key={index} style={styles.modalText}>
                  • {requirement}
                </Text>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Your Eligibility</Text>
              <Text style={styles.modalText}>
                You are {hasEnteredCurrentRaffle ? 'eligible' : 'not yet eligible'} for this quarter's drawing.
              </Text>
              <Text style={styles.modalText}>
                {config?.alternativeEntryText || 'Submit a harvest report to be automatically entered. No purchase or report necessary.'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header with background image */}
      <ImageBackground
        source={require('../assets/fish-logo.png')}
        style={styles.headerContainer}
        resizeMode="cover"
      >
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{currentDrawing.name}</Text>
            <Text style={styles.headerSubtitle}>Active contributors can win gear & prizes!</Text>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {calculated.quarterDisplay} Drawing: {new Date(currentDrawing.drawingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </ImageBackground>

      {/* Progress bar showing time elapsed in rewards period */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${calculated.periodProgress}%` },
            ]}
          />
        </View>
      </View>

      {/* Info section */}
      <View style={styles.infoContainer}>
        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => setShowDetailsModal(true)}
        >
          <View style={styles.infoIcon}>
            <Feather name="info" size={18} color={colors.primary} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>How It Works</Text>
            <Text style={styles.infoText}>
              {config?.noPurchaseNecessaryText || 'Submit harvest reports to be eligible for quarterly prize drawings.'}{'\n'}
              {config?.noPurchaseNecessaryText ? '' : 'No purchase or report necessary to enter.'}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Feather name="calendar" size={18} color={colors.primary} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Drawing Date</Text>
            <Text style={styles.infoText}>
              Winners selected at the end of each quarter.{'\n'}
              Next drawing: {calculated.formattedDrawingDate}
            </Text>
          </View>
        </View>
      </View>

      {/* Featured prizes carousel */}
      <View style={styles.carouselContainer}>
        <Text style={styles.carouselTitle}>Current Quarter Prizes</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          scrollEnabled={true}
          directionalLockEnabled={true}
          alwaysBounceHorizontal={true}
        >
          {currentDrawing.prizes.map(renderPrizeCard)}
        </ScrollView>
      </View>

      {/* Info bubble - clickable to navigate to Profile */}
      <TouchableOpacity
        style={styles.infoBubble}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.8}
      >
        <Feather
          name="bell"
          size={20}
          color={colors.white}
          style={styles.infoBubbleIcon}
        />
        <Text style={styles.infoBubbleText}>
          Selected contributors will be notified via email. Make sure your account info is up to date!
        </Text>
        <Feather
          name="chevron-right"
          size={18}
          color={colors.white}
          style={{ opacity: 0.8 }}
        />
      </TouchableOpacity>

      {/* Footer with call to action */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Report your catches to support NC fisheries data.
        </Text>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={handleReportPress}
        >
          <Feather name="file-plus" size={16} color={colors.white} />
          <Text style={styles.reportButtonText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Details modal */}
      {renderDetailsModal()}
    </View>
  );
};

export default PrizesComponent;
