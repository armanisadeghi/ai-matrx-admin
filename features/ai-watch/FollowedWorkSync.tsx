"use client";

/**
 * THE background-AI publisher, mounted once for admin debuggers (AdminFeatureProviderCore).
 *   1. Reads followed server work (`followed-work.ts`) on registration and on every `chat.user_request`
 *      change (realtime, no timer), keeping `followed-work-store` current — Watch AI lists the calls.
 *   2. Publishes that work to the Builder panel (`ai.server_work`) and mirrors every AI run the
 *      tab holds into it (`ai.page_runs`), so a Studio step, a Debrief, a planner run or a chat
 *      turn needs no feature-side Builder code.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { selectPageAiRuns } from "./page-ai-runs";
import { useCanWatchAi } from "./useCanWatchAi";
import { useFollowedWork } from "./followed-work";
import { getResolved, setFollowedReadError, setFollowedRuns, setResolved, useResolvedFollowed } from "./followed-work-store";
import { useUserRequestChanges } from "./useUserRequestChanges";
import { readFollowed } from "./followed-work-resolve";
import { fetchFollowedRuns, type FollowedScope } from "./ai-watch-records";
import { PAGE_RUN_PREFIX, PAGE_RUNS_SURFACE, SERVER_WORK_PREFIX, SERVER_WORK_SURFACE, pageRunEntries, serverWorkEntries } from "./followed-work-builder";

export default function FollowedWorkSync() {
  const canWatch = useCanWatchAi();
  const work = useFollowedWork();
  const resolved = useResolvedFollowed();
  const pageRuns = useAppSelector(selectPageAiRuns);
  const workFeed = useBuilderFeed(SERVER_WORK_SURFACE);
  const runFeed = useBuilderFeed(PAGE_RUNS_SURFACE);

  // 1. Read. Work that is over is read once more on registration, then left alone. A read runs when the work
  // changes (registration; an ending via `endServerWork` changes the signature, so a run that failed before any
  // AI call is read once more and closes) and whenever `chat.user_request` changes — never on a timer.
  const workSig = work.map((w) => `${w.key}${w.ended ? "!" : ""}`).join(",");
  const done = useRef(new Set<string>());
  const workRef = useRef(work);
  useEffect(() => {
    workRef.current = work;
  });
  const generation = useRef(0);
  const reading = useRef(false);
  const again = useRef(false);
  const readAll = useCallback(async () => {
    if (reading.current) {
      again.current = true;
      return;
    }
    reading.current = true;
    const mine = generation.current;
    try {
      do {
        again.current = false;
        const items = workRef.current;
        let failure: string | null = null;
        for (const w of items) {
          if (done.current.has(w.key)) continue;
          try {
            const r = await readFollowed(w);
            if (mine !== generation.current) return;
            setResolved(w.key, r);
            if (r.done) done.current.add(w.key);
          } catch (err) {
            failure = err instanceof Error ? err.message : String(err);
          }
        }
        const scopes: FollowedScope[] = items.map((w) => ({
          key: w.key,
          label: w.label,
          userRequestIds: getResolved()[w.key]?.userRequestIds ?? [],
          conversationIds: getResolved()[w.key]?.conversationIds ?? [],
        }));
        try {
          const rows = await fetchFollowedRuns(scopes);
          if (mine !== generation.current) return;
          setFollowedRuns(rows);
        } catch (err) {
          failure = err instanceof Error ? err.message : String(err);
        }
        if (mine === generation.current) setFollowedReadError(failure);
      } while (again.current && mine === generation.current);
    } finally {
      reading.current = false;
    }
  }, []);
  useEffect(() => {
    if (!canWatch || !work.length) return undefined;
    generation.current += 1;
    void readAll();
    return () => {
      generation.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- work is identified by its keys
  }, [workSig, canWatch, readAll]);
  useUserRequestChanges({
    scope: "followed",
    enabled: canWatch && work.length > 0,
    refresh: () => void readAll(),
  });

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
