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

// Copy a note
const duplicate = await NotesAPI.copy('note-id');

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

## Quick Save Utilities

Super simple "one and done" components for saving content from anywhere in your app:

### SaveToScratchButton
One-click button to save content directly to Scratch folder:

```typescript
import { SaveToScratchButton } from '@/features/notes';

// Icon button (default)
<SaveToScratchButton content={myContent} />

// Button with label
<SaveToScratchButton 
    content={myContent}
    variant="default"
    size="default"
    label="Save to Scratch"
/>
```

**Perfect for**: Quick captures, temporary notes, copy-paste operations

### SaveSelectionButton
Saves currently selected text to notes:

```typescript
import { SaveSelectionButton } from '@/features/notes';

// Save selection to Scratch (default)
<SaveSelectionButton />

// Save to specific folder
<SaveSelectionButton folder="Personal" label="Save Selection" />
```

**Perfect for**: Reading apps, documentation, research pages

### QuickSaveModal
Modal with editing and folder selection before saving:

```typescript
import { QuickSaveModal } from '@/features/notes';

function MyComponent() {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                Save with Options
            </Button>
            
            <QuickSaveModal
                open={isOpen}
                onOpenChange={setIsOpen}
                initialContent={myContent}
                defaultFolder="Personal"
                onSaved={() => console.log('Saved!')}
            />
        </>
    );
}
```

**Perfect for**: When users need to review/edit before saving

### QuickCaptureButton
Button that opens QuickSaveModal:

```typescript
import { QuickCaptureButton } from '@/features/notes';

// Simple floating action button
<QuickCaptureButton />

// With custom defaults
<QuickCaptureButton
    defaultContent="Pre-filled content"
    defaultFolder="Ideas"
    label="Capture Idea"
    onSaved={() => refreshMyData()}
/>
```

**Perfect for**: Toolbars, floating action buttons, quick-access areas

### Real-World Examples

**Save AI Response:**
```typescript
<SaveToScratchButton content={aiResponse} variant="outline" />
```

**Save Selected Documentation:**
```typescript
<SaveSelectionButton folder="Research" />
```

**Capture Code Snippet:**
```typescript
<QuickCaptureButton 
    defaultContent={codeSnippet}
    defaultFolder="Programming"
    label="Save Snippet"
/>
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
        copyNote,           // Duplicate any note
        refreshNotes,
        findOrCreateEmptyNote,  // Never creates duplicates
    } = useNotesContext();
    
    // Use the shared state
}
```

## Key Features

### Core Functionality
- **Auto-labeling**: Generates titles from content (12+ chars or Enter key)
- **No duplicates**: Smart checking prevents multiple empty notes
- **Real-time sync**: All views share state automatically
- **Auto-save**: 1-second debounce with dirty tracking
- **Copy notes**: Duplicate any note with one click
- **Share notes**: Generate shareable links for collaboration

### Organization
- **Folder organization**: Drag & drop between folders
- **Default folders**: Always-visible folders (Draft, Personal, Business, Prompts, Scratch) with custom icons
- **30+ folder categories**: Pre-configured icons & colors (Work, Programming, Study, Research, etc.)
- **Tags**: Multi-tag support with filtering

### Collaboration
- **Share with link**: Generate URL for note sharing
- **Accept shared notes**: Visit link to add note to your collection
- **Shared With Me**: Query notes shared by others (via `fetchSharedNotes`)
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
import { getAllFolders, isDefaultFolder, getCustomFolders, getFolderIconAndColor } from '@/features/notes';

// Get complete folder list (default + custom)
const folders = getAllFolders(notes);
// Returns: ['Draft', 'Personal', 'Business', 'Prompts', 'Scratch', 'CustomFolder1', ...]

// Check if folder is a default
const isDefault = isDefaultFolder('Draft'); // true

// Get only custom folders
const customFolders = getCustomFolders(notes); // ['CustomFolder1', ...]

// Get icon & color for any folder (default or category)
const { icon, color } = getFolderIconAndColor('Work');
// Returns: { icon: BriefcaseIcon, color: 'text-blue-500 dark:text-blue-400' }
```

## Folder Categories

30+ pre-configured folder categories available when creating folders:

**Popular Categories:**
- Work, Programming, Study, Documents, Meetings
- Personal, Team, Research, Ideas, Projects
- Finances, Analytics, Emails, Images, Media, Videos
- Security, Bookmarks, Archive, Important, Cloud
- Completed, Saved, Drafts, Downloads, Shared

Each category includes:
- Custom icon (from Lucide React)
- Themed color (light & dark mode)
- Descriptive tooltip

```typescript
import { FOLDER_CATEGORIES, getFolderCategory } from '@/features/notes';

// Get all categories
FOLDER_CATEGORIES; // Array of 30+ categories

// Get specific category
const workCategory = getFolderCategory('work');
// Returns: { id: 'work', label: 'Work', icon: BriefcaseIcon, color: '...', description: '...' }
```

## Copy & Share Notes

### Copy Note

```typescript
import { NotesAPI } from '@/features/notes';

// Duplicate a note
const copiedNote = await NotesAPI.copy('note-id');
// Creates copy with "(Copy)" appended to label
```

UI: Click the **Copy** button in toolbar or quick sheet.

### Share Notes

**Generate Share Link:**
```typescript
import { generateShareLink } from '@/features/notes';

const shareUrl = generateShareLink('note-id');
// Returns: 'https://yourapp.com/notes/share/note-id'
```

**Accept Shared Note:**
Visit the share link while logged in. The note will be added to your collection.

```typescript
import { acceptSharedNote } from '@/features/notes';

// Programmatically accept (when logged in)
await acceptSharedNote('note-id', userId);
```

**Query Shared Notes:**
```typescript
import { fetchSharedNotes } from '@/features/notes';

// Get all notes shared with current user
const sharedNotes = await fetchSharedNotes(userId);
```

UI: Click the **Share** button in toolbar to generate a shareable link. Copy and send to anyone.

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

## Component Overview

**Full Interface:**
- `NotesLayout` - Complete notes app with sidebar
- `QuickNotesSheet` - Compact sheet version

**Quick Actions:**
- `SaveToScratchButton` - One-click save to Scratch
- `SaveSelectionButton` - Save selected text
- `QuickCaptureButton` - Opens modal for editing
- `QuickSaveModal` - Edit + folder selection

**When to Use What:**
- Need full app? → `NotesLayout` or `/notes` route
- Quick capture in header? → `QuickNotesButton` (already integrated)
- Save AI output? → `SaveToScratchButton`
- Save while reading? → `SaveSelectionButton`
- Need user to edit first? → `QuickSaveModal` or `QuickCaptureButton`

## Architecture

- **Provider**: Single instance in `app/Providers.tsx`
- **Service**: Supabase CRUD operations
- **Context**: Global state management
- **API**: Public programmatic interface
- **Utilities**: Drop-in buttons for common workflows

That's it. Simple, clean, works everywhere.

