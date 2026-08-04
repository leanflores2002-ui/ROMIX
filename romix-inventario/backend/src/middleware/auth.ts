import type { NextFunction, Request, Response } from 'express';
import { getSupabaseAuthClient } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authorization = req.header('Authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;

    if (!token) {
      throw new HttpError(401, 'Usuario no autenticado', 'unauthenticated');
    }

    const { data, error } = await getSupabaseAuthClient().auth.getUser(token);

    if (error || !data.user) {
      throw new HttpError(401, 'Token invalido o vencido', 'invalid_token');
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? undefined
    };
    next();
  } catch (error) {
    next(error);
  }
};

