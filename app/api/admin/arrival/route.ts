import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  productTypeIds: z.array(z.string().min(1)).min(1),
  arrived: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const json = await request.json();
    const payload = payloadSchema.parse(json);

    const result = await prisma.productType.updateMany({
      where: { id: { in: payload.productTypeIds } },
      data: {
        arrived: payload.arrived,
        arrivedAt: payload.arrived ? new Date() : null,
      },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

