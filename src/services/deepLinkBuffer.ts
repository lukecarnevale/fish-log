// services/deepLinkBuffer.ts
//
// Module-level buffer for deep link URLs that arrive before the React tree
// is ready to process them (e.g. during the animated splash screen).
//
// The Linking 'url' event is fire-and-forget — if no listener is attached,
// the event is lost.  By registering a native listener at import time
// (outside React), we guarantee no deep link is ever dropped.
//
// Usage:
//   import { consumeBufferedUrl } from '../services/deepLinkBuffer';
//   // In your hook, call consumeBufferedUrl() to retrieve (and clear) any URL
//   // that arrived before the hook mounted.

import { Linking } from 'react-native';

let bufferedUrl: string | null = null;

// Register immediately at module load — runs before any React component mounts.
const subscription = Linking.addEventListener('url', (event) => {
  console.log('📦 [DeepLinkBuffer] Captured URL before handler ready:', event.url);
  bufferedUrl = event.url;
});

/**
 * Retrieve and clear the buffered deep link URL.
 * Returns `null` if no URL arrived while the handler was unmounted.
 */
export function consumeBufferedUrl(): string | null {
  const url = bufferedUrl;
  bufferedUrl = null;
  return url;
}

/**
 * Stop buffering (call when the real handler takes over).
 * After this, URLs go directly to the Linking 'url' listener in the hook.
 */
export function stopBuffering(): void {
  subscription.remove();
}
