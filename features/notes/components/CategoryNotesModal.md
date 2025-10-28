# CategoryNotesModal

A reusable modal for managing notes within a specific category/folder. Works anywhere in the app.

## Quick Start

```typescript
import { CategoryNotesModal } from '@/features/notes';
import type { Note } from '@/features/notes';

<CategoryNotesModal
  open={isOpen}
  onOpenChange={setIsOpen}
  categoryName="SQL Templates"
  onSelectNote={(note) => {
    // Use the selected note
    console.log(note.content);
  }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | Required | Controls modal visibility |
| `onOpenChange` | `(open: boolean) => void` | Required | Callback when modal opens/closes |
| `categoryName` | `string` | Required | Category/folder to filter notes |
| `onSelectNote` | `(note: Note) => void` | Optional | Callback when a note is selected |
| `allowCreate` | `boolean` | `true` | Allow creating new items |
| `allowEdit` | `boolean` | `true` | Allow editing items |
| `allowDelete` | `boolean` | `true` | Allow deleting items |
| `allowImport` | `boolean` | `true` | Allow importing from other categories |
| `selectButtonLabel` | `string` | `"Use"` | Label for the select button |
| `title` | `string` | Auto | Custom modal title |
| `description` | `string` | Auto | Custom modal description |

## Features

- ✅ **Master-Detail Layout** - Sidebar list + full-height editor (like notes app)
- ✅ **Full CRUD** - Create, read, update, delete items
- ✅ **Import from Notes** - Import any note from other categories
- ✅ **Full-Height Editing** - Editor takes entire available height for maximum productivity
- ✅ **Compact Sidebar** - Narrow sidebar (320px) with minimal padding and small icons
- ✅ **Search** - Real-time filtering in sidebar
- ✅ **Auto-labeling** - Generates labels from content automatically
- ✅ **Mobile-Responsive** - Collapsible sidebar on mobile devices
- ✅ **Category Icons** - Shows category-specific icons and colors
- ✅ **Tags Support** - Displays tags for each item
- ✅ **User-scoped** - Only shows current user's content (RLS protected)

## Real-World Examples

### SQL Templates
```typescript
const [templatesOpen, setTemplatesOpen] = useState(false);

<Button onClick={() => setTemplatesOpen(true)}>
  SQL Templates
</Button>

<CategoryNotesModal
  open={templatesOpen}
  onOpenChange={setTemplatesOpen}
  categoryName="SQL Templates"
  selectButtonLabel="Use Template"
  onSelectNote={(note) => {
    setSqlQuery(note.content);
    setTemplatesOpen(false);
  }}
/>
```

### Code Snippets
```typescript
<CategoryNotesModal
  open={isOpen}
  onOpenChange={setIsOpen}
  categoryName="Programming"
  selectButtonLabel="Insert Snippet"
  onSelectNote={(note) => {
    insertCode(note.content);
  }}
/>
```

### Email Templates
```typescript
<CategoryNotesModal
  open={isOpen}
  onOpenChange={setIsOpen}
  categoryName="Emails"
  selectButtonLabel="Use Template"
  onSelectNote={(note) => {
    setEmailBody(note.content);
  }}
  allowDelete={false} // Prevent deletion
/>
```

## Notes

- Category names must match the `folder_name` in your notes table
- Uses existing notes infrastructure - no schema changes needed
- Add custom categories in `features/notes/constants/folderCategories.ts`
- Works with the Notes Context Provider (must be in app tree)
- Master-detail layout: Compact sidebar list (320px) + full-height editor/viewer
- Editor takes full available height when creating/editing for maximum productivity
- Mobile-responsive: Sidebar collapses on mobile with toggle button
- Minimal padding and small icons for space efficiency
- Import feature allows bringing in content from any other category
- Terminology adapts to category name (e.g., "SQL Templates" not "SQL Template Notes")

## Available Categories

Pre-configured categories: Work, Programming, SQL Templates, Study, Documents, Meetings, Personal, Team, Research, Ideas, Projects, Finances, Analytics, Emails, Images, Media, Videos, Security, Bookmarks, Archive, Important, Cloud, Completed, Saved, Drafts, Downloads, Shared, and more.

