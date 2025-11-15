/**
 * useContextMenuShortcuts
 * 
 * Loads shortcuts for context menu placement types from the database.
 * Uses direct Supabase client access via optimized view for maximum performance.
 * Groups them by category for hierarchical display.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { ShortcutCategory, PromptShortcut, PromptBuiltin } from '../types';
import { PLACEMENT_TYPES } from '../constants';

interface ShortcutWithBuiltin extends PromptShortcut {
  prompt_builtin: PromptBuiltin | null;
  category: ShortcutCategory | null;
}

interface CategoryGroup {
  category: ShortcutCategory;
  shortcuts: ShortcutWithBuiltin[];
}

interface UseContextMenuShortcutsReturn {
  shortcuts: ShortcutWithBuiltin[];
  categoryGroups: CategoryGroup[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to load context menu shortcuts
 * 
 * @param placementTypes - Array of placement types to filter by (defaults to all context-menu types)
 * @param enabled - Whether to load data (for conditional rendering)
 */
export function useContextMenuShortcuts(
  placementTypes: string[] = [
    PLACEMENT_TYPES.AI_ACTION,
    PLACEMENT_TYPES.CONTENT_BLOCK,
    PLACEMENT_TYPES.ORGANIZATION_TOOL,
    PLACEMENT_TYPES.USER_TOOL,
  ],
  enabled: boolean = true
): UseContextMenuShortcutsReturn {
  const [shortcuts, setShortcuts] = useState<ShortcutWithBuiltin[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadShortcuts = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Query the optimized view directly - much faster than API route!
      const { data, error: queryError } = await supabase
        .from('shortcuts_by_placement_view')
        .select('*')
        .in('placement_type', placementTypes);

      if (queryError) {
        throw new Error(`Failed to load shortcuts: ${queryError.message}`);
      }

      // Transform view data into our expected format
      const shortcutsMap = new Map<string, ShortcutWithBuiltin>();
      const categoriesMap = new Map<string, ShortcutCategory>();

      (data || []).forEach((row: any) => {
        // Build category object (reuse if already created)
        if (!categoriesMap.has(row.category_id)) {
          categoriesMap.set(row.category_id, {
            id: row.category_id,
            placement_type: row.placement_type,
            parent_category_id: row.parent_category_id,
            label: row.category_label,
            description: row.category_description,
            icon_name: row.category_icon,
            color: row.category_color,
            sort_order: row.category_sort_order,
            is_active: row.category_is_active,
            metadata: row.category_metadata,
          });
        }

        // Build shortcut with builtin
        const shortcut: ShortcutWithBuiltin = {
          id: row.shortcut_id,
          created_at: row.shortcut_created_at,
          updated_at: row.shortcut_updated_at,
          prompt_builtin_id: row.prompt_builtin_id,
          category_id: row.category_id,
          label: row.shortcut_label,
          description: row.shortcut_description,
          icon_name: row.shortcut_icon,
          keyboard_shortcut: row.keyboard_shortcut,
          sort_order: row.shortcut_sort_order,
          scope_mappings: row.scope_mappings,
          available_scopes: row.available_scopes,
          // Execution Configuration (Boolean-based)
          result_display: row.result_display || 'modal',
          auto_run: row.auto_run ?? true,
          allow_chat: row.allow_chat ?? true,
          show_variables: row.show_variables ?? false,
          apply_variables: row.apply_variables ?? true,
          is_active: row.shortcut_is_active,
          created_by_user_id: null,
          category: categoriesMap.get(row.category_id)!,
          prompt_builtin: row.builtin_id ? {
            id: row.builtin_id,
            created_at: '',
            updated_at: '',
            name: row.builtin_name,
            description: row.builtin_description,
            messages: row.builtin_messages,
            variableDefaults: row.builtin_variable_defaults,
            tools: row.builtin_tools,
            settings: row.builtin_settings,
            created_by_user_id: '',
            is_active: row.builtin_is_active,
            source_prompt_id: row.source_prompt_id,
            source_prompt_snapshot_at: row.source_prompt_snapshot_at,
          } : null,
        };

        shortcutsMap.set(shortcut.id, shortcut);
      });

      const allShortcuts = Array.from(shortcutsMap.values());
      setShortcuts(allShortcuts);

      // Group by category
      const categoryMap = new Map<string, CategoryGroup>();
      
      allShortcuts.forEach(shortcut => {
        if (!shortcut.category) return;
        
        const categoryId = shortcut.category.id;
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            category: shortcut.category,
            shortcuts: [],
          });
        }
        
        categoryMap.get(categoryId)!.shortcuts.push(shortcut);
      });

      // Sort categories by sort_order, then shortcuts within each category
      const groups = Array.from(categoryMap.values())
        .sort((a, b) => (a.category.sort_order || 0) - (b.category.sort_order || 0))
        .map(group => ({
          ...group,
          shortcuts: group.shortcuts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        }));

      setCategoryGroups(groups);
    } catch (err) {
      console.error('[useContextMenuShortcuts] Error loading shortcuts:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShortcuts();
  }, [enabled, placementTypes.join(',')]);

  return {
    shortcuts,
    categoryGroups,
    loading,
    error,
    refresh: loadShortcuts,
  };
}

/**
 * Hook to load shortcuts for a specific placement type
 */
export function useShortcutsByPlacement(placementType: string, enabled: boolean = true) {
  return useContextMenuShortcuts([placementType], enabled);
}

