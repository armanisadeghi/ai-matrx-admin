# Canvas History & Navigation System

## Overview

The canvas now supports **multiple items with full history and navigation**. When the AI creates multiple canvas items in a single session, users can easily switch between them, manage them, and eventually persist them to the database.

## Architecture

### Redux State Structure

```typescript
interface CanvasItem {
  id: string;                    // Unique identifier
  content: CanvasContent;        // The actual canvas content
  timestamp: number;             // Creation timestamp
  sourceMessageId?: string;      // Link to originating message
}

interface CanvasState {
  isOpen: boolean;               // Canvas visibility
  items: CanvasItem[];           // List of all canvas items
  currentItemId: string | null;  // Active item ID
}
```

### Key Features

1. **Multiple Items**: Track unlimited canvas items in a single session
2. **Navigation**: Switch between items using Previous/Next buttons or dropdown
3. **Item Management**: Remove individual items or clear all history
4. **Smart Switching**: Automatically handles active item when removing items
5. **Metadata**: Each item stores creation time and source context

## Components

### CanvasNavigation

Located at: `components/layout/adaptive-layout/CanvasNavigation.tsx`

**Purpose**: Provides navigation controls for canvas history

**Features**:
- Previous/Next buttons for sequential navigation
- Dropdown menu showing all items with labels and timestamps
- Individual item removal with X button
- "Clear all history" option
- Item count badge (e.g., "1 / 5")
- Hover states for remove buttons

**Usage**:
```tsx
<CanvasNavigation
  items={allItems}
  currentItemId={currentItemId}
  onNavigate={handleNavigate}
  onRemove={handleRemove}
  onClearAll={handleClearAll}
/>
```

### CanvasRenderer (Updated)

Now automatically uses Redux state if no content prop is provided:

```tsx
// Old way (still works)
<CanvasRenderer content={content} />

// New way (uses Redux state)
<CanvasRenderer />
```

## Redux Actions

### `openCanvas(content: CanvasContent)`
Creates a new canvas item and makes it active. Generates unique ID and timestamp.

```typescript
dispatch(openCanvas({
  type: 'quiz',
  data: quizData,
  metadata: { title: 'My Quiz' }
}));
```

### `setCurrentItem(itemId: string)`
Switch to a different canvas item without creating a new one.

```typescript
dispatch(setCurrentItem('canvas-123456'));
```

### `removeCanvasItem(itemId: string)`
Remove a specific item from history. If it's the current item, switches to the last remaining item or closes the canvas.

```typescript
dispatch(removeCanvasItem('canvas-123456'));
```

### `clearCanvas()`
Removes ALL canvas items and closes the canvas. Complete reset.

```typescript
dispatch(clearCanvas());
```

### `closeCanvas()`
Hides the canvas but keeps all items in memory. Users can reopen to see the last active item.

```typescript
dispatch(closeCanvas());
```

### `updateCanvasContent({ id?, content })`
Update an existing item's content. If no ID provided, updates current item.

```typescript
// Update current item
dispatch(updateCanvasContent({ content: newContent }));

// Update specific item
dispatch(updateCanvasContent({ id: 'canvas-123', content: newContent }));
```

## Redux Selectors

### Basic Selectors

```typescript
// Check if canvas is open
const isOpen = useAppSelector(selectCanvasIsOpen);

// Get all canvas items
const items = useAppSelector(selectCanvasItems);

// Get current item ID
const currentId = useAppSelector(selectCurrentItemId);

// Get count of items
const count = useAppSelector(selectCanvasCount);
```

### Advanced Selectors

```typescript
// Get current active item (with full content)
const currentItem = useAppSelector(selectCurrentCanvasItem);
// Returns: CanvasItem | null

// Get current content (backward compatible)
const content = useAppSelector(selectCanvasContent);
// Returns: CanvasContent | null
```

## Item Labels & Display

The system automatically generates labels for items:

1. **Priority**: Uses `metadata.title` if available
2. **Fallback**: Uses `{type} {index}` (e.g., "quiz 1", "iframe 2")
3. **Timestamp**: Shows creation time in dropdown (e.g., "2:45 PM")

## Usage Examples

### Example 1: AI Creates Multiple Quizzes

```typescript
// First quiz
dispatch(openCanvas({
  type: 'quiz',
  data: quiz1Data,
  metadata: { title: 'History Quiz' }
}));

// Second quiz (creates new item, switches to it)
dispatch(openCanvas({
  type: 'quiz',
  data: quiz2Data,
  metadata: { title: 'Science Quiz' }
}));

// User can now navigate between them using the UI
```

