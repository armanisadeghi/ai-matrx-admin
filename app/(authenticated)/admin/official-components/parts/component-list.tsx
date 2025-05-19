import { Component, Menu, PanelLeft, Layout, BarChart, Eye, MessageSquare, FileUp, Image, Layers, Box, Pencil, Puzzle, DollarSign, Folder, AlignJustify, ArrowUpDown, Maximize, Zap } from 'lucide-react';


// Contains all official reusable components
export interface ComponentEntry {
  id: string;
  name: string;
  path: string;
  description?: string;
  categories: ComponentCategory[]; // Changed from single category to array
  tags?: string[]; // Optional tags for enhanced searching
}

// Enhanced component categories with more specific options
export type ComponentCategory = 
  // Interactive elements
  | 'buttons'           // Buttons, clickable actions
  | 'inputs'            // Input controls, form elements
  | 'selectors'         // Dropdown, radio, checkbox, etc.
  | 'navigation'        // Navigation, menus, links
  | 'interactive'       // Other interactive elements
  
  // Layout and structure  
  | 'layout'            // Layout components, grids
  | 'containers'        // Cards, panels, containers
  | 'collapsible'       // Accordions, expandable areas
  | 'modals'            // Modals, dialogs, overlays
  
  // Content display
  | 'data-display'      // Tables, lists, data visualization
  | 'media'             // Images, video, audio
  | 'text'              // Text display, typography
  
  // Feedback and status  
  | 'feedback'          // Notifications, alerts, toasts
  | 'status'            // Loading states, progress indicators
  
  // Special purpose  
  | 'ai-helpers'        // AI-related components
  | 'commerce'          // Commerce, pricing, product display
  | 'dashboards'        // Dashboard components
  | 'editor'            // Content editing tools
  | 'utilities'         // Utility components
  ;

// Human-readable category names
export const categoryNames: Record<ComponentCategory, string> = {
  // Interactive elements
  buttons: 'Buttons',
  inputs: 'Input Controls',
  selectors: 'Selection Controls',
  navigation: 'Navigation',
  interactive: 'Interactive Elements',
  
  // Layout and structure
  layout: 'Layout',
  containers: 'Containers',
  collapsible: 'Collapsible Elements',
  modals: 'Modals & Overlays',
  
  // Content display
  'data-display': 'Data Display',
  media: 'Media',
  text: 'Text & Typography',
  
  // Feedback and status
  feedback: 'Feedback & Alerts',
  status: 'Status Indicators',
  
  // Special purpose
  'ai-helpers': 'AI Tools',
  commerce: 'Commerce',
  dashboards: 'Dashboard Elements',
  editor: 'Editing Tools',
  utilities: 'Utilities'
};

// Optional: Category grouping for better organization in UI
export const categoryGroups: Record<string, ComponentCategory[]> = {
  'Interactive Elements': ['buttons', 'inputs', 'selectors', 'navigation', 'interactive'],
  'Layout & Structure': ['layout', 'containers', 'collapsible', 'modals'],
  'Content Display': ['data-display', 'media', 'text'],
  'Feedback & Status': ['feedback', 'status'],
  'Special Purpose': ['ai-helpers', 'commerce', 'dashboards', 'editor', 'utilities']
};

// Category icons
export const categoryIcons: Record<ComponentCategory, React.ReactNode> = {
  // Interactive elements
  buttons: <Menu className="h-4 w-4" />,
  inputs: <FileUp className="h-4 w-4" />,
  selectors: <ArrowUpDown className="h-4 w-4" />,
  navigation: <PanelLeft className="h-4 w-4" />,
  interactive: <Zap className="h-4 w-4" />,
  
  // Layout and structure
  layout: <Layout className="h-4 w-4" />,
  containers: <Box className="h-4 w-4" />,
  collapsible: <AlignJustify className="h-4 w-4" />,
  modals: <Maximize className="h-4 w-4" />,
  
  // Content display
  'data-display': <BarChart className="h-4 w-4" />,
  media: <Image className="h-4 w-4" />,
  text: <Pencil className="h-4 w-4" />,
  
  // Feedback and status
  feedback: <MessageSquare className="h-4 w-4" />,
  status: <Eye className="h-4 w-4" />,
  
  // Special purpose
  'ai-helpers': <Puzzle className="h-4 w-4" />,
  commerce: <DollarSign className="h-4 w-4" />,
  dashboards: <BarChart className="h-4 w-4" />,
  editor: <Pencil className="h-4 w-4" />,
  utilities: <Folder className="h-4 w-4" />
};


