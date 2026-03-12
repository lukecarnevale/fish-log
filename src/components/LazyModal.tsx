// components/LazyModal.tsx
//
// Memory-efficient Modal wrapper that only mounts its children
// when visible, and unmounts them when hidden. This prevents
// keeping heavy component trees (ScrollViews, Images, forms)
// in the JavaScript heap when the modal is not shown.
//
// Drop-in replacement for React Native's Modal where the children
// are expensive to keep mounted.

import React, { useState, useEffect } from 'react';
import { Modal, ModalProps } from 'react-native';

interface LazyModalProps extends ModalProps {
  /** Controls visibility — children are only mounted when true */
  visible: boolean;
  children: React.ReactNode;
}

/**
 * A Modal that lazily mounts/unmounts its children based on visibility.
 *
 * - When `visible` becomes true, children mount immediately.
 * - When `visible` becomes false, children stay mounted briefly
 *   to allow the exit animation to complete, then unmount.
 *
 * This can save 5–15 MB per heavy modal that's normally hidden.
 */
export default function LazyModal({ visible, children, ...modalProps }: LazyModalProps) {
  // Track whether children should be mounted.
  // We keep them mounted slightly after visible=false so the
  // closing animation can play before the tree is destroyed.
  const [shouldMount, setShouldMount] = useState(visible);

  useEffect(() => {
    if (visible) {
      // Mount immediately when becoming visible
      setShouldMount(true);
    } else {
      // Delay unmount to allow closing animation (matches RN Modal's default ~300ms)
      const timer = setTimeout(() => setShouldMount(false), 350);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Don't render anything if never shown
  if (!shouldMount) return null;

  return (
    <Modal visible={visible} {...modalProps}>
      {children}
    </Modal>
  );
}
