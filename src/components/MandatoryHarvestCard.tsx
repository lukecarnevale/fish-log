// components/MandatoryHarvestCard.tsx
//
// Redesigned Mandatory Harvest Reporting info card with navy header,
// fish species icons in colored circles, yellow "When/What" info cards,
// and pill-shaped action buttons.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../styles/common';
import Svg, { Ellipse, Path, Circle } from 'react-native-svg';
import { MANDATORY_HARVEST_FAQS, FULL_FAQ_URL } from '../constants/faqData';

const HEADER_BG = '#0B548B';

// Fish species data with colors
const species = [
  { name: 'Flounder', bodyColor: '#4CAF50', tailColor: '#388E3C', bgColor: '#E8F5E9' },
  { name: 'Red Drum', bodyColor: '#E57373', tailColor: '#C62828', bgColor: '#FFEBEE' },
  { name: 'Spotted Seatrout', bodyColor: '#64B5F6', tailColor: '#1976D2', bgColor: '#E3F2FD' },
  { name: 'Striped Bass', bodyColor: '#90A4AE', tailColor: '#546E7A', bgColor: '#ECEFF1' },
  { name: 'Weakfish', bodyColor: '#FFB74D', tailColor: '#F57C00', bgColor: '#FFF3E0' },
];

// Fish icon component
const FishIcon: React.FC<{ bodyColor: string; tailColor: string }> = ({
  bodyColor,
  tailColor,
}) => (
  <Svg width={26} height={18} viewBox="0 0 40 28">
    <Ellipse cx={18} cy={14} rx={16} ry={8} fill={bodyColor} />
    <Path d="M32 14 Q40 8 38 14 Q40 20 32 14" fill={tailColor} />
    <Circle cx={6} cy={12} r={2} fill="white" />
  </Svg>
);

interface MandatoryHarvestCardProps {
  onLearnMore?: () => void;
  onDismiss?: () => void;
  onFishPress?: () => void;
}

const MandatoryHarvestCard: React.FC<MandatoryHarvestCardProps> = ({
  onLearnMore,
  onDismiss,
  onFishPress,
}) => {
  const [showFaqModal, setShowFaqModal] = useState(false);

  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      Linking.openURL('https://www.deq.nc.gov/about/divisions/marine-fisheries/science-and-statistics/mandatory-harvest-reporting/mandatory-harvest-reporting-recreational').catch((err) =>
        console.error('Could not open link', err)
      );
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Mandatory Harvest Reporting</Text>
          <Text style={styles.subtitle}>
            NC State Law
          </Text>
        </View>
        <TouchableOpacity
          style={styles.faqButton}
          onPress={() => setShowFaqModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="help-circle" size={22} color="rgba(255, 255, 255, 0.9)" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Fish Grid */}
        <View style={styles.fishGrid}>
          {species.map((fish) => (
            <TouchableOpacity
              key={fish.name}
              style={styles.fishItem}
              onPress={onFishPress}
              activeOpacity={0.7}
            >
              <View
                style={[styles.fishCircle, { backgroundColor: fish.bgColor }]}
              >
                <FishIcon bodyColor={fish.bodyColor} tailColor={fish.tailColor} />
              </View>
              <Text style={styles.fishName}>{fish.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Cards */}
        <View style={styles.infoBox}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>When</Text>
            <Text style={styles.infoText}>
              At end of trip (boat reaches shore or you stop fishing).
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>What</Text>
            <Text style={styles.infoText}>
              Only fish you keep — not released fish.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={handleLearnMore}
            activeOpacity={0.7}
          >
            <Feather name="external-link" size={16} color="#666" />
            <Text style={styles.btnOutlineText}>Learn More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSolid}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Feather name="thumbs-up" size={16} color="white" />
            <Text style={styles.btnSolidText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FAQ Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showFaqModal}
        onRequestClose={() => setShowFaqModal(false)}
      >
        <View style={styles.faqModalOverlay}>
          <View style={styles.faqModalContent}>
            <View style={styles.faqModalHeader}>
              <View style={styles.faqModalHeaderLeft}>
                <Feather name="help-circle" size={24} color={colors.primary} />
                <Text style={styles.faqModalTitle}>FAQs</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFaqModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.faqScrollView}
              showsVerticalScrollIndicator={false}
            >
              {MANDATORY_HARVEST_FAQS.map((faq, index) => (
                <View key={index} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}

              {/* Link to full FAQs */}
              <TouchableOpacity
                style={styles.faqLinkButton}
                onPress={() => {
                  setShowFaqModal(false);
                  Linking.openURL(FULL_FAQ_URL);
                }}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.faqLinkText}>View Full FAQs on NC DEQ Website</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.faqCloseButton}
              onPress={() => setShowFaqModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.faqCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  // Header
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  faqButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // Body
  body: {
    padding: 16,
  },

  // Fish Grid
  fishGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  fishItem: {
    alignItems: 'center',
    flex: 1,
  },
  fishCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fishName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Info Cards
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
    borderTopWidth: 3,
    borderTopColor: '#FFB74D',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E65100',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },

  // Buttons
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: 'white',
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  btnSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: HEADER_BG,
  },
  btnSolidText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  // FAQ Modal styles
  faqModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  faqModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  faqModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  faqModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faqModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  faqScrollView: {
    paddingHorizontal: 16,
  },
  faqItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: HEADER_BG,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  faqLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  faqLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: HEADER_BG,
  },
  faqCloseButton: {
    backgroundColor: HEADER_BG,
    paddingVertical: 14,
    alignItems: 'center',
  },
  faqCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default MandatoryHarvestCard;
