import { NextRequest } from 'next/server'
import { resolveProxyContext, forwardToOrchestrator } from '@/lib/sandbox/proxy-helpers'

/**
 * POST /api/sandbox/[id]/processes/[pid]/signal
 *
 * Body: { "signal": "SIGTERM" | "SIGKILL" | "SIGINT" }
 *
 * Used by the editor to cancel a stuck `pnpm install` etc. without destroying
 * the whole sandbox.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; pid: string }> }
) {
    const { id, pid } = await params
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/processes/${pid}/signal`
    return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, { timeoutMs: 15_000 })
}
