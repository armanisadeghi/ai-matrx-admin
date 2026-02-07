// File: app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const timestamp = new Date().toISOString();

    // Get redirectTo from search params, provide fallback
    // For email verification, there might not be a redirectTo param
    const redirectToParam = searchParams.get('redirectTo')
    let redirectTo = redirectToParam ? decodeURIComponent(redirectToParam) : '/dashboard'

    // CRITICAL: Never redirect to login, sign-up, or homepage after successful auth
    // These are common bugs that cause infinite redirect loops
    if (redirectTo === '/' || redirectTo === '/login' || redirectTo === '/sign-up' || redirectTo === '') {
        console.log(`[${timestamp}] Auth callback - Invalid redirectTo (${redirectTo}), using /dashboard`);
        redirectTo = '/dashboard'
    }

    console.log(`[${timestamp}] Auth callback - Code: ${code ? 'present' : 'missing'}, redirectTo: ${redirectTo}`);

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error(`[${timestamp}] Auth callback - Error exchanging code:`, error);
            // Return to login page with error, don't go to error page as users can't recover from there
            const loginUrl = `${origin}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`
            return NextResponse.redirect(loginUrl)
        }

        console.log(`[${timestamp}] Auth callback - Successfully exchanged code for session, user: ${data.user?.email}`);

        // Apple-specific: Persist user's name on first sign-in
        // Apple only sends the user's name on the very first authorization and returns null for all subsequent sign-ins.
        // We must capture and store it immediately.
        if (data.user) {
            const provider = data.user.app_metadata?.provider;
            const userMeta = data.user.user_metadata;

            if (provider === 'apple') {
                const fullName = userMeta?.full_name;
                const givenName = userMeta?.given_name || userMeta?.first_name;
                const familyName = userMeta?.family_name || userMeta?.last_name;

                // Only update if we have name data (first sign-in only)
                if (fullName || givenName || familyName) {
                    const nameToStore = fullName || `${givenName || ''} ${familyName || ''}`.trim();
                    console.log(`[${timestamp}] Auth callback - Apple first sign-in, persisting name: ${nameToStore}`);

                    try {
                        await supabase.auth.updateUser({
                            data: {
                                full_name: nameToStore,
                                ...(givenName && { given_name: givenName }),
                                ...(familyName && { family_name: familyName }),
                            },
                        });
                    } catch (nameError) {
                        // Non-blocking: don't fail the auth flow if name update fails
                        console.error(`[${timestamp}] Auth callback - Failed to persist Apple user name:`, nameError);
                    }
                }
            }
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

        // Final validation - ensure we never redirect to public pages
        const finalRedirectTo = (redirectTo && redirectTo !== '/' && redirectTo !== '/login' && redirectTo !== '/sign-up')
            ? redirectTo
            : '/dashboard'

        // Construct the final redirect URL
        const finalRedirectUrl = `${baseUrl}${finalRedirectTo}`
        console.log(`[${timestamp}] Auth callback - Final redirect URL: ${finalRedirectUrl}`);
        return NextResponse.redirect(finalRedirectUrl)
    }

    console.log(`[${timestamp}] Auth callback - No code present, redirecting to login`);
    // No auth code found, redirect to login page
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Invalid authentication callback')}`)
}