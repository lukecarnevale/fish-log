// services/photoUploadService.ts
//
// Service for uploading photos to Supabase Storage.
// Handles cross-platform image uploading for the catch feed.
//

import { supabase } from '../config/supabase';
import { File } from 'expo-file-system';

// Storage bucket names
const CATCH_PHOTOS_BUCKET = 'catch-photos';
const PROFILE_PHOTOS_BUCKET = 'profile-photos';

/**
 * Generate a unique filename for the uploaded photo.
 */
function generatePhotoFilename(userId?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const prefix = userId ? userId.substring(0, 8) : 'anon';
  return `${prefix}_${timestamp}_${random}.jpg`;
}

/**
 * Get the MIME type for the image.
 */
function getMimeType(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

/**
 * Read a local file URI as an ArrayBuffer using the new expo-file-system File API.
 */
async function readFileAsArrayBuffer(localUri: string): Promise<ArrayBuffer> {
  const file = new File(localUri);
  return file.arrayBuffer();
}

/**
 * Upload a photo to Supabase Storage.
 *
 * @param localUri - The local file URI (file:// or content://)
 * @param userId - Optional user ID for organizing uploads
 * @returns The public URL of the uploaded photo, or null if upload failed
 */
export async function uploadCatchPhoto(
  localUri: string,
  userId?: string
): Promise<string | null> {
  try {
    console.log('📸 Starting photo upload...');
    console.log('  Local URI:', localUri);

    // Read file directly as ArrayBuffer (no base64 roundtrip)
    let arrayBuffer: ArrayBuffer;

    try {
      arrayBuffer = await readFileAsArrayBuffer(localUri);
    } catch (readError) {
      console.error('Failed to read file:', readError);
      return null;
    }

    // Generate filename and get mime type
    const filename = generatePhotoFilename(userId);
    const mimeType = getMimeType(localUri);

    console.log('  Filename:', filename);
    console.log('  MIME type:', mimeType);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(CATCH_PHOTOS_BUCKET)
      .upload(filename, arrayBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    console.log('  Upload successful:', data.path);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(CATCH_PHOTOS_BUCKET)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      console.error('Failed to get public URL');
      return null;
    }

    console.log('✅ Photo uploaded successfully');
    console.log('  Public URL:', urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Photo upload failed:', error);
    return null;
  }
}

/**
 * Upload a profile photo to Supabase Storage.
 *
 * @param localUri - The local file URI (file:// or content://)
 * @param userId - User ID for organizing uploads
 * @returns The public URL of the uploaded photo, or null if upload failed
 */
export async function uploadProfilePhoto(
  localUri: string,
  userId: string
): Promise<string | null> {
  try {
    console.log('📸 Starting profile photo upload...');
    console.log('  Local URI:', localUri);

    // Read file directly as ArrayBuffer
    let arrayBuffer: ArrayBuffer;

    try {
      arrayBuffer = await readFileAsArrayBuffer(localUri);
    } catch (readError) {
      console.error('Failed to read file:', readError);
      return null;
    }

    // Generate filename with user ID and timestamp
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.jpg`;
    const mimeType = getMimeType(localUri);

    console.log('  Filename:', filename);
    console.log('  MIME type:', mimeType);

    // Upload to Supabase Storage (upsert to replace old photo)
    const { data, error } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(filename, arrayBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true, // Replace existing photo with same name
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    console.log('  Upload successful:', data.path);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      console.error('Failed to get public URL');
      return null;
    }

    console.log('✅ Profile photo uploaded successfully');
    console.log('  Public URL:', urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Profile photo upload failed:', error);
    return null;
  }
}

/**
 * Check if a URL is a local file URI that needs uploading.
 */
export function isLocalUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');
}

/**
 * Upload a photo if it's a local URI, otherwise return the existing URL.
 * This is useful for ensuring all photos have public URLs.
 */
export async function ensurePublicPhotoUrl(
  uri: string | null | undefined,
  userId?: string
): Promise<string | null> {
  if (!uri) return null;

  // If it's already a public URL, return it as-is
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  // Upload local file and get public URL
  return uploadCatchPhoto(uri, userId);
}
