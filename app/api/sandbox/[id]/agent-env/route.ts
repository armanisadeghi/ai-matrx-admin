/**
 * GET /api/sandbox/[id]/agent-env
 *
 * Auth: Supabase user, must own the sandbox row.
 *
 * Forwards to the orchestrator's GET /sandboxes/{id}/agent-env which returns
 * three views of the env vars actually visible inside the running container:
 *   - container_config_env: docker inspect Config.Env (passthrough output)
 *   - runtime_env: fresh `env` from a shell inside the container
 *   - aidream_proc_env: env of the running aidream/uvicorn process
 *     (/proc/<pid>/environ — the only ground-truth view)
 *
 * Use this on the diagnostics dock when "why doesn't the agent see X?" comes
 * up — beats inspecting from the host because it shows exactly what the
 * FastAPI process actually has.
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

    const url = `${lookup.orchestrator.url}/sandboxes/${lookup.sandboxId}/agent-env`;
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "GET",
        headers: orchestratorJsonHeaders(lookup.orchestrator),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      return NextResponse.json(
        { error: "Orchestrator not reachable", details: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }

    if (!resp.ok) {
      const body = await resp.text();
      return NextResponse.json(
        { error: "Orchestrator agent-env call failed", upstream_status: resp.status, body },
        { status: resp.status >= 500 ? 502 : resp.status },
      );
    }

    return NextResponse.json(await resp.json());
  } catch (err) {
    console.error("Sandbox agent-env route error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
