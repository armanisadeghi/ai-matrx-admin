"use client";

import { useState, useEffect, useCallback } from "react";
import { aiRunsService } from "../services/ai-runs-service";
import type {
  AiRun,
  AiRunsListFilters,
  UseAiRunsListReturn,
} from "../types";

/**
 * Hook for listing and filtering AI runs
 * 
 * Usage:
 * ```tsx
 * const { runs, loadMore, setFilters } = useAiRunsList({
 *   source_type: 'prompt',
 *   source_id: promptId,
 *   limit: 20
 * });
 * ```
 */
export function useAiRunsList(initialFilters: AiRunsListFilters = {}): UseAiRunsListReturn {
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [filters, setFilters] = useState<AiRunsListFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  // Load runs
  const loadRuns = useCallback(async (
    currentFilters: AiRunsListFilters,
    currentOffset: number,
    append: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiRunsService.list({
        ...currentFilters,
        offset: currentOffset,
      });
      
      if (append) {
        setRuns(prev => [...prev, ...response.runs]);
      } else {
        setRuns(response.runs);
      }
      
      setHasMore(response.hasMore);
      setTotal(response.total);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial data when filters change
  useEffect(() => {
    setOffset(0);
    loadRuns(filters, 0, false);
  }, [filters, loadRuns]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    const limit = filters.limit || 20;
    const newOffset = offset + limit;
    setOffset(newOffset);
    await loadRuns(filters, newOffset, true);
  }, [filters, offset, isLoading, hasMore, loadRuns]);

  // Refresh (reload from start)
  const refresh = useCallback(async () => {
    setOffset(0);
    await loadRuns(filters, 0, false);
  }, [filters, loadRuns]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AiRunsListFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    runs,
    isLoading,
    error,
    hasMore,
    total,
    
    // Actions
    loadMore,
    refresh,
    setFilters: updateFilters,
  };
}

