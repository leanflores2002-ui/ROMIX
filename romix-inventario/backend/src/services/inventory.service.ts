import { HttpError } from '../utils/httpError.js';
import type { ProductSummary, ScanResult } from '../types.js';
import { assertActiveVariant, createSupabaseInventoryRepository, type InventoryRepository } from './inventory.repository.js';

export const createInventoryService = (repository: InventoryRepository = createSupabaseInventoryRepository()) => ({
  async scan(input: {
    barcode: string;
    movementType: 'in' | 'out' | 'adjustment' | 'query';
    quantity: number;
    note: string | null;
    userId: string;
  }): Promise<ScanResult> {
    if (input.movementType === 'query') {
      const variant = await repository.findVariantByBarcode(input.barcode);
      if (!variant) throw new HttpError(404, 'Codigo inexistente', 'barcode_not_found');
      assertActiveVariant(variant);

      const product: ProductSummary = {
        id: variant.product.id,
        name: variant.product.name,
        category: variant.product.category,
        variantId: variant.id,
        barcode: variant.barcode,
        sku: variant.sku,
        color: variant.color,
        size: variant.size
      };

      return {
        success: true,
        product,
        previousStock: variant.stock,
        newStock: variant.stock
      };
    }

    return repository.adjustInventory({
      barcode: input.barcode,
      movementType: input.movementType,
      quantity: input.quantity,
      note: input.note,
      userId: input.userId
    });
  },

  listMovements: repository.listMovements,
  listLowStock: repository.listLowStock,
  getDashboard: repository.getDashboard
});

export const inventoryService = createInventoryService();

