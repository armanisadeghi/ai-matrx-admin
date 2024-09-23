// middleware.ts

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'
import {routeProtectionMiddleware} from "@/lib/supabase/routeProtection";

export async function middleware(request: NextRequest) {
    // First, apply the Supabase middleware
    const supabaseResponse = createClient(request)

    // Then, apply the route protection middleware
    const routeProtectionResponse = await routeProtectionMiddleware(request)

    // If the route protection middleware returned a response (e.g., a redirect),
    // use that response. Otherwise, use the Supabase response.
    return routeProtectionResponse instanceof NextResponse
        ? routeProtectionResponse
        : supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
