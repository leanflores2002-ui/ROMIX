import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { scanSchema } from '../src/schemas/inventory.js';
import { createInventoryService } from '../src/services/inventory.service.js';
import type { InventoryRepository } from '../src/services/inventory.repository.js';
import { HttpError } from '../src/utils/httpError.js';

const variant = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  barcode: 'ROM-JOG-NEG-T3',
  sku: 'JOG-NEG-T3',
  color: 'Negro',
  size: '3',
  stock: 10,
  minimum_stock: 3,
  active: true,
  product: { id: '11111111-1111-4111-8111-111111111111', name: 'Pantalon jogger rustico', category: 'Mujer', active: true }
};

const repositoryWithStock = (initialStock = 10): InventoryRepository & { currentStock: () => number } => {
  let stock = initialStock;
  let queue = Promise.resolve();
  return {
    currentStock: () => stock,
    findVariantByBarcode: vi.fn(async (barcode: string) => barcode === variant.barcode ? { ...variant, stock } : null),
    adjustInventory: vi.fn((input) => {
      const operation = queue.then(async () => {
        const previousStock = stock;
        const nextStock = input.movementType === 'in' ? stock + input.quantity : input.movementType === 'out' ? stock - input.quantity : input.quantity;
        if (nextStock < 0) throw new HttpError(409, 'Stock insuficiente', 'insufficient_stock');
        await Promise.resolve();
        stock = nextStock;
        return { success: true as const, product: { id: variant.product.id, name: variant.product.name, category: variant.product.category, variantId: variant.id, barcode: variant.barcode, sku: variant.sku, color: variant.color, size: variant.size }, previousStock, newStock: stock };
      });
      queue = operation.then(() => undefined, () => undefined);
      return operation;
    }),
    listMovements: vi.fn(async () => ({ rows: [], total: 0 })),
    listLowStock: vi.fn(async () => []),
    getDashboard: vi.fn(async () => ({}))
  };
};

const input = (movementType: 'in' | 'out' | 'adjustment' | 'query', quantity = 1) => ({ barcode: variant.barcode, movementType, quantity, note: null, userId: '99999999-9999-4999-8999-999999999999' });

describe('operaciones de inventario', () => {
  it('2. registra una entrada de stock', async () => {
    const result = await createInventoryService(repositoryWithStock()).scan(input('in', 3));
    expect(result).toMatchObject({ previousStock: 10, newStock: 13 });
  });

  it('3. registra una salida de stock', async () => {
    const result = await createInventoryService(repositoryWithStock()).scan(input('out', 2));
    expect(result).toMatchObject({ previousStock: 10, newStock: 8 });
  });

  it('4. ajusta el stock final, incluso a cero', async () => {
    const result = await createInventoryService(repositoryWithStock()).scan(input('adjustment', 0));
    expect(result).toMatchObject({ previousStock: 10, newStock: 0 });
  });

  it('5. consulta sin modificar ni invocar la RPC', async () => {
    const repository = repositoryWithStock();
    const result = await createInventoryService(repository).scan(input('query'));
    expect(result.previousStock).toBe(10);
    expect(result.newStock).toBe(10);
    expect(repository.adjustInventory).not.toHaveBeenCalled();
  });

  it('6. informa un codigo inexistente', async () => {
    const repository = repositoryWithStock();
    await expect(createInventoryService(repository).scan({ ...input('query'), barcode: 'NO-EXISTE' })).rejects.toMatchObject({ statusCode: 404, code: 'barcode_not_found' });
  });

  it('7. rechaza una cantidad invalida', () => {
    expect(scanSchema.safeParse({ barcode: variant.barcode, movementType: 'out', quantity: 0 }).success).toBe(false);
    expect(scanSchema.safeParse({ barcode: variant.barcode, movementType: 'in', quantity: -1 }).success).toBe(false);
  });

  it('8. rechaza un tipo de movimiento invalido', () => {
    expect(scanSchema.safeParse({ barcode: variant.barcode, movementType: 'delete', quantity: 1 }).success).toBe(false);
  });

  it('9. rechaza una salida que produciria stock negativo', async () => {
    await expect(createInventoryService(repositoryWithStock(1)).scan(input('out', 2))).rejects.toMatchObject({ statusCode: 409, code: 'insufficient_stock' });
  });

  it('10. serializa dos operaciones concurrentes sobre la misma variante', async () => {
    const repository = repositoryWithStock(10);
    const service = createInventoryService(repository);
    const results = await Promise.all([service.scan(input('out', 1)), service.scan(input('out', 1))]);
    expect(results.map((result) => result.newStock)).toEqual([9, 8]);
    expect(repository.currentStock()).toBe(8);
    const sql = readFileSync(resolve(process.cwd(), '../supabase/schema.sql'), 'utf8');
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/security definer/i);
  });
});
