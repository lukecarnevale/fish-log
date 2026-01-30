// components/QuarterlyRewardsCard.tsx
//
// Redesigned Quarterly Rewards card with cohesive styling.
// Drop-in replacement for PrizesComponent.
//

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Ellipse, Circle, G, Rect } from 'react-native-svg';

import { colors } from '../styles/common';
import { RootStackParamList } from '../types';
import { Prize, PrizeCategory } from '../types/rewards';
import { useRewards } from '../contexts/RewardsContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface QuarterlyRewardsCardProps {
  onReportPress?: () => void;
  /** Whether the user is signed in (rewards member) */
  isSignedIn?: boolean;
}

// ============================================
// SVG ILLUSTRATIONS
// ============================================

/** Wave background for hero section */
const WaveBackground: React.FC = () => (
  <Svg
    style={StyleSheet.absoluteFill}
    viewBox="0 0 400 200"
    preserveAspectRatio="xMidYMid slice"
  >
    <Path
      d="M-100 120 Q-25 100 50 120 Q125 140 200 120 Q275 100 350 120 Q425 140 500 120 L500 200 L-100 200 Z"
      fill="white"
      opacity={0.05}
    />
    <Path
      d="M-50 145 Q25 125 100 145 Q175 165 250 145 Q325 125 400 145 Q475 165 550 145 L550 200 L-50 200 Z"
      fill="white"
      opacity={0.07}
    />
    <Path
      d="M-80 170 Q-5 155 70 170 Q145 185 220 170 Q295 155 370 170 Q445 185 520 170 L520 200 L-80 200 Z"
      fill="white"
      opacity={0.05}
    />
  </Svg>
);

/** Fish illustration for hero section */
const HeroFishIllustration: React.FC = () => (
  <Svg width={90} height={70} viewBox="0 0 90 70">
    {/* Yellow fish */}
    <G transform="translate(25, 35)">
      <Ellipse cx={28} cy={14} rx={26} ry={12} fill="#FFB74D" opacity={0.9} />
      <Ellipse cx={28} cy={18} rx={20} ry={6} fill="#FFE082" opacity={0.9} />
      <Path d="M52 14 Q66 5 61 14 Q66 23 52 14" fill="#FF8F00" opacity={0.9} />
      <Circle cx={10} cy={12} r={3.5} fill="white" />
      <Circle cx={11} cy={12} r={2} fill="#1A1A1A" />
    </G>
    {/* Light/ghost fish */}
    <G transform="translate(0, 5)">
      <Ellipse cx={24} cy={12} rx={22} ry={10} fill="white" opacity={0.25} />
      <Ellipse cx={24} cy={15} rx={17} ry={5.5} fill="white" opacity={0.15} />
      <Path d="M44 12 Q56 4 52 12 Q56 20 44 12" fill="white" opacity={0.2} />
      <Circle cx={9} cy={10} r={3} fill="white" opacity={0.4} />
    </G>
  </Svg>
);

/** Prize illustration - Fishing Rod & Reel */
const FishingRodIllustration: React.FC = () => (
  <Svg width={60} height={50} viewBox="0 0 70 55">
    <Path
      d="M10 48 L10 18 Q10 12 16 10 L55 10"
      stroke="#8D6E63"
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx={10} cy={38} r={7} fill="#5D4037" />
    <Circle cx={10} cy={38} r={4} fill="#8D6E63" />
    <Path d="M55 10 L55 24" stroke="#90A4AE" strokeWidth={1.5} />
    <G transform="translate(42, 26)">
      <Ellipse cx={13} cy={7} rx={12} ry={5.5} fill="#FFB74D" />
      <Ellipse cx={13} cy={9} rx={9} ry={3} fill="#FFE082" />
      <Path d="M24 7 Q30 3 28 7 Q30 11 24 7" fill="#FF8F00" />
      <Circle cx={5} cy={6} r={2} fill="white" />
    </G>
  </Svg>
);

/** Prize illustration - Fishing License Card */
const LicenseCardIllustration: React.FC = () => (
  <Svg width={60} height={45} viewBox="0 0 70 50">
    <Rect x={5} y={8} width={60} height={38} rx={4} fill="#E3EBF6" />
    <Rect x={5} y={8} width={60} height={12} fill="#1E3A5F" />
    <G transform="translate(20, 28)">
      <Ellipse cx={15} cy={8} rx={14} ry={6} fill="#2D9596" />
      <Ellipse cx={15} cy={10} rx={10} ry={3.5} fill="#4DB6AC" />
      <Path d="M28 8 Q35 3 33 8 Q35 13 28 8" fill="#E57373" />
      <Circle cx={6} cy={7} r={2} fill="white" />
    </G>
  </Svg>
);

