import { NextRequest } from 'next/server'
import { resolveProxyContext, forwardToOrchestrator } from '@/lib/sandbox/proxy-helpers'

/**
 * Catchall proxy for sandbox search (ripgrep + fd, in-container daemon).
 *
 * /api/sandbox/[id]/search/content → ripgrep wrapper, JSON matches
 * /api/sandbox/[id]/search/paths   → fd wrapper, glob/fuzzy path matching
 */

async function handle(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; path: string[] }> }
) {
    const { id, path } = await params
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const subpath = (path || []).join('/')
    const search = request.nextUrl.search
    const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/search/${subpath}${search}`

    return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, { timeoutMs: 60_000 })
}

export const GET = handle
export const POST = handle
