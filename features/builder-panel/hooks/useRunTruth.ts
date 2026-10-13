"use client";

import { useEffect, useState } from "react";
import { fetchRunTruth, type RunTruth } from "../data";

const TERMINAL = new Set(["completed", "failed", "cancelled", "canceled", "errored", "succeeded", "interrupted"]);
const REFRESH_MS = 3_000;

/**
 * The stored rows of these runs (run, node outcomes, provision snapshots), re-read every few
 * seconds while any run is still going, then left alone.
 */
export function useRunTruth(runIds: string[], subjectIds: string[]): { truth: RunTruth | null; error: string | null } {
  const [truth, setTruth] = useState<RunTruth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sig = `${runIds.join(",")}|${subjectIds.join(",")}`;

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const [runPart, subjectPart] = sig.split("|");
    const runs = (runPart ?? "").split(",").filter(Boolean);
    const subjects = (subjectPart ?? "").split(",").filter(Boolean);
    const load = () => {
      fetchRunTruth(runs, subjects)
        .then((next) => {
          if (!live) return;
          setTruth(next);
          setError(null);
          const going = runs.length > next.runs.length || next.runs.some((r) => !TERMINAL.has(r.status));
          if (going) timer = setTimeout(load, REFRESH_MS);
        })
        .catch((e: unknown) => {
          if (!live) return;
          setError(e instanceof Error ? e.message : String(e));
          timer = setTimeout(load, REFRESH_MS * 3);
        });
    };
    load();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [sig]);

  return { truth, error };
}
