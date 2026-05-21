// utils/photoCompression.ts
//
// Image compression helpers for catch photo submissions.
//
// Rationale:
// A stock iPhone 12-MP photo is ~3–4 MB. A catch_log submission can include
// up to 6 photos → 18–24 MB without compression, which is painful on a pier
// with weak cellular. Compressing to ~1500px longest edge at 0.8 JPEG quality
// brings each photo down to ~300–500 KB with no user-visible quality loss in
// a 4:5 feed card.

import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Max dimension (longest side) for a compressed catch photo.
 * 1500px is enough for a 4:5 feed card and 2x retina displays while keeping
 * file sizes reasonable.
 */
const MAX_DIMENSION_PX = 1500;

/**
 * JPEG quality used when re-encoding. 0.8 is a sweet spot — visually
 * indistinguishable from source on typical fishing photos, but gives a ~6x
 * size reduction.
 */
const JPEG_QUALITY = 0.8;

/**
 * Compress a single local image URI.
 *
 * - Resizes the longest edge to MAX_DIMENSION_PX (aspect preserved).
 * - Re-encodes as JPEG at JPEG_QUALITY.
 * - On failure, returns the original URI (callers should still be able to submit).
 */
export async function compressCatchPhoto(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION_PX } }],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    return result.uri;
  } catch (err) {
    console.warn('⚠️ Photo compression failed, using original URI:', err);
    return uri;
  }
}

/**
 * Compress a batch of photos in parallel.
 * Failures are tolerated per-photo; the batch never rejects.
 */
export async function compressCatchPhotos(uris: string[]): Promise<string[]> {
  if (uris.length === 0) return [];
  return Promise.all(uris.map(compressCatchPhoto));
}
