/**
 * useSystemPrompts Hook
 * 
 * Custom hook for fetching and managing system prompts.
 * Similar to useContentBlocks pattern.
 */

import { useState, useEffect, useCallback } from 'react';
import type { SystemPromptDB, SystemPromptQueryOptions } from '@/types/system-prompts-db';
import { fetchSystemPrompts, fetchSystemPromptById } from '@/lib/services/system-prompts-service';

interface UseSystemPromptsOptions extends SystemPromptQueryOptions {
  autoFetch?: boolean;
  cacheKey?: string;
}

interface UseSystemPromptsReturn {
  systemPrompts: SystemPromptDB[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

// Simple in-memory cache
const cache = new Map<string, { data: SystemPromptDB[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useSystemPrompts(options: UseSystemPromptsOptions = {}): UseSystemPromptsReturn {
  const { autoFetch = true, cacheKey, ...queryOptions } = options;
  
  const [systemPrompts, setSystemPrompts] = useState<SystemPromptDB[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  
  const getCacheKey = useCallback(() => {
    if (cacheKey) return cacheKey;
    return `system-prompts-${JSON.stringify(queryOptions)}`;
  }, [cacheKey, queryOptions]);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const key = getCacheKey();
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setSystemPrompts(cached.data);
        setLoading(false);
        return;
      }
      
      // Fetch from database
      const data = await fetchSystemPrompts(queryOptions);
      
      // Update cache
      cache.set(key, { data, timestamp: Date.now() });
      
      setSystemPrompts(data);
    } catch (err) {
      console.error('Error fetching system prompts:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [queryOptions, getCacheKey]);
  
  const clearCache = useCallback(() => {
    const key = getCacheKey();
    cache.delete(key);
  }, [getCacheKey]);
  
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);
  
  return {
    systemPrompts,
    loading,
    error,
    refetch: fetchData,
    clearCache
  };
}

/**
 * Hook for fetching a single system prompt by ID
 */
interface UseSystemPromptOptions {
  autoFetch?: boolean;
}

interface UseSystemPromptReturn {
  systemPrompt: SystemPromptDB | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSystemPrompt(
  id: string | null,
  options: UseSystemPromptOptions = {}
): UseSystemPromptReturn {
  const { autoFetch = true } = options;
  
  const [systemPrompt, setSystemPrompt] = useState<SystemPromptDB | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch && id !== null);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!id) {
      setSystemPrompt(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchSystemPromptById(id);
      setSystemPrompt(data);
    } catch (err) {
      console.error('Error fetching system prompt:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setSystemPrompt(null);
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    if (autoFetch && id) {
      fetchData();
    }
  }, [autoFetch, id, fetchData]);
  
  return {
    systemPrompt,
    loading,
    error,
    refetch: fetchData
  };
}

/**
 * Hook specifically for context menu prompts
 */
export function useContextMenuPrompts(category?: string, subcategory?: string) {
  return useSystemPrompts({
    placement_type: 'context-menu',
    // Removed is_active and status filters to show ALL context menu items
    // Placeholders will show as disabled with "(Coming Soon)"
    category,
    subcategory,
    cacheKey: `context-menu-prompts-${category || 'all'}-${subcategory || 'all'}`
  });
}

/**
 * Hook specifically for card prompts
 */
export function useCardPrompts(category?: string) {
  return useSystemPrompts({
    placement_type: 'card',
    // Removed is_active and status filters to show ALL cards
    // Placeholders will show as locked with "Coming Soon"
    category,
    cacheKey: `card-prompts-${category || 'all'}`
  });
}

/**
 * Hook specifically for button prompts
 */
export function useButtonPrompts(category?: string) {
  return useSystemPrompts({
    placement_type: 'button',
    // Removed is_active and status filters to show ALL buttons
    // Placeholders will show as disabled
    category,
    cacheKey: `button-prompts-${category || 'all'}`
  });
}

/**
 * Hook to fetch ALL system prompts (including inactive/draft) for admin
 */
export function useAllSystemPrompts(placementType?: string) {
  const result = useSystemPrompts({
    placement_type: placementType as 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action',
    cacheKey: `all-system-prompts-${placementType || 'all'}`
  });
  
  // Enhance refetch to also clear cache
  const enhancedRefetch = async () => {
    result.clearCache();
    await result.refetch();
  };
  
  return {
    ...result,
    refetch: enhancedRefetch
  };
}

