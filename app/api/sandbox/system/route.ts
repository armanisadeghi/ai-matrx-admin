import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
    resolveOrchestratorByTier,
    orchestratorJsonHeaders,
} from '@/lib/sandbox/orchestrator-routing'
import type { SandboxTier } from '@/types/sandbox'

/**
 * GET /api/sandbox/system?tier=ec2|hosted
 *
 * Aggregates host pressure (disk/mem/cpu) + container counts from one or both
 * orchestrators. Powers the admin Sandbox Infrastructure panel.
 *
 * - Without `tier`: returns both tiers in a single response.
 * - With `tier`: returns just that tier.
 *
 * Auth: requires a Supabase session (any authenticated user). The orchestrator
 * itself enforces an API key — that's added server-side from env, never exposed
 * to the browser.
 */

interface OrchestratorSystemInfo {
    tier: SandboxTier
    url: string
    ok: boolean
    status: 'healthy' | 'unreachable' | 'error'
    error?: string
    /** Raw payload from {orchestrator}/system when ok */
    system?: Record<string, unknown>
    /** Raw payload from {orchestrator}/ when ok */
    info?: Record<string, unknown>
    /** Raw /api-surface route count when ok */
    routeCount?: number
    fetchedAt: string
}

async function fetchTierInfo(tier: SandboxTier): Promise<OrchestratorSystemInfo> {
    const target = resolveOrchestratorByTier(tier)
    const fetchedAt = new Date().toISOString()
    const headers = orchestratorJsonHeaders(target)

    try {
        // Three reads in parallel: /system (auth) + / (no auth) + /api-surface (no auth)
        const [systemResp, rootResp, surfaceResp] = await Promise.allSettled([
            fetch(`${target.url}/system`, { headers, signal: AbortSignal.timeout(8000) }),
            fetch(`${target.url}/`, { signal: AbortSignal.timeout(5000) }),
            fetch(`${target.url}/api-surface`, { signal: AbortSignal.timeout(5000) }),
        ])

        const sys =
            systemResp.status === 'fulfilled' && systemResp.value.ok
                ? await systemResp.value.json().catch(() => undefined)
                : undefined
        const info =
            rootResp.status === 'fulfilled' && rootResp.value.ok
                ? await rootResp.value.json().catch(() => undefined)
                : undefined
        const surface =
            surfaceResp.status === 'fulfilled' && surfaceResp.value.ok
                ? await surfaceResp.value.json().catch(() => undefined)
                : undefined

        const reachable = sys || info
        if (!reachable) {
            return {
                tier,
                url: target.url,
                ok: false,
                status: 'unreachable',
                error: 'Orchestrator did not respond to /, /system, or /api-surface',
                fetchedAt,
            }
        }

        return {
            tier,
            url: target.url,
            ok: true,
            status: 'healthy',
            system: sys,
            info,
            routeCount: surface?.routes?.length,
            fetchedAt,
        }
    } catch (err) {
        return {
            tier,
            url: target.url,
            ok: false,
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
            fetchedAt,
        }
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        const tierParam = request.nextUrl.searchParams.get('tier') as SandboxTier | null
        const tiers: SandboxTier[] = tierParam ? [tierParam] : ['ec2', 'hosted']

        const results = await Promise.all(tiers.map(fetchTierInfo))
        return NextResponse.json({ tiers: results })
    } catch (error) {
        console.error('Sandbox system API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
