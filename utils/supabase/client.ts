// utils/supabase/client.ts
// Browser client for Supabase - use in Client Components
// https://supabase.com/docs/guides/auth/server-side/nextjs

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  )
}

// Convenience singleton for files that import { supabase } from '@/utils/supabase/client'
// createBrowserClient already deduplicates internally, so this is safe.
export const supabase = createClient()
