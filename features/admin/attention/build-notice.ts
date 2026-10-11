/**
 * The one sentence the dock says — the PURE half of `AdminAttentionDock`.
 *
 * Pure so the negative case is provable without mutating live schedules or
 * waiting for a provider to fall over: no live items yields `null`, and `null`
 * renders nothing. A dock that says "all clear" on every page is wallpaper,
 * and wallpaper is how the next alarm gets missed.
 */

import { asCardItem, FALLBACK_CARD_BUDGET, type AttentionTriage } from "./triage";
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
  /**
   * Triaged: every live item NOT on the card that agents are fixing or preparing (agent_fix,
   * not ready, over budget). Shown as one muted line — never added to the pill.
   */
  preparedByAgents: number;
}

/**
 * The triage the card applies. `undefined`: none (the review page and old callers — every live
 * item). An `AttentionTriage`: only its on-card owner decisions, at most its budget.
 * `"unavailable"`: the triage read failed — the first FALLBACK_CARD_BUDGET items, never the list.
 */
export type NoticeTriage = AttentionTriage | "unavailable" | undefined;

/**
 * Narrow every source to the card: on-card verdicts only, prepared sentence + recommended action
 * applied, the whole card capped at the budget. A source with `counted: false` (Spend today) is a
 * fact, not an alarm: kept only when it is critical — or when the card has a decision anyway.
 */
function triageSources(
  sources: readonly AttentionSourceState[],
  triage: AttentionTriage | "unavailable",
  localMutes: Record<string, number>,
  now: number,
): { sources: AttentionSourceState[]; preparedByAgents: number } {
  const budget = triage === "unavailable" ? FALLBACK_CARD_BUDGET : triage.budget;
  let room = budget;
  let overflow = 0;
  const narrowed: AttentionSourceState[] = [];
  // Rank order across sources: the database's card_rank; fallback: severity, then source order.
  const candidates: Array<{ source: AttentionSourceState; item: AttentionItem; rank: number }> = [];
  sources.forEach((source, sourceIndex) => {
    if (source.counted === false) return;
    const { live } = partitionItems(source.items, localMutes, now);
    live.forEach((item, i) => {
      if (triage === "unavailable") {
        candidates.push({ source, item, rank: RANK[item.severity] * 10_000 + sourceIndex * 1_000 + i });
        return;
      }
      const verdict = triage.verdicts.get(item.key);
      if (verdict?.routedTo !== "owner_card") return;
      candidates.push({ source, item: asCardItem(item, verdict), rank: verdict.cardRank ?? 9_999 });
    });
  });
  candidates.sort((a, b) => a.rank - b.rank);
  const onCard = new Map<string, AttentionItem[]>();
  for (const c of candidates) {
    if (room <= 0) {
      overflow += 1;
      continue;
    }
    room -= 1;
    onCard.set(c.source.id, [...(onCard.get(c.source.id) ?? []), c.item]);
  }
  const hasDecision = candidates.length > 0;
  for (const source of sources) {
    if (source.counted === false) {
      const { live } = partitionItems(source.items, localMutes, now);
      const facts = live.filter((i) => hasDecision || i.severity === "critical");
      narrowed.push({ ...source, items: facts });
      continue;
    }
    // One "being prepared by agents" line for the whole card replaces each source's own line.
    narrowed.push({ ...source, items: onCard.get(source.id) ?? [], delegated: null });
  }
  const preparedByAgents =
    triage === "unavailable"
      ? overflow
      : triage.preparedByAgents + overflow;
  return { sources: narrowed, preparedByAgents };
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
  allSources: readonly AttentionSourceState[],
  localMutes: Record<string, number>,
  now: number = Date.now(),
  triage: NoticeTriage = undefined,
): AttentionNotice | null {
  const triaged = triage === undefined ? null : triageSources(allSources, triage, localMutes, now);
  const sources = triaged ? triaged.sources : allSources;
  const sections: AttentionNotice["sections"] = [];
  const summaries: string[] = [];
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const source of sources) {
    const { live } = partitionItems(source.items, localMutes, now);
    // A source with nothing live for the owner still carries its "N being fixed by agents" line.
    if (live.length === 0 && !source.delegated?.count) continue;
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
    const summary = ordered.length > 0 ? source.summarize(ordered) : null;
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
    preparedByAgents: triaged?.preparedByAgents ?? 0,
  };
}
