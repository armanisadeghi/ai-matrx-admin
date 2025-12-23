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
            // CRITICAL FIX: Don't recreate the response object!
            // Just update cookies on both the request and the existing response.
            // Creating a new NextResponse here was causing all previously set cookies to be lost.
            // This was causing users to be logged out after token refresh because
            // only the last cookie would survive, and other auth cookies would be dropped.
            cookiesToSet.forEach(({ name, value, options }) => {
              // Update the request cookies for downstream handlers
              request.cookies.set(name, value);
              // Update the response cookies that will be sent to the client
              supabaseResponse.cookies.set(name, value, options);
            });
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

  const pathname = request.nextUrl.pathname;
  
  // Define public pages that don't require authentication
  const isHomepage = pathname === '/';
  const isAuthPage = pathname === '/login' || pathname === '/sign-up';
  const isPublicPage = isHomepage || isAuthPage;

  // Handle authenticated users trying to access login/signup pages
  // Redirect them to dashboard - no point showing login if already logged in
  if (data.user && isAuthPage) {
    console.log(`[${timestamp}] ↪ Authenticated user on ${pathname} → redirecting to /dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Note: Homepage is allowed for both authenticated and unauthenticated users
  // The homepage component will show different UI based on auth status client-side

  // Handle unauthenticated users trying to access protected routes
  if (
      !data.user &&
      !isPublicPage && // Allow access to public pages (/, /login, /sign-up)
      !pathname.startsWith('/auth') && // Allow auth callbacks
      !pathname.startsWith('/_next') && // Allow Next.js internals
      !isStaticAsset // Allow static assets
  ) {
    // Get the full requested URL path and search params
    const fullPath = pathname + request.nextUrl.search
    
    // Redirect to login with the intended destination
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', fullPath)
    console.log(`[${timestamp}] → Redirecting to /login with redirectTo: ${fullPath}`);
    
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
