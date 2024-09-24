// app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    console.log('Auth callback route initiated')
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    console.log(`Auth callback params - code: ${code ? '[REDACTED]' : 'null'}, next: ${next}`)

    if (code) {
        const supabase = createClient()
        console.log('Exchanging code for session')
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)
        console.log('Code exchange result:', error ? 'Error' : 'Success', data)

        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            console.log(`Environment: ${isLocalEnv ? 'Development' : 'Production'}`)
            console.log(`Forwarded host: ${forwardedHost || 'Not set'}`)

            let redirectUrl
            if (isLocalEnv) {
                redirectUrl = `${origin}${next}`
            } else if (forwardedHost) {
                redirectUrl = `https://${forwardedHost}${next}`
            } else {
                redirectUrl = `${origin}${next}`
            }
            console.log(`Redirecting to: ${redirectUrl}`)
            return NextResponse.redirect(redirectUrl)
        }
    }

    console.log('Auth callback failed, redirecting to error page')
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
