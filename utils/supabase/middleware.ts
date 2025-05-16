// color-utils/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            supabaseResponse = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            supabaseResponse.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name, options) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            supabaseResponse = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            supabaseResponse.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
  )

  // This is the critical part! getUser() will check the JWT validity and
  // automatically refresh the token if needed, updating the cookies
  const { data } = await supabase.auth.getUser()

  console.log("Middleware checking auth for path:", request.nextUrl.pathname)

  if (
      !data.user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      !request.nextUrl.pathname.includes('.') // Don't redirect for static assets
  ) {
    // Get the full requested URL path and search params
    const fullPath = request.nextUrl.pathname + request.nextUrl.search
    
    console.log("Middleware - Original path requested:", fullPath)
    
    // Create the login URL with the redirectTo parameter
    const loginUrl = new URL('/login', request.url)
    
    // Set redirectTo parameter - ensure URL is clean
    loginUrl.searchParams.set('redirectTo', fullPath)
    
    console.log("Middleware - Redirecting to:", loginUrl.toString())
    
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
