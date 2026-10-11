// features/notifications/loud/loudNotices.ts
//
// THE LOUD NOTICE (2026-10-10): an in-app notice whose event declares `loud_severity`
// (aidream `NotificationEventDeclaration.loud_severity` → `config.loud`) is stamped
// `metadata.loud = { severity }` by `notify()`. It is still an ordinary row of
// `communication.notification` (it sits in the bell and the inbox like every notice); the loud
// part is that the notification centre OPENS it at sign-in, in its severity's colours, until the
// person handles it (Done, or the target's own verbs — a spend alarm's Resolve / Snooze).
// "Remind me later" hides it for this browser session only; a bump (the producer refreshing the
// notice) brings it back.
//
// Read through ONE door, `communication.my_loud_notices()` (own rows, not Done, not snoozed).

import { createClient } from "@/utils/supabase/client";
import { pgErrorToError } from "@ai-matrx/data";

export type LoudSeverity = "critical" | "warning" | "info";
export const LOUD_SEVERITIES: readonly LoudSeverity[] = ["critical", "warning", "info"];

export interface LoudNotice {
  id: string;
  event_key: string;
  severity: LoudSeverity;
  subject: string | null;
  body: string | null;
  deep_link: string | null;
  target_kind: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  read_at: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** One row of the door, checked field by field (the door is not in the generated types yet). */
export function toLoudNotice(raw: unknown): LoudNotice | null {
  const r = asRecord(raw);
  const id = str(r.id);
  if (!id) return null;
  return {
    id,
    event_key: str(r.event_key) ?? "",
    severity: LOUD_SEVERITIES.find((s) => s === r.severity) ?? "warning",
    subject: str(r.subject),
    body: str(r.body),
    deep_link: str(r.deep_link),
    target_kind: str(r.target_kind),
    target_id: str(r.target_id),
    payload: asRecord(r.payload),
    created_at: str(r.created_at) ?? "",
    updated_at: str(r.updated_at) ?? str(r.created_at) ?? "",
    read_at: str(r.read_at),
  };
}

export async function fetchLoudNotices(): Promise<LoudNotice[]> {
  const { data, error } = (await createClient()
    .schema("communication")
    .rpc("my_loud_notices" as never, { p_limit: 50 } as never)) as { data: unknown; error: Parameters<typeof pgErrorToError>[0] | null };
  if (error) throw pgErrorToError(error);
  return (Array.isArray(data) ? data : []).map(toLoudNotice).filter((n): n is LoudNotice => n !== null);
}

/** Critical first, then warning, then info; most recently refreshed first within a level. */
export function sortLoudNotices(notices: readonly LoudNotice[]): LoudNotice[] {
  return [...notices].sort((x, y) => {
    if (x.severity !== y.severity) return LOUD_SEVERITIES.indexOf(x.severity) - LOUD_SEVERITIES.indexOf(y.severity);
    return y.updated_at.localeCompare(x.updated_at);
  });
}

export function countBySeverity(notices: readonly LoudNotice[]): Record<LoudSeverity, number> {
  const out: Record<LoudSeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const n of notices) out[n.severity] += 1;
  return out;
}

/** The key "Remind me later" hides: a refreshed notice (new `updated_at`) asks again. */
export const laterKey = (n: Pick<LoudNotice, "id" | "updated_at">) => `${n.id}@${n.updated_at}`;

const LATER_KEY = "matrx:loudNoticesLater";

/** Keys hidden for this browser session by this person; storage trouble reads as none. */
export function readLater(userId: string): string[] {
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(LATER_KEY) ?? "null") as { userId?: string; keys?: unknown } | null;
    return raw && raw.userId === userId && Array.isArray(raw.keys) ? raw.keys.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function writeLater(userId: string, keys: string[]): void {
  try {
    window.sessionStorage.setItem(LATER_KEY, JSON.stringify({ userId, keys }));
  } catch {
    /* private mode / quota: the hide still holds in memory for this page */
  }
}
