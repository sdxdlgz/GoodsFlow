import { describe, expect, it, vi } from 'vitest';

const imageCompressionMock = vi.hoisted(() => vi.fn());

vi.mock('browser-image-compression', () => ({ default: imageCompressionMock }));

import { compressImageFile, DEFAULT_IMAGE_COMPRESS_OPTIONS } from '@/lib/image-compress';

describe('image-compress', () => {
  it('throws when input is not a File', async () => {
    await expect(compressImageFile({} as any)).rejects.toThrow('Expected File');
  });

  it('skips compression for non-image files', async () => {
    const file = new File(['hi'], 'note.txt', { type: 'text/plain' });
    const result = await compressImageFile(file);
    expect(result).toBe(file);
    expect(imageCompressionMock).not.toHaveBeenCalled();
  });

  it('skips compression when image is already under maxSizeMB', async () => {
    const file = new File(['1'], 'small.png', { type: 'image/png' });
    const result = await compressImageFile(file);
    expect(result).toBe(file);
    expect(imageCompressionMock).not.toHaveBeenCalled();
  });

  it('compresses large images with default options', async () => {
    imageCompressionMock.mockResolvedValueOnce(new File(['x'], 'compressed.jpg', { type: 'image/jpeg' }));

    const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    const result = await compressImageFile(big);

    expect(imageCompressionMock).toHaveBeenCalledWith(
      big,
      expect.objectContaining({
        maxSizeMB: DEFAULT_IMAGE_COMPRESS_OPTIONS.maxSizeMB,
        initialQuality: DEFAULT_IMAGE_COMPRESS_OPTIONS.initialQuality,
        maxWidthOrHeight: DEFAULT_IMAGE_COMPRESS_OPTIONS.maxWidthOrHeight,
        useWebWorker: true,
      }),
    );
    expect(result.name).toBe('compressed.jpg');
  });

  it('allows overriding compression options', async () => {
    imageCompressionMock.mockResolvedValueOnce(new File(['y'], 'compressed.jpg', { type: 'image/jpeg' }));

    const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    await compressImageFile(big, { maxSizeMB: 0.5, initialQuality: 0.6, maxWidthOrHeight: 800 });

    expect(imageCompressionMock).toHaveBeenCalledWith(
      big,
      expect.objectContaining({
        maxSizeMB: 0.5,
        initialQuality: 0.6,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      }),
    );
  });
});
