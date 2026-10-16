"use client";

/**
 * lib/boot/shellCounts.ts — THE HEADER'S BACKGROUND COUNTS, ONE READ.
 *
 * First-paint fetch contract (V9–V12): the bell badge, the assists dock, the "needs you" producer
 * and the KG suggestions toast each used to fire their own full read in the late tier. They now
 * share ONE tiny read — `platform.shell_counts()` — that opens after the page has settled
 * (`useLateIdleReady`) and answers only numbers. Each consumer loads its full list when its count
 * says there is something to show, or when its surface opens (bell, assists manager, inbox).
 *
 * Freshness (unchanged): window focus (≥ 1 min apart), every 5 minutes while the tab is visible,
 * and `invalidateShellCounts()` after any write that moves a count.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";
import { useLateIdleReady } from "./lateIdle";

import {
  SHELL_COUNTS_QUERY_KEY,
  invalidateShellCounts,
} from "./shellCountsKey";

export { SHELL_COUNTS_QUERY_KEY, invalidateShellCounts };
const STALE_MS = 60_000;
const POLL_MS = 5 * 60_000;

export interface ShellInboxSummary {
  unseenNeedsYou: number;
  unseenDirect: number;
  unseenUpdates: number;
  unread: number;
  inbox: number;
  snoozed: number;
  done: number;
}

export interface ShellWorkRow {
  organization_id: string;
  organization_name: string | null;
  waiting: number;
  snoozed: number;
  overdue: number;
}

/**
 * Each section is `null` when ITS count failed in the database (the door answers the rest anyway).
 * A consumer falls back to its own old read for a null section only — never for the others.
 */
export interface ShellCounts {
  inbox: ShellInboxSummary | null;
  work: ShellWorkRow[] | null;
  /** Presentable assists waiting (the dock loads its list only when this is above zero). */
  assists: number | null;
  /** Capture handoffs waiting on the person's browser. */
  needsYou: number | null;
  /** Pending KG suggestions, before the person's acknowledgements and the confidence floor. */
  kgPending: number | null;
}

export type ShellSection =
  "inbox" | "work" | "assists" | "needsYou" | "kgPending";

/**
 * True when the shell read has SETTLED and did not give this section: the whole read failed with
 * nothing cached, or the read answered but this section's count came back null. False while the
 * read is still loading (not known yet is not failed).
 */
export function shellSectionFailed(
  shell: { data: ShellCounts | undefined; isError: boolean },
  section: ShellSection,
): boolean {
  if (shell.data !== undefined) return shell.data[section] === null;
  return shell.isError;
}

function int(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** A count the database could not give is `null`, never zero. */
function intOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseShellCounts(data: unknown): ShellCounts {
  if (typeof data !== "object" || data === null) {
    throw new Error("platform.shell_counts returned no object.");
  }
  const d = data as Record<string, unknown>;
  const hasInbox = typeof d.inbox === "object" && d.inbox !== null;
  const i = (hasInbox ? d.inbox : {}) as Record<string, unknown>;
  return {
    inbox: !hasInbox
      ? null
      : {
          unseenNeedsYou: int(i.unseen_needs_you),
          unseenDirect: int(i.unseen_direct),
          unseenUpdates: int(i.unseen_updates),
          unread: int(i.unread),
          inbox: int(i.inbox),
          snoozed: int(i.snoozed),
          done: int(i.done),
        },
    work: !Array.isArray(d.work)
      ? null
      : d.work.flatMap((value): ShellWorkRow[] => {
          const r = value as Record<string, unknown>;
          if (typeof r?.organization_id !== "string") return [];
          return [
            {
              organization_id: r.organization_id,
              organization_name:
                typeof r.organization_name === "string"
                  ? r.organization_name
                  : null,
              waiting: int(r.waiting),
              snoozed: int(r.snoozed),
              overdue: int(r.overdue),
            },
          ];
        }),
    assists: intOrNull(d.assists),
    needsYou: intOrNull(d.needs_you),
    kgPending: intOrNull(d.kg_pending),
  };
}

export async function fetchShellCounts(): Promise<ShellCounts> {
  performance.mark("load:lazy:shell counts read"); // LOAD MARKER (lazy) — page-load trace, no import
  const { data, error } = await createClient()
    .schema("platform")
    .rpc("shell_counts" as never);
  if (error) throw operationFailed("count what is waiting on you", error);
  return parseShellCounts(data);
}

/** Visible tabs re-read every 5 minutes; hidden tabs never poll. */
function refetchInterval(): number | false {
  return typeof document !== "undefined" &&
    document.visibilityState === "visible"
    ? POLL_MS
    : false;
}

/**
 * The shell's counts. `data` is undefined until the late tier opens and the read answers — a
 * consumer treats that as "not known yet", never as zero.
 */
export function useShellCounts() {
  const userId = useAppSelector(selectUserId);
  const ready = useLateIdleReady();
  return useQuery({
    queryKey: [...SHELL_COUNTS_QUERY_KEY, userId],
    queryFn: fetchShellCounts,
    enabled: userId !== null && ready,
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: STALE_MS,
    retry: 1,
  });
}

/** Re-count after a write that moves a number (a notice cleared, an assist decided …). */
export function useInvalidateShellCounts(): () => void {
  const queryClient = useQueryClient();
  return () => invalidateShellCounts(queryClient);
}
