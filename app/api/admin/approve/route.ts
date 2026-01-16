import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  requestId: z.string().min(1),
  approved: z.boolean(),
  trackingNumber: z.string().trim().min(1).optional(),
});

function extractFirstProductTypeId(items: unknown): string | null {
  if (!Array.isArray(items)) return null;
  for (const entry of items) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.productTypeId === 'string' && record.productTypeId.trim()) {
      return record.productTypeId.trim();
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = payloadSchema.parse(json);

    const result = await prisma.$transaction(async (tx) => {
      const req = await tx.shipmentRequest.findUnique({
        where: { id: payload.requestId },
        select: { id: true, nickname: true, items: true },
      });

      if (!req) {
        return { status: 404 as const, body: { error: 'Request not found' } };
      }

      if (!payload.approved) {
        await tx.shipmentRequest.update({
          where: { id: payload.requestId },
          data: { status: 'rejected' },
        });

        const deleted = await tx.shipment.deleteMany({ where: { requestId: payload.requestId } });
        return {
          status: 200 as const,
          body: { shipmentId: deleted.count ? 'deleted' : undefined },
        };
      }

      const firstProductTypeId = extractFirstProductTypeId(req.items);
      if (!firstProductTypeId) {
        return { status: 400 as const, body: { error: 'Missing productTypeId in request items' } };
      }

      const productType = await tx.productType.findUnique({
        where: { id: firstProductTypeId },
        select: { periodId: true },
      });

      if (!productType) {
        return { status: 400 as const, body: { error: 'Invalid productTypeId' } };
      }

      const order = await tx.order.findUnique({
        where: { periodId_nickname: { periodId: productType.periodId, nickname: req.nickname } },
        select: { id: true },
      });

      if (!order) {
        return { status: 400 as const, body: { error: 'Order not found for this nickname' } };
      }

      await tx.shipmentRequest.update({
        where: { id: payload.requestId },
        data: { status: 'approved' },
      });

      const now = payload.trackingNumber ? new Date() : null;
      const shipment = await tx.shipment.upsert({
        where: { requestId: payload.requestId },
        update: {
          orderId: order.id,
          trackingNumber: payload.trackingNumber,
          shippedAt: now,
          status: payload.trackingNumber ? 'shipped' : 'processing',
        },
        create: {
          orderId: order.id,
          requestId: payload.requestId,
          trackingNumber: payload.trackingNumber,
          shippedAt: now,
          status: payload.trackingNumber ? 'shipped' : 'processing',
        },
      });

      return { status: 200 as const, body: { shipmentId: shipment.id } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

