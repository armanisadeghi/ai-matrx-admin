// Contains all official reusable components
export interface ComponentEntry {
  id: string;
  name: string;
  path: string;
  description?: string;
}

export const componentList: ComponentEntry[] = [
  {
    id: 'icon-button',
    name: 'Icon Button with Tooltip',
    path: 'components/ui/icon-button.tsx',
    description: 'Button with icon and tooltip support for quick actions',
  },
  {
    id: 'accordion-wrapper',
    name: 'Accordion Collapsible Wrapper',
    path: 'components/matrx/matrx-collapsible/AccordionWrapper.tsx',
    description: 'Collapsible section with header and content',
  },
  {
    id: 'floating-dock',
    name: 'Floating Dock',
    path: 'components/ui/floating-dock.tsx',
    description: 'Floating dock component for persistent tools or actions',
  },
  {
    id: 'matrx-switch',
    name: 'MatrxSwitch',
    path: 'components/ui/matrx/matrix-switch.tsx',
    description: 'Enhanced toggle switch component with multiple variants',
  },
  {
    id: 'multi-step-loader',
    name: 'Multi-Step Loader',
    path: 'components/ui/multi-step-loader.tsx',
    description: 'Progress indicator for multi-step processes',
  },
  {
    id: 'file-upload',
    name: 'File Upload',
    path: 'components/ui/file-upload/file-upload.tsx',
    description: 'Complete file upload component with drag and drop support',
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    path: 'components/ui/sidebar.tsx',
    description: 'Configurable sidebar navigation component',
  },
  {
    id: 'sidebar-collapsible',
    name: 'Collapsible Sidebar',
    path: 'components/ui/sidebar-collapsible.tsx',
    description: 'Sidebar with collapsible sections',
  },
  {
    id: 'json-viewer',
    name: 'JSON Viewer',
    path: 'components/ui/JsonComponents/JsonViewerComponent.tsx',
    description: 'Component for displaying and editing JSON data',
  },
  {
    id: 'matrx-date-picker',
    name: 'MatrxDatePicker',
    path: 'components/ui/matrx-date-picker.tsx',
    description: 'Enhanced date picker with presets and range selection',
  },
  {
    id: 'card-hover-effect',
    name: 'Card Hover Effect',
    path: 'components/ui/card-hover-effect.tsx',
    description: 'Card with interactive hover animations',
  },
  {
    id: 'canvas-reveal-effect',
    name: 'Canvas Reveal Effect',
    path: 'components/ui/canvas-reveal-effect.tsx',
    description: 'Interactive reveal effect for content',
  },
  {
    id: 'background-beams',
    name: 'Background Beams',
    path: 'components/ui/background-beams-with-collision.tsx',
    description: 'Animated background effect with collision detection',
  },
  {
    id: 'sparkles',
    name: 'Sparkles Effect',
    path: 'components/ui/sparkles.tsx',
    description: 'Sparkle animation effect for elements',
  },
  {
    id: '3d-card',
    name: '3D Card',
    path: 'components/ui/3d-card.tsx',
    description: 'Card with 3D perspective effect on hover',
  }
]; 