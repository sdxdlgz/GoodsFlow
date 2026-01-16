import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type BlobPutOptions = {
  contentType?: string;
  cacheControlMaxAge?: number;
};

export type BlobPutResult = {
  url: string;
  pathname: string;
  size: number;
  contentType?: string;
};

export type BlobStorage = {
  put: (pathname: string, body: ArrayBuffer | Uint8Array | Buffer, options?: BlobPutOptions) => Promise<BlobPutResult>;
};

export type BlobStorageMode = 'auto' | 'vercel' | 'local' | 'cloudflare-imgbed';

export type BlobStorageConfig = {
  mode?: BlobStorageMode;
  vercel?: {
    token?: string;
  };
  local?: {
    rootDir?: string;
    publicBasePath?: string;
    appUrl?: string;
  };
  cloudflareImgbed?: {
    baseUrl?: string;
    token?: string;
    uploadChannel?: string;
  };
};

function normalizePathname(raw: string): string {
  const parts = raw
    .replaceAll('\\', '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..')
    .map((part) => part.replaceAll(/[^a-zA-Z0-9._-]/g, '_'))
    .map((part) => part.replaceAll(/^_+|_+$/g, ''))
    .filter(Boolean);

  return parts.join('/');
}

function resolveLocalRoot(config?: BlobStorageConfig['local']): {
  rootDir: string;
  publicBasePath: string;
  appUrl: string | undefined;
} {
  const rootDir = config?.rootDir ?? path.join(process.cwd(), 'public', 'uploads');
  const publicBasePath = (config?.publicBasePath ?? '/uploads').replaceAll('\\', '/');
  const appUrl = config?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL;

  return {
    rootDir,
    publicBasePath: publicBasePath.startsWith('/') ? publicBasePath : `/${publicBasePath}`,
    appUrl,
  };
}

function toBuffer(body: ArrayBuffer | Uint8Array | Buffer): Buffer {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  return Buffer.from(body);
}

function createDeterministicSuffix(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
}

class LocalBlobStorage implements BlobStorage {
  private rootDir: string;
  private publicBasePath: string;
  private appUrl?: string;

  constructor(config?: BlobStorageConfig['local']) {
    const resolved = resolveLocalRoot(config);
    this.rootDir = resolved.rootDir;
    this.publicBasePath = resolved.publicBasePath;
    this.appUrl = resolved.appUrl;
  }

  async put(pathname: string, body: ArrayBuffer | Uint8Array | Buffer, options?: BlobPutOptions) {
    const bytes = toBuffer(body);
    const safeKey = normalizePathname(pathname);
    const key = safeKey || `upload-${Date.now()}-${createDeterministicSuffix(bytes)}`;

    const targetPath = path.join(this.rootDir, ...key.split('/'));
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(targetPath, bytes);

    const urlPath = path.posix.join(this.publicBasePath, key);
    const url = this.appUrl ? new URL(urlPath, this.appUrl).toString() : urlPath;

    return {
      url,
      pathname: key,
      size: bytes.byteLength,
      contentType: options?.contentType,
    } satisfies BlobPutResult;
  }
}

class VercelBlobStorage implements BlobStorage {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  async put(pathname: string, body: ArrayBuffer | Uint8Array | Buffer, options?: BlobPutOptions) {
    const key = normalizePathname(pathname);
    const bytes = toBuffer(body);
    const uploadKey = key || `upload-${Date.now()}-${(globalThis.crypto?.randomUUID?.() ?? randomUUID?.()) || ''}`;

    const { put } = await import('@vercel/blob');
    const result = await put(uploadKey, bytes, {
      access: 'public',
      token: this.token,
      addRandomSuffix: false,
      contentType: options?.contentType,
      cacheControlMaxAge: options?.cacheControlMaxAge,
    });

    return {
      url: result.url,
      pathname: result.pathname,
      size: bytes.byteLength,
      contentType: options?.contentType,
    } satisfies BlobPutResult;
  }
}

class CloudflareImgbedStorage implements BlobStorage {
  private baseUrl: string;
  private token: string;
  private uploadChannel?: string;

  constructor(baseUrl: string, token: string, uploadChannel?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.uploadChannel = uploadChannel;
  }

  async put(pathname: string, body: ArrayBuffer | Uint8Array | Buffer, options?: BlobPutOptions) {
    const bytes = toBuffer(body);
    const key = normalizePathname(pathname);
    const filename = key.split('/').pop() || `upload-${Date.now()}.bin`;

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(bytes)], { type: options?.contentType || 'application/octet-stream' });
    formData.append('file', blob, filename);

    const params = new URLSearchParams();
    if (this.uploadChannel) {
      params.set('uploadChannel', this.uploadChannel);
    }
    params.set('returnFormat', 'full');

    const url = `${this.baseUrl}/upload?${params.toString()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CloudFlare ImgBed upload failed: ${response.status} ${text}`);
    }

    const result = await response.json() as Array<{ src: string }>;
    if (!result?.[0]?.src) {
      throw new Error('CloudFlare ImgBed returned invalid response');
    }

    const src = result[0].src;
    const finalUrl = src.startsWith('http') ? src : `${this.baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;

    return {
      url: finalUrl,
      pathname: src,
      size: bytes.byteLength,
      contentType: options?.contentType,
    } satisfies BlobPutResult;
  }
}

export function createBlobStorage(config: BlobStorageConfig = {}): BlobStorage {
  const vercelToken = config.vercel?.token ?? process.env.BLOB_READ_WRITE_TOKEN;
  const imgbedUrl = config.cloudflareImgbed?.baseUrl ?? process.env.IMGBED_URL;
  const imgbedToken = config.cloudflareImgbed?.token ?? process.env.IMGBED_TOKEN;
  const imgbedChannel = config.cloudflareImgbed?.uploadChannel ?? process.env.IMGBED_CHANNEL;

  const mode = config.mode ?? 'auto';

  let resolvedMode: Exclude<BlobStorageMode, 'auto'>;
  if (mode === 'auto') {
    if (imgbedUrl && imgbedToken) {
      resolvedMode = 'cloudflare-imgbed';
    } else if (vercelToken) {
      resolvedMode = 'vercel';
    } else {
      resolvedMode = 'local';
    }
  } else {
    resolvedMode = mode;
  }

  if (resolvedMode === 'cloudflare-imgbed') {
    if (!imgbedUrl || !imgbedToken) {
      throw new Error('IMGBED_URL and IMGBED_TOKEN are required for cloudflare-imgbed mode');
    }
    return new CloudflareImgbedStorage(imgbedUrl, imgbedToken, imgbedChannel);
  }
  if (resolvedMode === 'vercel') return new VercelBlobStorage(vercelToken);
  return new LocalBlobStorage(config.local);
}

