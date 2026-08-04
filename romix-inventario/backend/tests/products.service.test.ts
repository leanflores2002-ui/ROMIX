import { describe, expect, it } from 'vitest';
import { createProductsService } from '../src/services/products.service.js';
import type { ProductsRepository } from '../src/services/products.repository.js';

const createProductsRepository = (): ProductsRepository => {
  const products = [{ id: '11111111-1111-4111-8111-111111111111', name: 'Pantalon jogger rustico', category: 'Mujer', product_variants: [] }];
  const variants: any[] = [{ barcode: 'ROM-JOG-NEG-T3', sku: 'JOG-NEG-T3' }];

  return {
    async listProducts() {
      return products;
    },
    async getProduct(id) {
      return products.find((product) => product.id === id) ?? null;
    },
    async createProduct(input) {
      const product = { id: '22222222-2222-4222-8222-222222222222', ...input };
      products.push(product);
      return product;
    },
    async updateProduct(id, input) {
      const product = products.find((item) => item.id === id);
      return product ? Object.assign(product, input) : null;
    },
    async createVariant(_productId, input) {
      if (variants.some((variant) => variant.barcode === input.barcode)) {
        const error = new Error('duplicate barcode') as Error & { code: string };
        error.code = '23505';
        throw error;
      }
      if (variants.some((variant) => variant.sku === input.sku)) {
        const error = new Error('duplicate sku') as Error & { code: string };
        error.code = '23505';
        throw error;
      }
      variants.push(input);
      return input;
    },
    async updateVariant() {
      return null;
    },
    async getVariantByBarcode() {
      return null;
    }
  };
};

describe('products service', () => {
  it('crea un producto', async () => {
    const service = createProductsService(createProductsRepository());
    const product = await service.createProduct({ name: 'Campera de lycra', category: 'Mujer' });
    expect(product.name).toBe('Campera de lycra');
  });

  it('rechaza una variante con codigo duplicado', async () => {
    const service = createProductsService(createProductsRepository());
    await expect(
      service.createVariant('11111111-1111-4111-8111-111111111111', {
        barcode: 'ROM-JOG-NEG-T3',
        sku: 'NUEVO-SKU',
        color: 'Negro',
        size: '3',
        stock: 1,
        minimumStock: 0
      })
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('rechaza una variante con SKU duplicado', async () => {
    const service = createProductsService(createProductsRepository());
    await expect(
      service.createVariant('11111111-1111-4111-8111-111111111111', {
        barcode: 'ROM-NUEVO',
        sku: 'JOG-NEG-T3',
        color: 'Negro',
        size: '3',
        stock: 1,
        minimumStock: 0
      })
    ).rejects.toMatchObject({ code: '23505' });
  });
});

