import { NextRequest } from 'next/server'
import { resolveProxyContext, forwardToOrchestrator } from '@/lib/sandbox/proxy-helpers'

/**
 * POST /api/sandbox/[id]/credentials
 *
 * Configures git/SSH credentials inside the sandbox. The orchestrator stores
 * the secret in a mode-restricted helper script and wires `git config --global
 * credential.helper` so subsequent `git push` works without the user pasting
 * tokens into a terminal.
 *
 * Body shapes:
 *   { kind: "github", token: "ghp_…", scope?: "read"|"write" }
 *   { kind: "ssh",    private_key: "-----BEGIN…", known_hosts?: "…" }
 *
 * Tokens never appear in /fs/read listings; revoked on sandbox stop or via
 * /api/sandbox/[id]/credentials/revoke.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const ctx = await resolveProxyContext(id)
    if (!ctx.ok) return ctx.response

    const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/credentials`
    return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, { timeoutMs: 30_000 })
}