/** Generic prize illustration */
const GenericPrizeIllustration: React.FC = () => (
  <Svg width={60} height={50} viewBox="0 0 60 50">
    <Rect x={10} y={20} width={40} height={28} rx={4} fill="#E3EBF6" />
    <Rect x={22} y={8} width={16} height={12} rx={2} fill="#1E3A5F" />
    <Path d="M18 20 L30 8 L42 20" fill="#2D5A87" />
    <Circle cx={30} cy={34} r={8} fill="#FFB74D" />
    <Circle cx={30} cy={34} r={4} fill="#FFE082" />
  </Svg>
);

/** Swimming fish for Report button */
const SwimmingFishButton: React.FC = () => (
  <View style={{
    position: 'absolute',
    right: -8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <Svg width={50} height={32} viewBox="0 0 60 40">
      {/* Bubble trail */}
      <Circle cx={8} cy={20} r={2.5} fill="white" opacity={0.5} />
      <Circle cx={15} cy={17} r={2} fill="white" opacity={0.4} />
      <Circle cx={20} cy={21} r={1.5} fill="white" opacity={0.3} />
      {/* Fish swimming away */}
      <G transform="translate(22, 8)">
        <Ellipse cx={18} cy={12} rx={17} ry={8} fill="#2D9596" />
        <Ellipse cx={18} cy={15} rx={13} ry={5} fill="#4DB6AC" />
        <Path d="M34 12 Q44 5 40 12 Q44 19 34 12" fill="#E57373" />
        <Circle cx={6} cy={10} r={3} fill="white" />
        <Circle cx={7} cy={10} r={1.8} fill="#1A1A1A" />
        {/* Scales */}
        <G stroke="#1A6B6C" strokeWidth={0.7} fill="none" opacity={0.4}>
          <Path d="M12 11 Q14 9 16 11" />
          <Path d="M18 11 Q20 9 22 11" />
          <Path d="M24 11 Q26 9 28 11" />
        </G>
      </G>
    </Svg>
  </View>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

const CATEGORY_ICONS: Record<PrizeCategory, keyof typeof Feather.glyphMap> = {
  license: 'credit-card',
  gear: 'anchor',
  apparel: 'shopping-bag',
  experience: 'compass',
  other: 'gift',
};

function getPrizeIcon(category: PrizeCategory): keyof typeof Feather.glyphMap {
  return CATEGORY_ICONS[category] || 'gift';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Get appropriate illustration for prize category */
function getPrizeIllustration(category: PrizeCategory): React.ReactNode {
  switch (category) {
    case 'gear':
      return <FishingRodIllustration />;
    case 'license':
      return <LicenseCardIllustration />;
    default:
      return <GenericPrizeIllustration />;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

const QuarterlyRewardsCard: React.FC<QuarterlyRewardsCardProps> = ({ onReportPress, isSignedIn = false }) => {
  const navigation = useNavigation<NavigationProp>();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const {
    currentDrawing,
    config,
    isLoading,
    error,
    calculated,
    hasEnteredCurrentRaffle,
    isNewQuarter,
    acknowledgeNewQuarter,
    enterDrawing,
  } = useRewards();

  // Slow pulsing animation for progress indicator border
  const progressPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(progressPulse, {
          toValue: 1,
          duration: 2000, // Slower - 2 seconds up
          useNativeDriver: false,
        }),
        Animated.timing(progressPulse, {
          toValue: 0,
          duration: 2000, // Slower - 2 seconds down
          useNativeDriver: false,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [progressPulse]);

  // Border color pulse - white to orange
  const progressBorderColor = progressPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.white, COLORS.orange],
  });

  // Handle entering the drawing directly (for returning members)
  const handleEnterDrawing = async () => {
    setIsEntering(true);
    try {
      const success = await enterDrawing();
      if (success) {
        acknowledgeNewQuarter();
      }
    } finally {
      setIsEntering(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading rewards...</Text>
      </View>
    );
  }

  // Error or no drawing state
  if (error || !currentDrawing) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>
          {error || 'No active rewards program at this time.'}
        </Text>
      </View>
    );
  }

  const handleReportPress = () => {
    if (onReportPress) {
      onReportPress();
    } else {
      navigation.navigate('ReportForm');
    }
  };

  // Render prize item (for single or first prize)
  const renderPrizeItem = (prize: Prize) => (
    <View style={styles.prizeItem}>
      <View style={styles.prizeIllustration}>
        {getPrizeIllustration(prize.category)}
      </View>
      <View style={styles.prizeDetails}>
        <Text style={styles.prizeName}>{prize.name}</Text>
        <Text style={styles.prizeValue}>{prize.value}</Text>
      </View>
    </View>
  );

  // Details Modal
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
              {currentDrawing.prizes.map((prize) => (
                <View key={prize.id} style={styles.modalPrizeItem}>
                  <Feather
                    name={getPrizeIcon(prize.category)}
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.modalPrizeText}>
                    {prize.name} ({prize.value})
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Eligibility Requirements</Text>
              {currentDrawing.eligibilityRequirements.map((req, idx) => (
                <Text key={idx} style={styles.modalText}>• {req}</Text>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Your Entry Status</Text>
              {hasEnteredCurrentRaffle ? (
                <>
                  <View style={styles.eligibilityBadge}>
                    <Feather name="check-circle" size={16} color="#4CAF50" />
                    <Text style={styles.eligibilityBadgeText}>You're entered!</Text>
                  </View>
                  <Text style={styles.modalText}>
                    You're in the {calculated.quarterDisplay} drawing. Good luck!
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.eligibilityBadge, styles.eligibilityBadgeInactive]}>
                    <Feather name="alert-circle" size={16} color="#FF9800" />
                    <Text style={[styles.eligibilityBadgeText, styles.eligibilityBadgeTextInactive]}>Not yet entered</Text>
                  </View>
                  <Text style={styles.modalText}>
                    Tap "Enter Drawing" on the rewards card to join this quarter's prize drawing.
                  </Text>
                </>
              )}
              <Text style={styles.modalText}>
                {config?.alternativeEntryText || 'No purchase or report necessary to enter.'}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowDetailsModal(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Entry Status Tab - File folder style tab sticking up from behind */}
      <View style={styles.entryStatusTab}>
        <View style={[
          styles.entryStatusContent,
          hasEnteredCurrentRaffle ? styles.entryStatusEntered : styles.entryStatusNotEntered
        ]}>
          <Feather
            name={hasEnteredCurrentRaffle ? "check-circle" : "alert-circle"}
            size={13}
            color="#FFFFFF"
          />
          <Text style={styles.entryStatusText}>
            {hasEnteredCurrentRaffle ? "Entered" : "Not Entered"}
          </Text>
        </View>
      </View>

      {/* Main Card Container */}
      <View style={styles.cardContainer}>

        {/* Hero Header */}
        <LinearGradient
          colors={[COLORS.navyDark, COLORS.navyLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroContainer}
        >
          <WaveBackground />

          <View style={styles.fishIllustrationContainer}>
            <HeroFishIllustration />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{currentDrawing.name}</Text>
            <Text style={styles.heroSubtitle}>
              Active contributors can win gear & prizes!
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {calculated.quarterDisplay} Drawing: {new Date(currentDrawing.drawingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Content Area */}
        <View style={styles.contentContainer}>

          {/* New Quarter Banner (for signed-in members) */}
          {isSignedIn && isNewQuarter && (
            <TouchableOpacity
              style={styles.newQuarterBanner}
              onPress={handleEnterDrawing}
              activeOpacity={0.8}
              disabled={isEntering}
            >
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.newQuarterIcon}>
                <Feather name="star" size={18} color="white" />
              </View>
              <View style={styles.newQuarterContent}>
                <Text style={styles.newQuarterTitle}>New Quarter Started!</Text>
                <Text style={styles.newQuarterText}>
                  {calculated.quarterDisplay} drawing is now open. Tap to enter!
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}

          {/* Enter Drawing Button (for signed-in members not yet entered) */}
          {isSignedIn && !hasEnteredCurrentRaffle && !isNewQuarter && (
            <TouchableOpacity
              style={styles.enterDrawingButton}
              onPress={handleEnterDrawing}
              activeOpacity={0.8}
              disabled={isEntering}
            >
              <Feather name="award" size={18} color={COLORS.navyDark} />
              <Text style={styles.enterDrawingText}>
                {isEntering ? 'Entering...' : `Enter ${calculated.quarterDisplay} Drawing`}
              </Text>
              <Feather name="chevron-right" size={18} color={COLORS.navyDark} />
            </TouchableOpacity>
          )}

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Quarter Progress</Text>
              <Text style={styles.daysLeft}>
                {calculated.daysRemaining} {calculated.daysRemaining === 1 ? 'day' : 'days'} left!
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[COLORS.navyDark, COLORS.navyLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${calculated.periodProgress}%` }]}
              />
              <Animated.View
                style={[
                  styles.progressIndicator,
                  {
                    left: `${calculated.periodProgress}%`,
                    borderColor: progressBorderColor,
                  },
                ]}
              />
            </View>
          </View>

          {/* How It Works Row */}
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => setShowDetailsModal(true)}
          >
            <View style={styles.infoIcon}>
              <Feather name="info" size={18} color={COLORS.navyDark} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How It Works</Text>
              <Text style={styles.infoText}>
                Must be a registered user of the Fish Log app.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Drawing Date Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Feather name="calendar" size={18} color={COLORS.navyDark} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Drawing Date</Text>
              <Text style={styles.infoText}>
                Winners selected at the end of each quarter.{'\n'}
                Next drawing: {calculated.formattedDrawingDate}
              </Text>
            </View>
          </View>

          {/* Prize Section */}
          <View style={styles.prizeSection}>
            <Text style={styles.prizeSectionTitle}>
              Current Quarter Prize
            </Text>
            {renderPrizeItem(currentDrawing.prizes[0])}
          </View>

          {/* Notification Banner */}
          <TouchableOpacity
            style={styles.notificationBanner}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.navyDark, COLORS.navyLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.notificationIcon}>
              <Feather name="bell" size={18} color="white" />
            </View>
            <Text style={styles.notificationText}>
              Selected contributors will be notified via email. Make sure your account info is up to date!
            </Text>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

        </View>
      </View>

      {/* Footer CTA - Outside main card */}
      <View style={styles.footerCta}>
        <Text style={styles.footerText}>
          Report your catches to support NC fisheries data.
        </Text>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={handleReportPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.navyDark, COLORS.navyLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reportButtonGradient}
          />
          <Text style={styles.reportButtonText}>Report</Text>
          <SwimmingFishButton />
        </TouchableOpacity>
      </View>

      {renderDetailsModal()}
    </View>
  );
};

// ============================================
// COLORS
// ============================================

const COLORS = {
  navyDark: '#1E3A5F',
  navyLight: '#2D5A87',
  primary: '#1E3A5F',
  orange: '#FF8F00',
  white: '#FFFFFF',
  bgLight: '#E3EBF6',
  bgCard: '#F8FAFC',
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  border: '#f0f0f0',
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    marginTop: 20, // Extra space for the tab
  },

  // Entry Status Tab - File folder style (appears behind card)
  entryStatusTab: {
    position: 'absolute',
    top: -18,
    right: 16,
    zIndex: -1, // Behind the card
  },
  entryStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 18, // Extra padding at bottom to tuck under card
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 6,
    minWidth: 120, // Wider tab
  },
  entryStatusEntered: {
    backgroundColor: '#4CAF50', // Solid green for better visibility
  },
  entryStatusNotEntered: {
    backgroundColor: '#FF9800', // Solid orange for better visibility
  },
  entryStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FFFFFF', // White text for contrast
  },
  entryStatusTextEntered: {
    color: '#FFFFFF',
  },
  entryStatusTextNotEntered: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    backgroundColor: COLORS.white,
    borderRadius: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
  },
  errorText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Card Container
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    zIndex: 1, // Above the tab
    overflow: 'hidden',
  },

  // Hero Section
  heroContainer: {
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  fishIllustrationContainer: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -35 }],
  },
  heroContent: {
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Content Container
  contentContainer: {
    padding: 16,
  },

  // Progress Section
  progressSection: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  daysLeft: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navyDark,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.bgLight,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressIndicator: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.orange,
    borderWidth: 2.5,
    borderColor: COLORS.white, // This gets animated to orange
    marginLeft: -6,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoIcon: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Prize Section
  prizeSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  prizeSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  prizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 12,
  },
  prizeIllustration: {
    width: 60,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  prizeDetails: {
    flex: 1,
  },
  prizeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  prizeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navyDark,
  },

  // Notification Banner
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    overflow: 'hidden',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.white,
    lineHeight: 17,
  },

  // Footer CTA
  footerCta: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
    paddingRight: 12,
    lineHeight: 18,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 45,
    overflow: 'visible',
    shadowColor: COLORS.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  reportButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    zIndex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalScrollContent: {
    padding: 20,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  modalPrizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPrizeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  modalButton: {
    backgroundColor: COLORS.navyDark,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },

  // New Quarter Banner
  newQuarterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  newQuarterIcon: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newQuarterContent: {
    flex: 1,
  },
  newQuarterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  newQuarterText: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
  },

  // Enter Drawing Button
  enterDrawingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  enterDrawingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navyDark,
    flex: 1,
  },

  // Eligibility Badge (Modal)
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  eligibilityBadgeInactive: {
    backgroundColor: '#FFF3E0',
  },
  eligibilityBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  eligibilityBadgeTextInactive: {
    color: '#FF9800',
  },
});

export default QuarterlyRewardsCard;
