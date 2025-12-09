// color-utils/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create a new headers object with the pathname added
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  requestHeaders.set('x-search-params', request.nextUrl.search);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set({
                name,
                value,
                ...options,
              })
            );
          },
        },
      }
  )

  // This is the critical part! getUser() will check the JWT validity and
  // automatically refresh the token if needed, updating the cookies
  const { data, error } = await supabase.auth.getUser()
  
  // Log authentication status for debugging
  const timestamp = new Date().toISOString();
  const isStaticAsset = request.nextUrl.pathname.includes('.');
  const isPublicRoute = request.nextUrl.pathname.startsWith('/login') || 
                        request.nextUrl.pathname.startsWith('/auth') || 
                        request.nextUrl.pathname.startsWith('/_next');
  
  // Only log meaningful auth checks (skip static assets and public routes for cleaner logs)
  if (!isStaticAsset && !isPublicRoute) {
    console.log(`[${timestamp}] Auth Check - Path: ${request.nextUrl.pathname}, User: ${data.user ? 'authenticated' : 'not authenticated'}${error ? `, Error: ${error.message}` : ''}`);
  }

  // Handle unauthenticated users trying to access protected routes
  if (
      !data.user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      !isStaticAsset // Don't redirect for static assets
  ) {
    // Get the full requested URL path and search params
    const fullPath = request.nextUrl.pathname + request.nextUrl.search
    
    // Only add redirectTo if it's not the homepage (/)
    // Homepage should just go to login, then default to dashboard
    const loginUrl = new URL('/login', request.url)
    if (fullPath !== '/') {
      loginUrl.searchParams.set('redirectTo', fullPath)
      console.log(`[${timestamp}] → Redirecting to /login with redirectTo: ${fullPath}`);
    } else {
      console.log(`[${timestamp}] → Redirecting to /login (homepage access)`);
    }
    
    return NextResponse.redirect(loginUrl)
  }

  // Handle authenticated users trying to access homepage or auth pages
  // Redirect them to dashboard instead
  if (data.user) {
    const pathname = request.nextUrl.pathname;
    
    // Redirect authenticated users away from public pages to dashboard
    if (pathname === '/' || pathname === '/login' || pathname === '/sign-up') {
      const timestamp2 = new Date().toISOString();
      console.log(`[${timestamp2}] ↪ Authenticated user on ${pathname} → redirecting to /dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
