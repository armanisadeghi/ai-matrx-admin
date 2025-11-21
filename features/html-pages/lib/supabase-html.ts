'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseHtmlInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase HTML client (singleton pattern)
 * This ensures the client is only created in the browser environment
 */
export function getSupabaseHtml(): SupabaseClient {
  // Return existing instance if available
  if (supabaseHtmlInstance) {
    return supabaseHtmlInstance;
  }

  // Ensure we're in the browser
  if (typeof window === 'undefined') {
    throw new Error('Supabase HTML client can only be initialized in the browser');
  }

  // Get environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_HTML_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_HTML_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase HTML environment variables');
  }

  // Create and cache the client
  supabaseHtmlInstance = createBrowserClient(url, anonKey, {
    auth: {
      storageKey: 'sb-html-auth-token', // Unique storage key to avoid conflicts
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });

  return supabaseHtmlInstance;
}

// Export default for backward compatibility
export default getSupabaseHtml;
