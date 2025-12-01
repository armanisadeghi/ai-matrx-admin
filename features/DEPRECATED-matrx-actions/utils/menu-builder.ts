/**
 * Menu Builder Utilities
 * 
 * Helper functions to combine actions and menu items into hierarchical structures
 */

import {
  MatrxAction,
  MatrxActionMenuItem,
  MatrxActionMenuItemWithAction,
  MatrxMenuCategory,
  ActionCategory,
  AvailableContext
} from '../types';
import { SYSTEM_ACTIONS } from '../constants/system-actions';
import { SYSTEM_MENU_ITEMS } from '../constants/system-menu-items';

/**
 * Category metadata for display
 */
export const CATEGORY_INFO: Record<ActionCategory, { label: string; description?: string }> = {
  standalone: {
    label: 'Quick Actions',
    description: 'Commonly used actions'
  },
  matrx_create: {
    label: 'Matrx Create',
    description: 'Generate new content'
  },
  translation: {
    label: 'Translation',
    description: 'Translate to different languages'
  },
  personal: {
    label: 'Personal Actions',
    description: 'Your personal actions'
  },
  org: {
    label: 'Org Actions',
    description: 'Organization-wide actions'
  },
  workspace: {
    label: 'Workspace Actions',
    description: 'Workspace-specific actions'
  }
};

/**
 * Combine menu item with its action data
 */
export function enrichMenuItem(
  menuItem: MatrxActionMenuItem,
  actions: MatrxAction[] = SYSTEM_ACTIONS
): MatrxActionMenuItemWithAction | null {
  const action = actions.find(a => a.id === menuItem.actionId);
  
  if (!action) {
    console.warn(`Action not found for menu item: ${menuItem.actionId}`);
    return null;
  }

  return {
    ...menuItem,
    action,
    effectiveLabel: menuItem.displayLabel || action.name,
    effectiveIcon: menuItem.displayIcon || action.icon,
    effectiveDescription: menuItem.displayDescription || action.description
  };
}

/**
 * Check if a menu item should be visible based on context
 */
export function isMenuItemVisible(
  menuItem: MatrxActionMenuItem,
  context: AvailableContext
): boolean {
  if (!menuItem.showInMenu) return false;
  
  const requirements = menuItem.contextRequirements;
  if (!requirements) return true;

  // Check selection requirements
  if (requirements.requiresSelection && !context.selectedText) {
    return false;
  }

  // Check minimum selection length
  if (requirements.minSelectionLength && context.selectedText) {
    if (context.selectedText.length < requirements.minSelectionLength) {
      return false;
    }
  }

  // Check maximum selection length
  if (requirements.maxSelectionLength && context.selectedText) {
    if (context.selectedText.length > requirements.maxSelectionLength) {
      return false;
    }
  }

  // Additional checks can be added here (file types, editor types, etc.)

  return true;
}

/**
 * Build hierarchical menu structure for context menu
 */
export function buildContextMenu(
  context: AvailableContext = {},
  menuItems: MatrxActionMenuItem[] = SYSTEM_MENU_ITEMS,
  actions: MatrxAction[] = SYSTEM_ACTIONS
): MatrxMenuCategory[] {
  // Filter to context menu items only
  const contextMenuItems = menuItems.filter(item => item.menuType === 'context_menu');

  // Enrich with action data and filter by context
  const enrichedItems = contextMenuItems
    .map(item => enrichMenuItem(item, actions))
    .filter((item): item is MatrxActionMenuItemWithAction => item !== null)
    .filter(item => isMenuItemVisible(item, context))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Group by category
  const categoryMap = new Map<ActionCategory, MatrxActionMenuItemWithAction[]>();
  
  for (const item of enrichedItems) {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, []);
    }
    categoryMap.get(item.category)!.push(item);
  }

  // Build category structures
  const categories: MatrxMenuCategory[] = [];
  
  for (const [category, items] of categoryMap) {
    // Group by subcategory if present
    const subcategoryMap = new Map<string, MatrxActionMenuItemWithAction[]>();
    const standaloneItems: MatrxActionMenuItemWithAction[] = [];

    for (const item of items) {
      if (item.subcategory) {
        if (!subcategoryMap.has(item.subcategory)) {
          subcategoryMap.set(item.subcategory, []);
        }
        subcategoryMap.get(item.subcategory)!.push(item);
      } else {
        standaloneItems.push(item);
      }
    }

    const categoryData: MatrxMenuCategory = {
      category,
      label: CATEGORY_INFO[category]?.label || category,
      items: standaloneItems,
      subcategories: Array.from(subcategoryMap.entries()).map(([subcategory, subItems]) => ({
        subcategory,
        label: subcategory.charAt(0).toUpperCase() + subcategory.slice(1),
        items: subItems
      }))
    };

    categories.push(categoryData);
  }

  return categories;
}

/**
 * Get all standalone (top-level) actions
 */
export function getStandaloneActions(
  context: AvailableContext = {},
  menuItems: MatrxActionMenuItem[] = SYSTEM_MENU_ITEMS,
  actions: MatrxAction[] = SYSTEM_ACTIONS
): MatrxActionMenuItemWithAction[] {
  const categories = buildContextMenu(context, menuItems, actions);
  const standalone = categories.find(c => c.category === 'standalone');
  return standalone?.items || [];
}

/**
 * Get grouped actions (non-standalone)
 */
export function getGroupedActions(
  context: AvailableContext = {},
  menuItems: MatrxActionMenuItem[] = SYSTEM_MENU_ITEMS,
  actions: MatrxAction[] = SYSTEM_ACTIONS
): MatrxMenuCategory[] {
  const categories = buildContextMenu(context, menuItems, actions);
  return categories.filter(c => c.category !== 'standalone');
}

