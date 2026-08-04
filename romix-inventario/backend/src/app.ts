import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { getEnv } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { productsRouter } from './routes/products.routes.js';

export const createApp = () => {
  const app = express();
  const isTest = process.env.NODE_ENV === 'test';
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: isTest ? true : frontendUrl,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  if (!isTest) app.use(morgan('combined'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', requireAuth, productsRouter, inventoryRouter);
  app.use((_req, res) => {
    res.status(404).json({ success: false, code: 'not_found', message: 'Ruta inexistente' });
  });
  app.use(errorHandler);

  return app;
};

export const validateRuntimeEnv = () => {
  getEnv();
};
