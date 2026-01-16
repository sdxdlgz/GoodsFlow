import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Legacy route - kept for backwards compatibility
// New multi-tenant route is at /api/g/[slug]/shipment/request
export async function POST() {
  return NextResponse.json(
    { error: 'Please use the multi-tenant route /api/g/[slug]/shipment/request' },
    { status: 400 }
  );
}

