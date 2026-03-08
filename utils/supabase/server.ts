// utils/supabase/server.ts
// Server client for Supabase - use in Server Components, Server Actions, Route Handlers
// https://supabase.com/docs/guides/auth/server-side/nextjs

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

/**
 * Standard Supabase server client.
 * Works everywhere: Server Components, Server Actions, Route Handlers.
 * Creates a fresh client per call — safe for all contexts.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The setAll method was called from a Server Component.
            // This can be ignored if you have middleware/proxy refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Per-request CACHED Supabase client — for use ONLY in Server Components.
 *
 * React.cache() deduplicates calls within a single React render pass, so
 * multiple Server Components in the same request share one client instance.
 *
 * DO NOT use in Route Handlers (route.ts) or Server Actions — React.cache()
 * only works inside the React render pipeline. Use createClient() there instead.
 */
export const createCachedClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored in Server Components — middleware handles session refresh.
          }
        },
      },
    }
  )
})

/**
 * Per-request cached auth check — for use ONLY in Server Components.
 *
 * Guaranteed single network call per request regardless of how many
 * Server Components call it. Uses createCachedClient() internally.
 *
 * DO NOT use in Route Handlers or Server Actions — use createClient() there.
 */
export const getUser = cache(async () => {
  const supabase = await createCachedClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
