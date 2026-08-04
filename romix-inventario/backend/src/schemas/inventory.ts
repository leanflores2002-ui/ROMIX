import { z } from 'zod';
import { sanitizeOptionalText, sanitizeText } from '../utils/sanitize.js';

export const scanSchema = z
  .object({
    barcode: z.string().min(1).max(120).transform((value) => sanitizeText(value).toUpperCase()),
    movementType: z.enum(['in', 'out', 'adjustment', 'query']),
    quantity: z.number().int().min(0).default(1),
    note: z.string().max(300).optional().nullable().transform(sanitizeOptionalText)
  })
  .superRefine((value, context) => {
    if (value.movementType !== 'adjustment' && value.quantity <= 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['quantity'], message: 'La cantidad debe ser mayor que cero' });
    }
  });

export const movementsQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  movementType: z.enum(['in', 'out', 'adjustment']).optional(),
  product: z.string().max(160).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
  barcode: z.string().max(120).optional().transform((value) => (value ? sanitizeText(value).toUpperCase() : undefined)),
  user: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});
