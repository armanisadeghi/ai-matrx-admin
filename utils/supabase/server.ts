import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            // The set method was called from a Server Component.
            // This is ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({
              name,
              value: '',
              ...options,
            })
          } catch (error) {
            // The delete method was called from a Server Component.
            // This is ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}