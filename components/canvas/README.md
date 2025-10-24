# Canvas Persistence System

## Overview

Complete canvas persistence system with deduplication, cloud sync, and management UI.

## Features

✅ **Content Deduplication** - SHA-256 hash prevents duplicate saves
✅ **Full CRUD Operations** - Create, read, update, delete canvas items  
✅ **Cloud Sync Indicator** - Visual feedback for save status
✅ **Management UI** - Search, filter, organize saved items
✅ **Batch Operations** - Delete/archive multiple items at once
✅ **Smart Labels** - Auto-generate titles from content
✅ **Share Support** - Generate shareable links (ready for implementation)
✅ **Favorites & Archive** - Organize your saved items
✅ **Session Tracking** - Link items to chat sessions and tasks

## Quick Start

### 1. Database Setup

Run the migrations:
```bash
# Initial table creation (already done)
# Run: supabase/migrations/add_canvas_content_hash.sql
```

### 2. Save Canvas Item

The sync button in the canvas header automatically saves items:

```tsx
// In CanvasRenderer - already integrated
const handleSync = async () => {
  const { data, isDuplicate } = await canvasItemsService.save({
    content: canvasContent,
    task_id: taskId, // Optional
  });
  
  if (isDuplicate) {
    toast.info('Already saved!');
  }
};
```

### 3. Using the Hook

```tsx
import { useCanvasItems } from '@/hooks/useCanvasItems';

function MyComponent() {
  const { items, load, save, remove, toggleFavorite } = useCanvasItems();
  
  useEffect(() => {
    load(); // Load user's saved items
  }, []);
  
  const handleSave = async () => {
    const { data, isDuplicate } = await save({
      content: myCanvasContent,
      title: 'Custom Title', // Optional
      description: 'Description', // Optional
      tags: ['quiz', 'math'], // Optional
    });
  };
  
  return <div>Found {items.length} saved items</div>;
}
```

### 4. Management UI

Add to a page or modal:

```tsx
import { SavedCanvasItems } from '@/components/canvas/SavedCanvasItems';

function SavedItemsPage() {
  return (
    <div className="h-screen">
      <SavedCanvasItems />
    </div>
  );
}
```

## How Deduplication Works

1. **Content Hash Generation**:
   - Creates SHA-256 hash of `type` + `data` (excludes metadata like title)
   - Same quiz content = same hash
   - Different title = same hash (not a duplicate)

2. **Duplicate Detection**:
   - Before saving, checks for existing hash
   - If found, updates `last_accessed_at` timestamp
   - Returns existing item with `isDuplicate: true`

3. **User Experience**:
   - User clicks "Save" → checks hash
   - If duplicate → "Already saved!" toast
   - If new → "Canvas item saved!" toast
   - Sync icon turns green ✅

## Database Schema

```typescript
interface CanvasItemRow {
  id: string;                    // UUID
  user_id: string;               // Owner
  type: string;                  // 'quiz', 'iframe', etc.
  content: CanvasContent;        // Full content as JSONB
  content_hash: string;          // SHA-256 for deduplication
  title: string;                 // Display name
  description: string;           // Optional notes
  is_favorited: boolean;         // Star status
  is_archived: boolean;          // Archive status
  tags: string[];                // For filtering
  session_id: string;            // Chat session ID
  source_message_id: string;     // Which message created it
  task_id: string;               // Socket.io task UUID
  is_public: boolean;            // Share status
  share_token: string;           // Unique share link
  created_at: timestamp;         // Creation time
  updated_at: timestamp;         // Last modified
  last_accessed_at: timestamp;   // Last viewed/updated
}
```

## API Reference

### Service Layer (`services/canvasItemsService.ts`)

```typescript
// Save with deduplication
canvasItemsService.save(input): Promise<{ data, isDuplicate, error }>

// Update existing item
canvasItemsService.update(id, input): Promise<{ data, error }>

// List with filters
canvasItemsService.list(filters): Promise<{ data, error }>

// Get by ID
canvasItemsService.getById(id): Promise<{ data, error }>

// Get by task ID
canvasItemsService.getByTaskId(taskId): Promise<{ data, error }>

// Delete
canvasItemsService.delete(id): Promise<{ error }>

// Toggle favorite
canvasItemsService.toggleFavorite(id, isFavorited): Promise<{ data, error }>

// Toggle archive
canvasItemsService.toggleArchive(id, isArchived): Promise<{ data, error }>

// Share (generate link)
canvasItemsService.share(id): Promise<{ shareUrl, error }>

// Unshare (make private)
canvasItemsService.unshare(id): Promise<{ error }>

// Get shared item (public)
canvasItemsService.getShared(shareToken): Promise<{ data, error }>

// Batch operations
canvasItemsService.batchDelete(ids): Promise<{ error }>
canvasItemsService.batchArchive(ids, isArchived): Promise<{ error }>

// Statistics
canvasItemsService.getStats(): Promise<{ total, byType, favorited, archived, error }>
```

