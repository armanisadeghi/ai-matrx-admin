import { NextRequest } from "next/server";
import {
  resolveProxyContext,
  forwardToOrchestrator,
} from "@/lib/sandbox/proxy-helpers";

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

// Run on the Node.js runtime so the route can stream the upstream SSE body
// back to the browser without Vercel's edge runtime imposing additional
// buffering. `force-dynamic` defeats any accidental caching of the response.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel hard cap on Pro Serverless Functions is 300s — the build will
// reject anything higher with "Serverless Functions must have a maxDuration
// between 1 and 300 for plan pro" (https://vercel.com/docs/limits). Hobby
// is 60s, Enterprise is 900s; Fluid Compute does NOT raise the per-request
// ceiling. Anything that genuinely needs to run longer than 5 minutes
// (full `pnpm install` cold cache, `next build`, large `pnpm test` matrix)
// must talk to the orchestrator directly — see
// `features/code/SANDBOX_DIRECT_ENDPOINTS.md` for the proposed contract.
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await resolveProxyContext(id);
  if (!ctx.ok) return ctx.response;

  const upstreamUrl = `${ctx.orchestrator.url}/sandboxes/${ctx.sandboxId}/exec/stream`;
  // No timeout — long builds (e.g. pnpm install on a fresh node_modules) can
  // run for many minutes. Cancellation comes from the client closing the
  // connection, which propagates through the proxy to the orchestrator.
  return forwardToOrchestrator(request, upstreamUrl, ctx.orchestrator, {
    stream: true,
  });
}
