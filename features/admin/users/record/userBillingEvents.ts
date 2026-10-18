// A person's billing history — the client half of admin.user_billing_events (users one-roof lane Q, S16;
// migration 20261018171000). THE one read: the Billing tab's table and the Activity tab's "Billing"
// source (admin._user_activity_billing) both come from it, so they never disagree on what happened.
// Members: free-month grants, coupon redemptions, coupons sent / revoked, usage resets, plan changes.
// Each row carries its record (type + id); `billingEventHref` is its door.

import { createClient } from "@/utils/supabase/client";
import { userRecordHref } from "./userSurfaces";

export type BillingEventKind = "grant" | "redemption" | "coupon" | "reset" | "plan";
export type BillingRecordType = "free_period_grant" | "coupon" | "usage_reset" | "admin_history" | "user_plan";

export interface UserBillingEvent {
  /** Stable row key, e.g. `grant:<id>`. */
  key: string;
  at: string;
  kind: BillingEventKind;
  title: string;
  detail: string | null;
  note: string | null;
  actorId: string | null;
  recordType: BillingRecordType;
  recordId: string;
}

const COUPONS_PATH = "/administration/users/coupons";

/**
 * The door for a billing row. Coupons have no record page yet, so a coupon opens the coupons hub;
 * a plan change opens the person's Admin history; grants, resets and the current plan stay on Billing.
 */
export function billingEventHref(e: Pick<UserBillingEvent, "recordType">, personId: string): string {
  switch (e.recordType) {
    case "coupon":
      return COUPONS_PATH;
    case "admin_history":
      return userRecordHref(personId, "history");
    default:
      return userRecordHref(personId, "billing");
  }
}

export async function fetchUserBillingEvents(userId: string, limit = 200): Promise<UserBillingEvent[]> {
  const { data, error } = await createClient()
    .schema("admin")
    .rpc("user_billing_events", { p_user: userId, p_limit: limit });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    key: r.key,
    at: r.at,
    kind: r.kind as BillingEventKind,
    title: r.title,
    detail: r.detail,
    note: r.note,
    actorId: r.actor_id,
    recordType: r.record_type as BillingRecordType,
    recordId: r.record_id,
  }));
}
