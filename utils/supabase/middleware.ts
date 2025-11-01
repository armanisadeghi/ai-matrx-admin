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
  const { data } = await supabase.auth.getUser()


  if (
      !data.user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      !request.nextUrl.pathname.includes('.') // Don't redirect for static assets
  ) {
    // Get the full requested URL path and search params
    const fullPath = request.nextUrl.pathname + request.nextUrl.search
    
    
    // Create the login URL with the redirectTo parameter
    const loginUrl = new URL('/login', request.url)
    
    // Set redirectTo parameter - ensure URL is clean
    loginUrl.searchParams.set('redirectTo', fullPath)
    
    
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
