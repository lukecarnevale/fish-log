// screens/reportForm/AreaInfoModal.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../styles/common';
import { localStyles } from '../../styles/reportFormScreenLocalStyles';

interface AreaInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const AreaInfoModal: React.FC<AreaInfoModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={localStyles.areaInfoModalOverlay}>
          <TouchableWithoutFeedback>
            <View style={localStyles.areaInfoModalContent}>
              <View style={localStyles.areaInfoModalHeader}>
                <Feather name="info" size={24} color={colors.primary} />
                <Text style={localStyles.areaInfoModalTitle}>Area of Harvest</Text>
              </View>
              <Text style={localStyles.areaInfoModalText}>
                Select the waterbody where you harvested the majority of your fish.
              </Text>
              <Text style={localStyles.areaInfoModalText}>
                Use the interactive map to help identify your harvest area.
              </Text>
              <View style={localStyles.areaInfoModalTip}>
                <Feather name="info" size={16} color={colors.primary} />
                <Text style={localStyles.areaInfoModalTipText}>
                  Once the map opens, tap the blue icon at the bottom to view the color legend for Harvest Areas.
                </Text>
              </View>
              <TouchableOpacity
                style={localStyles.areaInfoModalButton}
                onPress={() => {
                  onClose();
                  Linking.openURL("https://experience.arcgis.com/experience/dc745a4de8344e40b5855b9e9130d0c1");
                }}
                activeOpacity={0.7}
              >
                <Feather name="map" size={18} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={localStyles.areaInfoModalButtonText}>View Interactive Map</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.areaInfoModalCloseButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={localStyles.areaInfoModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default AreaInfoModal;
