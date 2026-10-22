"use client";

/**
 * useTopStories — Google's "Top stories" for a newsy query on the All tab.
 *
 * The web answer's own news band is the engine's general headlines (a query about electric vehicles
 * came back with stories about Russia), so the All page asks the News vertical for the same words
 * once the web answer is in — one extra engine search, only for a query asking for what is new.
 */

import { useEffect, useState } from "react";
import { useBackendApi } from "@/hooks/useBackendApi";
import { runKindSearch } from "@/features/search/service";

/** Stories the carousel holds — Google shows about this many before "More news". */
const TOP_STORIES_COUNT = 10;

function storiesOf(result: Record<string, unknown>): Record<string, unknown>[] {
  const list = Array.isArray(result.news) && result.news.length > 0 ? result.news : result.results;
  return Array.isArray(list)
    ? list.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v))
    : [];
}

export function useTopStories(query: string, enabled: boolean): Record<string, unknown>[] {
  const { post } = useBackendApi();
  const [answer, setAnswer] = useState<{ query: string; stories: Record<string, unknown>[] } | null>(null);
  useEffect(() => {
    if (!enabled || !query) return undefined;
    const controller = new AbortController();
    let stories: Record<string, unknown>[] = [];
    runKindSearch({
      post,
      query,
      provider: "brave",
      count: TOP_STORIES_COUNT,
      options: { vertical: "news" },
      signal: controller.signal,
      onOutcome: (outcome) => {
        stories = storiesOf(outcome.result).map((s) => ({ ...s, __kind: "news_result" }));
      },
    }).then(
      () => {
        if (!controller.signal.aborted) setAnswer({ query, stories });
      },
      (err: unknown) => {
        // A missing carousel is not an error the reader must act on; the web results stand.
        if (!controller.signal.aborted) console.warn("[search] Top stories did not load:", err);
      },
    );
    return () => controller.abort();
  }, [query, enabled, post]);
  return answer?.query === query ? answer.stories : [];
}
