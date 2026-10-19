"use client";

/**
 * THE background-AI publisher, mounted once for admin debuggers (AdminFeatureProviderCore).
 *   1. Polls followed server work (`followed-work.ts`) while it runs and after (one final read),
 *      keeping `followed-work-store` current — Watch AI lists the calls, nothing else polls.
 *   2. Publishes that work to the Builder panel (`ai.server_work`) and mirrors every AI run the
 *      tab holds into it (`ai.page_runs`), so a Studio step, a Debrief, a planner run or a chat
 *      turn needs no feature-side Builder code.
 */

import { useEffect, useRef } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { selectPageAiRuns } from "./page-ai-runs";
import { useCanWatchAi } from "./useCanWatchAi";
import { useFollowedWork } from "./followed-work";
import { getResolved, setFollowedRuns, setResolved, useResolvedFollowed } from "./followed-work-store";
import { readFollowed } from "./followed-work-resolve";
import { fetchFollowedRuns, type FollowedScope } from "./ai-watch-records";
import { PAGE_RUN_PREFIX, PAGE_RUNS_SURFACE, SERVER_WORK_PREFIX, SERVER_WORK_SURFACE, pageRunEntries, serverWorkEntries } from "./followed-work-builder";

const POLL_MS = 3000;

export default function FollowedWorkSync() {
  const canWatch = useCanWatchAi();
  const work = useFollowedWork();
  const resolved = useResolvedFollowed();
  const pageRuns = useAppSelector(selectPageAiRuns);
  const workFeed = useBuilderFeed(SERVER_WORK_SURFACE);
  const runFeed = useBuilderFeed(PAGE_RUNS_SURFACE);

  // 1. Poll. Work that is over is read once more on registration, then left alone.
  // An ending (`endServerWork`) changes the signature, so a run that failed before any AI call is read once more and closes.
  const workSig = work.map((w) => `${w.key}${w.ended ? "!" : ""}`).join(",");
  const done = useRef(new Set<string>());
  useEffect(() => {
    if (!canWatch || !work.length) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      let pending = false;
      for (const w of work) {
        if (done.current.has(w.key)) continue;
        try {
          const r = await readFollowed(w);
          if (cancelled) return;
          setResolved(w.key, r);
          if (r.done) done.current.add(w.key);
          else pending = true;
        } catch {
          pending = true;
        }
      }
      const scopes: FollowedScope[] = work.map((w) => ({
        key: w.key,
        label: w.label,
        userRequestIds: getResolved()[w.key]?.userRequestIds ?? [],
        conversationIds: getResolved()[w.key]?.conversationIds ?? [],
      }));
      try {
        const rows = await fetchFollowedRuns(scopes);
        if (!cancelled) setFollowedRuns(rows);
      } catch {
        pending = true;
      }
      if (!cancelled && pending) timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- work is identified by its keys
  }, [workSig, canWatch]);

  // 2. Publish (no-ops unless an admin has debug mode on).
  useEffect(() => {
    if (!workFeed.isActive) return;
    workFeed.publish(serverWorkEntries(work, resolved), { prune: [SERVER_WORK_PREFIX] });
  });
  useEffect(() => {
    if (!runFeed.isActive) return;
    runFeed.publish(pageRunEntries(pageRuns), { prune: [PAGE_RUN_PREFIX] });
  });
  return null;
}
