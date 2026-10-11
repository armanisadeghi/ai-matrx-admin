// features/notifications/loud/targetVerbs.ts
//
// What a loud notice can DO beyond Open / Done / Remind me later depends on what it is about.
// One adapter per `target_kind`; a notice with no adapter gets the generic verbs only. A new
// loud producer adds its adapter here, never its own panel.

import { setSpendAlarmStatus } from "@/features/admin/spend-alarms/spendAlarms";
import type { LoudNotice } from "./loudNotices";

export interface LoudTargetVerbs {
  /** Words of the "this happened" line under the title (the notice body when absent). */
  detail?: (n: LoudNotice) => string | null;
  /** Short facts after the severity word: cost, what to do, repeat count. */
  facts?: (n: LoudNotice) => string[];
  /** Resolve the target for everyone (with an optional note). Hides the notice for every recipient. */
  resolve?: { label: string; title: string; run: (n: LoudNotice, note: string) => Promise<void> };
  /** Quiet the target for everyone. */
  snooze?: { label: string; title: string; run: (n: LoudNotice) => Promise<void> };
  /** What "Copy for AI" hands an agent. */
  agentCopy?: (n: LoudNotice) => { kind: string; data: Record<string, unknown> };
}

function alarmOf(n: LoudNotice): Record<string, unknown> {
  const a = n.payload.alarm;
  return a !== null && typeof a === "object" && !Array.isArray(a) ? (a as Record<string, unknown>) : {};
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export const SPEND_ALARM_VERBS: LoudTargetVerbs = {
  detail: (n) => text(alarmOf(n).detail) ?? n.body,
  facts: (n) => {
    const a = alarmOf(n);
    const count = typeof a.count === "number" ? a.count : Number(a.count ?? 1);
    return [text(a.cost), count > 1 ? `x${count}` : null, text(a.fix)].filter((s): s is string => !!s);
  },
  resolve: {
    label: "Resolve",
    title: "Resolve for every super admin; it reopens if it happens again",
    run: async (n, note) => {
      if (n.target_id) await setSpendAlarmStatus(n.target_id, "resolved", { note });
    },
  },
  snooze: {
    label: "Snooze 24h",
    title: "Quiet this alarm for 24 hours, for everyone",
    run: async (n) => {
      if (n.target_id) await setSpendAlarmStatus(n.target_id, "snoozed", { snoozeHours: 24 });
    },
  },
  agentCopy: (n) => {
    const a = alarmOf(n);
    return {
      kind: "spend-alarm",
      data: {
        record_id: n.target_id,
        record_page: n.deep_link,
        kind: a.kind ?? null,
        level: n.severity,
        title: n.subject,
        what_happened: a.detail ?? n.body,
        fix: a.fix ?? null,
        count: a.count ?? 1,
        last_seen_at: a.last_seen_at ?? n.updated_at,
      },
    };
  },
};

/** target_kind → its verbs. */
export const LOUD_TARGET_VERBS: Readonly<Record<string, LoudTargetVerbs>> = {
  spend_alarm: SPEND_ALARM_VERBS,
};

export function verbsFor(n: Pick<LoudNotice, "target_kind">): LoudTargetVerbs {
  return (n.target_kind && LOUD_TARGET_VERBS[n.target_kind]) || {};
}
