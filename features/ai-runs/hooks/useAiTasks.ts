"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { aiTasksService } from "../services/ai-tasks-service";
import type {
  AiTask,
  AiTasksListFilters,
  UseAiTasksReturn,
} from "../types";

/**
 * Hook for listing and filtering AI tasks
 * 
 * Features:
 * - Auto-refresh every 10 seconds to pick up new/updated tasks
 * - Manual refresh capability
 * - Pagination support
 * 
 * Usage:
 * ```tsx
 * const { tasks, loadMore, setFilters, refresh } = useAiTasks({
 *   status: 'completed',
 *   limit: 20
 * });
 * ```
 */
export function useAiTasks(initialFilters: AiTasksListFilters = {}): UseAiTasksReturn {
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [filters, setFilters] = useState<AiTasksListFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load tasks
  const loadTasks = useCallback(async (
    currentFilters: AiTasksListFilters,
    currentOffset: number,
    append: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiTasksService.list({
        ...currentFilters,
        offset: currentOffset,
      });
      
      if (append) {
        setTasks(prev => [...prev, ...response.tasks]);
      } else {
        setTasks(response.tasks);
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
    loadTasks(filters, 0, false);
  }, [filters, loadTasks]);

  // Set up auto-refresh polling (every 10 seconds)
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up new interval for auto-refresh
    refreshIntervalRef.current = setInterval(() => {
      // Silent refresh - don't reset offset, just reload current page
      loadTasks(filters, 0, false);
    }, 10000); // 10 seconds

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [filters, loadTasks]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    const limit = filters.limit || 20;
    const newOffset = offset + limit;
    setOffset(newOffset);
    await loadTasks(filters, newOffset, true);
  }, [filters, offset, isLoading, hasMore, loadTasks]);

  // Refresh (reload from start)
  const refresh = useCallback(async () => {
    setOffset(0);
    await loadTasks(filters, 0, false);
  }, [filters, loadTasks]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AiTasksListFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    tasks,
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
