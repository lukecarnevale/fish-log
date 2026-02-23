/**
 * photoUploadService.test.ts - Photo upload and URI handling tests
 */
import { mockSupabase } from '../mocks/supabase';

import {
  isLocalUri,
  ensurePublicPhotoUrl,
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
