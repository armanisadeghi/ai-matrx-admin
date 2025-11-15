'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { buildCategoryHierarchy } from '@/features/prompt-builtins/utils/menuHierarchy';
import type { CategoryGroup } from '@/features/prompt-builtins/types/menu';

interface UseUnifiedContextMenuReturn {
  categoryGroups: CategoryGroup[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface ViewResponse {
  placement_type: string;
  categories_flat: any[];
}

/**
 * Load all context menu items from unified view and build hierarchy.
 * 
 * @param placementTypes - Array of placement types to filter by (e.g., ['ai-action', 'content-block'])
 * @param enabled - Whether to fetch data (useful for conditional loading)
 * 
 * @example
 * ```tsx
 * const { categoryGroups, loading, error } = useUnifiedContextMenu(['ai-action']);
 * ```
 */
export function useUnifiedContextMenu(
  placementTypes: string[] = [],
  enabled: boolean = true
): UseUnifiedContextMenuReturn {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMenuItems = async () => {
    // Early return if disabled or no placement types specified
    if (!enabled || placementTypes.length === 0) {
      setCategoryGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Fetch unified data from view (ONE QUERY!)
      const { data, error: queryError } = await supabase
        .from('context_menu_unified_view')
        .select('placement_type, categories_flat')
        .in('placement_type', placementTypes);

      if (queryError) {
        throw new Error(`Failed to load menu: ${queryError.message}`);
      }

      // Build hierarchical structure from flat data
      const allGroups = (data as ViewResponse[])?.flatMap(row => 
        buildCategoryHierarchy(row.categories_flat || [])
      ) || [];

      setCategoryGroups(allGroups);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(err instanceof Error ? err : new Error('Failed to load context menu'));
      setCategoryGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload when dependencies change
  useEffect(() => {
    loadMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(placementTypes), enabled]);

  return {
    categoryGroups,
    loading,
    error,
    refresh: loadMenuItems,
  };
}