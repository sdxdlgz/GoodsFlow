import { NextResponse } from 'next/server';
import { z } from 'zod';

import { importExcelData } from '@/lib/excel-import';
import { ExcelParseError, parseExcelImport } from '@/lib/excel-parser';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Legacy route - kept for backwards compatibility
// New multi-tenant route is at /api/g/[slug]/admin/import
export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'Please use the multi-tenant route /api/g/[slug]/admin/import' },
    { status: 400 }
  );
}

