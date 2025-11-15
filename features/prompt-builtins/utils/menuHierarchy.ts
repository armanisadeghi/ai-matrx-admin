import * as LucideIcons from 'lucide-react';
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
  };
  items: any[];
}

/**
 * Builds a hierarchical tree structure from a flat array of categories.
 * Each category can have children nested inside it.
 * 
 * @param flatData - Flat array of categories with items
 * @returns Hierarchical array of CategoryGroup nodes
 */
export function buildCategoryHierarchy(flatData: FlatCategory[]): CategoryGroup[] {
  if (!flatData || flatData.length === 0) return [];

  const idMap = new Map<string, CategoryGroup>();
  const roots: CategoryGroup[] = [];

  // First pass: Create all nodes with hydrated icons
  flatData.forEach(item => {
    const hydratedItems = hydrateIcons(item.items || []);
    
    const node: CategoryGroup = {
      category: item.category,
      items: hydratedItems,
      children: [],
    };
    
    idMap.set(item.category.id, node);
  });

  // Second pass: Link children to parents
  flatData.forEach(item => {
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
      const IconComponent = (LucideIcons as any)[item.icon_name] || LucideIcons.FileText;
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