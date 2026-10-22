"use client";

/**
 * `useWaitingRuns` — the "waiting on you" inbox's data (census #38).
 *
 * `GET /runs/waiting` through the canonical typed `callApi`, plus the shared
 * run-announce channel so the list is live: a run that parks appears, a run
 * that gets answered leaves. The announce frames carry no snapshot of WHAT a
 * run is waiting for, so any announcement that could change the membership of
 * this list refetches the projection — the fetch is the truth, the frames are
 * the hint (`announce-channel.ts`).
 *
 * 🚨 **This hook is only as alive as `api-types.ts`.** The projection landed in
 * aidream before the deployed server served it, so a regen against production
 * strips `/runs/waiting` out of the generated paths and this file stops
 * compiling. The fix is to regenerate from a server that HAS the route (a local
 * aidream at HEAD, or production once the deploy agent has shipped it) — never
 * to stub this hook out, which turns a temporary contract skew into a surface
 * that silently reports "nothing is waiting" forever.
 * `__tests__/waiting-contract.test.ts` is the tripwire.
 *
 * 🚨 ONE read per page, however many surfaces mount this hook: the state lives
 * in `waitingRunsStore.ts` (one request in flight, hints debounced, backoff
 * after a failure). Five mounts used to mean five fetches (2026-10-22).
 *
 * A failed read is a stated error, never an empty list: "nothing is waiting on
 * you" and "we could not check" are opposite answers, and showing the
 * reassuring one for the alarming one is the exact failure this inbox exists
 * to prevent.
 */

import { useEffect, useSyncExternalStore } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { callApi } from "@/lib/api/call-api";

import type { WaitingRunRow } from "./waiting";
import { useRunAnnouncements } from "./useRunAnnouncements";
import { waitingRunsStore } from "./waitingRunsStore";

/** The two statuses this inbox is made of — see `waiting.ts`. */
const WAITING_STATUSES = new Set(["interrupted", "awaiting_input"]);

export interface WaitingRunsState {
  rows: WaitingRunRow[];
  loading: boolean;
  /** Set when the projection could not be read — never rendered as "all clear". */
  error: string | null;
  refresh: () => void;
}

const refresh = () => waitingRunsStore.request();

export function useWaitingRuns(): WaitingRunsState {
  const dispatch = useAppDispatch();
  // 🚨 A LIST IS DECIDED BY ACCESS, NEVER BY THE SELECTED ORGANIZATION
  // (common-docs/policies/access-ladder.md): `GET /runs/waiting`
  // answers the person's waiting runs in EVERY organization with none
  // selected, so this inbox never waits for or refetches with the header's.
  const snapshot = useSyncExternalStore(
    waitingRunsStore.subscribe,
    waitingRunsStore.getSnapshot,
    waitingRunsStore.getSnapshot,
  );

  useEffect(() => {
    waitingRunsStore.setFetcher(() =>
      dispatch(
        callApi({
          path: "/runs/waiting",
          method: "GET",
          // This projection is authenticated-only. During logout/session expiry
          // the protected shell can finish one in-flight read as a guest; the
          // caller renders the refusal, but it is not a product incident.
          expectedErrorStatuses: [401],
        }),
      ),
    );
    // Every mount asks; the store turns a page's worth of mounts into one read.
    waitingRunsStore.schedule();
  }, [dispatch]);

  const known = new Set(snapshot.rows.map((row) => row.runId));

  useRunAnnouncements({
    onAnnounce: (event) => {
      // Refetch when a run ENTERS the waiting set, or when a run currently ON
      // the list moves at all (it may have just been answered and left). Every
      // other transition in the user's whole account is none of this list's
      // business.
      if (WAITING_STATUSES.has(event.status) || known.has(event.run_id)) {
        waitingRunsStore.schedule();
      }
    },
    // Every reconnect has a hole in it (the frames are ephemeral, with no
    // replay), so the snapshot is re-read on each open — once, for all mounts.
    onStatus: (status) => {
      if (status === "open") waitingRunsStore.schedule();
    },
  });

  return { rows: snapshot.rows, loading: snapshot.loading, error: snapshot.error, refresh };
}
