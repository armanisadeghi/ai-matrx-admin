'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { buildCategoryHierarchy } from '@/features/prompt-builtins/utils/menuHierarchy';
import type { CategoryGroup } from '@/features/prompt-builtins/types/menu';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { cachePrompt } from '@/lib/redux/slices/promptCacheSlice';
import type { CachedPrompt } from '@/lib/redux/slices/promptCacheSlice';
import { selectContextMenuRows, selectContextMenuHydrated } from '@/lib/redux/slices/contextMenuCacheSlice';

interface UseUnifiedContextMenuReturn {
  categoryGroups: CategoryGroup[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface ViewResponse {
  placement_type: string;
  categories_flat: unknown[];
}

/**
 * Load all context menu items and build hierarchy.
 *
 * Fast path: if rows were pre-populated server-side via get_ssr_shell_data(),
 * they are already in the Redux contextMenuCache slice — no Supabase fetch needed.
 *
 * Fallback: fetches from context_menu_unified_view directly (public routes,
 * or any route where the SSR data wasn't available).
 *
 * @param placementTypes - Array of placement types to filter by (e.g., ['ai-action', 'content-block'])
 * @param contextFilter  - Optional context filter (e.g., 'code-editor', 'note-editor')
 * @param enabled        - Whether to fetch data (useful for conditional loading)
 */
export function useUnifiedContextMenu(
  placementTypes: string[] = [],
  contextFilter?: string,
  enabled: boolean = true
): UseUnifiedContextMenuReturn {
  const dispatch = useAppDispatch();

  const cachedRows = useAppSelector(selectContextMenuRows);
  const isHydrated = useAppSelector(selectContextMenuHydrated);

  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheBuiltins = (groups: CategoryGroup[]) => {
    const cacheItems = (items: unknown[]) => {
      (items as Array<{ type: string; prompt_builtin?: Record<string, unknown> }>).forEach(item => {
        if (item.type === 'prompt_shortcut' && item.prompt_builtin) {
          const builtin = item.prompt_builtin;
          dispatch(cachePrompt({
            id: builtin.id as string,
            name: builtin.name as string,
            description: (builtin.description as string) || undefined,
            messages: builtin.messages as CachedPrompt['messages'],
            variableDefaults: (builtin.variableDefaults as CachedPrompt['variableDefaults']) || [],
            settings: builtin.settings as CachedPrompt['settings'],
            userId: (builtin.user_id as string) || '',
            source: 'prompt_builtins',
            fetchedAt: Date.now(),
            status: 'cached',
          } satisfies CachedPrompt));
        }
      });
    };
    const recurse = (children: CategoryGroup[]) => {
      children.forEach(child => {
        if (child.items) cacheItems(child.items as unknown[]);
        if (child.children) recurse(child.children);
      });
    };
    groups.forEach(group => {
      if (group.items) cacheItems(group.items as unknown[]);
      if (group.children) recurse(group.children);
    });
  };

  const loadMenuItems = async () => {
    if (!enabled || placementTypes.length === 0) {
      setCategoryGroups([]);
      setLoading(false);
      return;
    }

    // ── Fast path: rows already in Redux from SSR RPC ─────────────────────
    if (isHydrated && cachedRows.length > 0) {
      try {
        const rows = cachedRows as unknown as ViewResponse[];
        const allGroups = rows
          .filter(r => placementTypes.includes(r.placement_type))
          .flatMap(row => buildCategoryHierarchy(row.categories_flat as Parameters<typeof buildCategoryHierarchy>[0], contextFilter));
        cacheBuiltins(allGroups);
        setCategoryGroups(allGroups);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to build context menu'));
        setCategoryGroups([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Fallback: fetch from Supabase ──────────────────────────────────────
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('context_menu_unified_view')
        .select('placement_type, categories_flat')
        .in('placement_type', placementTypes);

      if (queryError) {
        throw new Error(`Failed to load menu: ${queryError.message}`);
      }

      const allGroups = ((data as ViewResponse[]) || []).flatMap(row =>
        buildCategoryHierarchy(row.categories_flat as Parameters<typeof buildCategoryHierarchy>[0], contextFilter)
      );
      cacheBuiltins(allGroups);
      setCategoryGroups(allGroups);

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load context menu'));
      setCategoryGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(placementTypes), contextFilter, enabled, isHydrated]);

  return {
    categoryGroups,
    loading,
    error,
    refresh: loadMenuItems,
  };
}
