# Notes Feature

A simple, modern, and performant notes application with auto-save functionality.

## Features

- ✨ **Simple & Clean UI** - Minimalistic VSCode-style interface
- 📁 **Folder Organization** - Group notes by folders
- 🏷️ **Tags** - Tag notes for easy filtering
- 💾 **Auto-Save** - Automatic saving with debouncing (1s delay)
- 📱 **Mobile Responsive** - Fully responsive with mobile-friendly sidebar
- 🎨 **Modern Design** - Clean, elegant UI with dark mode support
- ⚡ **Performant** - Optimistic updates and smart dirty state tracking

## Structure

```
features/notes/
├── components/          # React components
│   ├── NotesLayout.tsx  # Main layout component
│   ├── NotesSidebar.tsx # Folder/file tree sidebar
│   ├── NoteEditor.tsx   # Note editor with auto-save
│   └── NoteToolbar.tsx  # Action toolbar
├── hooks/               # React hooks
│   ├── useNotes.ts      # Fetch and manage notes
│   ├── useAutoSave.ts   # Auto-save with debouncing
│   └── useActiveNote.ts # Manage active note
├── service/             # Business logic
│   ├── notesService.ts  # Supabase CRUD operations
│   └── notesApi.ts      # Public API for external use
├── utils/               # Utility functions
│   └── noteUtils.ts     # Filtering, sorting, grouping
├── types.ts             # TypeScript types
└── index.ts             # Public exports
```

## Usage

### In a Page Component

```tsx
import { NotesLayout } from '@/features/notes';

export default function NotesPage() {
    return <NotesLayout />;
}
```

### As a Popover/Sheet Component

```tsx
import { NotesLayout } from '@/features/notes';
import { Sheet, SheetContent } from '@/components/ui/sheet';

function MyComponent() {
    return (
        <Sheet>
            <SheetContent className="w-full sm:max-w-4xl">
                <NotesLayout />
            </SheetContent>
        </Sheet>
    );
}
```

### Using the Public API

Create, update, and delete notes programmatically from anywhere in your app:

```typescript
import { NotesAPI } from '@/features/notes';

// Create a note
const note = await NotesAPI.create({
    label: "My Note",
    content: "Some content",
    folder_name: "Personal",
    tags: ["important"]
});

// Quick create
const quickNote = await NotesAPI.quickCreate("Quick note content");

// Update a note
await NotesAPI.update(noteId, {
    content: "Updated content",
    tags: ["updated"]
});

// Get all notes
const notes = await NotesAPI.getAll();

// Get a single note
const note = await NotesAPI.getById(noteId);

// Delete a note
await NotesAPI.remove(noteId);
```

## Database Schema

The notes table includes:

- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `label` - Note title (default: "New Note")
- `content` - Note content (text)
- `folder_name` - Folder name (default: "General")
- `tags` - Array of tag strings
- `metadata` - JSONB for additional data
- `shared_with` - JSONB for sharing info
- `is_deleted` - Soft delete flag
- `position` - For custom ordering
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

## How It Works

### Auto-Save

The auto-save system uses a debounced approach:

1. User types in the editor
2. Changes are queued and marked as "dirty"
3. After 1 second of inactivity, changes are saved
4. On blur or unmount, pending changes are force-saved
5. Status indicator shows: "Unsaved", "Saving...", or "Saved"

### Active Note Management

The system always ensures there's an active note:

1. On load, selects the most recently updated note
2. If no notes exist, creates a default "New Note"
3. If active note is deleted, selects another note
4. New notes are automatically set as active

### Mobile Responsiveness

- Desktop: Fixed sidebar on the left
- Mobile: Sidebar in a sheet/drawer, triggered by menu button
- Automatically closes sidebar after selecting/creating a note on mobile

## Styling

The notes feature follows the app's design system:

- Uses Tailwind CSS with dark mode support
- Clean, minimalistic UI with lucide-react icons
- Responsive spacing and typography
- Consistent with the rest of the application

## Performance

- **Optimistic Updates**: UI updates immediately, then syncs with database
- **Debounced Auto-Save**: Reduces database calls
- **Indexed Queries**: Database indexes on common query fields
- **Smart Caching**: React state management with proper memoization

## Future Enhancements

Potential features to add:

- Rich text editing
- Note sharing
- Search by tags
- Export notes
- Note templates
- Keyboard shortcuts
- Nested folders
- Drag-and-drop reordering

