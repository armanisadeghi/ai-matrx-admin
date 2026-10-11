"use client";

/**
 * The "Spend today" source's live half: today's headline (`fetchSpendHeadline`, the same read the
 * spend dashboard uses) and the two `platform.spend_popover` knobs. `times_per_day` = 0 turns the
 * row off; the scare threshold decides critical vs information.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchSpendHeadline, viewerTimezone } from "@/features/admin/spend/service";
import { usd } from "@/features/admin/spend/format";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { useSpendPopoverKnobs } from "@/features/admin/spend/useSpendPopoverKnobs";
import { ATTENTION_POLL_MS } from "../poll";
import { muteItem, unmuteItem } from "../item-mute";
import { useLocalMutes } from "../useLocalMutes";
import type { AttentionSourceState } from "../types";
import { SPEND_DASHBOARD_HREF, SPEND_TODAY_SOURCE_ID, SPEND_TODAY_SOURCE_LABEL, spendTodayItems } from "./spend-today";

export function useSpendTodaySource(enabled: boolean): AttentionSourceState {
  const { knobs } = useSpendPopoverKnobs({ enabled });
  const on = enabled && (knobs?.timesPerDay ?? 0) > 0;
  const { rate } = useCostDisplay();
  const localMutes = useLocalMutes();
  const query = useQuery({
    queryKey: ["admin-attention", "spend-today"],
    queryFn: () => fetchSpendHeadline(viewerTimezone()),
    enabled: on,
    refetchInterval: ATTENTION_POLL_MS,
    retry: false,
  });
  const snapshot = on ? (query.data ?? null) : null;
  const key = snapshot ? `${SPEND_TODAY_SOURCE_ID}:${snapshot.todayStart}` : "";
  const items = spendTodayItems(snapshot, {
    money: (n) => usd(n, rate),
    scareThresholdUsd: knobs?.scareThresholdUsd ?? Number.POSITIVE_INFINITY,
    muteLocally: (k, ms) => void muteItem(k, ms),
    unmuteLocally: (k) => unmuteItem(k),
    localMuteUntil: key ? (localMutes[key] ?? null) : null,
  });
  return {
    id: SPEND_TODAY_SOURCE_ID,
    label: SPEND_TODAY_SOURCE_LABEL,
    items,
    status: !on ? "idle" : query.isError ? "failed" : query.data === undefined ? "loading" : "ok",
    error: query.error instanceof Error ? query.error.message : null,
    loud: false,
    summarize: (live) => (live.length ? `${live[0].title}.` : null),
    review: { href: SPEND_DASHBOARD_HREF, label: "Open spend dashboard" },
    refetch: () => void query.refetch(),
  };
}
