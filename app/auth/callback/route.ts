// File: app/auth/callback/route.ts

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const origin = requestUrl.origin;

    const fullSearchParams = requestUrl.search.slice(1); // Remove the leading '?'
    const params = new URLSearchParams(fullSearchParams);
    let redirectTo = '/dashboard';

    for (const [key, value] of params.entries()) {
        if (value.includes('redirectTo=')) {
            const match = value.match(/redirectTo=(.+)/);
            if (match && match[1]) {
                redirectTo = decodeURIComponent(match[1]);
                break;
            }
        }
    }

    console.log("Auth Callback - RedirectTo:", redirectTo); // Debug log

    if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error("Error exchanging code for session:", error); // Debug log
            return NextResponse.redirect(new URL('/sign-in', origin));
        }
    } else {
        console.error("No code provided in the callback"); // Debug log
    }

    // Construct the final redirect URL
    let finalRedirectUrl;
    try {
        // Check if redirectTo is a full URL or just a path
        if (redirectTo.startsWith('http://') || redirectTo.startsWith('https://')) {
            finalRedirectUrl = new URL(redirectTo);
        } else {
            finalRedirectUrl = new URL(redirectTo, origin);
        }
    } catch (error) {
        console.error("Error constructing final redirect URL:", error); // Debug log
        finalRedirectUrl = new URL('/dashboard', origin);
    }

    return NextResponse.redirect(finalRedirectUrl);
}
