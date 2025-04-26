// Contains all official reusable components
export interface ComponentEntry {
  id: string;
  name: string;
  path: string;
  description?: string;
}

// Documentation: official-components.md

export const componentList: ComponentEntry[] = [
  {
    id: 'icon-button',
    name: 'Icon Button with Tooltip',
    path: 'components/ui/official/icon-button.tsx',
    description: 'Button with icon and tooltip support for quick actions',
  },
  {
    id: 'text-icon-button',
    name: 'Text Icon Button With Tooltip',
    path: 'components/ui/official/TextIconButton.tsx',
    description: 'Button with text, icon and tooltip support',
  },
  {
    id: 'accordion-wrapper',
    name: 'Accordion Collapsible Wrapper',
    path: 'components/matrx/matrx-collapsible/AccordionWrapper.tsx',
    description: 'Collapsible section with header and content',
  },
  {
    id: 'state-persisting-accordion',
    name: 'State Persisting Accordion Wrapper',
    path: 'components/matrx/matrx-collapsible/StatePersistingAccordionWrapper.tsx',
    description: 'Collapsible accordion that persists its state',
  },
  {
    id: 'chat-collapsible',
    name: 'Chat Collapsible Wrapper',
    path: 'components/mardown-display/blocks/ChatCollapsibleWrapper.tsx',
    description: 'Collapsible wrapper for chat interactions',
  },
  {
    id: 'full-screen-overlay',
    name: 'Full Screen Overlay',
    path: 'components/official/FullScreenOverlay.tsx',
    description: 'Full screen overlay with tab support',
  },
  {
    id: 'card-and-grid',
    name: 'Card & Grid System',
    path: 'components/official/card-and-grid',
    description: 'Flexible grid system with colorful cards, horizontal cards, and list components',
  },
  {
    id: 'floating-dock',
    name: 'Floating Dock',
    path: 'components/official/FloatingDock.tsx',
    description: 'Floating dock component for persistent tools or actions',
  },
  {
    id: 'icon-select',
    name: 'Icon Select',
    path: 'components/official/IconSelect.tsx',
    description: 'Icon-only select component with dropdown of labeled items',
  },
  {
    id: 'json-explorer',
    name: 'JSON Explorer',
    path: 'features/scraper/parts/RawJsonExplorer.tsx',
    description: 'Advanced component for exploring and manipulating JSON data',
  }
]; 