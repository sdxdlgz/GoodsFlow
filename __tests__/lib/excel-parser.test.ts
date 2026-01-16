// @vitest-environment node
import { readFileSync } from 'node:fs';

import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import { aggregateOrdersByNickname, ExcelParseError, parseExcelImport } from '@/lib/excel-parser';

function makeWorkbookBuffer(rows: unknown[][], sheetName = '汇总表'): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function expectParseError(code: string, fn: () => unknown) {
  try {
    fn();
    throw new Error('Expected parse error');
  } catch (error) {
    expect(error).toBeInstanceOf(ExcelParseError);
    expect((error as ExcelParseError).code).toBe(code);
  }
}

describe('parseExcelImport', () => {
  it('parses a normal workbook and merges duplicate nicknames', () => {
    const buffer = readFileSync('__tests__/fixtures/test-data.xlsx');
    const data = parseExcelImport(buffer);

    expect(data.periodName).toBe('【测试】');
    expect(data.productTypes).toEqual([
      { name: 'A', unitPrice: 5 },
      { name: 'B', unitPrice: 2.5 },
    ]);

    expect(data.orders).toHaveLength(2);

    const alice = data.orders.find((o) => o.nickname === 'alice');
    const bob = data.orders.find((o) => o.nickname === 'bob');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();

    expect(alice!.totalAmount).toBeCloseTo(12.5);
    expect(alice!.items).toEqual([
      { productName: 'A', unitPrice: 5, quantity: 1, subtotal: 5 },
      { productName: 'B', unitPrice: 2.5, quantity: 3, subtotal: 7.5 },
    ]);

    expect(bob!.totalAmount).toBeCloseTo(2.5);
    expect(bob!.items).toEqual([
      { productName: 'A', unitPrice: 5, quantity: 1, subtotal: 5 },
      { productName: 'B', unitPrice: 2.5, quantity: -1, subtotal: -2.5 },
    ]);

    for (const order of data.orders) {
      expect(order.nickname.trim()).toBe(order.nickname);
      expect(Number.isFinite(order.totalAmount)).toBe(true);
      for (const item of order.items) {
        expect(Number.isFinite(item.unitPrice)).toBe(true);
        expect(Number.isInteger(item.quantity)).toBe(true);
        expect(Number.isFinite(item.subtotal)).toBe(true);
      }
    }
  });

  it('accepts ArrayBuffer and Uint8Array inputs', () => {
    const buffer = readFileSync('__tests__/fixtures/test-data.xlsx');
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const uint8 = new Uint8Array(buffer);

    expect(parseExcelImport(arrayBuffer).orders).toHaveLength(2);
    expect(parseExcelImport(uint8).periodName).toBe('【测试】');
  });

  it('selects sheet by name and errors for unknown names', () => {
    const buffer = readFileSync('__tests__/fixtures/test-data.xlsx');
    expect(parseExcelImport(buffer, { sheetName: '汇总表' }).orders).toHaveLength(2);
    expectParseError('MISSING_SHEET', () => parseExcelImport(buffer, { sheetName: '不存在' }));
  });

  it('extracts the title cell even when not in the first column', () => {
    const buffer = makeWorkbookBuffer([
      ['x', '【测试】汇总表'],
      ['', '种类', 'A'],
      ['', '单价', 1],
      ['总金额', '昵称/总数', 0],
      [1, 'alice', 1],
    ]);
    const data = parseExcelImport(buffer);
    expect(data.periodName).toBe('【测试】');
  });

  it('parses when the 总金额 header row is missing', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A'],
      ['', '单价', 1],
      [1, 'alice', 1],
    ]);
    const data = parseExcelImport(buffer);
    expect(data.orders).toEqual([
      {
        nickname: 'alice',
        totalAmount: 1,
        items: [{ productName: 'A', unitPrice: 1, quantity: 1, subtotal: 1 }],
      },
    ]);
  });

  it('skips rows with empty nickname and no data', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A'],
      ['', '单价', 1],
      ['总金额', '昵称/总数', 0],
      [0, '', 0],
      [1, 'alice', 1],
    ]);
    const data = parseExcelImport(buffer);
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].nickname).toBe('alice');
  });

  it('skips unnamed product columns and keeps correct mapping', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A', '', 'B'],
      ['', '单价', 1, 999, 2],
      ['总金额', '昵称/总数', 0, 0, 0],
      [3, 'alice', 1, 0, 1],
    ]);
    const data = parseExcelImport(buffer);
    expect(data.productTypes.map((p) => p.name)).toEqual(['A', 'B']);
    expect(data.orders[0].items).toEqual([
      { productName: 'A', unitPrice: 1, quantity: 1, subtotal: 1 },
      { productName: 'B', unitPrice: 2, quantity: 1, subtotal: 2 },
    ]);
  });

  it('handles numeric strings and non-numeric totals (avoids NaN)', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A'],
      ['', '单价', '2'],
      ['总金额', '昵称/总数', 0],
      [true, 'alice', '1'],
    ]);
    const data = parseExcelImport(buffer);
    expect(data.orders[0].totalAmount).toBe(2);
    expect(Number.isNaN(data.orders[0].totalAmount)).toBe(false);
  });

  it('throws when the title row is missing', () => {
    const buffer = makeWorkbookBuffer([
      ['标题'],
      ['', '种类', 'A'],
      ['', '单价', 1],
      ['总金额', '昵称/总数', 0],
      [1, 'alice', 1],
    ]);
    expectParseError('MISSING_TITLE_ROW', () => parseExcelImport(buffer));
  });

  it('throws when period name cannot be extracted', () => {
    const buffer = makeWorkbookBuffer([
      ['汇总表'],
      ['', '种类', 'A'],
      ['', '单价', 1],
      ['总金额', '昵称/总数', 0],
      [1, 'alice', 1],
    ]);
    expectParseError('MISSING_PERIOD_NAME', () => parseExcelImport(buffer));
  });

  it('throws when product row is missing', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '单价', 1],
      ['总金额', '昵称/总数', 0],
      [1, 'alice', 1],
    ]);
    expectParseError('MISSING_PRODUCT_ROW', () => parseExcelImport(buffer));
  });

  it('throws when unit price row is missing', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A'],
      ['总金额', '昵称/总数', 0],
      [1, 'alice', 1],
    ]);
    expectParseError('MISSING_UNIT_PRICE_ROW', () => parseExcelImport(buffer));
  });

  it('throws on invalid row ordering', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '单价', 1],
      ['', '种类', 'A'],
      ['总金额', '昵称/总数', 0],
      [1, 'alice', 1],
    ]);
    expectParseError('INVALID_LAYOUT', () => parseExcelImport(buffer));
  });

  it('throws when a product unit price is missing', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A'],
      ['', '单价', null],
      ['总金额', '昵称/总数', 0],
      [0, 'alice', 0],
    ]);
    expectParseError('MISSING_UNIT_PRICE', () => parseExcelImport(buffer));
  });

  it('throws when there are no product types', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类'],
      ['', '单价'],
      ['总金额', '昵称/总数'],
      [0, 'alice'],
    ]);
    expectParseError('MISSING_PRODUCT_TYPES', () => parseExcelImport(buffer));
  });

  it('throws when nickname is missing but data exists', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A'],
      ['', '单价', 1],
      ['总金额', '昵称/总数', 0],
      [1, '', 1],
    ]);
    expectParseError('MISSING_NICKNAME', () => parseExcelImport(buffer));
  });

  it('throws when there are no orders', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A'],
      ['', '单价', 1],
      ['总金额', '昵称/总数', 0],
    ]);
    expectParseError('NO_ORDERS', () => parseExcelImport(buffer));
  });

  it('throws on non-integer quantities', () => {
    const buffer = makeWorkbookBuffer([
      ['【测试】汇总表'],
      ['', '种类', 'A'],
      ['', '单价', 1],
      ['总金额', '昵称/总数', 0],
      [1.5, 'alice', 1.5],
    ]);
    expectParseError('INVALID_QUANTITY', () => parseExcelImport(buffer));
  });
});

describe('aggregateOrdersByNickname', () => {
  it('throws on product mismatch while merging', () => {
    expectParseError('PRODUCT_MISMATCH', () =>
      aggregateOrdersByNickname([
        {
          nickname: 'alice',
          totalAmount: 1,
          items: [{ productName: 'A', unitPrice: 1, quantity: 1, subtotal: 1 }],
        },
        {
          nickname: 'alice',
          totalAmount: 1,
          items: [{ productName: 'B', unitPrice: 1, quantity: 1, subtotal: 1 }],
        },
      ]),
    );
  });
});
