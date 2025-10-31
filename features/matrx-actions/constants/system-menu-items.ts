/**
 * System Menu Items - Hardcoded Definitions
 * 
 * This file defines WHERE actions appear in menus.
 * In production, these will come from the database.
 */

import { MatrxActionMenuItem } from '../types';

export const SYSTEM_MENU_ITEMS: MatrxActionMenuItem[] = [
  // ========================================
  // Standalone Actions (Top-level)
  // ========================================
  {
    id: 'menu-explain',
    actionId: 'explain',
    menuType: 'context_menu',
    category: 'standalone',
    displayOrder: 10,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: false, // Works with selection or editor content
      minSelectionLength: 1
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-summarize',
    actionId: 'summarize',
    menuType: 'context_menu',
    category: 'standalone',
    displayOrder: 20,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: false,
      minSelectionLength: 50 // Summaries work better with more text
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-extract-key-points',
    actionId: 'extract-key-points',
    menuType: 'context_menu',
    category: 'standalone',
    displayOrder: 30,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: false,
      minSelectionLength: 50
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-improve',
    actionId: 'improve',
    menuType: 'context_menu',
    category: 'standalone',
    displayOrder: 40,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: false,
      minSelectionLength: 10
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-get-ideas',
    actionId: 'get-ideas',
    menuType: 'context_menu',
    category: 'standalone',
    displayOrder: 50,
    showInMenu: true,
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-search-web',
    actionId: 'search-web',
    menuType: 'context_menu',
    category: 'standalone',
    displayOrder: 60,
    showInMenu: true,
    uiSettings: {
      successMessage: 'Search completed'
    },
    scope: 'system',
    isSystem: true
  },

  // ========================================
  // Matrx Create Submenu
  // ========================================
  {
    id: 'menu-create-flashcards',
    actionId: 'create-flashcards',
    menuType: 'context_menu',
    category: 'matrx_create',
    subcategory: 'flashcards',
    displayOrder: 10,
    showInMenu: true,
    contextRequirements: {
      minSelectionLength: 100 // Need substantial content
    },
    uiSettings: {
      outputDestination: 'canvas',
      successMessage: 'Flashcards created!'
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-create-presentation',
    actionId: 'create-presentation',
    menuType: 'context_menu',
    category: 'matrx_create',
    subcategory: 'presentation',
    displayOrder: 20,
    showInMenu: true,
    uiSettings: {
      outputDestination: 'canvas',
      successMessage: 'Presentation created!'
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-create-quiz',
    actionId: 'create-quiz',
    menuType: 'context_menu',
    category: 'matrx_create',
    subcategory: 'quiz',
    displayOrder: 30,
    showInMenu: true,
    contextRequirements: {
      minSelectionLength: 100
    },
    uiSettings: {
      outputDestination: 'canvas',
      successMessage: 'Quiz created!'
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-create-flowchart',
    actionId: 'create-flowchart',
    menuType: 'context_menu',
    category: 'matrx_create',
    subcategory: 'flowchart',
    displayOrder: 40,
    showInMenu: true,
    uiSettings: {
      outputDestination: 'canvas',
      successMessage: 'Flow chart created!'
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-create-other',
    actionId: 'create-other',
    menuType: 'context_menu',
    category: 'matrx_create',
    subcategory: 'other',
    displayOrder: 50,
    showInMenu: true,
    uiSettings: {
      showModal: true,
      modalTitle: 'Create Custom Content'
    },
    scope: 'system',
    isSystem: true
  },

  // ========================================
  // Translation Submenu
  // ========================================
  {
    id: 'menu-translate-english',
    actionId: 'translate-english',
    menuType: 'context_menu',
    category: 'translation',
    subcategory: 'english',
    displayOrder: 10,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: true,
      minSelectionLength: 1
    },
    variableOverrides: {
      targetLanguage: {
        default: 'English'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-translate-spanish',
    actionId: 'translate-spanish',
    menuType: 'context_menu',
    category: 'translation',
    subcategory: 'spanish',
    displayOrder: 20,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: true,
      minSelectionLength: 1
    },
    variableOverrides: {
      targetLanguage: {
        default: 'Spanish'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-translate-french',
    actionId: 'translate-french',
    menuType: 'context_menu',
    category: 'translation',
    subcategory: 'french',
    displayOrder: 30,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: true,
      minSelectionLength: 1
    },
    variableOverrides: {
      targetLanguage: {
        default: 'French'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-translate-italian',
    actionId: 'translate-italian',
    menuType: 'context_menu',
    category: 'translation',
    subcategory: 'italian',
    displayOrder: 40,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: true,
      minSelectionLength: 1
    },
    variableOverrides: {
      targetLanguage: {
        default: 'Italian'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-translate-persian',
    actionId: 'translate-persian',
    menuType: 'context_menu',
    category: 'translation',
    subcategory: 'persian',
    displayOrder: 50,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: true,
      minSelectionLength: 1
    },
    variableOverrides: {
      targetLanguage: {
        default: 'Persian'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'menu-translate-other',
    actionId: 'translate-other',
    menuType: 'context_menu',
    category: 'translation',
    subcategory: 'other',
    displayOrder: 60,
    showInMenu: true,
    contextRequirements: {
      requiresSelection: true,
      minSelectionLength: 1
    },
    uiSettings: {
      showModal: true,
      modalTitle: 'Translate to Custom Language'
    },
    scope: 'system',
    isSystem: true
  }
];

/**
 * Helper to get menu items by category
 */
export function getMenuItemsByCategory(category: MatrxActionMenuItem['category']): MatrxActionMenuItem[] {
  return SYSTEM_MENU_ITEMS.filter(item => item.category === category && item.showInMenu)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Helper to get menu items by menu type
 */
export function getMenuItemsByType(menuType: MatrxActionMenuItem['menuType']): MatrxActionMenuItem[] {
  return SYSTEM_MENU_ITEMS.filter(item => item.menuType === menuType && item.showInMenu)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get all visible menu items for context menu
 */
export function getContextMenuItems(): MatrxActionMenuItem[] {
  return getMenuItemsByType('context_menu');
}

