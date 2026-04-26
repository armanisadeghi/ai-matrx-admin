import { NextRequest } from 'next/server'
import { resolveProxyContext, forwardToOrchestrator } from '@/lib/sandbox/proxy-helpers'

/**
 * GET /api/sandbox/[id]/ports
 *
 * Lists ports listening **inside** the sandbox container. Note: this is
 * informational only — there's no public expose-via-Traefik flow yet
 * (deferred wishlist item). The editor uses this to populate the
 * "running services" panel and to detect dev servers.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/ports`
    return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, { timeoutMs: 15_000 })
}
