// utils/supabase/adminClient.ts
// Admin client for server-side operations that bypass RLS

import { createClient } from '@supabase/supabase-js';

/**
 * Creates an admin Supabase client with service/secret key.
 * This bypasses RLS and should only be used in server-side code
 * with proper validation.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not configured. Please add it to your .env.local file.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
