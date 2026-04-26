import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
    lookupSandboxAndOrchestrator,
    orchestratorJsonHeaders,
} from '@/lib/sandbox/orchestrator-routing'

/**
 * POST /api/sandbox/[id]/extend
 *
 * Extends a sandbox's TTL by calling the orchestrator's `/sandboxes/{id}/extend`
 * endpoint, then mirrors the new `expires_at` into the local Postgres row so
 * UI and the orchestrator stay in sync. This replaces the old DB-only "extend"
 * action on PUT /api/sandbox/[id], which silently drifted from orchestrator
 * state.
 *
 * Body:
 *   { ttl_seconds?: number }   // default 3600, range 60..86400
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const lookup = await lookupSandboxAndOrchestrator(id)
        if (!lookup.ok) {
            return NextResponse.json({ error: lookup.error }, { status: lookup.status })
        }

        const body = await request.json().catch(() => ({}))
        const ttlSeconds = Number(body?.ttl_seconds ?? 3600)
        if (!Number.isFinite(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 86400) {
            return NextResponse.json(
                { error: 'ttl_seconds must be between 60 and 86400' },
                { status: 400 }
            )
        }

        // Forward to the orchestrator hosting this sandbox's tier.
        let resp: Response
        try {
            resp = await fetch(
                `${lookup.orchestrator.url}/sandboxes/${lookup.sandboxId}/extend`,
                {
                    method: 'POST',
                    headers: orchestratorJsonHeaders(lookup.orchestrator),
                    body: JSON.stringify({ ttl_seconds: ttlSeconds }),
                }
            )
        } catch (fetchError) {
            console.error('Orchestrator extend connection failed:', fetchError)
            return NextResponse.json(
                { error: 'Sandbox orchestrator is not reachable' },
                { status: 502 }
            )
        }

        if (!resp.ok) {
            const errBody = await resp.text()
            console.error('Orchestrator extend failed:', resp.status, errBody)
            return NextResponse.json(
                { error: 'Failed to extend sandbox', details: errBody },
                { status: resp.status >= 500 ? 502 : resp.status }
            )
        }

        const orchestratorPayload = await resp.json()
        const newExpiresAt = orchestratorPayload?.new_expires_at || orchestratorPayload?.expires_at
        if (!newExpiresAt) {
            return NextResponse.json(
                { error: 'Orchestrator extend returned no expires_at — likely on stale code' },
                { status: 502 }
            )
        }

        // Mirror the orchestrator's authoritative new expiry into our DB.
        const supabase = await createClient()
        const { data: instance, error: updateError } = await supabase
            .from('sandbox_instances')
            .update({
                expires_at: newExpiresAt,
                ttl_seconds: ttlSeconds,
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            console.error('Failed to mirror extend into DB:', updateError)
            // Don't fail the request — orchestrator already accepted the extend.
            return NextResponse.json({
                instance: null,
                orchestrator: orchestratorPayload,
                warning: 'Extended at orchestrator but local DB mirror failed',
            })
        }

        return NextResponse.json({
            instance,
            orchestrator: orchestratorPayload,
        })
    } catch (error) {
        console.error('Sandbox extend API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
