// app/api/organizations/[orgId]/domains/route.ts — connect, check and remove an organization's own domain.
//
// A Next route because it talks to the Vercel Domains API with the platform's team token (a true
// server-only concern). Every action first runs iam.org_domain_admin_check AS the signed-in caller
// (org admin, plan knob or platform grant, per-org limit, host shape, host not taken); only then does
// the server call Vercel, and only after Vercel answered does it write through iam.org_domain_record
// (service role — a browser can never mark a host live). Reads stay direct: iam.org_domains.
// Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md
//
//   POST   { action: "add", host }        → Vercel add → row (pending/verifying/live) + DNS records
//   POST   { action: "check", domain_id } → Vercel verify + DNS config → row status
//   POST   { action: "purge", domain_id } → after a route write (iam.org_domain_route_set, direct from
//                                           the browser): drops the host from this server's lookup cache
//   DELETE ?domain_id=…                   → Vercel remove → row removed (its routes go with it)

import { NextRequest, NextResponse } from "next/server";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import type { Json } from "@/types/database.types";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { forgetDomain } from "@/lib/custom-domains/lookup";
import { statusFor, type DomainState } from "@/lib/custom-domains/dns-records";
import { addDomain, checkDomain, isVercelConfigured, removeDomain, VercelUnavailable } from "@/lib/custom-domains/vercel";

export const dynamic = "force-dynamic";

type Action = "add" | "check" | "remove";

interface AdminCheck {
  ok: boolean;
  reason?: string;
  detail?: string;
  host?: string;
  domain_id?: string;
}

async function adminCheck(orgId: string, action: Action, host: string | null, domainId: string | null) {
  if (!isUuidShape(orgId)) {
    return { refusal: NextResponse.json({ error: "Name the organization." }, { status: 400 }) } as const;
  }
  const supabase = await createClient();
  const { data: { user } } = await getClaimsUser(supabase);
  if (!user) return { refusal: NextResponse.json({ error: "Sign in first." }, { status: 401 }) } as const;
  const { data, error } = await supabase.schema("iam").rpc("org_domain_admin_check", {
    p_organization_id: orgId,
    p_action: action,
    p_host: host as string,
    p_domain_id: domainId as string,
  });
  if (error) {
    const status = error.code === "42501" ? 403 : 500;
    return { refusal: NextResponse.json({ error: error.message }, { status }) } as const;
  }
  const check = data as unknown as AdminCheck;
  if (!check.ok) {
    const status = check.reason === "plan" ? 402 : check.reason === "missing" ? 404 : 409;
    return { refusal: NextResponse.json({ error: check.detail, reason: check.reason }, { status }) } as const;
  }
  return { check, userId: user.id } as const;
}

async function record(
  orgId: string,
  domainId: string | null,
  host: string,
  status: string,
  state: DomainState | null,
  errorText: string | null,
  actor: string,
) {
  const verification = state
    ? { records: state.records, vercel_verified: state.verified, misconfigured: state.misconfigured, on_project: state.onProject }
    : null;
  const { data, error } = await createAdminClient().schema("iam").rpc("org_domain_record", {
    p_organization_id: orgId,
    p_domain_id: domainId as string,
    p_host: host,
    p_status: status,
    p_verification: verification as unknown as Json,
    p_error: errorText as string,
    p_actor: actor,
  });
  if (error) throw new Error(`Saving the domain failed: ${error.message}`);
  forgetDomain(host);
  return data as unknown as { ok: boolean; domain_id: string | null };
}

function vercelMissing() {
  return NextResponse.json({ error: "Custom domains are not set up on this server." }, { status: 503 });
}

function failure(thrown: unknown) {
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  console.error("[organizations/domains]", message);
  return NextResponse.json({ error: message }, { status: thrown instanceof VercelUnavailable ? 502 : 500 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string; host?: string; domain_id?: string };
  if (body.action !== "purge" && !isVercelConfigured()) return vercelMissing();
  if (body.action !== "add" && body.action !== "check" && body.action !== "purge") {
    return NextResponse.json({ error: "action is add, check or purge." }, { status: 400 });
  }
  const who = await adminCheck(orgId, body.action === "purge" ? "check" : body.action, body.host ?? null, body.domain_id ?? null);
  if ("refusal" in who) return who.refusal;
  const host = who.check.host as string;
  if (body.action === "purge") {
    // A route write changes what the host serves: this instance stops serving the old routes now;
    // other instances follow within the lookup cache's hit TTL.
    forgetDomain(host);
    return NextResponse.json({ ok: true, host });
  }
  try {
    if (body.action === "add") {
      const state = await addDomain(host);
      const saved = await record(orgId, null, host, statusFor(state), state, null, who.userId);
      return NextResponse.json({ domain_id: saved.domain_id, host, status: statusFor(state), records: state.records });
    }
    const domainId = who.check.domain_id as string;
    let state: DomainState;
    try {
      state = await checkDomain(host);
    } catch (thrown) {
      // Vercel unreachable: say so on the row, keep its status, answer the failure.
      await record(orgId, domainId, host, "verifying", null, thrown instanceof Error ? thrown.message : String(thrown), who.userId);
      throw thrown;
    }
    const status = statusFor(state);
    await record(orgId, domainId, host, status, state, state.onProject ? null : "Vercel no longer has this domain.", who.userId);
    return NextResponse.json({ domain_id: domainId, host, status, records: state.records });
  } catch (thrown) {
    return failure(thrown);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  if (!isVercelConfigured()) return vercelMissing();
  const { orgId } = await params;
  const domainId = request.nextUrl.searchParams.get("domain_id");
  if (!domainId || !isUuidShape(domainId)) {
    return NextResponse.json({ error: "Name the domain." }, { status: 400 });
  }
  const who = await adminCheck(orgId, "remove", null, domainId);
  if ("refusal" in who) return who.refusal;
  const host = who.check.host as string;
  try {
    await removeDomain(host);
    await record(orgId, domainId, host, "removed", null, null, who.userId);
    return NextResponse.json({ ok: true, host });
  } catch (thrown) {
    return failure(thrown);
  }
}
