import { NextRequest } from 'next/server'
import { resolveProxyContext, forwardToOrchestrator } from '@/lib/sandbox/proxy-helpers'

/**
 * POST /api/sandbox/[id]/credentials/revoke
 *
 * Removes the git credential helper script and unsets the git config the
 * matching POST /credentials installed. Use on logout / disconnect.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/credentials/revoke`
    return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, { timeoutMs: 30_000 })
}
