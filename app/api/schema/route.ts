// app/api/schema/route.ts
// On-demand schema endpoint for the SSR entity system.
// Returns the processed schema (UnifiedSchemaCache) as JSON.
// Called by useEntitySystem() when a route needs entity data.

import { NextResponse } from 'next/server';
import { initializeSchemaSystem } from '@/utils/schema/schema-processing/processSchema';

// Cache the result in module scope — schema is static per deployment
let cachedResponse: string | null = null;

export async function GET() {
    if (!cachedResponse) {
        const globalCache = initializeSchemaSystem(['api/schema']);
        cachedResponse = JSON.stringify(globalCache);
    }

    return new NextResponse(cachedResponse, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            // Cache for 1 hour on CDN, revalidate in background
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