### Example 2: Switching Between Items

```typescript
function MyComponent() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCanvasItems);
  
  return (
    <div>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => dispatch(setCurrentItem(item.id))}
        >
          {item.content.metadata?.title || item.content.type}
        </button>
      ))}
    </div>
  );
}
```

### Example 3: Cleanup on Route Change

```typescript
useEffect(() => {
  // Clear canvas history when leaving page
  return () => {
    dispatch(clearCanvas());
  };
}, []);
```

## UI/UX Behavior

### Navigation Controls Position

The navigation controls appear in the header's `customActions` slot, between the title and the view mode toggle.

### Visual States

- **Active Item**: Highlighted in dropdown with background color
- **Disabled Buttons**: Previous/Next buttons disabled at boundaries
- **Remove Hover**: X buttons appear on hover in dropdown
- **Count Badge**: Always shows current position and total (e.g., "2 / 5")

### Keyboard Navigation

- **Tab**: Navigate through dropdown items
- **Enter**: Select highlighted item
- **Escape**: Close dropdown
- **Arrow Keys**: Navigate within dropdown

## Future Enhancements

### Database Persistence (Planned)

```typescript
// Future structure
interface CanvasItemRow {
  id: string;
  user_id: string;
  content: CanvasContent;
  title: string;
  created_at: timestamp;
  updated_at: timestamp;
  is_favorited: boolean;
  tags: string[];
  session_id?: string;
}
```

**Features to Add**:
1. Save items to database automatically or on-demand
2. Load previous sessions on app start
3. Search/filter saved items
4. Tag and organize items
5. Share items with other users
6. Export/import functionality

### Smart Item Management

1. **Auto-cleanup**: Remove items older than X hours
2. **Favorites**: Pin important items
3. **Duplicates**: Detect and merge similar items
4. **Version History**: Track changes to items over time

### Enhanced Navigation

1. **Search**: Filter items by title/type
2. **Grouping**: Group by session, type, or date
3. **Thumbnails**: Show preview in dropdown
4. **Drag Reorder**: Manually reorder items

## Migration Guide

### For Existing Code

The changes are **backward compatible**. Existing code using `selectCanvasContent` will continue to work:

```typescript
// Still works - returns current item's content
const content = useAppSelector(selectCanvasContent);
```

### For New Code

Use the new selectors for better functionality:

```typescript
// Recommended for new code
const currentItem = useAppSelector(selectCurrentCanvasItem);
const allItems = useAppSelector(selectCanvasItems);
```

### Updating Components

If a component was receiving `content` as a prop:

```typescript
// Before
<MyComponent content={canvasContent} />

// After (both work)
<MyComponent content={canvasContent} />  // Still works
<MyComponent />  // Uses Redux state automatically
```

## Testing

### Test Scenarios

1. **Create Multiple Items**: Verify each creates a new entry
2. **Navigate Forward/Backward**: Test button states and switching
3. **Remove Items**: Test removal, auto-switching, and empty state
4. **Close/Reopen**: Verify items persist when canvas is closed/reopened
5. **Clear All**: Ensure complete cleanup
6. **View Mode Switching**: Verify mode resets when changing items

### Example Test

```typescript
// Create 3 items
dispatch(openCanvas(content1));
dispatch(openCanvas(content2));
dispatch(openCanvas(content3));

// Verify state
const items = selectCanvasItems(getState());
expect(items).toHaveLength(3);
expect(selectCurrentItemId(getState())).toBe(items[2].id);

// Navigate backward
dispatch(setCurrentItem(items[1].id));
expect(selectCurrentItemId(getState())).toBe(items[1].id);

// Remove current
dispatch(removeCanvasItem(items[1].id));
expect(selectCanvasItems(getState())).toHaveLength(2);
```

## Troubleshooting

### Items Not Switching

**Symptom**: Clicking navigation doesn't change content

**Solution**: Ensure `CanvasRenderer` is using Redux state:
```tsx
<CanvasRenderer />  // Not <CanvasRenderer content={content} />
```

### Duplicate Items

**Symptom**: Same content appears multiple times

**Solution**: Use `updateCanvasContent` instead of `openCanvas` when modifying existing content.

### Lost Items on Refresh

**Symptom**: All items disappear on page reload

**Solution**: This is expected until database persistence is implemented. For now, items only persist during the session.

## API Reference

See `lib/redux/slices/canvasSlice.ts` for complete type definitions and implementation details.

