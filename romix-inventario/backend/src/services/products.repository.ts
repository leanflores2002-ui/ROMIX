import { getSupabaseServiceClient } from '../config/supabase.js';

export interface ProductsRepository {
  listProducts(): Promise<any[]>;
  getProduct(id: string): Promise<any | null>;
  createProduct(input: any): Promise<any>;
  updateProduct(id: string, input: any): Promise<any>;
  createVariant(productId: string, input: any, userId: string): Promise<any>;
  updateVariant(id: string, input: any): Promise<any>;
  getVariantByBarcode(barcode: string): Promise<any | null>;
}

const selectProduct = 'id, name, category, description, active, created_at, updated_at, product_variants(id, barcode, sku, color, size, stock, minimum_stock, active)';

export const createSupabaseProductsRepository = (): ProductsRepository => ({
  async listProducts() {
    const { data, error } = await getSupabaseServiceClient().from('products').select(selectProduct).order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getProduct(id) {
    const { data, error } = await getSupabaseServiceClient().from('products').select(selectProduct).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async createProduct(input) {
    const { data, error } = await getSupabaseServiceClient()
      .from('products')
      .insert({
        name: input.name,
        category: input.category,
        description: input.description,
        active: input.active ?? true
      })
      .select(selectProduct)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id, input) {
    const { data, error } = await getSupabaseServiceClient()
      .from('products')
      .update(input)
      .eq('id', id)
      .select(selectProduct)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createVariant(productId, input, userId) {
    const client = getSupabaseServiceClient();
    const initialStock = Number(input.stock ?? 0);
    const { data, error } = await client
      .from('product_variants')
      .insert({
        product_id: productId,
        barcode: input.barcode,
        sku: input.sku,
        color: input.color,
        size: input.size,
        stock: 0,
        minimum_stock: input.minimumStock ?? 0,
        active: input.active ?? true
      })
      .select('id, product_id, barcode, sku, color, size, stock, minimum_stock, active, created_at, updated_at')
      .single();
    if (error) throw error;

    if (initialStock > 0) {
      const { error: stockError } = await client.rpc('adjust_inventory', {
        p_barcode: input.barcode,
        p_movement_type: 'adjustment',
        p_quantity: initialStock,
        p_note: 'Stock inicial',
        p_user_id: userId
      });

      if (stockError) {
        await client.from('product_variants').delete().eq('id', data.id);
        throw stockError;
      }
      data.stock = initialStock;
    }
    return data;
  },

  async updateVariant(id, input) {
    const payload: Record<string, unknown> = { ...input };
    if ('minimumStock' in payload) {
      payload.minimum_stock = payload.minimumStock;
      delete payload.minimumStock;
    }

    const { data, error } = await getSupabaseServiceClient()
      .from('product_variants')
      .update(payload)
      .eq('id', id)
      .select('id, product_id, barcode, sku, color, size, stock, minimum_stock, active, created_at, updated_at')
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getVariantByBarcode(barcode) {
    const { data, error } = await getSupabaseServiceClient()
      .from('product_variants')
      .select('id, product_id, barcode, sku, color, size, stock, minimum_stock, active, products(id, name, category, description, active)')
      .eq('barcode', barcode)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
});
