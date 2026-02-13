// hooks/useToast.ts
//
// Shared hook for toast notification state and animations.
// Extracted from ReportFormScreen.
//

import { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

interface ToastState {
  /** Whether the toast is currently visible */
  visible: boolean;
  /** The toast title text */
  title: string;
  /** The toast subtitle text */
  subtitle: string;
  /** Animated value for the toast slide-in/out (pass to translateY) */
  animValue: Animated.Value;
  /** Call to show the toast with a title and subtitle. Auto-dismisses after 5s. */
  show: (title: string, subtitle: string) => void;
  /** Call to manually hide the toast */
  hide: () => void;
}

/**
 * Manages toast notification state with spring-in and timing-out animations.
 *
 * Usage:
 * ```tsx
 * const toast = useToast();
 *
 * // Show it:
 * toast.show("Success!", "Your report was saved.");
 *
 * // Render it:
 * {toast.visible && (
 *   <Animated.View style={[styles.toast, { transform: [{ translateY: toast.animValue }] }]}>
 *     <Text>{toast.title}</Text>
 *     <Text>{toast.subtitle}</Text>
 *   </Animated.View>
 * )}
 * ```
 */
export function useToast(): ToastState {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const animValue = useRef(new Animated.Value(100)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(animValue, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  }, [animValue]);

  const show = useCallback((newTitle: string, newSubtitle: string) => {
    // Clear any pending auto-dismiss
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }

    setTitle(newTitle);
    setSubtitle(newSubtitle);
    setVisible(true);
    animValue.setValue(100);

    Animated.spring(animValue, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after 5 seconds
    hideTimeout.current = setTimeout(() => {
      hide();
    }, 5000);
  }, [animValue, hide]);

  return {
    visible,
    title,
    subtitle,
    animValue,
    show,
    hide,
  };
}
