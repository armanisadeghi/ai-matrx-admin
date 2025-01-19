# ActivityBar Component

A vertical sidebar component that provides quick access to different panels in the workspace layout, similar to VS Code's activity bar.

## Features

- 🎯 Quick panel access
- 💡 Tooltips for panel names
- 🔵 Active panel indicators
- 📱 Collapsible interface
- 🎨 Consistent styling
- ⌨️ Keyboard accessibility

## Props Interface

```typescript
interface ActivityBarProps {
    panels: PanelConfig[];
    layoutState: LayoutState;
    onPanelVisibilityChange: (panelId: string, isVisible: boolean) => void;
    isCollapsed?: boolean;
}
```

## Usage

```tsx
import { ActivityBar } from './components/ActivityBar';

<ActivityBar
    panels={panels}
    layoutState={layoutState}
    onPanelVisibilityChange={(id, visible) => handleVisibilityChange(id, visible)}
    isCollapsed={false}
/>
```

## Component Features

### Panel Buttons

Each panel is represented by a button that:
- Shows the panel's icon
- Displays a tooltip on hover
- Indicates active state
- Toggles panel visibility

```tsx
<button
    key={panel.id}
    className={`p-3 mb-1 rounded-md transition-colors relative group
        ${isActive ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
    onClick={() => onPanelVisibilityChange(panel.id, !isActive)}
    title={panel.title}
>
    <Icon size={24}/>
    {/* Active Indicator */}
    {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500"/>
    )}
    {/* Tooltip */}
    <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 
         bg-neutral-800 rounded text-sm whitespace-nowrap opacity-0 
         group-hover:opacity-100 pointer-events-none transition-opacity">
        {panel.title}
    </div>
</button>
```

### Active State Indication

Active panels are indicated by:
- Blue side bar indicator
- Different background color
- Higher contrast text color

### Tooltips

Tooltips provide:
- Panel title display
- Smooth fade in/out
- Proper positioning
- No interference with clicks

## Styling

Uses Tailwind CSS for:
- Neutral color scheme
- Hover effects
- Transitions
- Responsive design

Key classes:
```css
.activity-bar {
    width: 48px;
    background: theme('colors.neutral.900');
    border-right: 1px solid theme('colors.neutral.700');
}

.panel-button {
    /* Default state */
    @apply p-3 mb-1 rounded-md transition-colors relative group;
    
    /* Active state */
    @apply bg-neutral-800 text-white;
    
    /* Inactive state */
    @apply text-neutral-400 hover:bg-neutral-800/50 hover:text-white;
}
```

## Events

### onPanelVisibilityChange
Called when a panel button is clicked:
```typescript
onPanelVisibilityChange: (panelId: string, isVisible: boolean) => void;
```

## States

### Normal State
- Full width display
- All buttons visible
- Tooltips enabled

### Collapsed State
- Component hidden
- Panels accessible through menu
- Layout adjusts accordingly

## Best Practices

1. **Accessibility**
   - Implement keyboard navigation
   - Provide proper ARIA labels
   - Maintain focus management
   - Ensure tooltip readability

2. **Performance**
   - Minimize state updates
   - Use proper memoization
   - Handle transitions smoothly

3. **User Experience**
   - Provide clear active states
   - Implement smooth transitions
   - Maintain consistent spacing
   - Keep tooltips readable

4. **Responsiveness**
   - Handle collapse state properly
   - Maintain layout integrity
   - Support different screen sizes

## Implementation Notes

- Uses CSS Grid for button layout
- Implements hover effects
- Manages tooltip positioning
- Handles collapsed state
- Maintains accessibility features