/**
 * useUnifiedContextMenu
 * 
 * Loads ALL menu items (shortcuts + content blocks) from a SINGLE unified view.
 * This is THE definitive hook for loading context menu data.
 * 
 * REPLACES: useContextMenuShortcuts + useContentBlocks for context menus
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { ShortcutCategory, PromptBuiltin } from '../types';
import * as LucideIcons from 'lucide-react';

// Shortcut item (from prompt_shortcuts table)
export interface ShortcutItem {
  type: 'prompt_shortcut';
  id: string;
  label: string;
  description: string | null;
  icon_name: string | null;
  sort_order: number;
  keyboard_shortcut: string | null;
  scope_mappings: any;
  available_scopes: string[] | null;
  result_display: string;
  auto_run: boolean;
  allow_chat: boolean;
  show_variables: boolean;
  apply_variables: boolean;
  prompt_builtin_id: string | null;
  // Included builtin data (for execution)
  prompt_builtin: PromptBuiltin | null;
}

// Content block item (from content_blocks table)
export interface ContentBlockItem {
  type: 'content_block';
  id: string;
  label: string;
  description: string | null;
  icon: any; // Lucide icon component
  icon_name: string | null;
  sort_order: number;
  template: string;
  block_id: string;
}

// Union type for all menu items
export type MenuItem = ShortcutItem | ContentBlockItem;

// Category with its items (hierarchical!)
export interface CategoryGroup {
  category: ShortcutCategory;
  items: MenuItem[];
  children?: CategoryGroup[]; // Recursive structure for nested categories
}

interface UseUnifiedContextMenuReturn {
  categoryGroups: CategoryGroup[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Load all context menu items (shortcuts + content blocks) from unified view
 * 
 * @param placementTypes - Array of placement types to load
 * @param enabled - Whether to load data
 */
export function useUnifiedContextMenu(
  placementTypes: string[] = [],
  enabled: boolean = true
): UseUnifiedContextMenuReturn {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMenuItems = async () => {
    if (!enabled || placementTypes.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Query the UNIFIED view - gets both shortcuts AND content blocks!
      const { data, error: queryError } = await supabase
        .from('unified_context_menu_view')
        .select('*')
        .in('placement_type', placementTypes);

      if (queryError) {
        throw new Error(`Failed to load menu items: ${queryError.message}`);
      }

      console.log('[useUnifiedContextMenu] Loaded items from unified view:', data);

      // Build categories and items maps
      const categoriesMap = new Map<string, ShortcutCategory>();
      const itemsByCategory = new Map<string, MenuItem[]>();

      (data || []).forEach((row: any) => {
        // Build or update category
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
          itemsByCategory.set(row.category_id, []);
        }

        const items = itemsByCategory.get(row.category_id)!;

        // Build the appropriate item type
        if (row.item_type === 'prompt_shortcut') {
          // Transform builtin data (snake_case → camelCase for variableDefaults)
          const builtin: PromptBuiltin | null = row.builtin_id ? {
            id: row.builtin_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            name: row.builtin_name,
            description: row.builtin_description,
            messages: row.builtin_messages,
            variableDefaults: row.builtin_variable_defaults || [],
            tools: row.builtin_tools,
            settings: row.builtin_settings,
            created_by_user_id: null,
            is_active: row.builtin_is_active,
            source_prompt_id: row.source_prompt_id,
            source_prompt_snapshot_at: row.source_prompt_snapshot_at,
          } : null;

          const shortcutItem: ShortcutItem = {
            type: 'prompt_shortcut',
            id: row.item_id,
            label: row.label,
            description: row.description,
            icon_name: row.icon_name,
            sort_order: row.sort_order,
            keyboard_shortcut: row.keyboard_shortcut,
            scope_mappings: row.scope_mappings,
            available_scopes: row.available_scopes,
            result_display: row.result_display || 'modal',
            auto_run: row.auto_run ?? true,
            allow_chat: row.allow_chat ?? true,
            show_variables: row.show_variables ?? false,
            apply_variables: row.apply_variables ?? true,
            prompt_builtin_id: row.prompt_builtin_id,
            prompt_builtin: builtin,
          };

          items.push(shortcutItem);
        } else if (row.item_type === 'content_block') {
          // Get Lucide icon
          const IconComponent = row.icon_name && (LucideIcons as any)[row.icon_name] 
            ? (LucideIcons as any)[row.icon_name]
            : LucideIcons.FileText;

          const contentBlockItem: ContentBlockItem = {
            type: 'content_block',
            id: row.item_id,
            label: row.label,
            description: row.description,
            icon: IconComponent,
            icon_name: row.icon_name,
            sort_order: row.sort_order,
            template: row.template,
            block_id: row.block_id,
          };

          items.push(contentBlockItem);
        }
      });

      // Build hierarchical structure
      const buildHierarchy = (parentId: string | null): CategoryGroup[] => {
        const children: CategoryGroup[] = [];
        
        for (const [categoryId, category] of categoriesMap.entries()) {
          if (category.parent_category_id === parentId) {
            const items = itemsByCategory.get(categoryId) || [];
            
            // Sort items by sort_order
            items.sort((a, b) => a.sort_order - b.sort_order);
            
            children.push({
              category,
              items,
              children: buildHierarchy(categoryId), // Recursive!
            });
          }
        }
        
        // Sort children by category sort_order
        children.sort((a, b) => a.category.sort_order - b.category.sort_order);
        
        return children;
      };

      // Build hierarchy starting from root categories (parent_category_id = null)
      const hierarchy = buildHierarchy(null);

      setCategoryGroups(hierarchy);
      console.log('[useUnifiedContextMenu] Hierarchical groups:', hierarchy);
    } catch (err) {
      console.error('[useUnifiedContextMenu] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, [JSON.stringify(placementTypes), enabled]);

  return {
    categoryGroups,
    loading,
    error,
    refresh: loadMenuItems,
  };
}

