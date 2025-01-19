# Workspace Layout System

A flexible and customizable workspace layout system for React applications, inspired by modern IDE layouts. This system provides a VS Code-like interface with resizable panels, activity bar, and customizable layouts.

## Features

- 🎯 Flexible panel system with support for left, right, and bottom panels
- 🔄 Resizable panels with drag handles
- 📱 Collapsible activity bar
- 🎨 Modern, dark theme UI
- 🎮 Panel controls (maximize, close)
- 🔍 Panel state management
- ⚡ TypeScript support
- 🎨 Tailwind CSS styling

## Components

### WorkspaceLayout

The main container component that orchestrates the entire layout system.

```typescript
interface WorkspaceLayoutProps {
    panels: PanelConfig[];
    initialState?: LayoutState;
    children: React.ReactNode;
    onLayoutChange?: (state: LayoutState) => void;
}
```

#### Usage

```tsx
import { WorkspaceLayout } from './components/Layout';
import { DEFAULT_PANELS } from './config';

function App() {
    return (
        <WorkspaceLayout
            panels={DEFAULT_PANELS}
            onLayoutChange={(state) => console.log('Layout changed:', state)}
        >
            <YourMainContent />
        </WorkspaceLayout>
    );
}
```

### Panel Configuration

Panels are configured using the `PanelConfig` interface:

```typescript
interface PanelConfig {
    id: string;
    title: string;
    icon: React.ComponentType;
    group: 'left' | 'right' | 'bottom';
    defaultSize: number;
    minSize: number;
    order: number;
    component: React.ComponentType;
}
```

### ActivityBar

The activity bar provides quick access to panels and can be collapsed:

- Shows icons for available panels
- Provides tooltips for panel names
- Indicates active panels
- Can be toggled/hidden

### PanelGroup

Manages groups of panels in specific positions (left, right, bottom):

- Handles panel ordering
- Manages panel visibility
- Controls panel focus
- Supports panel resizing

### Layout Controls

The system includes built-in layout controls:

- Toggle left sidebar
- Toggle right sidebar
- Toggle bottom panel
- Collapse/expand activity bar
- Individual panel controls (maximize, close)

## State Management

The layout state is managed through the `LayoutState` interface:

```typescript
interface LayoutState {
    panels: {
        [key: string]: {
            isVisible: boolean;
            size: number;
            position: number;
        };
    };
    activePanel: {
        [key in PanelGroupId]?: string;
    };
}
```

## Styling

The system uses Tailwind CSS for styling with a dark theme by default:

- Neutral color palette for backgrounds
- Blue accents for active states
- Hover effects for interactive elements
- Smooth transitions

## Events

The system provides several event handlers:

- `onLayoutChange`: Called when any part of the layout changes
- `onPanelResize`: Called when a panel is resized
- `onPanelVisibilityChange`: Called when a panel's visibility changes
- `onPanelFocus`: Called when a panel is focused

## Custom Panel Implementation

To create a custom panel:

1. Define the panel configuration:

```typescript
const customPanel: PanelConfig = {
    id: 'custom-panel',
    title: 'Custom Panel',
    icon: IconCustom,
    group: 'left',
    defaultSize: 250,
    minSize: 200,
    order: 1,
    component: CustomPanelComponent
};
```

2. Create the panel component:

```tsx
const CustomPanelComponent: React.FC = () => {
    return (
        <div className="p-4">
            {/* Your panel content */}
        </div>
    );
};
```

## Best Practices

1. **Panel Sizing**
    - Set appropriate `minSize` values to ensure usability
    - Consider `maxSize` for panels that shouldn't take up too much space

2. **Performance**
    - Use React.memo for panel components that don't need frequent updates
    - Implement virtualization for panels with long lists

3. **Accessibility**
    - Ensure all interactive elements are keyboard accessible
    - Maintain proper focus management
    - Include ARIA labels where appropriate

4. **State Management**
    - Persist layout state if needed
    - Handle layout changes gracefully
    - Implement proper error boundaries

## Dependencies

- React 18+
- TypeScript 4.5+
- Tailwind CSS 3+
- @tabler/icons-react for icons

## License

This project is licensed under the MIT License - see the LICENSE file for details.