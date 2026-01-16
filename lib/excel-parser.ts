import * as XLSX from 'xlsx';

export type ExcelImportProductType = {
  name: string;
  unitPrice: number;
};

export type ExcelImportOrderItem = {
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type ExcelImportOrder = {
  nickname: string;
  totalAmount: number;
  items: ExcelImportOrderItem[];
};

export type ExcelImportData = {
  periodName: string;
  productTypes: ExcelImportProductType[];
  orders: ExcelImportOrder[];
};

export type ParseExcelOptions = {
  sheetName?: string;
};

export class ExcelParseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ExcelParseError';
  }
}

function cellToString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function cellToNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function cellToInteger(value: unknown): number {
  const parsed = cellToNumberOrNull(value);
  if (parsed == null) return 0;
  if (!Number.isInteger(parsed)) {
    throw new ExcelParseError('INVALID_QUANTITY', `Invalid quantity: ${String(value)}`);
  }
  return parsed;
}

function extractPeriodName(titleCell: string): string {
  const keyword = '汇总表';
  const idx = titleCell.indexOf(keyword);
  const name = (idx >= 0 ? titleCell.slice(0, idx) : titleCell).trim();
  return name;
}

function findRowIndex(
  rows: unknown[][],
  predicate: (row: unknown[], rowIndex: number) => boolean,
): number {
  for (let i = 0; i < rows.length; i++) {
    if (predicate(rows[i] ?? [], i)) return i;
  }
  return -1;
}

type ProductColumn = {
  name: string;
  unitPrice: number;
  columnIndex: number;
};

function parseProductColumns(rows: unknown[][], namesRowIndex: number, priceRowIndex: number): ProductColumn[] {
  const namesRow = rows[namesRowIndex] ?? [];
  const priceRow = rows[priceRowIndex] ?? [];
  const columns: ProductColumn[] = [];

  const columnCount = Math.max(namesRow.length, priceRow.length);
  for (let colIndex = 2; colIndex < columnCount; colIndex++) {
    const name = cellToString(namesRow[colIndex]);
    if (!name) continue;
    const unitPrice = cellToNumberOrNull(priceRow[colIndex]);
    if (unitPrice == null) {
      throw new ExcelParseError('MISSING_UNIT_PRICE', `Missing unit price for product "${name}"`);
    }
    columns.push({ name, unitPrice, columnIndex: colIndex });
  }

  if (columns.length === 0) {
    throw new ExcelParseError('MISSING_PRODUCT_TYPES', 'No product types found');
  }

  return columns;
}

function parseRawOrders(
  rows: unknown[][],
  dataStartRowIndex: number,
  productColumns: ProductColumn[],
): ExcelImportOrder[] {
  const rawOrders: ExcelImportOrder[] = [];

  for (let rowIndex = dataStartRowIndex; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    const nickname = cellToString(row[1]);
    const items: ExcelImportOrderItem[] = productColumns.map(({ name, unitPrice, columnIndex }) => {
      const quantity = cellToInteger(row[columnIndex]);
      return {
        productName: name,
        unitPrice,
        quantity,
        subtotal: quantity * unitPrice,
      };
    });

    const computedTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalAmount = cellToNumberOrNull(row[0]) ?? computedTotal;

    const hasMeaningfulData =
      totalAmount !== 0 || items.some((item) => item.quantity !== 0 || item.subtotal !== 0);

    if (!nickname) {
      if (hasMeaningfulData) {
        throw new ExcelParseError('MISSING_NICKNAME', `Missing nickname at row ${rowIndex + 1}`);
      }
      continue;
    }

    rawOrders.push({ nickname, totalAmount, items });
  }

  if (rawOrders.length === 0) {
    throw new ExcelParseError('NO_ORDERS', 'No orders found');
  }

  return rawOrders;
}

export function aggregateOrdersByNickname(orders: ExcelImportOrder[]): ExcelImportOrder[] {
  const merged = new Map<string, ExcelImportOrder>();

  for (const order of orders) {
    const nickname = order.nickname.trim();
    if (!nickname) continue;

    const existing = merged.get(nickname);
    if (!existing) {
      merged.set(nickname, {
        nickname,
        totalAmount: order.totalAmount,
        items: order.items.map((item) => ({ ...item })),
      });
      continue;
    }

    existing.totalAmount += order.totalAmount;
    for (let i = 0; i < existing.items.length; i++) {
      const existingItem = existing.items[i];
      const incomingItem = order.items[i];
      if (!incomingItem) continue;
      if (existingItem.productName !== incomingItem.productName) {
        throw new ExcelParseError(
          'PRODUCT_MISMATCH',
          `Product mismatch while merging nickname "${nickname}"`,
        );
      }
      existingItem.quantity += incomingItem.quantity;
      existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
    }
  }

  return [...merged.values()];
}

export function parseExcelImport(
  input: ArrayBuffer | Uint8Array | Buffer,
  options: ParseExcelOptions = {},
): ExcelImportData {
  const buffer = Buffer.isBuffer(input)
    ? input
    : input instanceof Uint8Array
      ? Buffer.from(input)
      : Buffer.from(input);

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = options.sheetName ?? workbook.SheetNames[0];
  if (!sheetName) throw new ExcelParseError('MISSING_SHEET', 'Workbook has no sheets');
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new ExcelParseError('MISSING_SHEET', `Missing sheet "${sheetName}"`);

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: null,
  }) as unknown[][];

  const titleRowIndex = findRowIndex(rows, (row) =>
    row.some((cell) => cellToString(cell).includes('汇总表')),
  );
  if (titleRowIndex < 0) {
    throw new ExcelParseError('MISSING_TITLE_ROW', 'Cannot find title row containing "汇总表"');
  }

  const titleRow = rows[titleRowIndex] ?? [];
  const titleCellValue = titleRow.find((cell) => cellToString(cell).includes('汇总表'));
  const titleCell = cellToString(titleCellValue);
  const periodName = extractPeriodName(titleCell);
  if (!periodName) {
    throw new ExcelParseError('MISSING_PERIOD_NAME', 'Cannot extract period name from title row');
  }

  const productNamesRowIndex = findRowIndex(rows, (row) => cellToString(row[1]) === '种类');
  if (productNamesRowIndex < 0) {
    throw new ExcelParseError('MISSING_PRODUCT_ROW', 'Cannot find product row containing "种类"');
  }

  const unitPriceRowIndex = findRowIndex(rows, (row) => cellToString(row[1]) === '单价');
  if (unitPriceRowIndex < 0) {
    throw new ExcelParseError('MISSING_UNIT_PRICE_ROW', 'Cannot find unit price row containing "单价"');
  }
  if (unitPriceRowIndex <= productNamesRowIndex) {
    throw new ExcelParseError('INVALID_LAYOUT', '"单价" row must appear after "种类" row');
  }

  const amountHeaderRowIndex = findRowIndex(rows, (row) => cellToString(row[0]) === '总金额');
  const dataStartRowIndex =
    amountHeaderRowIndex >= 0 ? amountHeaderRowIndex + 1 : unitPriceRowIndex + 1;

  const productColumns = parseProductColumns(rows, productNamesRowIndex, unitPriceRowIndex);
  const rawOrders = parseRawOrders(rows, dataStartRowIndex, productColumns);
  const orders = aggregateOrdersByNickname(rawOrders);

  return {
    periodName,
    productTypes: productColumns.map(({ name, unitPrice }) => ({ name, unitPrice })),
    orders,
  };
}
