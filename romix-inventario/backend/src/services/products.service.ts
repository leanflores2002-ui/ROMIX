import { HttpError } from '../utils/httpError.js';
import { createSupabaseProductsRepository, type ProductsRepository } from './products.repository.js';

export const createProductsService = (repository: ProductsRepository = createSupabaseProductsRepository()) => ({
  listProducts: repository.listProducts,

  async getProduct(id: string) {
    const product = await repository.getProduct(id);
    if (!product) throw new HttpError(404, 'Producto inexistente', 'product_not_found');
    return product;
  },

  createProduct: repository.createProduct,

  async updateProduct(id: string, input: any) {
    const product = await repository.updateProduct(id, input);
    if (!product) throw new HttpError(404, 'Producto inexistente', 'product_not_found');
    return product;
  },

  async createVariant(productId: string, input: any, userId: string) {
    const product = await repository.getProduct(productId);
    if (!product) throw new HttpError(404, 'Producto inexistente', 'product_not_found');
    return repository.createVariant(productId, input, userId);
  },

  async updateVariant(id: string, input: any) {
    const variant = await repository.updateVariant(id, input);
    if (!variant) throw new HttpError(404, 'Variante inexistente', 'variant_not_found');
    return variant;
  },

  async getVariantByBarcode(barcode: string) {
    const variant = await repository.getVariantByBarcode(barcode);
    if (!variant) throw new HttpError(404, 'Codigo inexistente', 'barcode_not_found');
    return variant;
  }
});

export const productsService = createProductsService();
