// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBlobStorage } from '@/lib/blob-storage';

const vercelPutMock = vi.hoisted(() => vi.fn());

vi.mock('@vercel/blob', () => ({ put: vercelPutMock }));

describe('blob-storage', () => {
  let dir: string | null = null;

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
      dir = null;
    }
    delete process.env.BLOB_READ_WRITE_TOKEN;
    vercelPutMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('stores bytes on local filesystem and returns public url', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'goodsflow-uploads-'));
    const storage = createBlobStorage({
      mode: 'local',
      local: { rootDir: dir, publicBasePath: '/uploads', appUrl: 'https://example.com' },
    });

    const result = await storage.put('proofs/test.txt', Buffer.from('hello'), {
      contentType: 'text/plain',
    });

    expect(result).toEqual(
      expect.objectContaining({
        pathname: 'proofs/test.txt',
        url: 'https://example.com/uploads/proofs/test.txt',
        size: 5,
        contentType: 'text/plain',
      }),
    );

    const contents = await readFile(path.join(dir, 'proofs', 'test.txt'), 'utf8');
    expect(contents).toBe('hello');
  });

  it('normalizes unsafe pathnames for local storage', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'goodsflow-uploads-'));
    const storage = createBlobStorage({
      mode: 'local',
      local: { rootDir: dir, publicBasePath: '/uploads' },
    });

    const result = await storage.put('../evil.txt', Buffer.from('x'));
    expect(result.pathname).toBe('evil.txt');
    expect(result.url).toBe('/uploads/evil.txt');

    const contents = await readFile(path.join(dir, 'evil.txt'), 'utf8');
    expect(contents).toBe('x');
  });

  it('generates a deterministic local key when pathname is empty', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'goodsflow-uploads-'));
    const storage = createBlobStorage({
      mode: 'local',
      local: { rootDir: dir, publicBasePath: 'uploads' },
    });

    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const bytes = Buffer.from('hello');
    const expectedSuffix = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const result = await storage.put('///', bytes);

    expect(result.pathname).toBe(`upload-${now}-${expectedSuffix}`);
    expect(result.url).toBe(`/uploads/${result.pathname}`);
    const contents = await readFile(path.join(dir, result.pathname), 'utf8');
    expect(contents).toBe('hello');
  });

  it('uploads to Vercel Blob when configured', async () => {
    vercelPutMock.mockResolvedValueOnce({
      url: 'https://blob.example.com/p/proofs/a.png',
      pathname: 'proofs/a.png',
      size: 123,
    });

    const storage = createBlobStorage({ mode: 'vercel', vercel: { token: 'token' } });
    const result = await storage.put('proofs/a.png', new Uint8Array([1, 2, 3]), {
      contentType: 'image/png',
      cacheControlMaxAge: 60,
    });

    expect(vercelPutMock).toHaveBeenCalledWith(
      'proofs/a.png',
      expect.any(Buffer),
      expect.objectContaining({
        access: 'public',
        token: 'token',
        addRandomSuffix: false,
        contentType: 'image/png',
        cacheControlMaxAge: 60,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        url: 'https://blob.example.com/p/proofs/a.png',
        pathname: 'proofs/a.png',
        size: 123,
        contentType: 'image/png',
      }),
    );
  });

  it('handles ArrayBuffer inputs', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'goodsflow-uploads-'));
    const storage = createBlobStorage({ mode: 'local', local: { rootDir: dir, publicBasePath: '/uploads' } });

    const bytes = new Uint8Array([1, 2, 3, 4]);
    const result = await storage.put('array-buffer.bin', bytes.buffer);

    expect(result.size).toBe(4);
    const contents = await readFile(path.join(dir, 'array-buffer.bin'));
    expect(Buffer.from(contents)).toEqual(Buffer.from([1, 2, 3, 4]));
  });

  it('uses local storage in auto mode without token (default root)', async () => {
    const originalCwd = process.cwd();
    dir = await mkdtemp(path.join(tmpdir(), 'goodsflow-cwd-'));
    process.chdir(dir);
    try {
      const storage = createBlobStorage();
      const result = await storage.put('auto.txt', Buffer.from('ok'));

      expect(result.url).toBe('/uploads/auto.txt');
      const contents = await readFile(path.join(dir, 'public', 'uploads', 'auto.txt'), 'utf8');
      expect(contents).toBe('ok');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('uses Vercel Blob in auto mode when token exists', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'env-token';
    vercelPutMock.mockResolvedValueOnce({
      url: 'https://blob.example.com/p/proofs/env.png',
      pathname: 'proofs/env.png',
      size: 3,
    });

    const storage = createBlobStorage();
    await storage.put('proofs/env.png', Buffer.from([1, 2, 3]));

    expect(vercelPutMock).toHaveBeenCalledWith(
      'proofs/env.png',
      expect.any(Buffer),
      expect.objectContaining({ token: 'env-token' }),
    );
  });

  it('generates a Vercel key when pathname normalizes to empty', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.stubGlobal('crypto', { randomUUID: () => 'abc' } as any);

    vercelPutMock.mockResolvedValueOnce({
      url: 'https://blob.example.com/p/upload.png',
      pathname: 'upload.png',
      size: 1,
    });

    const storage = createBlobStorage({ mode: 'vercel', vercel: { token: 'token' } });
    await storage.put('///', Buffer.from([1]));

    expect(vercelPutMock).toHaveBeenCalledWith(
      `upload-${now}-abc`,
      expect.any(Buffer),
      expect.objectContaining({ token: 'token' }),
    );
  });

  it('falls back to Node randomUUID when crypto.randomUUID is missing', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.stubGlobal('crypto', {} as any);

    vercelPutMock.mockResolvedValueOnce({
      url: 'https://blob.example.com/p/upload.png',
      pathname: 'upload.png',
      size: 1,
    });

    const storage = createBlobStorage({ mode: 'vercel', vercel: { token: 'token' } });
    await storage.put('///', Buffer.from([1]));

    const calledKey = vercelPutMock.mock.calls[0]?.[0] as string;
    expect(calledKey).toMatch(new RegExp(`^upload-${now}-`));
    expect(calledKey.length).toBeGreaterThan(`upload-${now}-`.length);
  });
});
