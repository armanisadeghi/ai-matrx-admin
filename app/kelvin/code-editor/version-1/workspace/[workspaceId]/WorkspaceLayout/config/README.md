# Workspace Configuration System

A comprehensive configuration system that defines the default panels and layout state for the workspace interface.

## Features

- 📋 Predefined panel configurations
- 🎨 Default layout state
- 🔧 Customizable settings
- 🎯 Type-safe configurations
- 📱 Responsive defaults

## Default Panels

### Panel Configuration Interface

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

### Available Default Panels

```typescript
export const DEFAULT_PANELS: PanelConfig[] = [
    // Left Group Panels
    {
        id: 'explorer',
        title: 'Explorer',
        icon: IconFiles,
        group: 'left',
        defaultSize: 250,
        minSize: 200,
        order: 1,
        component: () => null
    },
    {
        id: 'search',
        title: 'Search',
        icon: IconSearch,
        group: 'left',
        defaultSize: 250,
        minSize: 200,
        order: 2,
        component: () => null
    },
    // ... more panels
];
```

## Layout State

### State Interface

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

### Default State Generation

```typescript
export const DEFAULT_LAYOUT_STATE: LayoutState = {
    panels: DEFAULT_PANELS.reduce((acc, panel) => ({
        ...acc,
        [panel.id]: {
            isVisible: false,
            size: panel.defaultSize,
            position: panel.order
        }
    }), {}),
    activePanel: {}
};
```

## Panel Groups

### Left Panel Group
- Explorer
- Search
- Source Control

### Bottom Panel Group
- Terminal
- Problems
- Output
- Debug Console

## Usage

### Basic Implementation

```typescript
import { DEFAULT_PANELS, DEFAULT_LAYOUT_STATE } from './config';

function WorkspaceComponent() {
    const [layoutState, setLayoutState] = useState(DEFAULT_LAYOUT_STATE);
    
    return (
        <WorkspaceLayout
            panels={DEFAULT_PANELS}
            initialState={layoutState}
            onLayoutChange={setLayoutState}
        >
            {/* Your content */}
        </WorkspaceLayout>
    );
}
```

### Custom Panel Configuration

```typescript
const CUSTOM_PANELS: PanelConfig[] = [
    ...DEFAULT_PANELS,
    {
        id: 'custom-panel',
        title: 'Custom Panel',
        icon: CustomIcon,
        group: 'right',
        defaultSize: 300,
        minSize: 200,
        order: 1,
        component: CustomPanelComponent
    }
];
```

## Customization

### Panel Customization
- Add new panels
- Modify existing panels
- Change default sizes
- Reorder panels

### State Customization
- Modify default visibility
- Change initial sizes
- Set active panels
- Adjust panel positions

## Best Practices

1. **Panel Configuration**
   - Use meaningful panel IDs
   - Set appropriate size constraints
   - Maintain logical ordering
   - Group related panels together

2. **State Management**
   - Initialize with sensible defaults
   - Handle state persistence
   - Maintain type safety
   - Consider user preferences

3. **Component Implementation**
   - Lazy load panel components
   - Implement proper error boundaries
   - Handle loading states
   - Support proper cleanup

4. **Performance**
   - Minimize initial bundle size
   - Use dynamic imports
   - Implement proper memoization
   - Handle large configurations

## Implementation Notes

- Uses TypeScript for type safety
- Implements icon system using @tabler/icons-react
- Supports custom panel components
- Provides sensible defaults
- Allows full customization
- Maintains consistent styling