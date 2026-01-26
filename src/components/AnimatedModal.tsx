// components/AnimatedModal.tsx
//
// Reusable modal component with proper animations:
// - Overlay fades in
// - Content slides up with spring animation
//
// Use this instead of React Native's Modal for consistent UX across the app.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius } from '../styles/common';

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Optional customization
  containerStyle?: ViewStyle;
  overlayStyle?: ViewStyle;
  // Whether to close when tapping the overlay (default: true)
  closeOnOverlayPress?: boolean;
  // Whether content should be scrollable (default: true)
  scrollable?: boolean;
  // Whether to use KeyboardAvoidingView (default: true)
  avoidKeyboard?: boolean;
  // Animation configuration
  slideDistance?: number; // How far the content slides from (default: 300)
  springTension?: number; // Spring animation tension (default: 65)
  springFriction?: number; // Spring animation friction (default: 11)
}

const AnimatedModal: React.FC<AnimatedModalProps> = ({
  visible,
  onClose,
  children,
  containerStyle,
  overlayStyle,
  closeOnOverlayPress = true,
  scrollable = true,
  avoidKeyboard = true,
  slideDistance = 300,
  springTension = 65,
  springFriction = 11,
}) => {
  // Animation value for slide-up effect
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Reset to starting position and animate
      slideAnim.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: springTension,
        friction: springFriction,
      }).start();
    }
  }, [visible, slideAnim, springTension, springFriction]);

  // Handle overlay press
  const handleOverlayPress = () => {
    if (closeOnOverlayPress) {
      onClose();
    }
  };

  // Render the content wrapper (scrollable or not)
  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>
      );
    }
    return <View style={styles.contentWrapper}>{children}</View>;
  };

  // Main modal content
  const modalContent = (
    <View style={[styles.overlay, overlayStyle]}>
      <TouchableWithoutFeedback onPress={handleOverlayPress}>
        <View style={styles.overlayTouchable} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.container,
          containerStyle,
          {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [slideDistance, 0],
                }),
              },
            ],
          },
        ]}
      >
        {renderContent()}
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          {modalContent}
        </KeyboardAvoidingView>
      ) : (
        modalContent
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  contentWrapper: {
    padding: spacing.lg,
  },
});

export default AnimatedModal;
