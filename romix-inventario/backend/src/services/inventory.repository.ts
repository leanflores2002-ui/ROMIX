import { getSupabaseServiceClient } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';
import type { MovementType, ProductVariantView, ScanResult } from '../types.js';

export interface InventoryMovementFilters {
  dateFrom?: string;
  dateTo?: string;
  movementType?: MovementType;
  product?: string;
  barcode?: string;
  user?: string;
  page: number;
  pageSize: number;
}

export interface InventoryRepository {
  findVariantByBarcode(barcode: string): Promise<ProductVariantView | null>;
  adjustInventory(input: {
    barcode: string;
    movementType: MovementType;
    quantity: number;
    note: string | null;
    userId: string;
  }): Promise<ScanResult>;
  listMovements(filters: InventoryMovementFilters): Promise<{ rows: any[]; total: number }>;
  listLowStock(): Promise<ProductVariantView[]>;
  getDashboard(): Promise<any>;
}

const normalizeVariant = (row: any): ProductVariantView => {
  const product = Array.isArray(row.products) ? row.products[0] : row.products ?? row.product;
  return {
    id: row.id,
    barcode: row.barcode,
    sku: row.sku,
    color: row.color,
    size: row.size,
    stock: row.stock,
    minimum_stock: row.minimum_stock,
    active: row.active,
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      active: product.active
    }
  };
};

export const createSupabaseInventoryRepository = (): InventoryRepository => ({
  async findVariantByBarcode(barcode) {
    const { data, error } = await getSupabaseServiceClient()
      .from('product_variants')
      .select('id, barcode, sku, color, size, stock, minimum_stock, active, products(id, name, category, description, active)')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) throw error;
    return data ? normalizeVariant(data) : null;
  },

  async adjustInventory(input) {
    const { data, error } = await getSupabaseServiceClient().rpc('adjust_inventory', {
      p_barcode: input.barcode,
      p_movement_type: input.movementType,
      p_quantity: input.quantity,
      p_note: input.note,
      p_user_id: input.userId
    });

    if (error) throw error;
    return data as ScanResult;
  },

  async listMovements(filters) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    let query = getSupabaseServiceClient()
      .from('inventory_movements')
      .select(
        'id, movement_type, quantity, previous_stock, new_stock, note, created_by, created_at, product_variants!inner(id, barcode, sku, color, size, products!inner(id, name, category))',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
    if (filters.movementType) query = query.eq('movement_type', filters.movementType);
    if (filters.user) query = query.eq('created_by', filters.user);
    if (filters.barcode) query = query.ilike('product_variants.barcode', `%${filters.barcode}%`);
    if (filters.product) query = query.ilike('product_variants.products.name', `%${filters.product}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    const userIds = [...new Set((data ?? []).map((row: any) => row.created_by).filter(Boolean))];
    const users = new Map<string, string>();
    await Promise.all(
      userIds.map(async (userId) => {
        const { data: userData } = await getSupabaseServiceClient().auth.admin.getUserById(userId as string);
        users.set(userId as string, userData.user?.email ?? (userId as string));
      })
    );

    return {
      rows: (data ?? []).map((row: any) => ({ ...row, user: users.get(row.created_by) ?? row.created_by })),
      total: count ?? 0
    };
  },

  async listLowStock() {
    const { data, error } = await getSupabaseServiceClient()
      .from('product_variants')
      .select('id, barcode, sku, color, size, stock, minimum_stock, active, products(id, name, category, description, active)')
      .eq('active', true)
      .order('stock', { ascending: true });

    if (error) throw error;
    return (data ?? [])
      .filter((variant: any) => Number(variant.stock) <= Number(variant.minimum_stock))
      .map(normalizeVariant);
  },

  async getDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [products, variants, movementsToday, latestMovements, lowStock] = await Promise.all([
      getSupabaseServiceClient().from('products').select('id', { count: 'exact', head: true }),
      getSupabaseServiceClient().from('product_variants').select('stock, minimum_stock', { count: 'exact' }),
      getSupabaseServiceClient()
        .from('inventory_movements')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString()),
      getSupabaseServiceClient()
        .from('inventory_movements')
        .select('id, movement_type, quantity, previous_stock, new_stock, note, created_at, product_variants(barcode, sku, color, size, products(name, category))')
        .order('created_at', { ascending: false })
        .limit(8),
      getSupabaseServiceClient()
        .from('product_variants')
        .select('id, barcode, sku, color, size, stock, minimum_stock, active, products(id, name, category, description, active)')
        .eq('active', true)
        .order('stock', { ascending: true })
    ]);

    const firstError = products.error ?? variants.error ?? movementsToday.error ?? latestMovements.error ?? lowStock.error;
    if (firstError) throw firstError;

    const variantRows = variants.data ?? [];
    return {
      products: products.count ?? 0,
      variants: variants.count ?? 0,
      availableUnits: variantRows.reduce((sum, variant: any) => sum + Number(variant.stock ?? 0), 0),
      lowStock: variantRows.filter((variant: any) => Number(variant.stock) <= Number(variant.minimum_stock)).length,
      movementsToday: movementsToday.count ?? 0,
      latestMovements: latestMovements.data ?? [],
      lowStockVariants: (lowStock.data ?? [])
        .filter((variant: any) => Number(variant.stock) <= Number(variant.minimum_stock))
        .slice(0, 8)
        .map(normalizeVariant)
    };
  }
});

export const assertActiveVariant = (variant: ProductVariantView): void => {
  if (!variant.product.active) throw new HttpError(409, 'Producto inactivo', 'product_inactive');
  if (!variant.active) throw new HttpError(409, 'Variante inactiva', 'variant_inactive');
};
