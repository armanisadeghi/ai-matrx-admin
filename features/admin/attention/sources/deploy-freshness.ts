/**
 * Deploy freshness as attention items — the PURE half of the source.
 *
 * THE DEFECT THIS EXISTS FOR (2026-10-13). files.matrxserver.com ran a four-day-old
 * build while thirteen newer releases refused to install, and pasted images failed to
 * upload on every page. The Ship Manager knew (its fleet check said "warning") but that
 * warning reached nobody: its mirror into the database had been skipping every sweep
 * since 2026-08-23 for one missing setting.
 *
 * The database read (`platform.deploy_freshness_for_attention`) returns every service
 * the Manager reports behind its release or unhealthy, plus "the deploy watch has gone
 * quiet" when its heartbeat is older than 30 minutes. Both route to agents by default;
 * an item reaches this card only when the triage escalates it to the owner.
 */

import { humanizeRelative } from "@/features/scheduling/utils/triggerHumanize";
import type { AttentionItem } from "../types";

export const DEPLOY_FRESHNESS_SOURCE_ID = "deploy-freshness";
export const DEPLOY_FRESHNESS_SOURCE_LABEL = "Deploys";
export const FLEET_HEALTH_HREF = "https://manager.dev.codematrx.com/admin/fleet-health";

export interface DeployFreshnessRow {
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

export interface DeployFreshnessDeps {
  muteLocally: (key: string, ms: number) => void;
  unmuteLocally: (key: string) => void;
  now?: number;
}

function stateOf(row: DeployFreshnessRow): string {
  if (row.kind === "watch_silent") return row.last_seen_at ? `quiet since ${humanizeRelative(row.last_seen_at)}` : "never reported";
  if (row.kind === "behind") return "behind its release";
  return "unhealthy";
}

export function deployFreshnessItems(rows: readonly DeployFreshnessRow[], deps: DeployFreshnessDeps): AttentionItem[] {
  const now = deps.now ?? Date.now();
  return rows.map((row) => {
    const key = row.item_key;
    const href = row.record_href ?? FLEET_HEALTH_HREF;
    return {
      key,
      sourceId: DEPLOY_FRESHNESS_SOURCE_ID,
      id: key.slice(DEPLOY_FRESHNESS_SOURCE_ID.length + 1),
      severity: row.severity === "critical" ? "critical" : "warning",
      title: row.title,
      state: stateOf(row),
      sentence: row.sentence,
      about: null,
      fix: row.detail,
      record: null,
      doors: [{ kind: "evidence", href, label: "Fleet health", what: "The Ship Manager's live check of every deployed service." }],
      impactDeclared: null,
      actions: [],
      copy: {
        label: "Deploy freshness",
        human: () => `${row.title}: ${row.sentence}${row.detail ? `\n${row.detail}` : ""}`,
        agent: () => ({
          kind: "deploy-freshness",
          location: href,
          description: "One deployed service the Ship Manager reports behind its latest release or unhealthy, with the reason it gave.",
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

export function summarizeDeployFreshness(items: readonly AttentionItem[]): string | null {
  if (items.length === 0) return null;
  if (items.length === 1) return `${items[0].title} is not running its latest release.`;
  return `${items.length} services are not running their latest release.`;
}
