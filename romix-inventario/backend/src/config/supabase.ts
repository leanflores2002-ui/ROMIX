import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env.js';

let serviceClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

export const getSupabaseServiceClient = (): SupabaseClient => {
  if (!serviceClient) {
    const env = getEnv();
    serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return serviceClient;
};

export const getSupabaseAuthClient = (): SupabaseClient => {
  if (!authClient) {
    const env = getEnv();
    authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return authClient;
};

