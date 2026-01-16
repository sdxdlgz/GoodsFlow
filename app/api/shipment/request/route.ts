import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  nickname: z.string().trim().min(1),
  address: z.string().trim().min(1),
  paymentProof: z.string().trim().min(1),
  shippingProof: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        productTypeId: z.string().trim().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = payloadSchema.parse(json);

    const uniqueItems = new Map<string, number>();
    for (const item of payload.items) {
      uniqueItems.set(item.productTypeId, (uniqueItems.get(item.productTypeId) ?? 0) + item.quantity);
    }

    const productTypeIds = Array.from(uniqueItems.keys());
    const productTypes = await prisma.productType.findMany({
      where: { id: { in: productTypeIds } },
      select: { id: true, arrived: true, periodId: true },
    });

    if (productTypes.length !== productTypeIds.length) {
      return NextResponse.json({ error: 'Invalid productTypeId' }, { status: 400 });
    }

    const firstPeriodId = productTypes[0]?.periodId;
    if (!firstPeriodId) {
      return NextResponse.json({ error: 'Invalid productTypeId' }, { status: 400 });
    }

    for (const productType of productTypes) {
      if (!productType.arrived) {
        return NextResponse.json({ error: 'Selected product has not arrived' }, { status: 400 });
      }
      if (productType.periodId !== firstPeriodId) {
        return NextResponse.json({ error: 'Items must belong to the same period' }, { status: 400 });
      }
    }

    const order = await prisma.order.findUnique({
      where: { periodId_nickname: { periodId: firstPeriodId, nickname: payload.nickname } },
      select: {
        id: true,
        items: { select: { productTypeId: true, quantity: true, shipped: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found for this nickname' }, { status: 404 });
    }

    const orderItemByProductTypeId = new Map(order.items.map((i) => [i.productTypeId, i]));
    for (const [productTypeId, quantity] of uniqueItems) {
      const orderItem = orderItemByProductTypeId.get(productTypeId);
      if (!orderItem) {
        return NextResponse.json({ error: 'Selected item not found in order' }, { status: 400 });
      }
      if (orderItem.shipped) {
        return NextResponse.json({ error: 'Selected item already shipped' }, { status: 400 });
      }
      if (quantity > orderItem.quantity) {
        return NextResponse.json({ error: 'Quantity exceeds ordered amount' }, { status: 400 });
      }
    }

    const created = await prisma.shipmentRequest.create({
      data: {
        nickname: payload.nickname,
        address: payload.address,
        paymentProof: payload.paymentProof,
        shippingProof: payload.shippingProof,
        items: Array.from(uniqueItems.entries()).map(([productTypeId, quantity]) => ({
          productTypeId,
          quantity,
        })),
        status: 'pending',
      },
      select: { id: true },
    });

    return NextResponse.json({ requestId: created.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

