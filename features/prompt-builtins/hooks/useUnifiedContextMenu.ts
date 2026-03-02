'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { buildCategoryHierarchy } from '@/features/prompt-builtins/utils/menuHierarchy';
import type { CategoryGroup } from '@/features/prompt-builtins/types/menu';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { cachePrompt } from '@/lib/redux/slices/promptCacheSlice';
import type { CachedPrompt } from '@/lib/redux/slices/promptCacheSlice';
import type { ContextMenuCacheState } from '@/lib/redux/slices/contextMenuCacheSlice';
import type { ContextMenuRow } from '@/utils/supabase/ssrShellData';

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
  // Cast through unknown — contextMenuCache only exists in LiteRootState, not full RootState.
  // Both stores use the same reducer key, so this is safe at runtime.
  const cachedRows = useAppSelector(
    (state) => ((state as unknown as { contextMenuCache: ContextMenuCacheState }).contextMenuCache?.rows ?? []) as ContextMenuRow[]
  );
  const isHydrated = useAppSelector(
    (state) => (state as unknown as { contextMenuCache: ContextMenuCacheState }).contextMenuCache?.hydrated ?? false
  );

  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheBuiltinsFromGroups = useCallback((groups: CategoryGroup[]) => {
    const cacheItems = (items: unknown[]) => {
      (items as Array<{ type: string; prompt_builtin?: Record<string, unknown> }>).forEach(item => {
        if (item.type === 'prompt_shortcut' && item.prompt_builtin) {
          const builtin = item.prompt_builtin;
          const cachedPrompt: CachedPrompt = {
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
          };
          dispatch(cachePrompt(cachedPrompt));
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
  }, [dispatch]);

  const buildFromRows = useCallback((rows: ViewResponse[]) => {
    const filtered = rows.filter(r => placementTypes.includes(r.placement_type));
    const allGroups = filtered.flatMap(row =>
      // categories_flat is jsonb from DB — shape matches FlatCategory[] at runtime
      buildCategoryHierarchy(row.categories_flat as Parameters<typeof buildCategoryHierarchy>[0], contextFilter)
    );
    cacheBuiltinsFromGroups(allGroups);
    return allGroups;
  }, [placementTypes, contextFilter, cacheBuiltinsFromGroups]);

  const loadMenuItems = useCallback(async () => {
    if (!enabled || placementTypes.length === 0) {
      setCategoryGroups([]);
      setLoading(false);
      return;
    }

    // ── Fast path: rows already in Redux from SSR RPC ─────────────────────
    if (isHydrated && cachedRows.length > 0) {
      try {
        const allGroups = buildFromRows(cachedRows as ViewResponse[]);
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

    // ── Fallback: fetch from Supabase (public routes / cache miss) ─────────
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from('context_menu_unified_view')
        .select('placement_type, categories_flat')
        .in('placement_type', placementTypes);

      if (queryError) {
        throw new Error(`Failed to load menu: ${queryError.message}`);
      }

      const allGroups = buildFromRows((data as ViewResponse[]) || []);
      setCategoryGroups(allGroups);

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load context menu'));
      setCategoryGroups([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, placementTypes, contextFilter, isHydrated, cachedRows, buildFromRows]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  return {
    categoryGroups,
    loading,
    error,
    refresh: loadMenuItems,
  };
}