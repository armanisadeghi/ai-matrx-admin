// Contains all official reusable components
export interface ComponentEntry {
  id: string;
  name: string;
  path: string;
  description?: string;
  category: ComponentCategory;
  tags?: string[]; // Optional tags for enhanced searching
}

// Component categories
export type ComponentCategory = 
  | 'buttons'
  | 'navigation' 
  | 'layout' 
  | 'inputs' 
  | 'display' 
  | 'feedback'
  | 'data'
  | 'overlays';

// Documentation: official-components.md

export const componentList: ComponentEntry[] = [
  {
    id: 'icon-button',
    name: 'Icon Button with Tooltip',
    path: 'components/official/icon-button.tsx',
    description: 'Button with icon and tooltip support for quick actions',
    category: 'buttons',
    tags: ['icon', 'tooltip', 'action', 'clickable']
  },
  {
    id: 'text-icon-button',
    name: 'Text Icon Button With Tooltip',
    path: 'components/official/TextIconButton.tsx',
    description: 'Button with text, icon and tooltip support',
    category: 'buttons',
    tags: ['icon', 'text', 'tooltip', 'action', 'clickable']
  },
  {
    id: 'action-feedback-button',
    name: 'Action Feedback Button',
    path: 'components/official/ActionFeedbackButton.tsx',
    description: 'Button that shows visual success feedback after action completion',
    category: 'buttons',
    tags: ['icon', 'tooltip', 'action', 'feedback', 'success']
  },
  {
    id: 'accordion-wrapper',
    name: 'Accordion Collapsible Wrapper',
    path: 'components/matrx/matrx-collapsible/AccordionWrapper.tsx',
    description: 'Collapsible section with header and content',
    category: 'layout',
    tags: ['accordion', 'collapsible', 'expandable', 'section']
  },
  {
    id: 'state-persisting-accordion',
    name: 'State Persisting Accordion Wrapper',
    path: 'components/matrx/matrx-collapsible/StatePersistingAccordionWrapper.tsx',
    description: 'Collapsible accordion that persists its state',
    category: 'layout',
    tags: ['accordion', 'collapsible', 'expandable', 'state', 'persistence']
  },
  {
    id: 'chat-collapsible',
    name: 'Chat Collapsible Wrapper',
    path: 'components/mardown-display/blocks/ChatCollapsibleWrapper.tsx',
    description: 'Collapsible wrapper for chat interactions',
    category: 'layout',
    tags: ['accordion', 'collapsible', 'chat', 'expandable']
  },
  {
    id: 'advanced-collapsible',
    name: 'Advanced Collapsible',
    path: 'components/official/AdvancedCollapsible.tsx',
    description: 'Enhanced collapsible with action buttons and fullscreen capability',
    category: 'layout',
    tags: ['accordion', 'collapsible', 'expandable', 'fullscreen', 'actions']
  },
  {
    id: 'full-screen-overlay',
    name: 'Full Screen Overlay',
    path: 'components/official/FullScreenOverlay.tsx',
    description: 'Full screen overlay with tab support',
    category: 'overlays',
    tags: ['overlay', 'fullscreen', 'modal', 'dialog', 'tabs']
  },
  {
    id: 'card-and-grid',
    name: 'Card & Grid System',
    path: 'components/official/card-and-grid',
    description: 'Flexible grid system with colorful cards, horizontal cards, and list components',
    category: 'layout',
    tags: ['card', 'grid', 'list', 'display', 'content']
  },
  {
    id: 'floating-dock',
    name: 'Floating Dock',
    path: 'components/official/FloatingDock.tsx',
    description: 'Floating dock component with animated icons for desktop and mobile',
    category: 'navigation',
    tags: ['dock', 'menu', 'bar', 'icons', 'navigation', 'animated']
  },
  {
    id: 'balanced-floating-dock',
    name: 'Balanced Floating Dock',
    path: 'components/official/BalancedFloatingDock.tsx',
    description: 'Enhanced floating dock that grows in place with configurable options',
    category: 'navigation',
    tags: ['dock', 'menu', 'bar', 'icons', 'navigation', 'configurable']
  },
  {
    id: 'icon-select',
    name: 'Icon Select',
    path: 'components/official/IconSelect.tsx',
    description: 'Icon-only select component with dropdown of labeled items',
    category: 'inputs',
    tags: ['select', 'dropdown', 'icon', 'input', 'choice']
  },
  {
    id: 'json-explorer',
    name: 'JSON Explorer',
    path: 'features/scraper/parts/RawJsonExplorer.tsx',
    description: 'Advanced component for exploring and manipulating JSON data',
    category: 'data',
    tags: ['json', 'explorer', 'data', 'viewer', 'interactive']
  }
]; 

// Helper functions for component filtering and searching
export function getComponentsByCategory(category: ComponentCategory): ComponentEntry[] {
  return componentList.filter(component => component.category === category);
}

export function searchComponents(query: string): ComponentEntry[] {
  if (!query || query.trim() === '') {
    return componentList;
  }
  
  const searchTerms = query.toLowerCase().trim().split(/\s+/);
  
  return componentList.filter(component => {
    // Check name, description, and tags for matches
    const searchableText = `${component.name} ${component.description || ''} ${component.tags?.join(' ') || ''}`.toLowerCase();
    
    // Match if ALL search terms are found
    return searchTerms.every(term => searchableText.includes(term));
  });
}

// Get unique categories with component counts
export function getCategoriesWithCounts(): { category: ComponentCategory; count: number }[] {
  const categories = new Map<ComponentCategory, number>();
  
  componentList.forEach(component => {
    const currentCount = categories.get(component.category) || 0;
    categories.set(component.category, currentCount + 1);
  });
  
  return Array.from(categories.entries()).map(([category, count]) => ({ category, count }));
} 