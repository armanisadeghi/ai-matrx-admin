import { NextRequest } from 'next/server'
import { resolveProxyContext, forwardToOrchestrator } from '@/lib/sandbox/proxy-helpers'

/**
 * GET /api/sandbox/[id]/processes
 *
 * Returns the list of processes running inside the sandbox (parsed `ps aux`).
 * Per-process cancellation goes through /api/sandbox/[id]/processes/[pid]/signal.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/processes`
    return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, { timeoutMs: 15_000 })
}
