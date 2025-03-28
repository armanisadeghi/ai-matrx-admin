// File: middleware.ts

import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - Homepage '/'
         * - public (static folder)
         * - /flash-cards
         * - /tests
         * - /ava
         * - /dash
         * - /contact
         * - /about
         * - /privacy-policy
         * - favicon.ico (favicon file)
         * - sitemap.xml (sitemap file)
         * - robots.txt (robots metadata)
         */
        '/((?!api|_next/static|_next/image|$|public|auth|sign-up|forgot-password|error|reset-password|flash-cards|tests|ava|dash|contact|about|privacy-policy|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}
