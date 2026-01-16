import { z } from 'zod';

export const productTypeSchema = z.object({
  name: z.string().trim().min(1),
  unitPrice: z.number().finite(),
});

export const orderItemSchema = z.object({
  productName: z.string().trim().min(1),
  unitPrice: z.number().finite(),
  quantity: z.number().int(),
  subtotal: z.number().finite(),
});

export const orderSchema = z.object({
  nickname: z.string().trim().min(1),
  totalAmount: z.number().finite(),
  items: z.array(orderItemSchema).min(1),
});

export const excelImportSchema = z.object({
  periodName: z.string().trim().min(1),
  productTypes: z.array(productTypeSchema).min(1),
  orders: z.array(orderSchema).min(1),
});

export type ExcelImportValidatedData = z.infer<typeof excelImportSchema>;

