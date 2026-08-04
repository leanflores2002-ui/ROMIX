import { describe, expect, it } from 'vitest';
import { scanSchema } from '../src/schemas/inventory.js';
import { createInventoryService } from '../src/services/inventory.service.js';
import type { InventoryRepository } from '../src/services/inventory.repository.js';
import type { ProductVariantView, ScanResult } from '../src/types.js';
import { HttpError } from '../src/utils/httpError.js';

const makeVariant = (stock = 10): ProductVariantView => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  barcode: 'ROM-JOG-NEG-T3',
  sku: 'JOG-NEG-T3',
  color: 'Negro',
  size: '3',
  stock,
  minimum_stock: 3,
  active: true,
  product: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Pantalon jogger rustico',
    category: 'Mujer',
    active: true
  }
});

const createMemoryRepository = (initialStock = 10): InventoryRepository & { variant: ProductVariantView; movements: any[] } => {
  const variant = makeVariant(initialStock);
  const movements: any[] = [];
  let lock = Promise.resolve();

  return {
    variant,
    movements,
    async findVariantByBarcode(barcode) {
      return barcode === variant.barcode ? { ...variant, product: { ...variant.product } } : null;
    },
    async adjustInventory(input) {
      const previousLock = lock;
      let release!: () => void;
      lock = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previousLock;
      try {
        if (input.barcode !== variant.barcode) throw new HttpError(404, 'Codigo inexistente', 'barcode_not_found');
        const previousStock = variant.stock;
        const newStock =
          input.movementType === 'in'
            ? previousStock + input.quantity
            : input.movementType === 'out'
              ? previousStock - input.quantity
              : input.quantity;
        if (newStock < 0) throw new HttpError(409, 'Stock insuficiente', 'insufficient_stock');
        await new Promise((resolve) => setTimeout(resolve, 1));
        variant.stock = newStock;
        movements.push({ ...input, previousStock, newStock });
        return {
          success: true,
          product: {
            id: variant.product.id,
            name: variant.product.name,
            category: variant.product.category,
            variantId: variant.id,
            barcode: variant.barcode,
            sku: variant.sku,
            color: variant.color,
            size: variant.size
          },
          previousStock,
          newStock
        } satisfies ScanResult;
      } finally {
        release();
      }
    },
    async listMovements() {
      return { rows: movements, total: movements.length };
    },
    async listLowStock() {
      return variant.stock <= variant.minimum_stock ? [variant] : [];
    },
    async getDashboard() {
      return {};
    }
  };
};

describe('inventory scan service', () => {
  it('registra entrada de stock', async () => {
    const repo = createMemoryRepository(10);
    const service = createInventoryService(repo);
    const result = await service.scan({ barcode: 'ROM-JOG-NEG-T3', movementType: 'in', quantity: 5, note: 'Reposicion', userId: 'user' });
    expect(result.previousStock).toBe(10);
    expect(result.newStock).toBe(15);
  });

  it('registra salida de stock', async () => {
    const repo = createMemoryRepository(10);
    const service = createInventoryService(repo);
    const result = await service.scan({ barcode: 'ROM-JOG-NEG-T3', movementType: 'out', quantity: 2, note: 'Venta', userId: 'user' });
    expect(result.previousStock).toBe(10);
    expect(result.newStock).toBe(8);
  });

  it('registra ajuste de stock', async () => {
    const repo = createMemoryRepository(10);
    const service = createInventoryService(repo);
    const result = await service.scan({ barcode: 'ROM-JOG-NEG-T3', movementType: 'adjustment', quantity: 4, note: 'Conteo', userId: 'user' });
    expect(result.previousStock).toBe(10);
    expect(result.newStock).toBe(4);
  });

  it('consulta sin modificar stock ni registrar movimiento', async () => {
    const repo = createMemoryRepository(10);
    const service = createInventoryService(repo);
    const result = await service.scan({ barcode: 'ROM-JOG-NEG-T3', movementType: 'query', quantity: 1, note: null, userId: 'user' });
    expect(result.previousStock).toBe(10);
    expect(result.newStock).toBe(10);
    expect(repo.movements).toHaveLength(0);
  });

  it('rechaza codigo inexistente', async () => {
    const service = createInventoryService(createMemoryRepository(10));
    await expect(service.scan({ barcode: 'NO-EXISTE', movementType: 'query', quantity: 1, note: null, userId: 'user' })).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it('rechaza cantidad invalida', () => {
    expect(scanSchema.safeParse({ barcode: 'ROM-JOG-NEG-T3', movementType: 'out', quantity: 0 }).success).toBe(false);
  });

  it('rechaza tipo de movimiento invalido', () => {
    expect(scanSchema.safeParse({ barcode: 'ROM-JOG-NEG-T3', movementType: 'delete', quantity: 1 }).success).toBe(false);
  });

  it('rechaza stock negativo', async () => {
    const service = createInventoryService(createMemoryRepository(1));
    await expect(service.scan({ barcode: 'ROM-JOG-NEG-T3', movementType: 'out', quantity: 2, note: null, userId: 'user' })).rejects.toMatchObject({
      statusCode: 409
    });
  });

  it('serializa dos operaciones concurrentes sobre la misma variante', async () => {
    const repo = createMemoryRepository(10);
    const service = createInventoryService(repo);
    await Promise.all([
      service.scan({ barcode: 'ROM-JOG-NEG-T3', movementType: 'out', quantity: 3, note: null, userId: 'u1' }),
      service.scan({ barcode: 'ROM-JOG-NEG-T3', movementType: 'out', quantity: 4, note: null, userId: 'u2' })
    ]);
    expect(repo.variant.stock).toBe(3);
    expect(repo.movements.map((movement) => movement.previousStock)).toEqual([10, 7]);
  });
});

