import { NextResponse } from 'next/server';
import { z } from 'zod';

import { importExcelData } from '@/lib/excel-import';
import { ExcelParseError, parseExcelImport } from '@/lib/excel-parser';
import { getGroupBySlug } from '@/lib/group';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const group = await getGroupBySlug(slug);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const buffer = Buffer.from(await (file as Blob).arrayBuffer());
    const parsed = parseExcelImport(buffer);
    const result = await importExcelData(
      prisma as unknown as Parameters<typeof importExcelData>[0],
      parsed,
      group.id
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ExcelParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
