/**
 * photoCompression.test.ts
 *
 * Ensures catch_log photo compression:
 * - Resizes + re-encodes via expo-image-manipulator.
 * - Falls back to the original URI on failure instead of throwing (so
 *   submissions never hard-block on a compression problem).
 * - Handles batch compression with mixed outcomes.
 */
import * as ImageManipulator from 'expo-image-manipulator';

import {
  compressCatchPhoto,
  compressCatchPhotos,
} from '../../src/utils/photoCompression';

describe('photoCompression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compressCatchPhoto', () => {
    it('returns the manipulator-produced URI on success', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
        uri: 'file:///compressed-abc.jpg',
      });

      const result = await compressCatchPhoto('file:///original.jpg');

      expect(result).toBe('file:///compressed-abc.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file:///original.jpg',
        expect.arrayContaining([expect.objectContaining({ resize: { width: 1500 } })]),
        expect.objectContaining({ compress: 0.8 }),
      );
    });

    it('falls back to the original URI when manipulator throws', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValueOnce(
        new Error('simulated encoding error'),
      );
      // Silence the expected console.warn so test output stays clean.
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await compressCatchPhoto('file:///original.jpg');

      expect(result).toBe('file:///original.jpg');
      warnSpy.mockRestore();
    });
  });

  describe('compressCatchPhotos', () => {
    it('returns an empty array for an empty input', async () => {
      const result = await compressCatchPhotos([]);
      expect(result).toEqual([]);
      expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
    });

    it('compresses each URI in parallel and preserves order', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({ uri: 'file:///c1.jpg' })
        .mockResolvedValueOnce({ uri: 'file:///c2.jpg' })
        .mockResolvedValueOnce({ uri: 'file:///c3.jpg' });

      const result = await compressCatchPhotos([
        'file:///raw1.jpg',
        'file:///raw2.jpg',
        'file:///raw3.jpg',
      ]);

      expect(result).toEqual(['file:///c1.jpg', 'file:///c2.jpg', 'file:///c3.jpg']);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(3);
    });

    it('tolerates per-photo failures by returning the original URI for that slot', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({ uri: 'file:///c1.jpg' })
        .mockRejectedValueOnce(new Error('fail #2'))
        .mockResolvedValueOnce({ uri: 'file:///c3.jpg' });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await compressCatchPhotos([
        'file:///raw1.jpg',
        'file:///raw2.jpg',
        'file:///raw3.jpg',
      ]);

      // Slot 2 falls back to the original — batch never rejects.
      expect(result).toEqual([
        'file:///c1.jpg',
        'file:///raw2.jpg',
        'file:///c3.jpg',
      ]);
      warnSpy.mockRestore();
    });
  });
});
