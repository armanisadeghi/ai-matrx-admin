import { createBrowserClient } from '@supabase/ssr';

const supabaseHtml = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_HTML_URL,
  process.env.NEXT_PUBLIC_SUPABASE_HTML_ANON_KEY,
  {
    auth: {
      storageKey: 'sb-html-auth-token', // Unique storage key to avoid conflicts
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

export default supabaseHtml;