### React Hook (`hooks/useCanvasItems.ts`)

```typescript
const {
  // State
  items,              // Current items
  isLoading,          // Loading state
  error,              // Error state
  filters,            // Active filters
  
  // Actions
  load,               // Reload items
  save,               // Save new item
  update,             // Update existing
  remove,             // Delete item
  toggleFavorite,     // Toggle star
  toggleArchive,      // Toggle archive
  share,              // Generate share link
  unshare,            // Make private
  batchDelete,        // Delete multiple
  batchArchive,       // Archive multiple
  updateFilters,      // Change filters
} = useCanvasItems(initialFilters?);
```

### Redux Integration

```typescript
import { markItemSynced } from '@/lib/redux/slices/canvasSlice';

// After successful save
dispatch(markItemSynced({ 
  canvasItemId: 'canvas-123', 
  savedItemId: 'uuid-from-db' 
}));

// Check sync status
const currentItem = useAppSelector(selectCurrentCanvasItem);
const isSynced = currentItem?.isSynced; // true/false
```

## UI Components

### SavedCanvasItems

Full-featured management interface:

- 📋 List all saved items in card grid
- 🔍 Search by title
- 🏷️ Filter by type
- ⭐ Mark favorites
- 📦 Archive items
- 🗑️ Delete items
- ✏️ Rename items (click title)
- 🔗 Share items
- 👁️ Open in canvas

### CanvasHeader

Shows sync status:
- 🔴 CloudOff icon = Not saved
- 🟢 Cloud icon = Saved  
- 🔵 CloudSync (spinning) = Saving

## Example: Auto-Save on AI Response

```tsx
function ChatComponent() {
  const dispatch = useAppDispatch();
  
  const handleAIResponse = async (canvasContent, taskId) => {
    // 1. Open in canvas
    dispatch(openCanvas(canvasContent));
    
    // 2. Auto-save to database
    const { data, isDuplicate } = await canvasItemsService.save({
      content: canvasContent,
      task_id: taskId,
    });
    
    // 3. Mark as synced if successful
    if (data && !isDuplicate) {
      dispatch(markItemSynced({ 
        canvasItemId: data.id, 
        savedItemId: data.id 
      }));
    }
  };
}
```

## Filters

```typescript
interface CanvasItemFilters {
  type?: string;              // Filter by canvas type
  is_favorited?: boolean;     // Only favorites
  is_archived?: boolean;      // Only archived
  session_id?: string;        // Items from specific session
  task_id?: string;           // Items from specific task
  search?: string;            // Search in titles
}
```

## Next Steps

1. **Add to Menu**: Add a "Saved Items" link in the sidebar
2. **Auto-Save**: Optionally auto-save all canvas items
3. **Implement Sharing**: Create `/canvas/shared/[token]` page
4. **Add Thumbnails**: Generate preview images
5. **Collaboration**: Add `canvas_collaborators` table
6. **Analytics**: Track usage with `canvas_analytics` table

## Testing

```typescript
// Test deduplication
const { data: item1 } = await canvasItemsService.save({ content: quiz1 });
const { data: item2, isDuplicate } = await canvasItemsService.save({ content: quiz1 });

expect(isDuplicate).toBe(true);
expect(item1.id).toBe(item2.id);
```

## Performance Considerations

- ✅ Content hash indexed for fast lookup
- ✅ User ID + content hash unique constraint
- ✅ Task ID indexed for AI-generated content
- ✅ Optimistic updates in React hook
- ✅ Lazy loading with pagination support (in service)

## Security

- ✅ Row Level Security (RLS) enabled
- ✅ Users can only access their own items
- ✅ Public items accessible via share token only
- ✅ Share tokens are unique and unpredictable
- ✅ All queries filtered by `user_id`

## Troubleshooting

**Q: "Already saved" but I want to create a duplicate?**  
A: Change the content slightly, or add it as a new version with different metadata.

**Q: Hash collision?**  
A: SHA-256 collisions are astronomically rare. For practical purposes, impossible.

**Q: Can I customize the hash algorithm?**  
A: Yes, modify `generateContentHash()` in `canvasItemsService.ts`

**Q: How to bulk import items?**  
A: Use `canvasItemsService.save()` in a loop with error handling.

