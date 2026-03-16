// utils/supabase/middleware.ts
// Official Supabase SSR pattern for Next.js 16 proxy
// https://supabase.com/docs/guides/auth/server-side/nextjs

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: getClaims() validates the JWT locally (no network call with asymmetric keys).
  // Internally calls getSession() which refreshes expired tokens using the refresh token.
  // This is the official recommended approach for proxy/middleware.
  const { data, error } = await supabase.auth.getClaims()

  if (error) {
    // Log but don't redirect — transient JWKS fetch or refresh failures shouldn't
    // immediately lock the user out. The claims will be null and the redirect logic
    // below handles unauthenticated routes.
    console.warn(`[Supabase middleware] getClaims error on ${request.nextUrl.pathname}:`, error.message)
  }

  const user = data?.claims

  // Handle authenticated users trying to access login/signup pages
  if (
    user &&
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/sign-up')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Handle unauthenticated users trying to access protected routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/sign-up') &&
    request.nextUrl.pathname !== '/' &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/oauth') &&         // OAuth consent handles its own auth flow
    !request.nextUrl.pathname.startsWith('/p/') &&            // Public app/chat routes
    !request.nextUrl.pathname.startsWith('/demos') &&         // Demo pages
    !request.nextUrl.pathname.startsWith('/canvas/shared') && // Shared canvases
    !request.nextUrl.pathname.startsWith('/canvas/discover') && // Canvas discovery gallery
    !request.nextUrl.pathname.startsWith('/education') &&     // Education pages
    !request.nextUrl.pathname.startsWith('/appointment-reminder') // Public appointment pages
  ) {
    const url = request.nextUrl.clone()
    const fullPath = request.nextUrl.pathname + request.nextUrl.search
    url.pathname = '/login'
    url.searchParams.set('redirectTo', fullPath)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  // Forward the pathname so server layouts can read it via headers()
  supabaseResponse.headers.set("x-pathname", request.nextUrl.pathname);

  // Prevent CDN/Vercel from caching responses that include Set-Cookie headers.
  // Without this, a cached response from one user's session refresh can be served
  // to another user, causing cross-user session contamination or stale cookies
  // replacing fresh ones — the most common cause of "random logouts" in production.
  // https://supabase.com/docs/guides/auth/server-side/advanced-guide
  supabaseResponse.headers.set('Cache-Control', 'private, no-store')

  return supabaseResponse
}
