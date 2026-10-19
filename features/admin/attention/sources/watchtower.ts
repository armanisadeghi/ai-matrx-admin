/**
 * Watchtower alarms as attention items — the PURE half of the source.
 *
 * A feature that fails its canary N rounds in a row, or whose success rate fell under its 7-day baseline, is one item here
 * (`tool.watchtower_for_attention`); the daily health note is one `info` item. Agents fix the alarms by default
 * (`platform.attention_audience_rule` source 'watchtower'); the note is information only. Never a modal, never a text.
 */

import type { AttentionItem } from "../types";

export const WATCHTOWER_SOURCE_ID = "watchtower";
export const WATCHTOWER_SOURCE_LABEL = "Features";
export const WATCHTOWER_HREF = "/administration/agents/watchtower";

export interface WatchtowerRow {
  item_key: string;
  kind: string;
  severity: string;
  title: string;
  sentence: string;
  detail: string | null;
  record_href: string | null;
  last_seen_at: string | null;
  facts: unknown;
}

export interface WatchtowerDeps {
  muteLocally: (key: string, ms: number) => void;
  unmuteLocally: (key: string) => void;
  now?: number;
}

function stateOf(row: WatchtowerRow): string {
  if (row.kind === "failing") return "failing its checks";
  if (row.kind === "degraded") return "working worse than last week";
  return "daily note";
}

export function watchtowerItems(rows: readonly WatchtowerRow[], deps: WatchtowerDeps): AttentionItem[] {
  const now = deps.now ?? Date.now();
  return rows.map((row) => {
    const key = row.item_key;
    const href = row.record_href ?? WATCHTOWER_HREF;
    return {
      key,
      sourceId: WATCHTOWER_SOURCE_ID,
      id: key.slice(WATCHTOWER_SOURCE_ID.length + 1),
      severity: row.severity === "critical" ? "critical" : row.severity === "info" ? "info" : "warning",
      title: row.title,
      state: stateOf(row),
      sentence: row.sentence,
      about: null,
      fix: row.detail,
      record: null,
      doors: [{ kind: "evidence", href, label: row.kind === "daily_note" ? "Watchtower" : "Its last checks", what: "Each check that ran, its result, seconds and points." }],
      impactDeclared: null,
      actions: [],
      copy: {
        label: "Watchtower",
        human: () => `${row.title}: ${row.sentence}${row.detail ? `\n${row.detail}` : ""}`,
        agent: () => ({
          kind: "watchtower",
          location: href,
          description: "One paid feature's canary alarm, or the daily health note, with the numbers that raised it.",
          attributes: { item_key: row.item_key, kind: row.kind, severity: row.severity },
          data: row,
        }),
      },
      mute: {
        scope: "local",
        current: null,
        apply: async (untilMs) => {
          deps.muteLocally(key, Math.max(0, untilMs - now));
        },
        clear: async () => {
          deps.unmuteLocally(key);
        },
      },
    };
  });
}

export function summarizeWatchtower(items: readonly AttentionItem[]): string | null {
  const alarms = items.filter((i) => i.severity !== "info");
  if (alarms.length === 0) return items.length ? items[0].sentence : null;
  if (alarms.length === 1) return `${alarms[0].title}: ${alarms[0].state}.`;
  return `${alarms.length} features are failing their checks.`;
}
