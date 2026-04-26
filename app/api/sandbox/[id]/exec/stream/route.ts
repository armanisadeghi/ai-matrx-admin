import { NextRequest } from 'next/server'
import { resolveProxyContext, forwardToOrchestrator } from '@/lib/sandbox/proxy-helpers'

/**
 * POST /api/sandbox/[id]/exec/stream
 *
 * Streaming exec — returns text/event-stream chunks for incremental
 * stdout/stderr instead of one buffered JSON blob at the end. Use for long
 * commands (npm install, builds, test runs) so the UI shows progress and
 * cancellation works (close the SSE = orchestrator cancels).
 *
 * Body shape mirrors the buffered /exec endpoint:
 *   { command, cwd?, env?, stdin?, timeout? }
 *
 * Response: Content-Type: text/event-stream with `stdout` / `stderr` / `exit`
 * events.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/exec/stream`
    // No timeout — long builds (e.g. pnpm install on a fresh node_modules) can
    // run for many minutes. Cancellation comes from the client closing the
    // connection, which propagates through the proxy to the orchestrator.
    return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, { stream: true })
}
