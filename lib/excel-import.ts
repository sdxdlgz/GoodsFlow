import { excelImportSchema } from '@/lib/validators';
import type { ExcelImportData } from '@/lib/excel-parser';

type ImportTx = {
  period: {
    upsert: (args: unknown) => Promise<{ id: string; name: string }>;
  };
  productType: {
    upsert: (args: unknown) => Promise<{ id: string; name: string; unitPrice: number }>;
  };
  order: {
    upsert: (args: unknown) => Promise<{ id: string; nickname: string; totalAmount: number }>;
  };
  orderItem: {
    upsert: (args: unknown) => Promise<unknown>;
  };
};

export type ImportPrisma = {
  $transaction: <T>(fn: (tx: ImportTx) => Promise<T>) => Promise<T>;
};

export type ImportResult = {
  periodId: string;
  periodName: string;
  totalOrders: number;
  totalAmount: number;
};

export async function importExcelData(prisma: ImportPrisma, data: ExcelImportData): Promise<ImportResult> {
  const validated = excelImportSchema.parse(data);

  return prisma.$transaction(async (tx) => {
    const period = await tx.period.upsert({
      where: { name: validated.periodName },
      update: {},
      create: { name: validated.periodName },
    });

    const productTypeIdByName = new Map<string, string>();
    for (const productType of validated.productTypes) {
      const record = await tx.productType.upsert({
        where: { periodId_name: { periodId: period.id, name: productType.name } },
        update: { unitPrice: productType.unitPrice },
        create: { periodId: period.id, name: productType.name, unitPrice: productType.unitPrice },
      });
      productTypeIdByName.set(record.name, record.id);
    }

    for (const order of validated.orders) {
      const record = await tx.order.upsert({
        where: { periodId_nickname: { periodId: period.id, nickname: order.nickname } },
        update: { totalAmount: order.totalAmount },
        create: { periodId: period.id, nickname: order.nickname, totalAmount: order.totalAmount },
      });

      for (const item of order.items) {
        const productTypeId = productTypeIdByName.get(item.productName);
        if (!productTypeId) throw new Error(`Unknown product type: ${item.productName}`);

        await tx.orderItem.upsert({
          where: { orderId_productTypeId: { orderId: record.id, productTypeId } },
          update: { quantity: item.quantity, subtotal: item.subtotal },
          create: {
            orderId: record.id,
            productTypeId,
            quantity: item.quantity,
            subtotal: item.subtotal,
          },
        });
      }
    }

    const totalOrders = validated.orders.length;
    const totalAmount = validated.orders.reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      periodId: period.id,
      periodName: period.name,
      totalOrders,
      totalAmount,
    };
  });
}

