"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StatelessRatingResponse } from "../api/types";
import { useStatelessCalculate, WcRatingsError } from "../api/hooks";
import { buildStatelessPayload, hashDraft } from "./buildStatelessPayload";
import { evaluateDraftReadiness } from "./buildStatelessPayload";
import type { RatingDraft } from "./types";

const DEBOUNCE_MS = 350;

export interface LiveRatingState {
  result: StatelessRatingResponse | null;
  status: "idle" | "incomplete" | "calculating" | "ready" | "error";
  reason?: string;
  error?: WcRatingsError;
}

export function useLiveRating(draft: RatingDraft): LiveRatingState {
  const calculate = useStatelessCalculate();
  const [state, setState] = useState<LiveRatingState>({
    result: null,
    status: "idle",
  });
  const lastFiredHash = useRef<string | null>(null);
  const inFlightRequestId = useRef(0);

  const draftHash = useMemo(() => hashDraft(draft), [draft]);
  const readiness = useMemo(() => evaluateDraftReadiness(draft), [draft]);

  useEffect(() => {
    if (!readiness.ready) {
      lastFiredHash.current = null;
      setState({
        result: null,
        status: "incomplete",
        reason: readiness.reason,
      });
      return;
    }

    if (lastFiredHash.current === draftHash) return;

    const payload = buildStatelessPayload(draft);
    if (!payload) return;

    const requestId = ++inFlightRequestId.current;
    lastFiredHash.current = draftHash;
    setState((prev) => ({ ...prev, status: "calculating" }));

    const timer = setTimeout(async () => {
      try {
        const result = await calculate.mutateAsync(payload);
        if (requestId !== inFlightRequestId.current) return;
        setState({ result, status: "ready" });
      } catch (err) {
        if (requestId !== inFlightRequestId.current) return;
        const wcErr =
          err instanceof WcRatingsError
            ? err
            : new WcRatingsError({
                error: {
                  type: "unknown",
                  message: err instanceof Error ? err.message : String(err),
                },
              });
        setState({
          result: null,
          status: "error",
          error: wcErr,
        });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draftHash, readiness.ready, readiness.reason, draft, calculate]);

  return state;
}
