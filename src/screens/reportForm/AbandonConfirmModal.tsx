// screens/reportForm/AbandonConfirmModal.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../styles/common';
import { localStyles } from '../../styles/reportFormScreenLocalStyles';

interface AbandonConfirmModalProps {
  visible: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

const AbandonConfirmModal: React.FC<AbandonConfirmModalProps> = ({
  visible,
  onKeepEditing,
  onDiscard,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onKeepEditing}
    >
      <View style={localStyles.abandonModalOverlay}>
        <View style={localStyles.abandonModalContent}>
          <View style={localStyles.abandonModalIconContainer}>
            <Feather name="alert-circle" size={32} color={colors.warning} />
          </View>
          <Text style={localStyles.abandonModalTitle}>Discard Report?</Text>
          <Text style={localStyles.abandonModalText}>
            You have unsaved information. Are you sure you want to leave? Your progress will be lost.
          </Text>
          <View style={localStyles.abandonModalButtons}>
            <TouchableOpacity
              style={localStyles.abandonModalCancelButton}
              onPress={onKeepEditing}
              activeOpacity={0.7}
            >
              <Text style={localStyles.abandonModalCancelText}>Keep Editing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={localStyles.abandonModalDiscardButton}
              onPress={onDiscard}
              activeOpacity={0.7}
            >
              <Text style={localStyles.abandonModalDiscardText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AbandonConfirmModal;
