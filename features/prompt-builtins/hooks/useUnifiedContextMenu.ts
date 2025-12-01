'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { buildCategoryHierarchy } from '@/features/prompt-builtins/utils/menuHierarchy';
import type { CategoryGroup } from '@/features/prompt-builtins/types/menu';
import { useAppDispatch } from '@/lib/redux/hooks';
import { cachePrompt } from '@/lib/redux/slices/promptCacheSlice';
import type { CachedPrompt } from '@/lib/redux/slices/promptCacheSlice';

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
 * @param contextFilter - Optional context to filter by (e.g., 'code-editor', 'note-editor')
 * @param enabled - Whether to fetch data (useful for conditional loading)
 * 
 * @example
 * ```tsx
 * const { categoryGroups, loading, error } = useUnifiedContextMenu(['ai-action'], 'code-editor');
 * ```
 */
export function useUnifiedContextMenu(
  placementTypes: string[] = [],
  contextFilter?: string,
  enabled: boolean = true
): UseUnifiedContextMenuReturn {
  const dispatch = useAppDispatch();
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

      // Build hierarchical structure from flat data with optional context filtering
      const allGroups = (data as ViewResponse[])?.flatMap(row =>
        buildCategoryHierarchy(row.categories_flat || [], contextFilter)
      ) || [];

      // ⭐ CACHE ALL PROMPT BUILTINS IN REDUX
      // This ensures they're available for execution without refetching
      allGroups.forEach(group => {
        const cacheItems = (items: any[]) => {
          items.forEach(item => {
            // Only cache prompt shortcuts that have a connected builtin
            if (item.type === 'prompt_shortcut' && item.prompt_builtin) {
              const builtin = item.prompt_builtin;
              
              const cachedPrompt: CachedPrompt = {
                id: builtin.id,
                name: builtin.name,
                description: builtin.description || undefined,
                messages: builtin.messages,
                variableDefaults: builtin.variableDefaults || [],
                settings: builtin.settings,
                userId: builtin.user_id || '', // From the builtin
                source: 'prompt_builtins',
                fetchedAt: Date.now(),
                status: 'cached',
              };

              // Cache in Redux - now getPrompt will use this instead of refetching
              dispatch(cachePrompt(cachedPrompt));
            }
          });
        };

        // Cache items from this group
        if (group.items) {
          cacheItems(group.items);
        }

        // Recursively cache items from child groups
        const cacheChildren = (children: typeof allGroups) => {
          children.forEach(child => {
            if (child.items) {
              cacheItems(child.items);
            }
            if (child.children) {
              cacheChildren(child.children);
            }
          });
        };

        if (group.children) {
          cacheChildren(group.children);
        }
      });

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
  }, [JSON.stringify(placementTypes), contextFilter, enabled]);

  return {
    categoryGroups,
    loading,
    error,
    refresh: loadMenuItems,
  };
}