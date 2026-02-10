// proxy.ts
// Next.js 16 Proxy (replaces middleware.ts)
// Refreshes auth tokens and manages session cookies on every matched request.
// https://supabase.com/docs/guides/auth/server-side/nextjs

import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest
     * - Static asset extensions (svg, png, jpg, jpeg, gif, webp)
     * - api (API routes handle their own auth)
     * - auth (auth callback routes)
     * - p (public routes like /p/chat)
     * - Public pages: demos, matrx, flash-cards, dash-test, app_redirect, app_callback
     * - Auth-related pages: forgot-password, error, reset-password
     * - Info pages: contact, about, privacy-policy, google-settings, google-auth-demo
     */
    '/((?!api|_next/static|_next/image|public|auth|p|demos|matrx|flash-cards|dash-test|app_redirect|app_callback|forgot-password|error|reset-password|contact|about|privacy-policy|google-settings|google-auth-demo|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)',
  ],
}
