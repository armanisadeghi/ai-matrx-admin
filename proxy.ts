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
         * The proxy runs on MOST routes to check authentication.
         * The middleware code itself handles the logic for what to allow/block.
         * 
         * Excluded from proxy (never checked):
         * - api (API routes handle their own auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - public (static assets folder)
         * - auth (auth callback routes - /auth/callback handles its own session)
         * - forgot-password, error, reset-password (special auth pages)
         * - contact, about, privacy-policy (public info pages)
         * - favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest (static files)
         * 
         * INCLUDED in proxy (middleware decides what to do):
         * - / (homepage) - allows unauth, redirects auth users to /dashboard
         * - /login - allows unauth, redirects auth users to /dashboard
         * - /sign-up - allows unauth, redirects auth users to /dashboard
         * - All other routes - requires authentication
         * 
         * The middleware has smart logic:
         * - Unauthenticated users: Can access /, /login, /sign-up; blocked from protected routes
         * - Authenticated users: Redirected from /, /login, /sign-up to /dashboard; allowed on protected routes
         */
        '/((?!api|_next/static|_next/image|public|auth|matrx|flash-cards|dash-test|app_redirect|app_callback|forgot-password|error|reset-password|contact|about|privacy-policy|google-settings|google-auth-demo|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)',
    ],
}

