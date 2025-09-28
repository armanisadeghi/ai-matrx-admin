import { createClient } from '@supabase/supabase-js';

const supabaseHtml = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_HTML_URL,
  process.env.NEXT_PUBLIC_SUPABASE_HTML_ANON_KEY
);

export default supabaseHtml;
