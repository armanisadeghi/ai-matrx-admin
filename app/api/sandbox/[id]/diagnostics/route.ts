/**
 * GET /api/sandbox/[id]/diagnostics
 *
 * Auth: Supabase user, must own the sandbox row.
 *
 * Forwards to the matching tier's orchestrator
 *   GET /sandboxes/{sandbox_id}/diagnostics
 *
 * Returns the orchestrator's full readiness JSON verbatim. The caller
 * (SandboxDiagnosticsPanel, the create-sandbox flow) renders every field
 * — even on failure — so the operator sees exactly which layer is broken
 * (container? matrx_agent on :8000? aidream on :8001? aidream's DB pool?).
 *
 * The sandbox detail page uses this BOTH:
 *   - At create time: poll until ``overall_ok: true`` before letting the
 *     user issue AI calls. Also surfaces any env-var that didn't propagate.
 *   - On demand: any time the operator wants to see "is everything wired
 *     up right" without spawning a chat round-trip.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  lookupSandboxAndOrchestrator,
  orchestratorJsonHeaders,
} from "@/lib/sandbox/orchestrator-routing";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const lookup = await lookupSandboxAndOrchestrator(id);
    if (lookup.ok === false) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status });
    }

    const url = `${lookup.orchestrator.url}/sandboxes/${lookup.sandboxId}/diagnostics`;
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "GET",
        headers: orchestratorJsonHeaders(lookup.orchestrator),
        // Diagnostics is a self-contained probe set with its own internal
        // timeouts; cap our wait so a totally-stuck container doesn't hang
        // the route handler.
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      return NextResponse.json(
        {
          error: "Orchestrator not reachable",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 502 },
      );
    }

    if (!resp.ok) {
      const body = await resp.text();
      return NextResponse.json(
        { error: "Orchestrator diagnostics call failed", upstream_status: resp.status, body },
        { status: resp.status >= 500 ? 502 : resp.status },
      );
    }

    return NextResponse.json(await resp.json());
  } catch (err) {
    console.error("Sandbox diagnostics route error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
