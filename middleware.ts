// File: middleware.ts

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from "@/utils/supabase/middleware";

export default async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    if (path.startsWith('/auth/callback')) {
        return NextResponse.next();
    }

    const shouldUpdateSession = shouldApplyMiddleware(path);

    if (shouldUpdateSession) {
        const response = await updateSession(request);
        if (response instanceof NextResponse && response.headers.get("Location")) {
            const originalUrl = request.nextUrl.clone();
            const redirectUrl = new URL(response.headers.get("Location")!, request.url);

            originalUrl.searchParams.forEach((value, key) => {
                redirectUrl.searchParams.set(key, value);
            });

            return NextResponse.redirect(redirectUrl);
        }

        return response;
    } else {
        return NextResponse.next();
    }
}

function shouldApplyMiddleware(path: string): boolean {
    const excludedPaths = [
        '/',
        '/_next/static',
        '/_next/image',
        '/favicon.ico',
        '/site.webmanifest',
        '/forgot-password',
        '/reset-password',
        '/sign-in',
        '/sign-up',
        '/test',
        '/tests',
        '/testing',
        '/about',
        '/contact',
        '/dash',
        '/blog',
        '/pricing',
        '/auth',
    ];

    for (const excludedPath of excludedPaths) {
        if (path === excludedPath) {
            return false;
        }
    }

    if (path.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)) {
        return false;
    }

    return true;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
    ],
};
