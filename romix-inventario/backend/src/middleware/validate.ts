import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { HttpError } from '../utils/httpError.js';

export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new HttpError(400, result.error.issues[0]?.message ?? 'Datos invalidos', 'invalid_payload'));
    }
    req.body = result.data;
    next();
  };

export const validateParams =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(new HttpError(400, result.error.issues[0]?.message ?? 'Parametros invalidos', 'invalid_params'));
    }
    req.params = result.data as any;
    next();
  };

export const validateQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new HttpError(400, result.error.issues[0]?.message ?? 'Filtros invalidos', 'invalid_query'));
    }
    req.query = result.data as any;
    next();
  };

