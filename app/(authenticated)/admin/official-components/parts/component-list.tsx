import { Component, Menu, PanelLeft, Layout, BarChart, Eye, MessageSquare, FileUp, Image, Layers } from 'lucide-react';


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
  | 'overlays'
  | 'media';

export const categoryNames: Record<ComponentCategory, string> = {
  buttons: 'Buttons',
  navigation: 'Navigation',
  layout: 'Layout',
  inputs: 'Inputs',
  display: 'Display',
  feedback: 'Feedback',
  data: 'Data',
  overlays: 'Overlays',
  media: 'Media'
};




export const categoryIcons: Record<ComponentCategory, React.ReactNode> = {
  buttons: <Menu className="h-4 w-4" />,
  navigation: <PanelLeft className="h-4 w-4" />,
  layout: <Layout className="h-4 w-4" />,
  inputs: <FileUp className="h-4 w-4" />,
  display: <Eye className="h-4 w-4" />,
  feedback: <MessageSquare className="h-4 w-4" />,
  data: <BarChart className="h-4 w-4" />,
  overlays: <Layers className="h-4 w-4" />,
  media: <Image className="h-4 w-4" />
};


// Documentation: official-components.md

export const componentList: ComponentEntry[] = [
  {
    id: 'icon-button',
    name: 'Icon Button with Tooltip',
    path: 'components/official/IconButton.tsx',
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
  },
  {
    id: 'public-image-search',
    name: 'Public Image Search',
    path: 'components/official/PublicImageSearch.tsx',
    description: 'Search and select public images from Unsplash with direct URL input option',
    category: 'media',
    tags: ['image', 'search', 'select', 'unsplash', 'media', 'input', 'modal']
  },
  {
    id: 'image-manager',
    name: 'Image Manager',
    path: 'components/image/ImageManager.tsx',
    description: 'Full-screen image manager with tabs for browsing and selecting images from multiple sources',
    category: 'media',
    tags: ['image', 'gallery', 'select', 'manager', 'modal', 'tabs', 'unsplash']
  },
  {
    id: 'image-preview-row',
    name: 'Image Preview Row',
    path: 'components/image/shared/ImagePreviewRow.tsx',
    description: 'Responsive row for displaying selected image previews with various size options',
    category: 'media',
    tags: ['image', 'preview', 'thumbnails', 'gallery', 'responsive', 'carousel']
  },
  {
    id: 'image-manager-row',
    name: 'Image Manager Row',
    path: 'components/image/shared/ImageManagerRow.tsx',
    description: 'All-in-one image selection component that combines preview row with image manager',
    category: 'media',
    tags: ['image', 'upload', 'preview', 'select', 'manager', 'input']
  },
  {
    id: 'image-manager-icon',
    name: 'Image Manager Icon',
    path: 'components/image/shared/ImageManagerIcon.tsx',
    description: 'Icon-only image selection component with dropdown of labeled items',
    category: 'media',
    tags: ['image', 'upload', 'preview', 'select', 'manager', 'input']
  },
  {
    id: 'single-image-select',
    name: 'Single Image Select',
    path: 'components/image/shared/SingleImageSelect.tsx',
    description: 'Single image selection component with preview and upload options',
    category: 'media',
    tags: ['image', 'upload', 'preview', 'select', 'manager', 'input']
  },
  {
    id: 'image-cropper',
    name: 'Image Cropper',
    path: 'components/official/image-cropper/index.tsx',
    description: 'Flexible image cropping component with aspect ratio selection and preview',
    category: 'media',
    tags: ['image', 'crop', 'edit', 'aspect ratio', 'resize', 'media']
  },
  {
    id: 'multi-applet-selector',
    name: 'Multi Applet Selector',
    path: 'features/applet/builder/components/smart-parts/applets/MultiAppletSelector.tsx',
    description: 'Component for selecting and managing multiple applets with various configuration options',
    category: 'inputs',
    tags: ['applet', 'select', 'multiple', 'management', 'configuration', 'dropdown']
  },
  {
    id: 'structured-section-card',
    name: 'Structured Section Card',
    path: 'components/official/StructuredSectionCard.tsx',
    description: 'A structured card layout with title, description, optional header actions, and a three-column footer',
    category: 'layout',
    tags: ['card', 'section', 'layout', 'header', 'footer', 'actions', 'form']
  },
  {
    id: 'help-icon',
    name: 'Help Icon',
    path: 'components/official/HelpIcon.tsx',
    description: 'Elegant informational tooltip icon for providing contextual help text with copy functionality',
    category: 'display',
    tags: ['tooltip', 'help', 'info', 'contextual', 'copy', 'hover']
  },
  {
    id: 'applet-list-table',
    name: 'Applet List Table',
    path: 'features/applet/builder/modules/applet-builder/AppletListTable.tsx',
    description: 'Flexible applet listing component with various configuration options for different use cases',
    category: 'data',
    tags: ['table', 'list', 'applet', 'data', 'interactive', 'configurable', 'selection']
  },
  {
    id: 'simple-card',
    name: 'Simple Card',
    path: 'components/official/cards/CardGrid.tsx',
    description: 'Versatile card component with icon, title, description, and support for links or click handlers',
    category: 'display',
    tags: ['card', 'icon', 'link', 'button', 'navigation', 'display']
  },
  {
    id: 'simple-card-grid',
    name: 'Simple Card Grid',
    path: 'components/official/cards/CardGrid.tsx',
    description: 'Flexible grid system for displaying Simple Cards with customizable layout, headers, and styling options',
    category: 'layout',
    tags: ['grid', 'card', 'layout', 'responsive', 'navigation', 'dashboard']
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

export function getCategoryIcon(category: ComponentCategory): React.ReactNode {
  return categoryIcons[category];
}

