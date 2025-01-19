# PanelGroup Component

A container component that manages a group of related panels in a specific position (left, right, or bottom) within the workspace layout.

## Features

- 📊 Panel group management
- 🔄 Dynamic panel ordering
- 👁️ Visibility control
- 🎯 Focus management
- 📑 Tabbed interface for bottom panels
- 🎨 Consistent styling

## Props Interface

```typescript
interface PanelGroupProps {
    groupId: 'left' | 'right' | 'bottom';
    panels: PanelConfig[];
    state: LayoutState;
    onPanelResize?: (panelId: string, size: number) => void;
    onPanelVisibilityChange?: (panelId: string, isVisible: boolean) => void;
    onPanelFocus?: (panelId: string) => void;
}
```

## Usage

```tsx
import { PanelGroup } from './components/PanelGroup';

<PanelGroup
    groupId="left"
    panels={leftPanels}
    state={layoutState}
    onPanelResize={(id, size) => handlePanelResize(id, size)}
    onPanelVisibilityChange={(id, visible) => handleVisibilityChange(id, visible)}
    onPanelFocus={(id) => handlePanelFocus(id)}
/>
```

## Group Types

### Bottom Panel Group
- Implements a tabbed interface
- Shows only one panel at a time
- Includes tab controls for panel switching

### Left/Right Panel Groups
- Stacks panels vertically
- All visible panels shown simultaneously
- Individual panel controls

## Panel Management

### Panel Ordering
```typescript
const sortedPanels = [...panels].sort(
    (a, b) => (state.panels[a.id]?.position ?? a.order) - 
              (state.panels[b.id]?.position ?? b.order)
);
```

### Visibility Control
```typescript
const visiblePanels = sortedPanels.filter(
    panel => state.panels[panel.id]?.isVisible
);
```

## Tab Interface (Bottom Panel)

Features:
- Panel switching
- Individual close buttons
- Active panel indication
- Icon + title display

```tsx
<div className="flex h-9 border-b border-neutral-700">
    {visiblePanels.map((panel) => (
        <button
            key={panel.id}
            className={`flex items-center gap-2 px-3 min-w-[120px] h-full
                ${isActive ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
            onClick={() => onPanelFocus?.(panel.id)}
        >
            <Icon size={16}/>
            <span className="text-sm">{panel.title}</span>
            {/* Close button */}
        </button>
    ))}
</div>
```

## Events

### onPanelResize
Called when any panel in the group is resized:
```typescript
onPanelResize?: (panelId: string, size: number) => void;
```

### onPanelVisibilityChange
Called when a panel's visibility changes:
```typescript
onPanelVisibilityChange?: (panelId: string, isVisible: boolean) => void;
```

### onPanelFocus
Called when a panel is activated:
```typescript
onPanelFocus?: (panelId: string) => void;
```

## Styling

Uses Tailwind CSS with:
- Neutral color scheme
- Consistent borders
- Smooth transitions
- Responsive layouts

## Best Practices

1. **Panel Management**
   - Maintain logical panel ordering
   - Handle empty states gracefully
   - Implement proper focus management

2. **Performance**
   - Minimize unnecessary renders
   - Use proper memoization
   - Handle layout changes efficiently

3. **Accessibility**
   - Ensure proper keyboard navigation
   - Maintain ARIA roles and labels
   - Handle focus trapping appropriately

4. **State Management**
   - Keep panel state normalized
   - Handle state updates atomically
   - Maintain panel group consistency

## Implementation Notes

- Differentiates between bottom and side panel groups
- Handles panel ordering and visibility
- Manages active panel state
- Implements tab interface for bottom panels
- Provides consistent styling and behavior