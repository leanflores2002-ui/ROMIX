import type { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service.js';

export const scanInventory = async (req: Request, res: Response) => {
  const result = await inventoryService.scan({
    ...req.body,
    userId: req.user!.id
  });
  res.json(result);
};

export const listMovements = async (req: Request, res: Response) => {
  res.json(await inventoryService.listMovements(req.query as any));
};

export const listLowStock = async (_req: Request, res: Response) => {
  res.json(await inventoryService.listLowStock());
};

export const getDashboard = async (_req: Request, res: Response) => {
  res.json(await inventoryService.getDashboard());
};