// Documentation: official-components.md

export const componentList: ComponentEntry[] = [
  {
    id: 'icon-button',
    name: 'Icon Button with Tooltip',
    path: 'components/official/IconButton.tsx',
    description: 'Button with icon and tooltip support for quick actions',
    categories: ['buttons', 'interactive'],
    tags: ['icon', 'tooltip', 'action', 'clickable']
  },
  {
    id: 'text-icon-button',
    name: 'Text Icon Button With Tooltip',
    path: 'components/official/TextIconButton.tsx',
    description: 'Button with text, icon and tooltip support',
    categories: ['buttons', 'interactive'],
    tags: ['icon', 'text', 'tooltip', 'action', 'clickable']
  },
  {
    id: 'action-feedback-button',
    name: 'Action Feedback Button',
    path: 'components/official/ActionFeedbackButton.tsx',
    description: 'Button that shows visual success feedback after action completion',
    categories: ['buttons', 'feedback', 'interactive'],
    tags: ['icon', 'tooltip', 'action', 'feedback', 'success']
  },
  {
    id: 'inline-copy-button',
    name: 'Inline Copy Button',
    path: 'components/matrx/buttons/InlineCopyButton.tsx',
    description: 'Button that copies content to clipboard with visual feedback',
    categories: ['buttons', 'utilities', 'feedback'],
    tags: ['copy', 'clipboard', 'tooltip', 'json', 'formatting']
  },
  {
    id: 'accordion-wrapper',
    name: 'Accordion Collapsible Wrapper',
    path: 'components/matrx/matrx-collapsible/AccordionWrapper.tsx',
    description: 'Collapsible section with header and content',
    categories: ['collapsible', 'layout', 'containers'],
    tags: ['accordion', 'collapsible', 'expandable', 'section']
  },
  {
    id: 'state-persisting-accordion',
    name: 'State Persisting Accordion Wrapper',
    path: 'components/matrx/matrx-collapsible/StatePersistingAccordionWrapper.tsx',
    description: 'Collapsible accordion that persists its state',
    categories: ['collapsible', 'layout', 'containers'],
    tags: ['accordion', 'collapsible', 'expandable', 'state', 'persistence']
  },
  {
    id: 'chat-collapsible',
    name: 'Chat Collapsible Wrapper',
    path: 'components/mardown-display/blocks/ChatCollapsibleWrapper.tsx',
    description: 'Collapsible wrapper for chat interactions',
    categories: ['collapsible', 'containers', 'ai-helpers'],
    tags: ['accordion', 'collapsible', 'chat', 'expandable']
  },
  {
    id: 'advanced-collapsible',
    name: 'Advanced Collapsible',
    path: 'components/official/AdvancedCollapsible.tsx',
    description: 'Enhanced collapsible with action buttons and fullscreen capability',
    categories: ['collapsible', 'layout', 'interactive'],
    tags: ['accordion', 'collapsible', 'expandable', 'fullscreen', 'actions']
  },
  {
    id: 'full-screen-overlay',
    name: 'Full Screen Overlay',
    path: 'components/official/FullScreenOverlay.tsx',
    description: 'Full screen overlay with tab support',
    categories: ['modals', 'layout'],
    tags: ['overlay', 'fullscreen', 'modal', 'dialog', 'tabs']
  },
  {
    id: 'card-and-grid',
    name: 'Card & Grid System',
    path: 'components/official/card-and-grid',
    description: 'Flexible grid system with colorful cards, horizontal cards, and list components',
    categories: ['layout', 'containers', 'data-display'],
    tags: ['card', 'grid', 'list', 'display', 'content']
  },
  {
    id: 'floating-dock',
    name: 'Floating Dock',
    path: 'components/official/FloatingDock.tsx',
    description: 'Floating dock component with animated icons for desktop and mobile',
    categories: ['navigation', 'interactive'],
    tags: ['dock', 'menu', 'bar', 'icons', 'navigation', 'animated']
  },
  {
    id: 'balanced-floating-dock',
    name: 'Balanced Floating Dock',
    path: 'components/official/BalancedFloatingDock.tsx',
    description: 'Enhanced floating dock that grows in place with configurable options',
    categories: ['navigation', 'interactive'],
    tags: ['dock', 'menu', 'bar', 'icons', 'navigation', 'configurable']
  },
  {
    id: 'icon-select',
    name: 'Icon Select',
    path: 'components/official/IconSelect.tsx',
    description: 'Icon-only select component with dropdown of labeled items',
    categories: ['selectors', 'inputs'],
    tags: ['select', 'dropdown', 'icon', 'input', 'choice']
  },
  {
    id: 'json-explorer',
    name: 'JSON Explorer',
    path: 'features/scraper/parts/RawJsonExplorer.tsx',
    description: 'Advanced component for exploring and manipulating JSON data',
    categories: ['data-display', 'interactive', 'editor'],
    tags: ['json', 'explorer', 'data', 'viewer', 'interactive']
  },
  {
    id: 'public-image-search',
    name: 'Public Image Search',
    path: 'components/official/PublicImageSearch.tsx',
    description: 'Search and select public images from Unsplash with direct URL input option',
    categories: ['media', 'inputs', 'selectors'],
    tags: ['image', 'search', 'select', 'unsplash', 'media', 'input', 'modal']
  },
  {
    id: 'image-manager',
    name: 'Image Manager',
    path: 'components/image/ImageManager.tsx',
    description: 'Full-screen image manager with tabs for browsing and selecting images from multiple sources',
    categories: ['media', 'modals'],
    tags: ['image', 'gallery', 'select', 'manager', 'modal', 'tabs', 'unsplash']
  },
  {
    id: 'image-preview-row',
    name: 'Image Preview Row',
    path: 'components/image/shared/ImagePreviewRow.tsx',
    description: 'Responsive row for displaying selected image previews with various size options',
    categories: ['media', 'layout'],
    tags: ['image', 'preview', 'thumbnails', 'gallery', 'responsive', 'carousel']
  },
  {
    id: 'image-manager-row',
    name: 'Image Manager Row',
    path: 'components/image/shared/ImageManagerRow.tsx',
    description: 'All-in-one image selection component that combines preview row with image manager',
    categories: ['media', 'selectors', 'inputs'],
    tags: ['image', 'upload', 'preview', 'select', 'manager', 'input']
  },
  {
    id: 'image-manager-icon',
    name: 'Image Manager Icon',
    path: 'components/image/shared/ImageManagerIcon.tsx',
    description: 'Icon-only image selection component with dropdown of labeled items',
    categories: ['media', 'selectors', 'inputs'],
    tags: ['image', 'upload', 'preview', 'select', 'manager', 'input']
  },
  {
    id: 'single-image-select',
    name: 'Single Image Select',
    path: 'components/image/shared/SingleImageSelect.tsx',
    description: 'Single image selection component with preview and upload options',
    categories: ['media', 'selectors', 'inputs'],
    tags: ['image', 'upload', 'preview', 'select', 'manager', 'input']
  },
  {
    id: 'image-cropper',
    name: 'Image Cropper',
    path: 'components/official/image-cropper/index.tsx',
    description: 'Flexible image cropping component with aspect ratio selection and preview',
    categories: ['media', 'editor'],
    tags: ['image', 'crop', 'edit', 'aspect ratio', 'resize', 'media']
  },
  {
    id: 'multi-applet-selector',
    name: 'Multi Applet Selector',
    path: 'features/applet/builder/components/smart-parts/applets/MultiAppletSelector.tsx',
    description: 'Component for selecting and managing multiple applets with various configuration options',
    categories: ['selectors', 'inputs'],
    tags: ['applet', 'select', 'multiple', 'management', 'configuration', 'dropdown']
  },
  {
    id: 'structured-section-card',
    name: 'Structured Section Card',
    path: 'components/official/StructuredSectionCard.tsx',
    description: 'A structured card layout with title, description, optional header actions, and a three-column footer',
    categories: ['containers', 'layout'],
    tags: ['card', 'section', 'layout', 'header', 'footer', 'actions', 'form']
  },
  {
    id: 'help-icon',
    name: 'Help Icon',
    path: 'components/official/HelpIcon.tsx',
    description: 'Elegant informational tooltip icon for providing contextual help text with copy functionality',
    categories: ['feedback', 'utilities'],
    tags: ['tooltip', 'help', 'info', 'contextual', 'copy', 'hover']
  },
  {
    id: 'applet-list-table',
    name: 'Applet List Table',
    path: 'features/applet/builder/modules/applet-builder/AppletListTable.tsx',
    description: 'Flexible applet listing component with various configuration options for different use cases',
    categories: ['data-display', 'interactive', 'dashboards'],
    tags: ['table', 'list', 'applet', 'data', 'interactive', 'configurable', 'selection']
  },
  {
    id: 'simple-card',
    name: 'Simple Card',
    path: 'components/official/cards/CardGrid.tsx',
    description: 'Versatile card component with icon, title, description, and support for links or click handlers',
    categories: ['containers', 'interactive'],
    tags: ['card', 'icon', 'link', 'button', 'navigation', 'display']
  },
  {
    id: 'simple-card-grid',
    name: 'Simple Card Grid',
    path: 'components/official/cards/CardGrid.tsx',
    description: 'Flexible grid system for displaying Simple Cards with customizable layout, headers, and styling options',
    categories: ['layout', 'containers', 'dashboards'],
    tags: ['grid', 'card', 'layout', 'responsive', 'navigation', 'dashboard']
  },
  {
    id: 'screenshot-tools',
    name: 'Screenshot Tools',
    path: 'hooks/useScreenshot.ts',
    description: 'Tools for capturing page screenshots and collecting page context for AI assistance',
    categories: ['ai-helpers', 'utilities', 'feedback'],
    tags: ['screenshot', 'capture', 'image', 'context', 'help', 'support', 'ai']
  }
]; 

