import { NextRequest } from 'next/server'
import { resolveProxyContext, forwardToOrchestrator } from '@/lib/sandbox/proxy-helpers'

/**
 * Catchall proxy for the sandbox filesystem API.
 *
 * Routes every method (GET/POST/PUT/DELETE/PATCH) under
 *   /api/sandbox/[id]/fs/...
 * to the orchestrator at
 *   {orchestrator}/sandboxes/{sandbox_id}/fs/...
 *
 * The orchestrator forwards into the in-container `matrx_agent` daemon which
 * implements the actual fs operations (list/stat/read/write/patch/delete/
 * mkdir/rename/copy/upload/download/batch). Binary content uses
 * `?encoding=base64` end-to-end.
 *
 * The auth/ownership check happens in resolveProxyContext (Supabase user check
 * + sandbox ownership). Tier routing is automatic — EC2-tier and hosted-tier
 * sandboxes route to different orchestrator URLs based on `config.tier` on
 * the sandbox row.
 */

async function handle(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; path: string[] }> }
) {
    const { id, path } = await params
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const subpath = (path || []).join('/')
    const search = request.nextUrl.search // includes leading '?' or ''
    const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/fs/${subpath}${search}`

    return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, { timeoutMs: 60_000 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle
