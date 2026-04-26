import { NextRequest, NextResponse } from 'next/server'
import { resolveProxyContext } from '@/lib/sandbox/proxy-helpers'

/**
 * PTY (terminal) WebSocket proxy.
 *
 * Path:  GET /api/sandbox/[id]/pty?cols=…&rows=…&cwd=…&shell=…
 *
 * The terminal uses a same-origin WebSocket upgrade against this route. The
 * pattern matches `app/api/sandbox/[id]/fs/[...path]/route.ts` and the
 * client side in [features/code/adapters/SandboxFilesystemAdapter.ts] watch().
 *
 * On a Node-based deployment with a custom HTTP-upgrade hook (Coolify /
 * self-hosted), the runtime forwards the upgrade onto the orchestrator's
 * `/sandboxes/{sandbox_id}/pty` endpoint. The Next route handler itself
 * cannot complete a 101 Switching Protocols response in standard Vercel /
 * Next runtimes, so the role of this file is twofold:
 *
 *   1. Reserve the URL pattern and document the protocol contract for the
 *      hosting layer's upgrade hook.
 *   2. Serve a JSON descriptor (`GET …pty?descriptor=1`) that the client can
 *      use as a fallback to dial the orchestrator directly when the
 *      same-origin upgrade isn't available (e.g. Vercel deploys).
 *
 * ── Wire format (terminal ↔ daemon) ────────────────────────────────────────
 *   client → server  (text JSON frames, one per line)
 *     {"type":"input",  "data":"ls\\n"}
 *     {"type":"resize", "cols":120, "rows":40}
 *     {"type":"signal", "signal":"SIGINT"}
 *     {"type":"ping"}
 *
 *   server → client  (text JSON frames, one per line)
 *     {"type":"output", "data":"<chunk>"}
 *     {"type":"exit",   "code":0,  "signal":null}
 *     {"type":"error",  "message":"…"}
 *     {"type":"pong"}
 *
 * Query parameters mirror the orchestrator surface — `cols`, `rows`, `cwd`,
 * `shell`, `env` (json-encoded) — and are forwarded verbatim.
 */

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    // Same-origin WebSocket upgrade path — let the hosting layer's upgrade
    // hook take over. Returning 101 from a Next route handler is not
    // supported on Vercel's standard runtime; in that environment the
    // client will receive a normal HTTP response and fall back to the
    // descriptor flow below.
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
        return new Response(null, {
            status: 426,
            headers: {
                Upgrade: 'websocket',
                Connection: 'Upgrade',
                'X-PTY-Sandbox-Id': id,
            },
        })
    }

    // Descriptor flow — return the connection target the client should dial.
    // The `ws_url` is the orchestrator's authoritative URL; the client may
    // either open it directly (when CORS allows) or use it as guidance for
    // the same-origin upgrade.
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const wsUrl = ctx.orchestrator.url
        .replace(/^http:\/\//, 'ws://')
        .replace(/^https:\/\//, 'wss://')
    const search = request.nextUrl.search
    return NextResponse.json({
        ws_url: `${wsUrl}/sandboxes/${ctx.sandboxId}/pty${search}`,
        same_origin_url: `/api/sandbox/${id}/pty${search}`,
        sandbox_id: ctx.sandboxId,
        tier: ctx.orchestrator.tier,
        // The API key intentionally never leaves the server. Direct-dial
        // use is reserved for self-hosted deployments where the orchestrator
        // is reachable from the browser; same-origin upgrade through the
        // hosting layer is the production path.
    })
}
