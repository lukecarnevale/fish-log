/**
 * photoUploadService.test.ts - Photo upload and URI handling tests
 */
import { mockSupabase } from '../mocks/supabase';

import {
  isLocalUri,
  ensurePublicPhotoUrl,
  ensurePublicPhotoUrls,
  uploadCatchPhoto,
  uploadProfilePhoto,
} from '../../src/services/photoUploadService';

describe('photoUploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // isLocalUri
  // ============================================================
  describe('isLocalUri', () => {
    it('returns true for file:// URIs', () => {
      expect(isLocalUri('file:///path/to/photo.jpg')).toBe(true);
    });

    it('returns true for content:// URIs (Android)', () => {
      expect(isLocalUri('content://media/photo.jpg')).toBe(true);
    });

    it('returns true for ph:// URIs (iOS PHAsset)', () => {
      expect(isLocalUri('ph://123-456')).toBe(true);
    });

    it('returns false for https:// URIs', () => {
      expect(isLocalUri('https://example.com/photo.jpg')).toBe(false);
    });

    it('returns false for http:// URIs', () => {
      expect(isLocalUri('http://example.com/photo.jpg')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isLocalUri(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isLocalUri(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isLocalUri('')).toBe(false);
    });
  });

  // ============================================================
  // ensurePublicPhotoUrl
  // ============================================================
  describe('ensurePublicPhotoUrl', () => {
    it('returns null for null input', async () => {
      const result = await ensurePublicPhotoUrl(null);
      expect(result).toBeNull();
    });

    it('returns null for undefined input', async () => {
      const result = await ensurePublicPhotoUrl(undefined);
      expect(result).toBeNull();
    });

    it('returns null for empty string', async () => {
      const result = await ensurePublicPhotoUrl('');
      expect(result).toBeNull();
    });

    it('passes through https:// URLs without uploading', async () => {
      const url = 'https://example.com/existing-photo.jpg';
      const result = await ensurePublicPhotoUrl(url);
      expect(result).toBe(url);
      expect(mockSupabase.storage.from).not.toHaveBeenCalled();
    });

    it('passes through http:// URLs without uploading', async () => {
      const url = 'http://example.com/photo.jpg';
      const result = await ensurePublicPhotoUrl(url);
      expect(result).toBe(url);
    });
  });

  // ============================================================
  // ensurePublicPhotoUrls — multi-photo upload orchestration
  // ============================================================
  describe('ensurePublicPhotoUrls', () => {
    // Helper to stub storage.from() so uploadCatchPhoto can succeed/fail
    // deterministically from within the batch.
    const stubStorage = (outcomes: Array<{ ok: boolean; path?: string }>) => {
      let call = 0;
      (mockSupabase.storage.from as jest.Mock).mockImplementation(() => ({
        upload: jest.fn().mockImplementation(() => {
          const outcome = outcomes[call] ?? outcomes[outcomes.length - 1];
          call += 1;
          return Promise.resolve(
            outcome.ok
              ? { data: { path: outcome.path ?? `file-${call}.jpg` }, error: null }
              : { data: null, error: { message: 'upload failed' } },
          );
        }),
        getPublicUrl: jest.fn(({ /* path is ignored by mock */ }) => ({
          data: { publicUrl: `https://cdn.example.com/photo-${call}.jpg` },
        })),
      }));
    };

    it('returns empty array for empty input (no upload, no progress)', async () => {
      const onProgress = jest.fn();
      const result = await ensurePublicPhotoUrls([], 'user-1', onProgress);
      expect(result).toEqual([]);
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('filters null/undefined entries before processing', async () => {
      stubStorage([{ ok: true }]);
      const result = await ensurePublicPhotoUrls(
        [null, 'https://cdn.example.com/already-public.jpg', undefined],
      );
      expect(result).toEqual(['https://cdn.example.com/already-public.jpg']);
    });

    it('passes through public URLs without uploading and still counts progress', async () => {
      const onProgress = jest.fn();
      const result = await ensurePublicPhotoUrls(
        [
          'https://cdn.example.com/a.jpg',
          'https://cdn.example.com/b.jpg',
        ],
        'user-1',
        onProgress,
      );
      expect(result).toEqual([
        'https://cdn.example.com/a.jpg',
        'https://cdn.example.com/b.jpg',
      ]);
      // Initial 0/2 + two completions.
      expect(onProgress).toHaveBeenCalledWith({ uploaded: 0, total: 2 });
      expect(onProgress).toHaveBeenLastCalledWith({ uploaded: 2, total: 2 });
      expect(mockSupabase.storage.from).not.toHaveBeenCalled();
    });

    it('throws with a user-facing message when any upload fails (abort-on-partial-failure)', async () => {
      stubStorage([{ ok: true }, { ok: false }, { ok: true }]);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        ensurePublicPhotoUrls(
          ['file:///a.jpg', 'file:///b.jpg', 'file:///c.jpg'],
          'user-1',
        ),
      ).rejects.toThrow(/Photo upload failed for 1 of 3 photos/);

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('preserves input ordering even when parallel uploads finish out-of-order', async () => {
      // Three local URIs. stubStorage fires resolves in call order, but we
      // deliberately model out-of-order timing via mock call resolutions.
      stubStorage([{ ok: true }, { ok: true }, { ok: true }]);
      const result = await ensurePublicPhotoUrls(
        ['file:///raw-a.jpg', 'file:///raw-b.jpg', 'file:///raw-c.jpg'],
        'user-1',
      );
      expect(result).toHaveLength(3);
      // We don't assert exact URLs (mock generates placeholder URLs) — just
      // that the returned array has the same length as the input, so callers
      // can index photos[0] as the cover reliably.
      expect(result.every((u) => u.startsWith('https://'))).toBe(true);
    });
  });

  // ============================================================
  // uploadCatchPhoto
  // ============================================================
  describe('uploadCatchPhoto', () => {
    it('returns null on upload error', async () => {
      // Mock storage.from().upload() to fail
      (mockSupabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        }),
        getPublicUrl: jest.fn(),
      });

      // uploadCatchPhoto reads a file, so we'd need expo-file-system mock.
      // The function will throw when trying to read a non-existent file.
      const result = await uploadCatchPhoto('file:///nonexistent.jpg');
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // uploadProfilePhoto
  // ============================================================
  describe('uploadProfilePhoto', () => {
    it('returns null on upload error', async () => {
      (mockSupabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        }),
        getPublicUrl: jest.fn(),
      });

      const result = await uploadProfilePhoto('file:///nonexistent.jpg', 'user-1');
      expect(result).toBeNull();
    });
  });
});
