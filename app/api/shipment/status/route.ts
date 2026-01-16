import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const querySchema = z.object({
  nickname: z.string().trim().min(1),
});

type StoredRequestItem =
  | { productTypeId: string; quantity: number }
  | { productName: string; quantity: number };

function normalizeItems(value: unknown): StoredRequestItem[] {
  if (!Array.isArray(value)) return [];
  const items: StoredRequestItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const quantity = typeof record.quantity === 'number' ? record.quantity : Number(record.quantity);
    if (!Number.isFinite(quantity)) continue;

    if (typeof record.productName === 'string' && record.productName.trim()) {
      items.push({ productName: record.productName.trim(), quantity });
      continue;
    }

    if (typeof record.productTypeId === 'string' && record.productTypeId.trim()) {
      items.push({ productTypeId: record.productTypeId.trim(), quantity });
    }
  }
  return items;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({ nickname: searchParams.get('nickname') ?? '' });

    const requests = await prisma.shipmentRequest.findMany({
      where: { nickname: parsed.nickname },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nickname: true,
        items: true,
        status: true,
        createdAt: true,
        shipment: { select: { trackingNumber: true, status: true, shippedAt: true } },
      },
    });

    const parsedItemsByRequestId = new Map<string, StoredRequestItem[]>();
    const productTypeIds = new Set<string>();

    for (const req of requests) {
      const parsedItems = normalizeItems(req.items);
      parsedItemsByRequestId.set(req.id, parsedItems);
      for (const item of parsedItems) {
        if ('productTypeId' in item) productTypeIds.add(item.productTypeId);
      }
    }

    const productTypes = productTypeIds.size
      ? await prisma.productType.findMany({
          where: { id: { in: Array.from(productTypeIds) } },
          select: { id: true, name: true, period: { select: { name: true } } },
        })
      : [];
    const productTypeById = new Map(productTypes.map((p) => [p.id, p]));

    return NextResponse.json({
      records: requests.map((req) => {
        const parsedItems = parsedItemsByRequestId.get(req.id) ?? [];
        const items = parsedItems.map((item) => {
          if ('productName' in item) return item;
          return {
            productName: productTypeById.get(item.productTypeId)?.name ?? item.productTypeId,
            quantity: item.quantity,
          };
        });

        const firstProductTypeId = parsedItems.find((i): i is { productTypeId: string; quantity: number } =>
          Boolean(i && typeof (i as any).productTypeId === 'string'),
        )?.productTypeId;
        const periodName = firstProductTypeId
          ? productTypeById.get(firstProductTypeId)?.period?.name ?? null
          : null;

        return {
          requestId: req.id,
          nickname: req.nickname,
          periodName,
          status: req.status,
          createdAt: req.createdAt.toISOString(),
          trackingNumber: req.shipment?.trackingNumber ?? null,
          shipmentStatus: req.shipment?.status ?? null,
          shippedAt: req.shipment?.shippedAt ? req.shipment.shippedAt.toISOString() : null,
          items,
        };
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

