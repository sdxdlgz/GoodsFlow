import imageCompression from 'browser-image-compression';

export type ImageCompressOptions = {
  maxSizeMB?: number;
  initialQuality?: number;
  maxWidthOrHeight?: number;
};

export const DEFAULT_IMAGE_COMPRESS_OPTIONS = Object.freeze({
  maxSizeMB: 1,
  initialQuality: 0.8,
  maxWidthOrHeight: 1920,
});

export async function compressImageFile(file: File, options: ImageCompressOptions = {}): Promise<File> {
  if (!(file instanceof File)) {
    throw new TypeError('Expected File');
  }

  if (!file.type.startsWith('image/')) {
    return file;
  }

  const maxSizeMB = options.maxSizeMB ?? DEFAULT_IMAGE_COMPRESS_OPTIONS.maxSizeMB;
  const initialQuality = options.initialQuality ?? DEFAULT_IMAGE_COMPRESS_OPTIONS.initialQuality;
  const maxWidthOrHeight =
    options.maxWidthOrHeight ?? DEFAULT_IMAGE_COMPRESS_OPTIONS.maxWidthOrHeight;

  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  return await imageCompression(file, {
    maxSizeMB,
    initialQuality,
    maxWidthOrHeight,
    useWebWorker: true,
  });
}
