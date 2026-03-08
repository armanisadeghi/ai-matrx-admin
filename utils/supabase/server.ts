// utils/supabase/server.ts
// Server client for Supabase - use in Server Components, Server Actions, Route Handlers
// https://supabase.com/docs/guides/auth/server-side/nextjs
//
// createClient and getUser are wrapped in React cache() so multiple Server Components
// in the same request share a single instance and a single auth call — no duplicate
// network round-trips regardless of how many layouts call them.
//
// IMPORTANT: React.cache() only works inside the React render pipeline (Server Components).
// Route Handlers (route.ts) run outside React — use createRouteHandlerClient() instead.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

async function createClientBase() {
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
 * Per-request cached Supabase client for use in Server Components and Server Actions.
 * React.cache() deduplicates calls within a single render pass.
 * DO NOT use in Route Handlers — use createRouteHandlerClient() instead.
 */
export const createClient = cache(createClientBase)

/**
 * Uncached Supabase client for use in Route Handlers (route.ts files).
 * React.cache() does not work outside the React render pipeline, so route handlers
 * must use this function to get a fresh client per request.
 */
export const createRouteHandlerClient = createClientBase

/**
 * Per-request cached auth check. Call this anywhere in the Server Component tree
 * instead of supabase.auth.getUser() — guaranteed single network call per request.
 */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
