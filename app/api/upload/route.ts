import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createBlobStorage } from '@/lib/blob-storage';

export const runtime = 'nodejs';

const uploadSchema = z.object({
  folder: z.string().trim().optional(),
});

function sanitizeFolder(input: string | undefined) {
  const value = (input ?? '').trim();
  if (!value) return '';
  return value
    .replaceAll('\\', '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..')
    .map((part) => part.replaceAll(/[^a-zA-Z0-9._-]/g, '_'))
    .filter(Boolean)
    .join('/');
}

function pickExtension(name: string) {
  const idx = name.lastIndexOf('.');
  if (idx <= 0) return '';
  const ext = name.slice(idx).trim();
  if (!ext || ext.length > 10) return '';
  if (!/^\.[a-zA-Z0-9]+$/.test(ext)) return '';
  return ext.toLowerCase();
}

function createKey(folder: string, filename: string) {
  const ext = pickExtension(filename);
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const safeFolder = sanitizeFolder(folder);
  const base = `upload-${id}${ext}`;
  return safeFolder ? `${safeFolder}/${base}` : base;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const meta = uploadSchema.parse({ folder: formData.get('folder') ?? undefined });
    const pathname = createKey(meta.folder ?? '', file.name || 'file');
    const arrayBuffer = await file.arrayBuffer();

    const storage = createBlobStorage();
    const result = await storage.put(pathname, Buffer.from(arrayBuffer), {
      contentType: file.type || 'application/octet-stream',
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', issues: error.issues }, { status: 400 });
    }
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

