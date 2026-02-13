// components/LicenseTypePicker.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../styles/common';

interface LicenseTypePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: string) => void;
  selectedValue?: string;
  options: string[];
}

const LicenseTypePicker: React.FC<LicenseTypePickerProps> = ({
  visible,
  onClose,
  onSelect,
  selectedValue,
  options
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const isClosing = useRef(false);

  // Handle close with animation
  const handleClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      isClosing.current = false;
      onClose();
    });
  }, [slideAnim, overlayOpacity, onClose]);

  // Handle visibility changes
  useEffect(() => {
    if (visible && !modalVisible && !isClosing.current) {
      setModalVisible(true);
      slideAnim.setValue(0);
      overlayOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    } else if (!visible && modalVisible && !isClosing.current) {
      handleClose();
    }
  }, [visible, modalVisible, slideAnim, overlayOpacity, handleClose]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {/* Animated overlay */}
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Animated content */}
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>Select License Type</Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item, index) => index.toString()}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  selectedValue === item && styles.selectedOption
                ]}
                onPress={() => {
                  onSelect(item);
                  handleClose();
                }}
              >
                <Text style={styles.optionText}>{item}</Text>
                {selectedValue === item && (
                  <Feather name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightestGray,
    marginBottom: spacing.sm,
  },
  headerText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  list: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightestGray,
  },
  selectedOption: {
    backgroundColor: colors.lightestGray,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  cancelButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default LicenseTypePicker;