// Updated helper functions for multiple categories
export function getComponentsByCategory(category: ComponentCategory): ComponentEntry[] {
  return componentList.filter(component => component.categories.includes(category));
}

export function searchComponents(query: string): ComponentEntry[] {
  if (!query || query.trim() === '') {
    return componentList;
  }
  
  const searchTerms = query.toLowerCase().trim().split(/\s+/);
  
  return componentList.filter(component => {
    // Check name, description, categories and tags for matches
    const searchableText = `${component.name} ${component.description || ''} ${component.categories.join(' ')} ${component.tags?.join(' ') || ''}`.toLowerCase();
    
    // Match if ALL search terms are found
    return searchTerms.every(term => searchableText.includes(term));
  });
}

// Get unique categories with component counts
export function getCategoriesWithCounts(): { category: ComponentCategory; count: number }[] {
  const categories = new Map<ComponentCategory, number>();
  
  componentList.forEach(component => {
    component.categories.forEach(category => {
      const currentCount = categories.get(category) || 0;
      categories.set(category, currentCount + 1);
    });
  });
  
  return Array.from(categories.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

// Get categories organized by group
export function getCategoriesByGroup() {
  const categoryCounts = getCategoriesWithCounts();
  const result: Record<string, { category: ComponentCategory; count: number }[]> = {};
  
  // Initialize all groups with empty arrays
  Object.keys(categoryGroups).forEach(group => {
    result[group] = [];
  });
  
  // Fill in groups with category data
  categoryCounts.forEach(catData => {
    // Find which group this category belongs to
    for (const [groupName, categories] of Object.entries(categoryGroups)) {
      if ((categories as ComponentCategory[]).includes(catData.category)) {
        result[groupName].push(catData);
        break;
      }
    }
  });
  
  return result;
}

export function getCategoryIcon(category: ComponentCategory): React.ReactNode {
  return categoryIcons[category];
}

