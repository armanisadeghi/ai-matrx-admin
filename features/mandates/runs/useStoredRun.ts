"use client";

// features/mandates/runs/useStoredRun.ts — one stored mandate run, read once
// per conversation id through `GET /mandates/runs/{conversation_id}`.

import { useEffect, useState } from "react";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { fetchStoredRun, type StoredRun } from "./service";

export interface StoredRunState {
  conversationId: string;
  run: StoredRun | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useStoredRun(conversationId: string, mandateKey: AnyMandateKey): StoredRunState {
  const dispatch = useAppDispatch();
  const [run, setRun] = useState<StoredRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  // AI WATCH: the read carries `?debug_view=1` only while debug mode is on, and debug mode
  // hydrates after the first paint — read again whenever it changes, or a watcher keeps a
  // withheld view (and a non-watcher keeps values after switching it off).
  const debugMode = Boolean(useAppSelector(selectIsDebugMode));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStoredRun(dispatch, conversationId, mandateKey)
      .then((next) => {
        if (!cancelled) setRun(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "The run could not be read.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, conversationId, mandateKey, attempt, debugMode]);

  return { conversationId, run, loading, error, retry: () => setAttempt((n) => n + 1) };
}
