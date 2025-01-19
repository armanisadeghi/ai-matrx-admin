# WorkspaceLayout Component

The main orchestrator component that manages the entire workspace layout system, providing a VS Code-like interface with configurable panels.

## Features

- 🎯 Flexible panel system with left, right, and bottom groups
- 📱 Collapsible activity bar
- 🔄 State management with layout persistence
- 📊 Panel group organization
- 🎨 Consistent styling
- ⚡ Performance optimized

## Props Interface

```typescript
interface WorkspaceLayoutProps {
    panels: PanelConfig[];
    initialState?: LayoutState;
    children: React.ReactNode;
    onLayoutChange?: (state: LayoutState) => void;
}
```

## Usage

```tsx
import { WorkspaceLayout } from './components/Layout';
import { DEFAULT_PANELS } from './config';

function App() {
    const handleLayoutChange = (newState: LayoutState) => {
        console.log('Layout updated:', newState);
        // Persist layout state if needed
    };

    return (
        <WorkspaceLayout
            panels={DEFAULT_PANELS}
            initialState={savedLayoutState}
            onLayoutChange={handleLayoutChange}
        >
            <YourMainContent />
        </WorkspaceLayout>
    );
}
```

## Component Structure

### Header Bar
- Activity bar toggle
- Layout group togglers
- Custom actions (extendable)

### Main Layout
```tsx
<div className="flex-1 flex overflow-hidden">
    {/* Activity Bar */}
    <ActivityBar
        panels={panels}
        layoutState={layoutState}
        onPanelVisibilityChange={handlePanelVisibilityChange}
        isCollapsed={isActivityBarCollapsed}
    />

    {/* Panel Groups */}
    {/* Left Panels */}
    {groupedPanels.left && (
        <PanelGroup groupId="left" ... />
    )}

    {/* Main Content */}
    <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
            {children}
        </div>
        {/* Bottom Panels */}
        {groupedPanels.bottom && (
            <PanelGroup groupId="bottom" ... />
        )}
    </div>

    {/* Right Panels */}
    {groupedPanels.right && (
        <PanelGroup groupId="right" ... />
    )}
</div>
```

## State Management

### Layout State
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

### State Updates
Uses callback pattern for optimized updates:
```typescript
const handlePanelResize = useCallback((panelId: string, size: number) => {
    setLayoutState(prev => {
        const newState = {
            ...prev,
            panels: {
                ...prev.panels,
                [panelId]: {
                    ...prev.panels[panelId],
                    size
                }
            }
        };
        onLayoutChange?.(newState);
        return newState;
    });
}, [onLayoutChange]);
```

## Panel Organization

Panels are grouped by position:
```typescript
const groupedPanels = panels.reduce((acc, panel) => {
    if (!acc[panel.group]) {
        acc[panel.group] = [];
    }
    acc[panel.group].push(panel);
    return acc;
}, {} as Record<PanelGroupId, typeof panels>);
```

## Events

### onLayoutChange
Called when any aspect of the layout changes:
```typescript
onLayoutChange?: (state: LayoutState) => void;
```

## Best Practices

1. **State Management**
    - Initialize with default state
    - Handle state updates atomically
    - Persist layout changes when needed
    - Use callbacks for optimized updates

2. **Performance**
    - Implement proper memoization
    - Use callback functions
    - Avoid unnecessary renders
    - Handle overflow correctly

3. **Accessibility**
    - Maintain keyboard navigation
    - Preserve focus management
    - Include ARIA attributes
    - Support screen readers

4. **Responsive Design**
    - Handle different screen sizes
    - Manage panel constraints
    - Implement proper overflow
    - Support collapsible elements

## Styling

Uses Tailwind CSS with:
- Neutral color scheme
- Proper overflow handling
- Flexible layouts
- Consistent borders

## Implementation Notes

- Uses React hooks for state management
- Implements callback patterns for optimization
- Supports customizable panel configurations
- Handles layout persistence
- Manages panel focus and visibility
- Provides consistent styling