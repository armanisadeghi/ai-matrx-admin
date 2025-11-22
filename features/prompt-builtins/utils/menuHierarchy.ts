import { getIconComponent } from '@/components/official/IconResolver';
import { FileText } from 'lucide-react';
import type { CategoryGroup, MenuItem } from '@/features/prompt-builtins/types/menu';
import type { PlacementType } from '@/features/prompt-builtins/constants';

interface FlatCategory {
  category: {
    id: string;
    placement_type: PlacementType;
    parent_category_id: string | null;
    label: string;
    description: string | null;
    icon_name: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean;
    metadata: any;
    enabled_contexts?: string[] | null; // NEW: context filtering support
  };
  items: any[];
}

/**
 * Filters categories and their items by enabled_contexts.
 * Only returns categories and items that include the specified context.
 * 
 * @param flatData - Flat array of categories with items
 * @param contextFilter - Context to filter by (e.g., 'code-editor', 'note-editor')
 * @returns Filtered flat array with only relevant categories/items
 */
export function filterByContext(
  flatData: FlatCategory[],
  contextFilter?: string
): FlatCategory[] {
  // If no filter specified, return all data
  if (!contextFilter) return flatData;

  return flatData
    .map(category => {
      // Check if category is enabled for this context
      const categoryEnabled = category.category.enabled_contexts?.includes(contextFilter) ?? true;
      if (!categoryEnabled) return null;

      // Filter items that are enabled for this context
      const filteredItems = category.items.filter(item => {
        const itemEnabled = item.enabled_contexts?.includes(contextFilter) ?? true;
        return itemEnabled;
      });

      // Only return category if it has items after filtering
      if (filteredItems.length === 0) return null;

      return {
        ...category,
        items: filteredItems,
      };
    })
    .filter((cat): cat is FlatCategory => cat !== null);
}

/**
 * Builds a hierarchical tree structure from a flat array of categories.
 * Each category can have children nested inside it.
 * 
 * @param flatData - Flat array of categories with items
 * @param contextFilter - Optional context to filter by (e.g., 'code-editor')
 * @returns Hierarchical array of CategoryGroup nodes
 */
export function buildCategoryHierarchy(
  flatData: FlatCategory[],
  contextFilter?: string
): CategoryGroup[] {
  if (!flatData || flatData.length === 0) return [];

  // Apply context filter if specified
  const filteredData = filterByContext(flatData, contextFilter);
  if (filteredData.length === 0) return [];

  const idMap = new Map<string, CategoryGroup>();
  const roots: CategoryGroup[] = [];

  // First pass: Create all nodes with hydrated icons
  filteredData.forEach(item => {
    const hydratedItems = hydrateIcons(item.items || []);

    const node: CategoryGroup = {
      category: item.category,
      items: hydratedItems,
      children: [],
    };

    idMap.set(item.category.id, node);
  });

  // Second pass: Link children to parents
  filteredData.forEach(item => {
    const node = idMap.get(item.category.id);
    if (!node) return;

    if (item.category.parent_category_id) {
      const parent = idMap.get(item.category.parent_category_id);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // Third pass: Sort recursively by sort_order
  sortHierarchyRecursive(roots);

  return roots;
}

/**
 * Hydrates Lucide icon components for content block items.
 * Lucide icons can't be stored in the database, so we inject them here.
 * 
 * @param items - Array of menu items
 * @returns Items with hydrated icon components
 */
function hydrateIcons(items: any[]): MenuItem[] {
  return items.map((item: any) => {
    if (item.type === 'content_block' && item.icon_name) {
      const IconComponent = getIconComponent(item.icon_name, "FileText");
      return { ...item, icon: IconComponent };
    }
    return item;
  });
}

/**
 * Recursively sorts a category hierarchy by sort_order.
 * Sorts both the current level and all nested children.
 * 
 * @param nodes - Array of category nodes to sort
 */
function sortHierarchyRecursive(nodes: CategoryGroup[]): void {
  // Sort current level
  nodes.sort((a, b) => a.category.sort_order - b.category.sort_order);

  // Recursively sort children
  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      sortHierarchyRecursive(node.children);
    }
  });
}