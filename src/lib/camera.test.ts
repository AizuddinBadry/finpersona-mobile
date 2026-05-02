import { describe, it, expect, vi, beforeEach } from 'vitest';

const getPhotoMock = vi.fn();

vi.mock('@capacitor/camera', () => ({
  Camera: { getPhoto: (...args: unknown[]) => getPhotoMock(...args) },
  CameraResultType: { Base64: 'base64', DataUrl: 'dataUrl', Uri: 'uri' },
  CameraSource: { Prompt: 'PROMPT', Camera: 'CAMERA', Photos: 'PHOTOS' },
}));

import { capturePhoto } from './camera';

describe('capturePhoto', () => {
  beforeEach(() => {
    getPhotoMock.mockReset();
  });

  it('returns base64 + image/jpeg for a typical jpeg photo', async () => {
    getPhotoMock.mockResolvedValue({ base64String: 'AAA', format: 'jpeg' });
    const out = await capturePhoto();
    expect(out).toEqual({ base64: 'AAA', mediaType: 'image/jpeg' });
  });

  it('maps png format to image/png', async () => {
    getPhotoMock.mockResolvedValue({ base64String: 'BBB', format: 'png' });
    const out = await capturePhoto();
    expect(out.mediaType).toBe('image/png');
  });

  it('falls back to image/jpeg for unknown formats', async () => {
    getPhotoMock.mockResolvedValue({ base64String: 'CCC', format: 'tiff' });
    const out = await capturePhoto();
    expect(out.mediaType).toBe('image/jpeg');
  });

  it('falls back to image/jpeg when format is missing entirely', async () => {
    getPhotoMock.mockResolvedValue({ base64String: 'DDD' });
    const out = await capturePhoto();
    expect(out.mediaType).toBe('image/jpeg');
  });

  it('passes Base64 result type and Prompt source to the plugin', async () => {
    getPhotoMock.mockResolvedValue({ base64String: 'AAA', format: 'jpeg' });
    await capturePhoto();
    expect(getPhotoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resultType: 'base64',
        source: 'PROMPT',
        allowEditing: false,
      }),
    );
  });

  it('throws when the plugin returns no base64 data', async () => {
    getPhotoMock.mockResolvedValue({ format: 'jpeg' });
    await expect(capturePhoto()).rejects.toThrow(/No image data/);
  });
});
