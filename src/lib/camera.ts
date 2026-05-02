/**
 * Thin adapter over @capacitor/camera. Returns a base64 image + media type
 * so the capture flow stays platform-agnostic — the screen calls
 * capturePhoto() and gets the same shape on iOS, Android, and web preview.
 *
 * On native, getPhoto({ resultType: Base64, source: Prompt }) shows the
 * native action sheet so the user picks Camera or Photos. On web, Capacitor
 * falls back to a file input.
 */
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { MediaType } from '@/lib/api/finpersona';

export type CapturedPhoto = {
  base64: string;
  mediaType: MediaType;
};

const VALID_FORMATS: Record<string, MediaType> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function normalizeMediaType(format: string | undefined): MediaType {
  if (!format) return 'image/jpeg';
  const f = format.toLowerCase();
  return VALID_FORMATS[f] ?? 'image/jpeg';
}

export async function capturePhoto(): Promise<CapturedPhoto> {
  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
  });
  if (!photo.base64String) {
    throw new Error('No image data returned from camera');
  }
  return {
    base64: photo.base64String,
    mediaType: normalizeMediaType(photo.format),
  };
}
