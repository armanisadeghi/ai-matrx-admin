// lib/supabase/routeProtection.ts

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function routeProtectionMiddleware(request: NextRequest) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: { session } } = await supabase.auth.getSession()

    // If the user is not authenticated and trying to access a protected route, redirect to login-old
    if (!session && request.nextUrl.pathname.startsWith('/(authenticated)')) {
        return NextResponse.redirect(new URL('/login-old', request.url))
    }

    // Allow the request to continue
    return NextResponse.next()
}
