import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();

vi.mock('../src/config/supabase.js', () => ({
  getSupabaseAuthClient: () => ({ auth: { getUser } }),
  getSupabaseServiceClient: vi.fn()
}));

describe('autenticacion HTTP', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    getUser.mockReset();
  });

  it('1. requiere inicio de sesion para consultar productos', async () => {
    const { createApp } = await import('../src/app.js');
    const response = await request(createApp()).get('/api/products');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('unauthenticated');
  });

  it('11. rechaza el acceso con un JWT invalido', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid jwt') });
    const { createApp } = await import('../src/app.js');
    const response = await request(createApp()).get('/api/products').set('Authorization', 'Bearer token-invalido');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('invalid_token');
  });

  it('mantiene publico el endpoint de salud', async () => {
    const { createApp } = await import('../src/app.js');
    const response = await request(createApp()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
