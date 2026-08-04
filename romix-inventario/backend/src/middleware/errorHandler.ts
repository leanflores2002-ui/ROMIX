import type { NextFunction, Request, Response } from 'express';
import { isHttpError } from '../utils/httpError.js';

const supabaseMessageMap: Record<string, { status: number; message: string; code: string }> = {
  barcode_not_found: { status: 404, message: 'Codigo inexistente', code: 'barcode_not_found' },
  product_not_found: { status: 404, message: 'Producto inexistente', code: 'product_not_found' },
  invalid_quantity: { status: 400, message: 'Cantidad invalida', code: 'invalid_quantity' },
  invalid_movement_type: { status: 400, message: 'Tipo de movimiento invalido', code: 'invalid_movement_type' },
  insufficient_stock: { status: 409, message: 'Stock insuficiente', code: 'insufficient_stock' },
  product_inactive: { status: 409, message: 'Producto inactivo', code: 'product_inactive' },
  variant_inactive: { status: 409, message: 'Variante inactiva', code: 'variant_inactive' },
  duplicate: { status: 409, message: 'Dato duplicado', code: 'duplicate_value' }
};

export const mapDatabaseError = (error: any) => {
  const message = String(error?.message ?? '');
  const code = String(error?.code ?? '');

  if (code === '23505') return supabaseMessageMap.duplicate;

  for (const [key, value] of Object.entries(supabaseMessageMap)) {
    if (message.includes(key)) return value;
  }

  return null;
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ success: false, code: 'invalid_json', message: 'JSON invalido' });
  }
  if (isHttpError(error)) {
    return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
  }

  const databaseError = mapDatabaseError(error);
  if (databaseError) {
    return res
      .status(databaseError.status)
      .json({ success: false, code: databaseError.code, message: databaseError.message });
  }

  console.error(error);
  return res.status(500).json({ success: false, code: 'internal_error', message: 'Error interno del servidor' });
};
