// A person's activity timeline — the client half of admin.user_activity (migration
// 20261018130100_admin_user_activity.sql, users one-roof lane T). One keyset page per call across 12
// sources (admin + org-admin actions, support sessions, sign-ins, account closure, conversations,
// runs, feedback, notifications, texts, billing, errors); a source that fails comes back in
// `sources` with its error instead of failing the page. `next_before` is INCLUSIVE (rows at or before
// it); when more rows than a page share one instant, `next_before_key` pages through that instant by
// key (migration 20261018171000), so no row is ever dropped. `appendActivityPage` drops any repeat by key.
//
// Doors: the SQL returns {type,id,user_id?,href?}; `activityRecordHref` maps each type to its ONE
// canonical address (no route strings in SQL). Rows show titles and statuses only, never content
// bodies (owner ruling 2026-10-18; migration 20261018140000). Types with no record page yet
// (background agent jobs, text threads, raw app_log rows without a conversation) return null.

import { createClient } from "@/utils/supabase/client";
import { isJsonObject } from "@/types/json";
import type { Json } from "@/types/database.types";
import { conversationHref } from "@/features/hindsight/subject-doors";
import { feedbackHref } from "@/features/admin/feedback/doors";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { adminOrganizationHref } from "./UserOrganizationsTab";
import { isVisibleUserTab, userRecordHref } from "./userSurfaces";

export const ACTIVITY_KINDS = [
  "admin",
  "org_admin",
  "support",
  "sign_in",
  "account",
  "conversation",
  "run",
  "feedback",
  "notification",
  "sms",
  "billing",
  "error",
  "contact",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  admin: "Admin",
  org_admin: "Org admin",
  support: "Support",
  sign_in: "Live sessions",
  account: "Account",
  conversation: "Conversations",
  run: "Runs",
  feedback: "Feedback",
  notification: "Notifications",
  sms: "Texts",
  billing: "Billing",
  error: "Errors",
  contact: "Messages",
};

export function isActivityKind(value: string): value is ActivityKind {
  return (ACTIVITY_KINDS as readonly string[]).includes(value);
}

export interface ActivityRecord {
  type: string;
  id: string | null;
  user_id: string | null;
  href: string | null;
}

export interface ActivityItem {
  key: string;
  at: string;
  kind: string;
  title: string;
  detail: string | null;
  actor_id: string | null;
  record: ActivityRecord | null;
}

export interface ActivitySource {
  kind: string;
  ok: boolean;
  error: string | null;
}

export interface ActivityPage {
  items: ActivityItem[];
  next_before: string | null;
  /** With next_before, the composite cursor: set only when one instant spans pages (rows after this key). */
  next_before_key: string | null;
  sources: ActivitySource[];
}

const str = (v: Json | undefined): string | null => (typeof v === "string" && v !== "" ? v : null);

function parseRecord(v: Json | undefined): ActivityRecord | null {
  if (!isJsonObject(v) || typeof v.type !== "string") return null;
  return { type: v.type, id: str(v.id), user_id: str(v.user_id), href: str(v.href) };
}

/** The RPC's jsonb, checked field by field (a malformed row is dropped, never guessed). */
export function parseActivityPage(json: Json): ActivityPage {
  if (!isJsonObject(json)) throw new Error("admin.user_activity returned no page");
  const items: ActivityItem[] = [];
  for (const raw of Array.isArray(json.items) ? json.items : []) {
    if (!isJsonObject(raw)) continue;
    const key = str(raw.key);
    const at = str(raw.at);
    const kind = str(raw.kind);
    if (!key || !at || !kind) continue;
    items.push({
      key,
      at,
      kind,
      title: str(raw.title) ?? kind,
      detail: str(raw.detail),
      actor_id: str(raw.actor_id),
      record: parseRecord(raw.record),
    });
  }
  const sources: ActivitySource[] = [];
  for (const raw of Array.isArray(json.sources) ? json.sources : []) {
    if (!isJsonObject(raw) || typeof raw.kind !== "string") continue;
    sources.push({ kind: raw.kind, ok: raw.ok === true, error: str(raw.error) });
  }
  return { items, next_before: str(json.next_before), next_before_key: str(json.next_before_key), sources };
}

export async function fetchActivityPage(
  userId: string,
  before: string | null,
  kinds: readonly ActivityKind[] | null,
  limit = 50,
  beforeKey: string | null = null,
): Promise<ActivityPage> {
  const { data, error } = await createClient()
    .schema("admin")
    .rpc("user_activity", {
      p_user: userId,
      ...(before ? { p_before: before } : {}),
      ...(before && beforeKey ? { p_before_key: beforeKey } : {}),
      ...(kinds ? { p_kinds: [...kinds] } : {}),
      p_limit: limit,
    });
  if (error) throw error;
  return parseActivityPage(data);
}

/**
 * Next page onto the loaded ones: repeats (same key) are dropped. A source that failed on ANY loaded
 * page stays reported, because the rows it missed on that page are still missing.
 */
export function appendActivityPage(loaded: ActivityPage, next: ActivityPage): ActivityPage {
  const seen = new Set(loaded.items.map((i) => i.key));
  const all = [...loaded.sources, ...next.sources];
  const failed = new Map<string, ActivitySource>();
  for (const s of all) if (!s.ok) failed.set(s.kind, s);
  const kinds = [...new Set(all.map((s) => s.kind))];
  return {
    items: [...loaded.items, ...next.items.filter((i) => !seen.has(i.key))],
    next_before: next.next_before,
    next_before_key: next.next_before_key,
    sources: kinds.map((kind) => failed.get(kind) ?? { kind, ok: true, error: null }),
  };
}

export interface ActivityDay {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  label: string;
  items: ActivityItem[];
}

function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Newest-first items grouped by local calendar day: Today, Yesterday, then the date. */
export function groupActivityByDay(items: readonly ActivityItem[], now: Date = new Date()): ActivityDay[] {
  const today = localDay(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = localDay(y);
  const days: ActivityDay[] = [];
  for (const item of items) {
    const at = new Date(item.at);
    const day = localDay(at);
    let group = days[days.length - 1];
    if (!group || group.day !== day) {
      const label =
        day === today
          ? "Today"
          : day === yesterday
            ? "Yesterday"
            : at.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                ...(at.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
              });
      group = { day, label, items: [] };
      days.push(group);
    }
    group.items.push(item);
  }
  return days;
}

/** The ONE door for an activity row's record, or null when that record has no page. */
export function activityRecordHref(record: ActivityRecord | null, personId: string): string | null {
  if (!record) return null;
  const id = record.id;
  switch (record.type) {
    case "admin_history":
      return userRecordHref(record.user_id ?? personId, "history");
    case "user":
      return id ? userRecordHref(id) : null;
    case "organization":
      return id ? adminOrganizationHref(id) : null;
    case "support_session":
      return userRecordHref(record.user_id ?? personId, "support");
    case "conversation":
      return id ? conversationHref(id, "admin") : null;
    case "workflow_run":
      return id ? runHref(id) : null;
    case "feedback":
      return id ? feedbackHref(id) : null;
    case "notification":
      return record.href && record.href.startsWith("/") ? record.href : null;
    case "auth_session":
      // A live sign-in session is listed on the person's Security tab (once that tab is built).
      return isVisibleUserTab("security") ? userRecordHref(personId, "security") : null;
    case "billing":
    case "coupon":
    case "free_period_grant":
    case "usage_reset":
    case "user_plan":
      return userRecordHref(record.user_id ?? personId, "billing");
    default:
      return null;
  }
}
