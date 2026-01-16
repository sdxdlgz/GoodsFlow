import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const querySchema = z.object({
  nickname: z.string().trim().min(1),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({ nickname: searchParams.get('nickname') ?? '' });

    const orders = await prisma.order.findMany({
      where: { nickname: parsed.nickname },
      orderBy: { period: { createdAt: 'desc' } },
      select: {
        id: true,
        totalAmount: true,
        period: { select: { name: true } },
        items: {
          orderBy: { productType: { name: 'asc' } },
          select: {
            id: true,
            quantity: true,
            subtotal: true,
            shipped: true,
            productType: {
              select: { id: true, name: true, unitPrice: true, arrived: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        periodName: order.period.name,
        totalAmount: order.totalAmount,
        items: order.items.map((item) => ({
          id: item.id,
          productTypeId: item.productType.id,
          productName: item.productType.name,
          unitPrice: item.productType.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
          arrived: item.productType.arrived,
          shipped: item.shipped,
        })),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

