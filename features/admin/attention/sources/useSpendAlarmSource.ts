"use client";

/**
 * The spend-alarm source's live half: the read, the writes, and the refetch after every write.
 *
 * Reads go React → Supabase directly through `billing.spend_alarms_for_attention` (super-admin
 * SECURITY DEFINER, so it answers on every page — the table's own RLS answers only inside the admin
 * lane and would read as an empty, healthy list everywhere else). Writes go through the SAME paths
 * the alarm's record page uses: `spend_alarm_set_status` (mute = snooze until + note + by; Unmute
 * reopens; Resolve), `run_approval_decide`, and the scheduler's patch / run-now.
 *
 * `enabled` is the super-admin gate: everyone else issues no request.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSpendAlarmsForAttention,
  setSpendAlarmStatus,
  type SpendAlarmAttentionRow,
} from "@/features/admin/spend-alarms/spendAlarms";
import { decideSpendApproval } from "@/features/admin/spend-approvals/spendApprovals";
import { patchSystemTask, runSystemTaskNow } from "@/features/scheduling/service/schedulerClient";
import { adminScheduleHref } from "@/features/scheduling/constants/routes";
import { ATTENTION_POLL_MS } from "../poll";
import type { AttentionSourceState } from "../types";
import {
  SPEND_ALARM_REVIEW_HREF,
  SPEND_ALARM_SOURCE_ID,
  SPEND_ALARM_SOURCE_LABEL,
  spendAlarmItems,
  summarizeSpendAlarms,
} from "./spend-alarms";

export const SPEND_ALARMS_QUERY_KEY = ["admin-attention", "spend-alarms"] as const;

export function useSpendAlarmSource(enabled: boolean): AttentionSourceState {
  const queryClient = useQueryClient();

  const query = useQuery<SpendAlarmAttentionRow[]>({
    queryKey: SPEND_ALARMS_QUERY_KEY,
    queryFn: fetchSpendAlarmsForAttention,
    enabled,
    refetchInterval: ATTENTION_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const refetch = () => {
    // The alarm list and record pages share the prefix: one mute refreshes every view of it.
    void queryClient.invalidateQueries({ queryKey: ["admin-attention"] });
  };

  const after = async (write: Promise<unknown>) => {
    await write;
    refetch();
  };

  const items = spendAlarmItems(query.data ?? [], {
    setStatus: (id, status, options) => after(setSpendAlarmStatus(id, status, options)),
    decideApproval: (approvalId, decision) => after(decideSpendApproval(approvalId, decision)),
    setTaskEnabled: (taskId, enabled) => after(patchSystemTask(taskId, { enabled })),
    runTaskNow: async (taskId) => {
      const { run_id } = await runSystemTaskNow(taskId);
      window.open(`${adminScheduleHref(taskId)}?run=${encodeURIComponent(run_id)}`, "_blank", "noopener");
      refetch();
    },
    origin: typeof window === "undefined" ? "" : window.location.origin,
  });

  const status: AttentionSourceState["status"] = !enabled
    ? "idle"
    : query.isError
      ? "failed"
      : query.data === undefined
        ? "loading"
        : "ok";

  return {
    id: SPEND_ALARM_SOURCE_ID,
    label: SPEND_ALARM_SOURCE_LABEL,
    items,
    status,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    // A direct DB read that fails must be SAID: money going out wrongly would otherwise be
    // invisible, and silence here reads as healthy.
    loud: true,
    summarize: summarizeSpendAlarms,
    review: { href: SPEND_ALARM_REVIEW_HREF, label: "Review all spend alarms" },
    refetch,
  };
}
