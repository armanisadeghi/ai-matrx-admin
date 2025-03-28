// File: app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Use redirectTo from search params if present, fallback to '/dashboard'
    const redirectTo = searchParams.get('redirectTo') || '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${redirectTo}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`)
            } else {
                return NextResponse.redirect(`${origin}${redirectTo}`)
            }
        }
    }

    // Return to error page, preserving redirectTo if it exists
    const errorUrl = `${origin}/auth/auth-code-error${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`
    return NextResponse.redirect(errorUrl)
}