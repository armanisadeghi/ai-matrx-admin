// File: proxy.ts
// Next.js 16 Proxy Configuration (replaces middleware.ts from Next.js 15)
//
// This proxy handles all authentication checks and session management.
// It runs BEFORE route handlers and layouts, ensuring users are authenticated
// before they can access protected routes.

import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
    // Update and validate the user's session
    // This will:
    // 1. Check if user is authenticated
    // 2. Refresh auth tokens if needed
    // 3. Redirect unauthenticated users to /login
    // 4. Redirect authenticated users away from public pages (/, /login, /sign-up)
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * CRITICAL: This matcher defines which routes the proxy middleware checks.
         * 
         * The negative lookahead (?!...) means "match everything EXCEPT these paths"
         * 
         * Excluded routes (PUBLIC - no auth check):
         * - api (API routes handle their own auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - public (static assets folder)
         * - login (login page itself)
         * - auth (auth callback routes - /auth/callback handles its own session)
         * - sign-up, forgot-password, error, reset-password (public auth pages)
         * - contact, about, privacy-policy (public info pages)
         * - favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest (static files)
         * - $ (exact match of homepage "/" - handled separately in middleware)
         * 
         * Everything else REQUIRES authentication and will be checked by this proxy.
         * 
         * Note: The homepage (/) is in the excluded list, but the middleware code
         * explicitly handles it to redirect authenticated users to /dashboard.
         * 
         * The middleware code also has a fast-path check for files with extensions
         * (any path containing a dot) to allow static assets through efficiently.
         */
        '/((?!api|_next/static|_next/image|public|login|auth|matrx|flash-cards|dash-test|app_redirect|app_callback|sign-up|forgot-password|error|reset-password|contact|about|privacy-policy|google-settings|google-auth-demo|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|$).*)',
    ],
}

