/**
 * The local dev server running packages older than disk, as an attention item — the PURE half.
 *
 * THE DEFECT THIS EXISTS FOR (Arman, 2026-10-14): "we catch these types of errors related to
 * our own packages getting stale at the top … for a system admin like me, show me what is going
 * on." A stale dev server surfaces as random errors in whatever page is open; this row says the
 * real cause once, so nobody chases them. Development only; contract in
 * `lib/dev-server/server-freshness.ts`. The preview watchdog restarts the server by itself, so
 * the row normally lives under a minute; past STUCK_AFTER_MS it turns critical.
 */

import { humanizeRelative } from "@/features/scheduling/utils/triggerHumanize";
import type { DevServerFreshness, PackageMove } from "@/lib/dev-server/server-freshness";
import type { AttentionItem } from "../types";

export const DEV_SERVER_FRESHNESS_SOURCE_ID = "dev-server-freshness";
export const DEV_SERVER_FRESHNESS_SOURCE_LABEL = "Dev server";

/** The watchdog settles 15s, checks every 10s, and boots in about a minute. */
export const STUCK_AFTER_MS = 3 * 60_000;

function describeMove(move: PackageMove): string {
  if (move.booted === null) return `${move.name} ${move.onDisk} (new)`;
  if (move.onDisk === null) return `${move.name} (removed)`;
  return `${move.name} ${move.booted} → ${move.onDisk}`;
}

function sentenceFor(freshness: DevServerFreshness): string {
  const { moved } = freshness;
  if (moved.length === 1 && moved[0].booted !== null) {
    return `It still runs ${moved[0].name} ${moved[0].booted} after ${moved[0].onDisk ?? "a removal"} was installed, so pages may throw errors that are not bugs.`;
  }
  if (moved.length > 0) {
    return `It still runs the code from before ${moved.length} of our packages changed, so pages may throw errors that are not bugs.`;
  }
  return "Packages were reinstalled under it, so pages may throw errors that are not bugs.";
}

export function devServerFreshnessItems(
  freshness: DevServerFreshness | null,
  deps: { muteLocally: (key: string, ms: number) => void; unmuteLocally: (key: string) => void; now?: number },
): AttentionItem[] {
  if (!freshness?.stale) return [];
  const now = deps.now ?? Date.now();
  const since = freshness.installedAt ?? freshness.bootedAt;
  const stuck = now - new Date(since).getTime() >= STUCK_AFTER_MS;
  // One key per install, so a mute of this install never silences the next one.
  const key = `${DEV_SERVER_FRESHNESS_SOURCE_ID}:${since}`;
  return [
    {
      key,
      sourceId: DEV_SERVER_FRESHNESS_SOURCE_ID,
      id: since,
      severity: stuck ? "critical" : "warning",
      title: "Local dev server",
      state: `packages changed ${humanizeRelative(since)}`,
      sentence: sentenceFor(freshness),
      about: null,
      fix: stuck
        ? "It did not restart by itself — ask an agent to restart the preview, then refresh."
        : "It restarts by itself within a minute — refresh after that.",
      record: null,
      doors: [],
      impactDeclared: null,
      actions: [],
      copy: {
        label: "Dev server freshness",
        human: () =>
          [
            `Local dev server: ${sentenceFor(freshness)}`,
            ...freshness.moved.map(describeMove),
            "Restart: pnpm preview:stop && pnpm preview:start",
          ].join("\n"),
        agent: () => ({
          kind: "dev-server-freshness",
          location: "/api/dev/server-freshness",
          description:
            "The local Next dev server is running @ai-matrx packages older than node_modules; errors on the page may be caused by that, not by the page. Restart with pnpm preview:stop && pnpm preview:start.",
          attributes: { moved: freshness.moved.length, stuck },
          data: freshness,
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
    },
  ];
}

export function summarizeDevServerFreshness(items: readonly AttentionItem[]): string | null {
  return items.length > 0 ? "The local dev server is running old package code." : null;
}
