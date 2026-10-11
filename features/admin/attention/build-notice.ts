/**
 * The one sentence the dock says — the PURE half of `AdminAttentionDock`.
 *
 * Pure so the negative case is provable without mutating live schedules or
 * waiting for a provider to fall over: no live items yields `null`, and `null`
 * renders nothing. A dock that says "all clear" on every page is wallpaper,
 * and wallpaper is how the next alarm gets missed.
 */

import type { AttentionItem, AttentionSeverity, AttentionSourceState } from "./types";

/**
 * The most rows one source shows on the floating card. Worst first, so the cap cuts info and
 * warnings before anything critical; the rest is one "+N more" door to the source's review page.
 * The counts (title, pill) are never capped — the cap shortens the card, not the truth.
 */
export const SECTION_LIMIT = 8;

const RANK: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };

export interface AttentionNotice {
  /** `destructive` while any live item is critical; `warning` otherwise. */
  tone: "destructive" | "warning";
  severity: AttentionSeverity;
  /** The headline — every source's summary, joined. */
  title: string;
  /** The collapsed pill: "3 things need a person" (· "2 to know" when info rows are live). */
  pill: string;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  /**
   * Live (un-muted) items per source, worst first, in source order — at most `SECTION_LIMIT`
   * shown; `hidden` live rows wait behind the source's review door.
   */
  sections: Array<{ source: AttentionSourceState; items: AttentionItem[]; hidden: number }>;
}

function isLive(item: AttentionItem, localMutes: Record<string, number>, now: number): boolean {
  // An unmutable item is always live — no server or local mute can hide it.
  if (item.mute === null) return true;
  const server = item.mute.current?.until;
  if (server && new Date(server).getTime() > now) return false;
  const local = localMutes[item.key];
  if (typeof local === "number" && local > now) return false;
  return true;
}

/**
 * Split every source's items into live and muted. Muted rows are not dropped —
 * the review page lists them with their reason and an un-mute — but they never
 * reach the dock.
 */
export function partitionItems(
  items: readonly AttentionItem[],
  localMutes: Record<string, number>,
  now: number = Date.now(),
): { live: AttentionItem[]; muted: AttentionItem[] } {
  const live: AttentionItem[] = [];
  const muted: AttentionItem[] = [];
  for (const item of items) (isLive(item, localMutes, now) ? live : muted).push(item);
  return { live, muted };
}

export function buildAttentionNotice(
  sources: readonly AttentionSourceState[],
  localMutes: Record<string, number>,
  now: number = Date.now(),
): AttentionNotice | null {
  const sections: AttentionNotice["sections"] = [];
  const summaries: string[] = [];
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const source of sources) {
    const { live } = partitionItems(source.items, localMutes, now);
    if (live.length === 0) continue;
    // Stable sort: within a severity the source's own order (its newest/worst first) holds.
    const ordered = [...live].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
    for (const i of ordered) {
      if (source.counted === false && i.severity !== "critical") continue;
      if (i.severity === "critical") criticalCount += 1;
      else if (i.severity === "warning") warningCount += 1;
      else infoCount += 1;
    }
    sections.push({
      source,
      items: ordered.slice(0, SECTION_LIMIT),
      hidden: Math.max(0, ordered.length - SECTION_LIMIT),
    });
    const summary = source.summarize(ordered);
    if (summary) summaries.push(summary);
  }

  const total = criticalCount + warningCount;
  if (total + infoCount === 0) return null;

  const needs = `${total} ${total === 1 ? "thing needs" : "things need"} a person`;
  const toKnow = `${infoCount} ${infoCount === 1 ? "thing" : "things"} to know`;
  const pill = total === 0 ? toKnow : infoCount > 0 ? `${needs} · ${infoCount} to know` : needs;

  return {
    tone: criticalCount > 0 ? "destructive" : "warning",
    severity: criticalCount > 0 ? "critical" : total > 0 ? "warning" : "info",
    title: summaries.length > 0 ? summaries.join(" ") : `${total === 0 ? toKnow : needs}.`,
    pill,
    criticalCount,
    warningCount,
    infoCount,
    sections,
  };
}
