// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { importExcelData } from '@/lib/excel-import';
import { parseExcelImport } from '@/lib/excel-parser';

const TEST_GROUP_ID = 'test_group_123';

function createMockPrisma() {
  const tx = {
    period: {
      upsert: vi.fn(async (args: any) => ({ id: 'period_1', name: args.create.name })),
    },
    productType: {
      upsert: vi.fn(async (args: any) => ({
        id: `pt_${args.create.name}`,
        name: args.create.name,
        unitPrice: args.create.unitPrice,
      })),
    },
    order: {
      upsert: vi.fn(async (args: any) => ({
        id: `order_${args.create.nickname}`,
        nickname: args.create.nickname,
        totalAmount: args.create.totalAmount,
      })),
    },
    orderItem: {
      upsert: vi.fn(async () => ({})),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };

  return { prisma, tx };
}

describe('importExcelData', () => {
  it('imports data in a transaction using upserts (idempotent)', async () => {
    const buffer = readFileSync('__tests__/fixtures/test-data.xlsx');
    const data = parseExcelImport(buffer);
    const { prisma, tx } = createMockPrisma();

    const result = await importExcelData(prisma as any, data, TEST_GROUP_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.period.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId_name: { groupId: TEST_GROUP_ID, name: '【测试】' } },
        create: { groupId: TEST_GROUP_ID, name: '【测试】' },
      }),
    );

    expect(tx.productType.upsert).toHaveBeenCalledTimes(2);
    expect(tx.order.upsert).toHaveBeenCalledTimes(2);
    expect(tx.orderItem.upsert).toHaveBeenCalledTimes(4);

    expect(result).toEqual({
      periodId: 'period_1',
      periodName: '【测试】',
      totalOrders: 2,
      totalAmount: 15,
    });

    await importExcelData(prisma as any, data, TEST_GROUP_ID);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('rolls back (rejects) when a transaction step throws', async () => {
    const buffer = readFileSync('__tests__/fixtures/test-data.xlsx');
    const data = parseExcelImport(buffer);
    const { prisma, tx } = createMockPrisma();

    tx.order.upsert.mockImplementationOnce(async (args: any) => ({
      id: `order_${args.create.nickname}`,
      nickname: args.create.nickname,
      totalAmount: args.create.totalAmount,
    }));
    tx.order.upsert.mockImplementationOnce(async () => {
      throw new Error('DB failure');
    });

    await expect(importExcelData(prisma as any, data, TEST_GROUP_ID)).rejects.toThrow('DB failure');
    expect(tx.orderItem.upsert).toHaveBeenCalledTimes(2);
  });

  it('rejects when an order references unknown product type', async () => {
    const buffer = readFileSync('__tests__/fixtures/test-data.xlsx');
    const data = parseExcelImport(buffer);
    const { prisma } = createMockPrisma();

    const broken = JSON.parse(JSON.stringify(data));
    broken.orders[0].items[0].productName = 'UNKNOWN';

    await expect(importExcelData(prisma as any, broken as any, TEST_GROUP_ID)).rejects.toThrow('Unknown product type');
  });
});
