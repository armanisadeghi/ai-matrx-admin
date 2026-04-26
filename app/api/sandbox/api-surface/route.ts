import { NextRequest, NextResponse } from 'next/server'
import {
    resolveOrchestratorByTier,
    orchestratorJsonHeaders,
} from '@/lib/sandbox/orchestrator-routing'
import type { SandboxTier } from '@/types/sandbox'

/**
 * GET /api/sandbox/api-surface?tier=ec2|hosted
 *
 * Forwards to the orchestrator's `GET /api-surface` capability descriptor and
 * returns it verbatim. The route is the only sanctioned way the client side
 * can discover orchestrator capabilities — `/openapi.json` omits any FastAPI
 * route declared with a `{path:path}` catchall (`/fs/*`, `/git/*`,
 * `/search/*`), so the surface there is incomplete.
 *
 * The response is cached aggressively at the client (see
 * `lib/sandbox/api-surface.ts`) so this route is hit at most once per tier
 * per session. We don't enforce auth — the surface descriptor leaks no
 * sandbox state, only route shapes.
 */
export async function GET(request: NextRequest) {
    const tierParam = request.nextUrl.searchParams.get('tier') || 'ec2'
    const tier = (tierParam === 'hosted' ? 'hosted' : 'ec2') as SandboxTier
    const target = resolveOrchestratorByTier(tier)

    try {
        const upstream = await fetch(`${target.url}/api-surface`, {
            method: 'GET',
            headers: orchestratorJsonHeaders(target),
            signal: AbortSignal.timeout(8_000),
        })
        if (!upstream.ok) {
            const body = await upstream.text().catch(() => upstream.statusText)
            return NextResponse.json(
                { error: 'Orchestrator api-surface failed', tier, details: body },
                { status: upstream.status >= 500 ? 502 : upstream.status }
            )
        }
        const data = await upstream.json()
        // Tag the response with the requested tier so the client cache key
        // stays unambiguous even if a future upstream forgets to include it.
        return NextResponse.json({ ...data, tier })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json(
            { error: 'Sandbox orchestrator is not reachable', tier, details: message },
            { status: 502 }
        )
    }
}
