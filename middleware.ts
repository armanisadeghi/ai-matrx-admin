import { type NextRequest, NextResponse } from 'next/server' // Import NextResponse
import { updateSession } from '@/lib/supabase/middleware'

export default async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    const shouldUpdateSession = shouldApplyMiddleware(path);

    if (shouldUpdateSession) {
        return await updateSession(request);
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
        '/test',
        '/tests',
        '/testing',
        '/about',
        '/contact',
        '/dash',
        '/blog',
        '/pricing',
        '/login',
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
}
