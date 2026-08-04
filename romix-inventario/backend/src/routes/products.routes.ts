import { Router } from 'express';
import {
  createProduct,
  createVariant,
  getProduct,
  getVariantByBarcode,
  listProducts,
  updateProduct,
  updateVariant
} from '../controllers/products.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createProductSchema,
  createVariantSchema,
  barcodeParamSchema,
  idParamSchema,
  productIdParamSchema,
  updateProductSchema,
  updateVariantSchema
} from '../schemas/products.js';
import { validateBody, validateParams } from '../middleware/validate.js';

export const productsRouter = Router();

productsRouter.get('/products', asyncHandler(listProducts));
productsRouter.get('/products/:id', validateParams(idParamSchema), asyncHandler(getProduct));
productsRouter.post('/products', validateBody(createProductSchema), asyncHandler(createProduct));
productsRouter.patch('/products/:id', validateParams(idParamSchema), validateBody(updateProductSchema), asyncHandler(updateProduct));
productsRouter.post('/products/:productId/variants', validateParams(productIdParamSchema), validateBody(createVariantSchema), asyncHandler(createVariant));
productsRouter.patch('/variants/:id', validateParams(idParamSchema), validateBody(updateVariantSchema), asyncHandler(updateVariant));
productsRouter.get('/variants/barcode/:barcode', validateParams(barcodeParamSchema), asyncHandler(getVariantByBarcode));
