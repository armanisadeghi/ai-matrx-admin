# LayoutTogglers Component

A component that provides controls for toggling different panel groups (left, right, bottom) in the workspace layout.

## Features

- 🔄 Group-level visibility controls
- 💡 Active state indication
- 🎨 Consistent styling
- 👆 Intuitive interactions
- 🏷️ Tooltips for clarity

## Props Interface

```typescript
interface LayoutTogglersProps {
    layoutState: LayoutState;
    groupedPanels: Record<PanelGroupId, any[]>;
    onPanelVisibilityChange: (panelId: string, isVisible: boolean) => void;
}
```

## Usage

```tsx
import { LayoutTogglers } from './components/LayoutTogglers';

<LayoutTogglers
    layoutState={layoutState}
    groupedPanels={groupedPanels}
    onPanelVisibilityChange={(id, visible) => handlePanelVisibility(id, visible)}
/>
```

## Component Features

### Group Toggle Controls

Each group (left, right, bottom) has a toggle button that:
- Shows/hides all panels in the group
- Indicates active state
- Provides visual feedback
- Includes descriptive tooltip

```tsx
const toggleGroup = (group: PanelGroupId) => {
    const panels = groupedPanels[group] || [];
    const hasVisiblePanel = panels.some(
        panel => layoutState.panels[panel.id]?.isVisible
    );

    panels.forEach(panel => {
        onPanelVisibilityChange(panel.id, !hasVisiblePanel);
    });
};
```

### State Management

Tracks group visibility:
```typescript
const isGroupVisible = (group: PanelGroupId) => {
    const panels = groupedPanels[group] || [];
    return panels.some(panel => layoutState.panels[panel.id]?.isVisible);
};
```

## Button Implementation

```tsx
<button
    className={`p-2 rounded-md transition-colors ${
        isGroupVisible(group)
            ? 'bg-neutral-800 text-white' 
            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
    }`}
    onClick={() => toggleGroup(group)}
    title={`Toggle ${group.charAt(0).toUpperCase() + group.slice(1)} Panel`}
>
    <GroupIcon size={18}/>
</button>
```

## Icon Components

Uses Tabler Icons for consistent styling:
- `IconLayoutSidebarLeftCollapse` for left panel
- `IconLayoutSidebarRightCollapse` for right panel
- `IconLayoutBottombarCollapse` for bottom panel

```tsx
import {
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarRightCollapse,
    IconLayoutBottombarCollapse
} from '@tabler/icons-react';
```

## Styling

Uses Tailwind CSS with:
- Neutral color scheme
- Hover states
- Transitions
- Proper spacing

Key classes:
```css
.toggler-container {
    @apply flex items-center gap-1;
}

.toggler-button {
    @apply p-2 rounded-md transition-colors;
    
    /* Active state */
    @apply bg-neutral-800 text-white;
    
    /* Inactive state */
    @apply text-neutral-400 hover:bg-neutral-800/50 hover:text-white;
}
```

## Events

### onPanelVisibilityChange
Called when toggling panel visibility:
```typescript
onPanelVisibilityChange: (panelId: string, isVisible: boolean) => void;
```

## States

### Button States
- **Active**: Panel group has visible panels
- **Inactive**: No visible panels in group
- **Hover**: Visual feedback for interaction
- **Disabled**: When group has no panels

## Best Practices

1. **User Experience**
    - Provide immediate visual feedback
    - Use consistent icon styling
    - Maintain button spacing
    - Include helpful tooltips

2. **Performance**
    - Minimize unnecessary renders
    - Handle state updates efficiently
    - Use proper memoization

3. **Accessibility**
    - Support keyboard navigation
    - Include ARIA labels
    - Maintain proper contrast
    - Provide clear tooltips

4. **State Management**
    - Handle group state correctly
    - Update all panels atomically
    - Maintain layout consistency

## Implementation Notes

- Groups panels by position
- Handles visibility toggling
- Provides visual feedback
- Maintains accessibility
- Supports keyboard interaction

## Example Implementation

```tsx
const LayoutTogglers: React.FC<LayoutTogglersProps> = ({
                                                           layoutState,
                                                           groupedPanels,
                                                           onPanelVisibilityChange
                                                       }) => {
    // Group toggle implementation
    const toggleGroup = (group: PanelGroupId) => {
        const panels = groupedPanels[group] || [];
        const hasVisiblePanel = panels.some(
            panel => layoutState.panels[panel.id]?.isVisible
        );
        panels.forEach(panel => {
            onPanelVisibilityChange(panel.id, !hasVisiblePanel);
        });
    };

    // Visibility check
    const isGroupVisible = (group: PanelGroupId) => {
        const panels = groupedPanels[group] || [];
        return panels.some(
            panel => layoutState.panels[panel.id]?.isVisible
        );
    };

    return (
        <div className="flex items-center gap-1">
            {/* Toggle buttons for each group */}
            {Object.keys(groupedPanels).map(group => (
                <GroupToggleButton
                    key={group}
                    group={group as PanelGroupId}
                    isVisible={isGroupVisible(group as PanelGroupId)}
                    onToggle={() => toggleGroup(group as PanelGroupId)}
                />
            ))}
        </div>
    );
};
```