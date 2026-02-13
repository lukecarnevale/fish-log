// screens/reportForm/FaqModal.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../styles/common';
import { localStyles } from '../../styles/reportFormScreenLocalStyles';

interface FaqModalProps {
  visible: boolean;
  onClose: () => void;
}

const FaqModal: React.FC<FaqModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={localStyles.faqModalOverlay}>
        <View style={localStyles.faqModalContent}>
          <View style={localStyles.faqModalHeader}>
            <View style={localStyles.faqModalHeaderLeft}>
              <Feather name="help-circle" size={24} color={colors.primary} />
              <Text style={localStyles.faqModalTitle}>FAQs</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={localStyles.faqScrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* FAQ 1 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>What is Mandatory Harvest Reporting?</Text>
              <Text style={localStyles.faqAnswer}>
                Beginning December 1, 2025, recreational anglers must report catches of red drum, flounder, spotted seatrout, striped bass, and weakfish. Commercial fishermen must also report all harvested fish regardless of sale status.
              </Text>
            </View>

            {/* FAQ 2 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>Why is Mandatory Harvest Reporting happening?</Text>
              <Text style={localStyles.faqAnswer}>
                The program aims to enhance fisheries management by collecting comprehensive harvest data to supplement existing commercial trip ticket reporting and recreational survey programs.
              </Text>
            </View>

            {/* FAQ 3 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>Who has to participate?</Text>
              <Text style={localStyles.faqAnswer}>
                Both recreational and commercial fishermen are impacted. Recreational anglers must report the five specified species, while commercial fishermen report personal consumption harvests through seafood dealers.
              </Text>
            </View>

            {/* FAQ 4 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>Which waters does this apply to?</Text>
              <Text style={localStyles.faqAnswer}>
                Requirements apply to coastal, joint, and adjacent inland fishing waters under Marine Fisheries Commission and Wildlife Resources Commission authority.
              </Text>
            </View>

            {/* FAQ 5 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>What information must I report?</Text>
              <Text style={localStyles.faqAnswer}>
                Recreational fishers report: license number (or name and zip code), harvest date, number of each species kept, harvest area, and gear type.
              </Text>
            </View>

            {/* FAQ 6 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>When must I report my harvest?</Text>
              <Text style={localStyles.faqAnswer}>
                Recreational fishers should report when harvest is complete (shore/dock arrival for boats). If you lack internet connection, record information and submit electronically by midnight the following day.
              </Text>
            </View>

            {/* FAQ 7 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>Why these five fish species?</Text>
              <Text style={localStyles.faqAnswer}>
                Red drum, flounder, spotted seatrout, striped bass, and weakfish are among the most targeted species in North Carolina's coastal and joint fishing waters.
              </Text>
            </View>

            {/* FAQ 8 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>How will the law be enforced?</Text>
              <Text style={localStyles.faqAnswer}>
                Enforcement phases over three years:{'\n'}• Dec 1, 2025 — Verbal warnings{'\n'}• Dec 1, 2026 — Warning tickets{'\n'}• Dec 1, 2027 — $35 infractions plus court fees
              </Text>
            </View>

            {/* FAQ 9 */}
            <View style={localStyles.faqItem}>
              <Text style={localStyles.faqQuestion}>Do charter captains report for customers?</Text>
              <Text style={localStyles.faqAnswer}>
                No. The law specifies individual anglers bear reporting responsibility at trip completion. Captains can obtain QR code stickers by contacting the Mandatory Harvest Reporting Team.
              </Text>
            </View>

            {/* Link to full FAQs */}
            <TouchableOpacity
              style={localStyles.faqLinkButton}
              onPress={() => {
                onClose();
                Linking.openURL("https://www.deq.nc.gov/about/divisions/marine-fisheries/science-and-statistics/mandatory-harvest-reporting/mandatory-harvest-reporting-faqs");
              }}
              activeOpacity={0.7}
            >
              <Feather name="external-link" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={localStyles.faqLinkText}>View Full FAQs on NC DEQ Website</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={localStyles.faqCloseButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={localStyles.faqCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FaqModal;
