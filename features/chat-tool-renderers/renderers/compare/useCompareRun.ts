"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ComparisonRefusal,
  mergeRunProgress,
  type ComparisonResult,
  type ItemProgress,
} from "@/features/comparison/contract";
import { startChatComparison } from "@/features/comparison/chat";
import { followRun } from "@/features/comparison/server";

export type ComparePhase = "checking" | "confirm" | "starting" | "running" | "done" | "failed";

export interface CompareRunView {
  phase: ComparePhase;
  progress: ItemProgress[];
  result: ComparisonResult | null;
  failure: string | null;
  startedAt: number;
  /** Start the run with this request (the lineup the person confirmed), or the quoted one. */
  confirm: (request?: unknown) => void;
}

/**
 * The card's one run. `runId` is the id the tool reserved: a run that exists is followed (a reload,
 * another tab, a finished run); a 404 means the person has not confirmed yet. Confirm starts the run
 * over HTTP (never through the agent) and follows it. Both paths end in the same durable reader.
 */
export function useCompareRun(args: { runId: string | null; request: unknown; organizationId: string | null }): CompareRunView {
  const { runId, request, organizationId } = args;
  const [phase, setPhase] = useState<ComparePhase>("checking");
  const [progress, setProgress] = useState<ItemProgress[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const abort = useRef<AbortController | null>(null);

  const follow = useCallback(() => {
    if (!runId || !organizationId) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    followRun(runId, {
      organizationId,
      signal: ctrl.signal,
      onRunState: (s) => {
        setPhase("running");
        setProgress((cur) => mergeRunProgress(cur, s.items));
        if (s.created_at) setStartedAt(new Date(s.created_at).getTime());
      },
    })
      .then((r) => {
        setResult(r);
        setPhase("done");
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ComparisonRefusal && err.code === "not_found") {
          setPhase("confirm"); // no such run yet: waiting for the person's Confirm
          return;
        }
        setFailure(err instanceof ComparisonRefusal ? err.userMessage : "The comparison could not be read.");
        setPhase("failed");
      });
  }, [runId, organizationId]);

  useEffect(() => {
    follow();
    return () => abort.current?.abort();
  }, [follow]);

  const confirm = useCallback((chosen?: unknown) => {
    const body = chosen ?? request;
    if (!runId || !organizationId || body == null) return;
    setPhase("starting");
    setFailure(null);
    setStartedAt(Date.now());
    startChatComparison(runId, body, { organizationId })
      .then(() => follow())
      .catch((err) => {
        setFailure(err instanceof ComparisonRefusal ? err.userMessage : "The comparison could not be started.");
        setPhase("confirm");
      });
  }, [runId, organizationId, request, follow]);

  return { phase, progress, result, failure, startedAt, confirm };
}
