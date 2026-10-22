// app/api/payments/connect/route.ts — an organization connects ITS OWN Stripe account.
//
// A Next route because it talks to Stripe with the platform secret key (a true server-only
// concern). POST creates or resumes the account and answers a Stripe onboarding link; GET
// re-reads the account from Stripe and answers its state; DELETE stops collecting through it.
// Org admins only — decided by `public.is_org_admin` as the signed-in caller. No platform fee
// is ever involved (Arman, 2026-10-17). Plan: common-docs/systems/data/custom-data/PAYMENTS-CONNECT.md

import { NextRequest, NextResponse } from "next/server";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { createClient } from "@/utils/supabase/server";
import { isStripeConfigured } from "@/lib/stripe/server";
import {
  disconnectOrgAccount,
  ensureOrgAccount,
  onboardingLink,
  refreshOrgAccount,
} from "@/features/payments/server";
import { isUuidShape } from "@ai-matrx/kit/uuid";

export const dynamic = "force-dynamic";

async function adminOf(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organization_id") ?? "";
  if (!isUuidShape(organizationId)) {
    return { refusal: NextResponse.json({ error: "Name the organization." }, { status: 400 }) } as const;
  }
  const supabase = await createClient();
  const { data: { user } } = await getClaimsUser(supabase);
  if (!user) return { refusal: NextResponse.json({ error: "Sign in first." }, { status: 401 }) } as const;
  const { data: isAdmin, error } = await supabase.schema("iam").rpc("is_org_admin", { p_org_id: organizationId });
  if (error) return { refusal: NextResponse.json({ error: error.message }, { status: 500 }) } as const;
  if (!isAdmin) {
    return { refusal: NextResponse.json({ error: "Only an admin of this organization can manage payments." }, { status: 403 }) } as const;
  }
  return { organizationId, user } as const;
}

function stripeMissing() {
  return NextResponse.json({ error: "Stripe is not configured on this server." }, { status: 503 });
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) return stripeMissing();
  const who = await adminOf(request);
  if ("refusal" in who) return who.refusal;
  try {
    const accountId = await ensureOrgAccount({
      organizationId: who.organizationId,
      userId: who.user.id,
      email: who.user.email ?? null,
    });
    const back = `${request.nextUrl.origin}/organizations/${who.organizationId}/settings/payments`;
    const url = await onboardingLink(accountId, `${back}?stripe=return`, `${back}?stripe=refresh`);
    return NextResponse.json({ url });
  } catch (thrown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    console.error("[payments/connect] start failed", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  if (!isStripeConfigured()) return stripeMissing();
  const who = await adminOf(request);
  if ("refusal" in who) return who.refusal;
  try {
    const account = await refreshOrgAccount(who.organizationId);
    return NextResponse.json({ account });
  } catch (thrown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    console.error("[payments/connect] refresh failed", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const who = await adminOf(request);
  if ("refusal" in who) return who.refusal;
  try {
    await disconnectOrgAccount(who.organizationId);
    return NextResponse.json({ ok: true });
  } catch (thrown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
