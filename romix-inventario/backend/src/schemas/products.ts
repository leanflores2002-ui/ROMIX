import { z } from 'zod';
import { sanitizeOptionalText, sanitizeText } from '../utils/sanitize.js';

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid()
});

export const barcodeParamSchema = z.object({
  barcode: z.string().min(1).max(120).transform((value) => sanitizeText(value).toUpperCase())
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(160).transform(sanitizeText),
  category: z.string().max(80).optional().nullable().transform(sanitizeOptionalText),
  description: z.string().max(500).optional().nullable().transform(sanitizeOptionalText),
  active: z.boolean().optional()
});

export const updateProductSchema = createProductSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo'
});

export const createVariantSchema = z.object({
  barcode: z.string().min(1).max(120).transform((value) => sanitizeText(value).toUpperCase()),
  sku: z.string().min(1).max(120).transform((value) => sanitizeText(value).toUpperCase()),
  color: z.string().min(1).max(80).transform(sanitizeText),
  size: z.string().min(1).max(40).transform(sanitizeText),
  stock: z.number().int().min(0).default(0),
  minimumStock: z.number().int().min(0).default(0),
  active: z.boolean().optional()
});

export const updateVariantSchema = createVariantSchema.omit({ stock: true }).partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo'
});
