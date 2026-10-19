"use server";

// The two things a client can DO on her own record: change a field the portal
// opened, and say something where the portal allows comments.
//
// 🚨 THE BROWSER NAMES THE SLUG AND THE RECORD, NEVER THE ORGANIZATION. The
// organization id is resolved HERE from `custom.portal_me()` — the door's own
// answer for `auth.uid()` — so a crafted request cannot point a write at an
// organization the caller is not a principal of. It would be refused anyway
// (the door checks, not this file), but handing a door an attacker-supplied
// scope and relying on it to say no is one mistake away from a hole.
//
// A REFUSAL IS CARRIED WHOLE. `custom.record_update` refuses a field the portal
// did not open with its own sentence — "You can see this record, but "Stage" is
// not yours to change." — plus a hint that says what it would take. Both are
// returned to the screen verbatim. Nothing here rewrites them into "Save
// failed", and nothing here swallows one.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PaymentRefusal, readAsk, startCheckout } from "@/features/payments/server";
import { requestHostOrigin } from "@/utils/auth/request-origin";
import { isHers } from "@/features/portals/shown";

import {
  DoorRefusal,
  VERSION_UNREAD_CODE,
  membershipFor,
  portalCommentWrite,
  portalMe,
  portalRecordUpdate,
  portalRecords,
} from "@/features/portals/service";

export interface PortalWriteOutcome {
  ok: boolean;
  /** The door's own sentence when it refused. */
  message?: string;
  /** The door's own hint — what it would take — when it gave one. */
  hint?: string | null;
  /** The record's version after a save landed — the next save is sent against it. */
  version?: number;
  /** A write sent against an older version: somebody else changed it, or the version could not be read. */
  conflict?: "changed" | "unread";
}

function refusalOutcome(error: unknown): PortalWriteOutcome {
  if (error instanceof DoorRefusal) {
    const conflict =
      error.code === "PT409" ? ("changed" as const) : error.code === VERSION_UNREAD_CODE ? ("unread" as const) : undefined;
    return { ok: false, message: error.message, hint: error.hint, ...(conflict ? { conflict } : {}) };
  }
  return {
    ok: false,
    message:
      error instanceof Error
        ? error.message
        : "That did not save, and we do not know why. Nothing was changed.",
    hint: null,
  };
}

async function organizationFor(slug: string): Promise<string | null> {
  const membership = membershipFor(await portalMe(), slug);
  return membership?.organization_id ?? null;
}

/**
 * Change one field on one record, against the version she saw (`version`, read with the record on
 * the page). The door decides whether it may change, and refuses a colleague's change since.
 */
export async function savePortalField(
  slug: string,
  recordId: string,
  key: string,
  value: string,
  version: number | null,
): Promise<PortalWriteOutcome> {
  const organizationId = await organizationFor(slug);
  if (!organizationId) {
    return {
      ok: false,
      message: "You are not signed in to this portal any more. Open your sign-in link again.",
      hint: null,
    };
  }
  let written: number;
  try {
    written = await portalRecordUpdate({ organizationId, recordId, patch: { [key]: value }, expectedVersion: version });
  } catch (error) {
    return refusalOutcome(error);
  }
  revalidatePath(`/portal/c/${slug}/r/${recordId}`);
  revalidatePath(`/portal/c/${slug}`);
  return { ok: true, version: written };
}

/** Say something on one record. The door decides whether comments are open. */
export async function addPortalComment(
  slug: string,
  recordId: string,
  body: string,
): Promise<PortalWriteOutcome> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, message: "Write something first.", hint: null };

  const organizationId = await organizationFor(slug);
  if (!organizationId) {
    return {
      ok: false,
      message: "You are not signed in to this portal any more. Open your sign-in link again.",
      hint: null,
    };
  }
  try {
    await portalCommentWrite({ organizationId, recordId, body: trimmed });
  } catch (error) {
    return refusalOutcome(error);
  }
  revalidatePath(`/portal/c/${slug}/r/${recordId}`);
  return { ok: true };
}

/**
 * PAYMENTS-CONNECT: Pay for one of HER records. Membership and "this record is hers" are asked
 * again here — a bound action is an address anyone can post to — then the server opens Stripe
 * Checkout on the organization's own Stripe account and sends her there.
 */
export async function payPortalRecord(
  slug: string,
  recordId: string,
  _state: { error: string | null },
  _form: FormData,
): Promise<{ error: string | null }> {
  // A refusal is returned as a sentence for the button to show in place (REVIEW-PAYMENTS I6);
  // only the redirect to Stripe leaves this function by throwing.
  let url: string;
  try {
    const membership = membershipFor(await portalMe(), slug);
    if (!membership) return { error: "Sign in to this portal first." };
    let tableId: string | null = null;
    for (const table of membership.tables) {
      const records = await portalRecords({ organizationId: membership.organization_id, tableId: table.table_id });
      if (records.some((r) => r.id === recordId && isHers(r.document, table.names_via, membership.client_record_id))) {
        tableId = table.table_id;
        break;
      }
    }
    if (!tableId) return { error: "That is not on your portal." };
    const ask = await readAsk("table", tableId);
    if (!ask || ask.organization_id !== membership.organization_id) return { error: "This record has nothing to pay." };
    const h = await headers();
    const origin = requestHostOrigin(h) ?? `https://${h.get("host")}`;
    const started = await startCheckout({
      ask,
      recordId,
      origin,
      back: `/portal/c/${encodeURIComponent(slug)}/r/${encodeURIComponent(recordId)}`,
    });
    url = started.url;
  } catch (thrown) {
    if (thrown instanceof PaymentRefusal) return { error: thrown.message };
    console.error("[portal pay]", thrown instanceof Error ? thrown.message : thrown);
    return { error: "Payment could not start. Try again in a moment." };
  }
  redirect(url);
}

