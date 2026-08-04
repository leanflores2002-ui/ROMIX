import { Router } from 'express';
import { getDashboard, listLowStock, listMovements, scanInventory } from '../controllers/inventory.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { movementsQuerySchema, scanSchema } from '../schemas/inventory.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const inventoryRouter = Router();

inventoryRouter.post('/inventory/scan', validateBody(scanSchema), asyncHandler(scanInventory));
inventoryRouter.get('/inventory/movements', validateQuery(movementsQuerySchema), asyncHandler(listMovements));
inventoryRouter.get('/inventory/low-stock', asyncHandler(listLowStock));
inventoryRouter.get('/inventory/dashboard', asyncHandler(getDashboard));

