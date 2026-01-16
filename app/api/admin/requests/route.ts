import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

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

export async function GET() {
  try {
    const requests = await prisma.shipmentRequest.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nickname: true,
        address: true,
        items: true,
        paymentProof: true,
        shippingProof: true,
        status: true,
        createdAt: true,
        shipment: { select: { trackingNumber: true } },
      },
    });

    const parsedItemsByRequestId = new Map<string, StoredRequestItem[]>();
    const productTypeIds = new Set<string>();

    for (const req of requests) {
      const parsed = normalizeItems(req.items);
      parsedItemsByRequestId.set(req.id, parsed);
      for (const item of parsed) {
        if ('productTypeId' in item) productTypeIds.add(item.productTypeId);
      }
    }

    const productTypes = productTypeIds.size
      ? await prisma.productType.findMany({
          where: { id: { in: Array.from(productTypeIds) } },
          select: { id: true, name: true },
        })
      : [];
    const productNameById = new Map(productTypes.map((p) => [p.id, p.name]));

    return NextResponse.json({
      requests: requests.map((req) => {
        const parsed = parsedItemsByRequestId.get(req.id) ?? [];
        const items = parsed.map((item) => {
          if ('productName' in item) return item;
          return {
            productName: productNameById.get(item.productTypeId) ?? item.productTypeId,
            quantity: item.quantity,
          };
        });

        return {
          id: req.id,
          nickname: req.nickname,
          address: req.address,
          items,
          paymentProof: req.paymentProof,
          shippingProof: req.shippingProof,
          status: req.status,
          createdAt: req.createdAt.toISOString(),
          trackingNumber: req.shipment?.trackingNumber ?? null,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

