"use client";

import { useCallback, useEffect, useState } from "react";
import { useResearchApi } from "./useResearchApi";
import type { TopicCostSummary } from "../types";

/**
 * Authoritative per-topic cost summary, fetched from the Python API
 * (`GET /research/topics/{topicId}/costs`). The endpoint aggregates
 * `token_usage` JSONB blobs from `rs_analysis`, `rs_synthesis`, and
 * `rs_document` — Supabase's `rs_topic` row does NOT include this data,
 * which is why anything reading `topic.cost_summary` was always
 * undefined.
 *
 * The wire returns a slightly larger envelope than `TopicCostSummary`
 * (it also includes `topic_id` and a legacy nested `breakdown` object).
 * We pick only the fields declared on the typed model — extra keys are
 * ignored.
 *
 * Auto-fetches on mount and on `topicId` change. Call `refetch()` after
 * a pipeline run completes (or any other event that mints new analyses,
 * syntheses, or documents) to pick up fresh totals.
 */
export interface UseCostSummaryResult {
  data: TopicCostSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCostSummary(topicId: string): UseCostSummaryResult {
  const api = useResearchApi();
  const [data, setData] = useState<TopicCostSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getCosts(topicId, signal);
        const json = (await res.json()) as Record<string, unknown>;
        setData({
          total_llm_calls: Number(json.total_llm_calls ?? 0),
          total_input_tokens: Number(json.total_input_tokens ?? 0),
          total_output_tokens: Number(json.total_output_tokens ?? 0),
          total_estimated_cost_usd: Number(json.total_estimated_cost_usd ?? 0),
          page_analyses:
            json.page_analyses as TopicCostSummary["page_analyses"],
          keyword_syntheses:
            json.keyword_syntheses as TopicCostSummary["keyword_syntheses"],
          project_syntheses:
            json.project_syntheses as TopicCostSummary["project_syntheses"],
          tag_consolidations:
            json.tag_consolidations as TopicCostSummary["tag_consolidations"],
          document_assembly:
            json.document_assembly as TopicCostSummary["document_assembly"],
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setData(null);
        setError((err as Error).message ?? "Failed to load costs");
      } finally {
        setIsLoading(false);
      }
    },
    [api, topicId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchCosts(controller.signal);
    return () => controller.abort();
  }, [fetchCosts]);

  const refetch = useCallback(async () => {
    await fetchCosts();
  }, [fetchCosts]);

  return { data, isLoading, error, refetch };
}
