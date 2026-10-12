/**
 * "Spend so far today" as an attention item — the PURE half.
 *
 * It used to be its own centred modal on /administration (DailySpendWindow, once a day, Escape did
 * not close it): a second admin-alert surface. Every admin alert lives on the dock (Arman,
 * 2026-10-10), so the same facts are one row here — today, runs, yesterday, last 7 days, month to
 * date, the biggest spender and the unmeasured cost sources — and nothing else opens on its own.
 * Above the `platform.spend_popover.scare_threshold_usd` knob it is critical; below, information.
 * "Dismiss for today" is a LOCAL mute until local midnight (any mute duration also works).
 */

import { formatCount } from "@ai-matrx/kit/format";
import type { SpendHeadlineSnapshot } from "@/features/admin/spend/types";
import type { AttentionItem } from "../types";

export const SPEND_TODAY_SOURCE_ID = "spend-today";
export const SPEND_TODAY_SOURCE_LABEL = "Spend today";
export const SPEND_DASHBOARD_HREF = "/administration/billing/spend";

export interface SpendTodayDeps {
  money: (n: number) => string;
  scareThresholdUsd: number;
  muteLocally: (key: string, ms: number) => void;
  unmuteLocally: (key: string) => void;
  localMuteUntil: number | null;
  now?: number;
}

/** Local midnight after `now`: "Dismiss for today" lasts until then. */
export function endOfLocalDay(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

export function spendTodayItems(snapshot: SpendHeadlineSnapshot | null, deps: SpendTodayDeps): AttentionItem[] {
  if (!snapshot) return [];
  const now = deps.now ?? Date.now();
  const key = `${SPEND_TODAY_SOURCE_ID}:${snapshot.todayStart}`;
  const over = snapshot.today >= deps.scareThresholdUsd;
  const runs = `${formatCount(snapshot.todayRuns, { locale: "en-US" })} ${snapshot.todayRuns === 1 ? "run" : "runs"}`;
  const top = snapshot.topOrg ? `${snapshot.topOrg.name} (${deps.money(snapshot.topOrg.cost)})` : "nothing recorded yet";
  const sentence =
    `Yesterday ${deps.money(snapshot.yesterday)} · last 7 days ${deps.money(snapshot.last7d)} · this month ${deps.money(snapshot.monthToDate)}. ` +
    `Biggest spender today: ${top}.` +
    (snapshot.gapCount > 0 ? ` ${snapshot.gapCount} cost sources measure nothing, so today is a lower bound.` : "");
  const title = `Spend so far today: ${deps.money(snapshot.today)}`;
  return [
    {
      key,
      sourceId: SPEND_TODAY_SOURCE_ID,
      id: snapshot.todayStart,
      severity: over ? "critical" : "info",
      title,
      state: over ? `${runs} · over the ${deps.money(deps.scareThresholdUsd)} alarm line` : runs,
      sentence,
      about: `Times in ${snapshot.timezone}`,
      fix: null,
      record: null,
      doors: [{ kind: "impact", href: SPEND_DASHBOARD_HREF, label: "Spend dashboard", what: "Every cost, by who and what" }],
      impactDeclared: true,
      actions: [
        {
          id: "dismiss_today",
          label: "Dismiss for today",
          variant: "outline",
          run: async () => deps.muteLocally(key, Math.max(60_000, endOfLocalDay(now) - now)),
        },
      ],
      mute: {
        scope: "local",
        current: deps.localMuteUntil && deps.localMuteUntil > now ? { until: new Date(deps.localMuteUntil).toISOString(), reason: null, by: null } : null,
        apply: async (untilMs) => deps.muteLocally(key, Math.max(0, untilMs - now)),
        clear: async () => deps.unmuteLocally(key),
      },
      copy: {
        label: "Spend today",
        human: () => [title, `${runs}.`, sentence, SPEND_DASHBOARD_HREF].join("\n"),
        agent: () => ({
          kind: "spend-today",
          location: SPEND_DASHBOARD_HREF,
          description: "Platform spend so far today with yesterday, 7-day and month-to-date figures.",
          data: snapshot,
        }),
      },
    },
  ];
}
