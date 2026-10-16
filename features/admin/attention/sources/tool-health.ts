/**
 * Switched-off Tool sources as attention items — the PURE half of the source.
 *
 * THE RULE THIS EXISTS FOR (third-party services R-10, Arman 2026-10-16): every Tool is easy to control
 * from admin, and when a source gives multiple unexpected errors it switches itself off and STAYS off
 * until a person or an agent verifies it. The breaker (database function tool.breaker_note_attempt)
 * opens one `ops.system_error` row per switched-off source; the database read
 * (`tool.control_for_attention`) returns those open rows in our words, and the row closes itself the
 * moment a verification run passes. Sources are repaired by agents by default; an account out of credit
 * or refused its key reaches the owner.
 *
 * It is one item per source: never a modal, never repeated while the source stays off.
 */

import type { AttentionItem } from "../types";

export const TOOL_HEALTH_SOURCE_ID = "tool-health";
export const TOOL_HEALTH_SOURCE_LABEL = "Tools";
export const TOOL_CONTROL_HREF = "/administration/agents/tool-control";

export interface ToolHealthRow {
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

export interface ToolHealthDeps {
  muteLocally: (key: string, ms: number) => void;
  unmuteLocally: (key: string) => void;
  now?: number;
}

function stateOf(row: ToolHealthRow): string {
  if (row.kind === "account_off") return "account switched off";
  if (row.kind === "tool_off") return "off — no working source";
  if (row.kind === "breaker_failed") return "guard could not run";
  return "one source switched off";
}

export function toolHealthItems(rows: readonly ToolHealthRow[], deps: ToolHealthDeps): AttentionItem[] {
  const now = deps.now ?? Date.now();
  return rows.map((row) => {
    const key = row.item_key;
    const href = row.record_href ?? TOOL_CONTROL_HREF;
    return {
      key,
      sourceId: TOOL_HEALTH_SOURCE_ID,
      id: key.slice(TOOL_HEALTH_SOURCE_ID.length + 1),
      severity: row.severity === "critical" ? "critical" : "warning",
      title: row.title,
      state: stateOf(row),
      sentence: row.sentence,
      about: null,
      fix: row.detail,
      record: null,
      doors: [{ kind: "control", href, label: "Tool control", what: "State, recent calls and the Verify button for this source." }],
      impactDeclared: null,
      actions: [],
      copy: {
        label: "Tool health",
        human: () => `${row.title}: ${row.sentence}${row.detail ? `\n${row.detail}` : ""}`,
        agent: () => ({
          kind: "tool-health",
          location: href,
          description: "One Tool source (or vendor account) the breaker switched off, with the numbers that tripped it.",
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

export function summarizeToolHealth(items: readonly AttentionItem[]): string | null {
  if (items.length === 0) return null;
  if (items.length === 1) return `${items[0].title}: ${items[0].state}.`;
  return `${items.length} Tool sources are switched off.`;
}
