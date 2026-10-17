"use client";

/**
 * "Which one?" for a name typed where a link was wanted (third-party services lane L12d): a Matrx web
 * search looks for the app or business page on its own site, and the places search looks for a business on
 * Google, and the few exact matches are offered. It never spends points and never runs by itself — only
 * when the person presses the button with a name in the box.
 */

import { useEffect, useRef, useState } from "react";

import { useBackendApi } from "@/hooks/useBackendApi";
import { runKindSearch } from "@/features/search/service";
import { finderQuery, finderSource, pickCandidates, pickPlaces, type FindCandidate } from "./searchToolPlan";

export type FinderState =
  | { phase: "idle" }
  | { phase: "looking"; words: string }
  | { phase: "found"; words: string; candidates: FindCandidate[] }
  | { phase: "failed"; words: string; message: string };

function listOf(list: unknown): Record<string, unknown>[] {
  return Array.isArray(list) ? (list.filter((r) => typeof r === "object" && r !== null && !Array.isArray(r)) as Record<string, unknown>[]) : [];
}

export function useLaneFinder(laneId: string) {
  const { post } = useBackendApi();
  const [state, setState] = useState<FinderState>({ phase: "idle" });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const find = async (words: string) => {
    const query = finderQuery(laneId, words);
    if (!query) return;
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setState({ phase: "looking", words });
    try {
      let candidates: FindCandidate[] = [];
      const places = finderSource(laneId) === "places";
      await runKindSearch({
        post,
        query,
        provider: places ? "google" : "brave",
        count: places ? 5 : 10,
        options: places ? { vertical: "places" } : undefined,
        signal: c.signal,
        onOutcome: (outcome) => {
          candidates = places
            ? pickPlaces(listOf(outcome.result.places))
            : pickCandidates(laneId, listOf(outcome.result.results));
        },
      });
      if (!c.signal.aborted) setState({ phase: "found", words, candidates });
    } catch (err: unknown) {
      if (c.signal.aborted) return;
      setState({ phase: "failed", words, message: err instanceof Error && err.message ? err.message : "That search didn't come back." });
    }
  };

  const clear = () => {
    controller.current?.abort();
    setState({ phase: "idle" });
  };

  return { state, find, clear };
}
