// File: app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    
    // Get redirectTo from search params, provide fallback
    // For email verification, there might not be a redirectTo param
    const redirectToParam = searchParams.get('redirectTo')
    const redirectTo = redirectToParam ? decodeURIComponent(redirectToParam) : '/dashboard'
    
    console.log("Auth callback - URL:", request.url);
    console.log("Auth callback - Has code:", !!code);
    console.log("Auth callback - redirectTo:", redirectTo);
    console.log("Auth callback - Search params:", Object.fromEntries(searchParams));

    if (code) {
        const supabase = await createClient()
        console.log("Auth callback - Exchanging code for session");
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
            console.error("Auth callback - Error exchanging code:", error);
            // Return to error page, preserving redirectTo if it exists
            const errorUrl = `${origin}/auth/auth-code-error${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`
            return NextResponse.redirect(errorUrl)
        }
        
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        // Create the base URL
        let baseUrl: string
        if (isLocalEnv) {
            // No load balancer in development
            baseUrl = origin
        } else if (forwardedHost) {
            baseUrl = `https://${forwardedHost}`
        } else {
            baseUrl = origin
        }
        
        // Default to dashboard if we don't have a specific redirect
        const finalRedirectTo = redirectTo || '/dashboard'
        
        // Construct the final redirect URL
        const finalRedirectUrl = `${baseUrl}${finalRedirectTo}`
        console.log("Auth callback - Final redirect URL:", finalRedirectUrl);
        return NextResponse.redirect(finalRedirectUrl)
    }

    console.log("Auth callback - No code present, redirecting to home");
    // No auth code found, redirect to home page
    return NextResponse.redirect(`${origin}/login?error=Invalid+auth+callback`)
}