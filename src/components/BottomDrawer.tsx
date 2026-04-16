// components/BottomDrawer.tsx
//
// Reusable bottom drawer component with consistent animations and safe area handling.
// Features:
// - Smooth spring animation for slide up/down
// - Overlay fade animation
// - Safe area handling for iOS and Android
// - Drag handle and optional close button
// - Consistent premium styling across the app

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  StatusBar,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { spacing, borderRadius } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';

// Default slide distance for open/close animations. Using the screen height
// guarantees the drawer fully leaves the viewport on close — even on tall
// phones where the drawer itself can exceed 700pt. A smaller default caused
// the close animation to finish with the top of the drawer still visible,
// producing a "stutter" as the modal then snapped shut.
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomDrawerProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Optional customization
  showCloseButton?: boolean;
  showDragHandle?: boolean;
  maxHeight?: `${number}%` | number;
  minHeight?: `${number}%` | number;
  containerStyle?: ViewStyle;
  // Animation configuration
  slideDistance?: number;
  springTension?: number;
  springFriction?: number;
}

const BottomDrawer: React.FC<BottomDrawerProps> = ({
  visible,
  onClose,
  children,
  showCloseButton = false,
  showDragHandle = true,
  maxHeight = '90%',
  minHeight,
  containerStyle,
  slideDistance = SCREEN_HEIGHT,
  springTension = 65,
  springFriction = 11,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Internal visibility state - keeps modal open during close animation
  const [modalVisible, setModalVisible] = useState(false);
  const isClosing = useRef(false);

  // Handle close with animation
  const handleClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    // Animate out
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
      // After animation completes, hide modal and notify parent
      setModalVisible(false);
      isClosing.current = false;
      onClose();
    });
  }, [slideAnim, overlayOpacity, onClose]);

  // Handle visibility changes from parent
  useEffect(() => {
    if (visible && !modalVisible && !isClosing.current) {
      // Opening: show modal immediately, then animate in
      setModalVisible(true);
      slideAnim.setValue(0);
      overlayOpacity.setValue(0);

      // Run open animations in parallel
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: springTension,
          friction: springFriction,
        }),
      ]).start();
    } else if (!visible && modalVisible && !isClosing.current) {
      // Parent requested close - trigger close animation
      handleClose();
    }
  }, [visible, modalVisible, slideAnim, overlayOpacity, springTension, springFriction, handleClose]);

  // Calculate bottom padding for safe area
  const bottomPadding = Math.max(insets.bottom, spacing.lg);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.wrapper}>
        {/* Animated overlay - fades in/out */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Animated content container - slides up/down */}
        <Animated.View
          style={[
            styles.container,
            {
              maxHeight,
              minHeight,
              // Add extra space at bottom to extend behind safe area
              paddingBottom: bottomPadding + (Platform.OS === 'android' ? 20 : 0),
              // Extend the container below the screen edge on Android
              marginBottom: Platform.OS === 'android' ? -20 : 0,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [slideDistance, 0],
                }),
              }],
            },
            containerStyle,
          ]}
        >
          {/* Drag handle */}
          {showDragHandle && <View style={styles.dragHandle} />}

          {/* Close button */}
          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.lightestGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BottomDrawer;
