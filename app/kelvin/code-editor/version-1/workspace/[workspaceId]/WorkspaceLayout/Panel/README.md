# Panel Component

A flexible and resizable panel component that can be used in different positions within the workspace layout.

## Features

- 🔄 Resizable via drag handles
- 📐 Minimum and maximum size constraints
- 🔲 Maximizable panel view
- ❌ Closeable
- 📱 Responsive sizing
- 🎨 Customizable header with icon and title

## Props Interface

```typescript
interface PanelProps {
    id: string;
    config: PanelConfig;
    state: {
        isVisible: boolean;
        size: number;
        position: number;
    };
    children: React.ReactNode;
    onResize?: (size: number) => void;
    onVisibilityChange?: (isVisible: boolean) => void;
    onFocus?: () => void;
}
```

## Usage

```tsx
import { Panel } from './components/Panel';

<Panel
    id="explorer"
    config={{
        id: 'explorer',
        title: 'Explorer',
        icon: IconFiles,
        group: 'left',
        defaultSize: 250,
        minSize: 200,
        order: 1,
        component: ExplorerComponent
    }}
    state={{
        isVisible: true,
        size: 250,
        position: 1
    }}
    onResize={(size) => console.log('Panel resized:', size)}
    onVisibilityChange={(isVisible) => console.log('Visibility changed:', isVisible)}
    onFocus={() => console.log('Panel focused')}
>
    <YourPanelContent />
</Panel>
```

## Features Explanation

### Resizing

The panel implements a resize handle that:
- Appears on hover
- Shows a blue highlight color when active
- Constrains resizing within min/max bounds
- Updates size smoothly during drag

```typescript
const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    // ... resize logic
}, [group, minSize, maxSize, onResize]);
```

### Maximization

The panel can be maximized to fill the available space:
- Toggles between normal and maximized states
- Adjusts z-index for proper layering
- Maintains aspect ratio and content scroll

### Title Bar

The title bar includes:
- Component icon
- Title text
- Maximize/restore button
- Close button

### Styles

Uses Tailwind CSS for styling:
- Neutral background colors
- Responsive sizing
- Smooth transitions
- Hover effects

## Events

### onResize
Called when the panel is resized via the drag handle:
```typescript
onResize?: (size: number) => void;
```

### onVisibilityChange
Called when the panel's visibility changes (e.g., when closed):
```typescript
onVisibilityChange?: (isVisible: boolean) => void;
```

### onFocus
Called when the panel is clicked or activated:
```typescript
onFocus?: () => void;
```

## Best Practices

1. **Size Constraints**
    - Always provide `minSize` to ensure usability
    - Consider `maxSize` for panels that shouldn't dominate the layout

2. **Content Rendering**
    - Implement proper overflow handling
    - Consider content virtualization for large lists
    - Use appropriate padding/spacing

3. **Performance**
    - Minimize unnecessary renders
    - Implement proper memoization
    - Handle resize events efficiently

4. **Accessibility**
    - Ensure resize handles are keyboard accessible
    - Provide proper ARIA labels
    - Maintain focus management

## Implementation Notes

- Uses ResizeObserver for size monitoring
- Implements custom drag handling for resize functionality
- Manages internal state for maximized view
- Handles group-specific layout adjustments