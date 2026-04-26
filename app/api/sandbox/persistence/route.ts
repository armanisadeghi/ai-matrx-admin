import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  orchestratorJsonHeaders,
  resolveOrchestratorByTier,
} from "@/lib/sandbox/orchestrator-routing";
import type {
  UserPersistenceInfo,
  UserPersistenceResponse,
} from "@/types/sandbox";

/**
 * GET /api/sandbox/persistence
 *
 * Aggregates per-user persistent-storage info across all tiers. Talks to each
 * orchestrator's `GET /users/{user_id}/persistence` endpoint shipped by the
 * Python team in Phase 1+2+3 of the persistence plan. The hosted tier returns
 * a real Docker volume + bytes; the EC2 tier may return empty/`{}` until the
 * cloud_sync work in Phase 6 lands — we still merge it so callers get a single
 * response shape.
 *
 * The `partial` flag is set if any orchestrator was unreachable or returned
 * less data than expected, so the UI can render "—" rather than "0 B" without
 * having to inspect every individual tier entry.
 *
 * DELETE /api/sandbox/persistence
 *
 * Forwards to `DELETE /users/{user_id}/volume` on the relevant tier(s). Pass
 * `?tier=hosted` to scope the deletion (recommended); the bare DELETE wipes
 * every tier we know about. The orchestrator refuses if any sandbox is still
 * mounted; we surface that 4xx straight back to the user.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tierFilter = url.searchParams.get("tier");
  const tiers: Array<"ec2" | "hosted"> =
    tierFilter === "ec2" || tierFilter === "hosted"
      ? [tierFilter]
      : ["hosted", "ec2"];

  const tierInfos: UserPersistenceInfo[] = [];
  let partial = false;
  let total = 0;

  for (const tier of tiers) {
    const target = resolveOrchestratorByTier(tier);
    if (!target.apiKey) {
      // Tier not configured on this deployment — skip but mark partial so
      // the UI doesn't claim it knows the full picture.
      partial = true;
      continue;
    }
    try {
      const resp = await fetch(
        `${target.url}/users/${encodeURIComponent(user.id)}/persistence`,
        { headers: orchestratorJsonHeaders(target) },
      );
      if (resp.status === 404) {
        // No volume yet for this user on this tier — still a valid state
        // (they've never created a sandbox on this tier).
        tierInfos.push({
          user_id: user.id,
          tier,
          current_size_bytes: 0,
          sandbox_count: 0,
        });
        continue;
      }
      if (!resp.ok) {
        partial = true;
        continue;
      }
      const body = (await resp.json()) as Record<string, unknown>;
      const info: UserPersistenceInfo = {
        user_id: user.id,
        tier,
        volume_name:
          typeof body.volume_name === "string" ? body.volume_name : null,
        current_size_bytes:
          typeof body.current_size_bytes === "number"
            ? body.current_size_bytes
            : null,
        sandbox_count:
          typeof body.sandbox_count === "number" ? body.sandbox_count : 0,
        s3_prefix:
          typeof body.s3_prefix === "string" ? body.s3_prefix : null,
        in_use: typeof body.in_use === "boolean" ? body.in_use : undefined,
        last_synced_at:
          typeof body.last_synced_at === "string" ? body.last_synced_at : null,
      };
      tierInfos.push(info);
      if (typeof info.current_size_bytes === "number") {
        total += info.current_size_bytes;
      } else {
        partial = true;
      }
    } catch (err) {
      console.error(
        `[sandbox/persistence] tier=${tier} fetch failed:`,
        err,
      );
      partial = true;
    }
  }

  const payload: UserPersistenceResponse = {
    user_id: user.id,
    total_size_bytes: total,
    partial,
    tiers: tierInfos,
  };
  return NextResponse.json(payload);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tierFilter = url.searchParams.get("tier");
  const tiers: Array<"ec2" | "hosted"> =
    tierFilter === "ec2" || tierFilter === "hosted"
      ? [tierFilter]
      : ["hosted", "ec2"];

  const results: Array<{
    tier: "ec2" | "hosted";
    ok: boolean;
    status: number;
    error?: string;
  }> = [];

  for (const tier of tiers) {
    const target = resolveOrchestratorByTier(tier);
    if (!target.apiKey) {
      results.push({ tier, ok: false, status: 0, error: "tier not configured" });
      continue;
    }
    try {
      const resp = await fetch(
        `${target.url}/users/${encodeURIComponent(user.id)}/volume`,
        {
          method: "DELETE",
          headers: orchestratorJsonHeaders(target),
        },
      );
      if (resp.ok || resp.status === 204 || resp.status === 404) {
        // 404 = already gone; treat as success.
        results.push({ tier, ok: true, status: resp.status });
        continue;
      }
      const text = await resp.text().catch(() => resp.statusText);
      results.push({ tier, ok: false, status: resp.status, error: text });
    } catch (err) {
      console.error(
        `[sandbox/persistence] tier=${tier} delete failed:`,
        err,
      );
      results.push({
        tier,
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { ok: allOk, results },
    { status: allOk ? 200 : 409 },
  );
}
