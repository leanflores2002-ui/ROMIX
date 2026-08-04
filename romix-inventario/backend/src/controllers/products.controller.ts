import type { Request, Response } from 'express';
import { productsService } from '../services/products.service.js';

export const listProducts = async (_req: Request, res: Response) => {
  res.json(await productsService.listProducts());
};

export const getProduct = async (req: Request, res: Response) => {
  res.json(await productsService.getProduct(req.params.id));
};

export const createProduct = async (req: Request, res: Response) => {
  res.status(201).json(await productsService.createProduct(req.body));
};

export const updateProduct = async (req: Request, res: Response) => {
  res.json(await productsService.updateProduct(req.params.id, req.body));
};

export const createVariant = async (req: Request, res: Response) => {
  res.status(201).json(await productsService.createVariant(req.params.productId, req.body, req.user!.id));
};

export const updateVariant = async (req: Request, res: Response) => {
  res.json(await productsService.updateVariant(req.params.id, req.body));
};

export const getVariantByBarcode = async (req: Request, res: Response) => {
  res.json(await productsService.getVariantByBarcode(req.params.barcode));
};
