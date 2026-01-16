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

export type BlobStorageMode = 'auto' | 'vercel' | 'local';

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

export function createBlobStorage(config: BlobStorageConfig = {}): BlobStorage {
  const token = config.vercel?.token ?? process.env.BLOB_READ_WRITE_TOKEN;
  const mode = config.mode ?? 'auto';
  const resolvedMode: Exclude<BlobStorageMode, 'auto'> =
    mode === 'auto' ? (token ? 'vercel' : 'local') : mode;

  if (resolvedMode === 'vercel') return new VercelBlobStorage(token);
  return new LocalBlobStorage(config.local);
}

