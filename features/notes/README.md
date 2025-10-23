# Notes Feature

A simple, fast notes system with folder organization, tags, and auto-labeling.

## Programmatic Usage

Use `NotesAPI` to interact with notes from anywhere in your app:

```typescript
import { NotesAPI } from '@/features/notes';

// Create a note
const note = await NotesAPI.create({
    label: 'Meeting Notes',
    content: 'Discussion points...',
    folder_name: 'Work',
    tags: ['important', 'meeting']
});

// Quick create (auto-labels, reuses empty notes, defaults to Draft)
const quickNote = await NotesAPI.quickCreate(
    'Content here',
    'Work'  // folder name (optional, defaults to Draft)
);

// Get all notes
const notes = await NotesAPI.getAll();

// Get specific note
const note = await NotesAPI.getById('note-id');

// Update a note
await NotesAPI.update('note-id', {
    content: 'Updated content',
    tags: ['updated']
});

// Delete a note
await NotesAPI.delete('note-id');
```

## UI Components

### Main Interface
Full notes app at `/notes` or use `<NotesLayout />` component.

### Quick Access
- **Quick Sheet**: `⚡` → Notes (side panel for fast capture)
- **Utilities Hub**: `⚡` → Utilities Hub (full overlay)
- Both include "Open in New Tab" button to open `/notes` page

### Embed Anywhere
```typescript
import { NotesLayout } from '@/features/notes';

// Full interface with sidebar
<NotesLayout />
```

## Context Hook

For custom UIs that need shared state:

```typescript
import { useNotesContext } from '@/features/notes';

function MyComponent() {
    const {
        notes,              // All notes
        activeNote,         // Currently selected
        isLoading,
        createNote,         // Smart create (no duplicates)
        updateNote,         // Auto-syncs everywhere
        deleteNote,
        refreshNotes,
        findOrCreateEmptyNote,  // Never creates duplicates
    } = useNotesContext();
    
    // Use the shared state
}
```

## Key Features

- **Auto-labeling**: Generates titles from content (12+ chars or Enter key)
- **No duplicates**: Smart checking prevents multiple empty notes
- **Real-time sync**: All views share state automatically
- **Auto-save**: 1-second debounce with dirty tracking
- **Folder organization**: Drag & drop between folders
- **Default folders**: Always-visible folders (Draft, Personal, Business, Prompts, Scratch) with custom icons
- **Tags**: Multi-tag support with inline editor
- **Mobile-friendly**: Responsive design

## Default Folders

Five default folders always appear (even when empty):
- **Draft** ✏️ - Work in progress (default for new notes)
- **Personal** 👤 - Personal notes
- **Business** 💼 - Work-related
- **Prompts** 💡 - AI prompts & templates
- **Scratch** 📄 - Quick notes

**Note**: All auto-generated notes default to "Draft" folder. Custom folders can still be created and appear after defaults alphabetically.

### Getting Folder List Programmatically

Use the centralized folder utility (single source of truth):

```typescript
import { getAllFolders } from '@/features/notes';

// Get complete folder list (default + custom)
const folders = getAllFolders(notes);
// Returns: ['Draft', 'Personal', 'Business', 'Prompts', 'Scratch', 'CustomFolder1', ...]

// Check if folder is a default
import { isDefaultFolder } from '@/features/notes';
const isDefault = isDefaultFolder('Draft'); // true

// Get only custom folders
import { getCustomFolders } from '@/features/notes';
const customFolders = getCustomFolders(notes); // ['CustomFolder1', ...]
```

## Database

Table: `notes`
```sql
- id (uuid)
- user_id (uuid, RLS protected)
- label (text)
- content (text)
- folder_name (text)
- tags (text[])
- metadata (jsonb)
- is_deleted (boolean)
- position (integer)
- created_at (timestamptz)
- updated_at (timestamptz, auto-updated)
```

## Architecture

- **Provider**: Single instance in `app/Providers.tsx`
- **Service**: Supabase CRUD operations
- **Context**: Global state management
- **API**: Public programmatic interface

That's it. Simple, clean, works everywhere.

