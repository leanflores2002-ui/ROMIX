import { describe, expect, it, vi } from 'vitest';
import { mapDatabaseError } from '../src/middleware/errorHandler.js';
import { createProductsService } from '../src/services/products.service.js';
import type { ProductsRepository } from '../src/services/products.repository.js';

const product = { id: '11111111-1111-4111-8111-111111111111', name: 'Pantalon jogger', category: 'Mujer', description: null, active: true, product_variants: [] };

const createRepository = (): ProductsRepository => ({
  listProducts: vi.fn(async () => [product]),
  getProduct: vi.fn(async () => product),
  createProduct: vi.fn(async (input) => ({ ...product, ...input })),
  updateProduct: vi.fn(async (_id, input) => ({ ...product, ...input })),
  createVariant: vi.fn(async (_productId, input) => ({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ...input })),
  updateVariant: vi.fn(async (_id, input) => input),
  getVariantByBarcode: vi.fn(async () => null)
});

describe('productos y variantes', () => {
  it('12. crea un producto', async () => {
    const repository = createRepository();
    const created = await createProductsService(repository).createProduct({ name: 'Campera', category: 'Mujer' });
    expect(created).toMatchObject({ name: 'Campera', category: 'Mujer' });
    expect(repository.createProduct).toHaveBeenCalledOnce();
  });

  it('13. transforma un codigo de barras duplicado en conflicto HTTP 409', () => {
    expect(mapDatabaseError({ code: '23505', message: 'duplicate key value violates unique constraint product_variants_barcode_key' })).toEqual({ status: 409, message: 'Dato duplicado', code: 'duplicate_value' });
  });

  it('14. transforma un SKU duplicado en conflicto HTTP 409', () => {
    expect(mapDatabaseError({ code: '23505', message: 'duplicate key value violates unique constraint product_variants_sku_key' })).toEqual({ status: 409, message: 'Dato duplicado', code: 'duplicate_value' });
  });
});
