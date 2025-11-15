/**
 * Placement types for prompt shortcuts
 * These define where and how shortcuts can be triggered
 */
export const PLACEMENT_TYPES = {
  AI_ACTION: 'ai-action',           // Context menu for ai-actions
  BUTTON: 'button',       // Pre-programmed buttons that trigger builtin prompts
  CARD: 'card',           // Pre-programmed cards with auto-scoped title/description
  QUICK_ACTION: 'quick-action', // Trigger specific functionality
  MODAL: 'modal',         // Render a given modal
  CONTENT_BLOCK: 'content-block', // Content blocks for insertion in editors
  ORGANIZATION_TOOL: 'organization-tool', // Organization tools
  USER_TOOL: 'user-tool', // User tools
  
} as const;

export type PlacementType = typeof PLACEMENT_TYPES[keyof typeof PLACEMENT_TYPES];

/**
 * Placement type metadata for UI display
 */
export const PLACEMENT_TYPE_META = {
  [PLACEMENT_TYPES.AI_ACTION]: {
    label: 'AI Actions',
    description: 'AI actions available in context menus',
    icon: 'Sparkles',
  },
  [PLACEMENT_TYPES.BUTTON]: {
    label: 'Button',
    description: 'Pre-programmed buttons that trigger prompts',
    icon: 'MousePointerClick',
  },
  [PLACEMENT_TYPES.CARD]: {
    label: 'Card',
    description: 'Cards with auto-scoped title and description',
    icon: 'LayoutGrid',
  },
  [PLACEMENT_TYPES.QUICK_ACTION]: {
    label: 'Quick Action',
    description: 'Trigger specific functionality quickly',
    icon: 'Zap',
  },
  [PLACEMENT_TYPES.MODAL]: {
    label: 'Modal',
    description: 'Render a modal interface',
    icon: 'Square',
  },
  [PLACEMENT_TYPES.CONTENT_BLOCK]: {
    label: 'Content Block',
    description: 'Content blocks for insertion in editors',
    icon: 'FileText',
  },
  [PLACEMENT_TYPES.ORGANIZATION_TOOL]: {
    label: 'Organization Tool',
    description: 'Organization tools',
    icon: 'Building',
  },
  [PLACEMENT_TYPES.USER_TOOL]: {
    label: 'User Tool',
    description: 'User tools',
    icon: 'User',
  },
} as const satisfies Record<PlacementType, {
  label: string;
  description: string;
  icon: string;
}>;

// TypeScript check to ensure all placement types have metadata
type PlacementTypeMetaKeys = keyof typeof PLACEMENT_TYPE_META;
type PlacementTypeKeys = typeof PLACEMENT_TYPES[keyof typeof PLACEMENT_TYPES];
// This will cause a compile error if any placement type is missing from PLACEMENT_TYPE_META
const _typeCheck: PlacementTypeKeys extends PlacementTypeMetaKeys ? true : never = true;

/**
 * Safely get placement type metadata with fallback
 * Prevents runtime errors when a placement type is missing from metadata
 * Returns the actual placement type value as the label if metadata is missing
 */
export function getPlacementTypeMeta(placementType: string) {
  const meta = PLACEMENT_TYPE_META[placementType as PlacementType];
  if (!meta) {
    console.warn(`Missing metadata for placement type: ${placementType}`);
    // Return the actual placement type value instead of "Unknown"
    return {
      label: placementType || 'undefined',
      description: 'No description available',
      icon: 'HelpCircle',
    };
  }
  return meta;
}

/**
 * Scope levels - hardcoded in the application
 * These are the three scopes that the app always provides
 */
export const SCOPE_LEVELS = {
  SELECTION: 'selection',
  CONTENT: 'content',
  CONTEXT: 'context',
} as const;

export type ScopeLevel = typeof SCOPE_LEVELS[keyof typeof SCOPE_LEVELS];

/**
 * Default values for unavailable scopes
 */
export const SCOPE_UNAVAILABLE_VALUES = {
  EMPTY: '',
  NOT_AVAILABLE: 'NOT AVAILABLE',
} as const;

/**
 * Common scope configurations for different placement types
 * These define what scope keys are available in different contexts
 */
export const COMMON_SCOPE_CONFIGURATIONS = {
  // Context menu - typically has selection, content, and context
  MENU_FULL: ['selection', 'content', 'context'],
  MENU_SELECTION_ONLY: ['selection'],
  MENU_CONTENT_ONLY: ['content'],
  
  // Button - typically no selection, just content and context
  BUTTON_STANDARD: ['content', 'context'],
  BUTTON_CONTENT_ONLY: ['content'],
  
  // Card - title as selection, description as content, visible cards as context
  CARD_FULL: ['selection', 'content', 'context'],
  CARD_TITLE_ONLY: ['selection'],
  
  // Quick action - varies by implementation
  QUICK_ACTION_FULL: ['selection', 'content', 'context'],
  QUICK_ACTION_NO_SELECTION: ['content', 'context'],
  
  // Modal - typically has access to all scopes
  MODAL_FULL: ['selection', 'content', 'context'],
} as const;

/**
 * Descriptions for scope configurations
 * Helps admins understand what each scope represents in different contexts
 */
export const SCOPE_CONFIGURATION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  'ai-action': {
    selection: 'Highlighted/selected text or item',
    content: 'Current item or primary content',
    context: 'Surrounding data or additional context',
  },
  button: {
    content: 'Button\'s associated data',
    context: 'Page or component context',
  },
  card: {
    selection: 'Card title',
    content: 'Card description',
    context: 'All visible cards and page content',
  },
  'quick-action': {
    selection: 'Selected item (if applicable)',
    content: 'Current item or data',
    context: 'Application context',
  },
  modal: {
    selection: 'Selected content in modal',
    content: 'Modal\'s primary data',
    context: 'Modal and application context',
  },
  'content-block': {
    selection: 'Selected content in content block',
    content: 'Content block\'s primary data',
    context: 'Content block and application context',
  },
  'organization-tool': {
    selection: 'Selected organization',
    content: 'Organization\'s primary data',
    context: 'Organization and application context',
  },
  'user-tool': {
    selection: 'Selected user',
    content: 'User\'s primary data',
    context: 'User and application context',
  },
};

