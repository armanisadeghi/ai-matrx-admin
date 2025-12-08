// File: proxy.ts

import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
    // Log which URL is being processed by the proxy
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - public (static folder)
         * - favicon.ico (favicon file)
         * - sitemap.xml (sitemap file)
         * - robots.txt (robots metadata)
         * 
         * Public pages that don't require authentication:
         * - / (Homepage)
         * - /auth (authentication related routes)
         * - /app_redirect, /app_callback (external app related routes)
         * - /sign-up, /forgot-password, /error, /reset-password (auth related pages)
         * - /contact, /about, /privacy-policy (public info pages)
         * 
         * Everything else requires authentication, including:
         * - /tests (all test routes)
         * - /flash-cards, /dash, /dashboard, etc.
         */
        '/((?!api|_next/static|_next/image|public|login|auth|matrx|flash-cards|dash-test|app_redirect|app_callback|sign-up|forgot-password|error|reset-password|contact|about|privacy-policy|google-settings|google-auth-demo|favicon.ico|sitemap.xml|robots.txt|$).*)',
    ],
}

