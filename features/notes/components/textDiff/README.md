# AI Text Diff System

A comprehensive system for AI-powered text editing with diff tracking, version history, and user review.

## Overview

This system allows AI models to suggest text changes using diffs instead of rewriting entire documents. Users can review, accept, or reject individual changes or accept all at once.

## Features

- ✅ **Two diff formats**: Search/Replace and Line-based
- ✅ **Two-pass matching**: Exact match → Fuzzy match (whitespace-tolerant)
- ✅ **Visual diff review**: Highlighted changes with accept/reject controls
- ✅ **Version history**: Auto-versioning with database triggers (max 10 versions)
- ✅ **Manual & auto-save**: User-controlled saves with dirty state tracking
- ✅ **Redux state management**: Normalized state for multiple sessions
- ✅ **Mobile-friendly UI**: Responsive design using shadcn/ui components

## Architecture

### Database
- **`note_versions`** table with auto-versioning trigger
- Stores up to 10 versions per note
- Tracks change type (manual, AI edit, etc.)

### Redux
- **`textDiffSlice`**: Manages diff sessions, acceptance state, dirty tracking
- Normalized state with `byId` pattern
- Selectors for easy data access

### Components
- **`AITextEditor`**: Main wrapper component
- **`DiffReviewPanel`**: Shows pending diffs with accept/reject buttons
- **`InlineDiffHighlight`**: Visual diff display
- **`VersionHistoryModal`**: Browse and restore previous versions
- **`SaveIndicator`**: Shows save status and unsaved changes

## Usage

### 1. Basic Implementation

```tsx
import { AITextEditor } from '@/features/notes/components/textDiff';

function MyNotePage({ noteId }: { noteId: string }) {
    const [content, setContent] = useState('Initial content');

    return (
        <AITextEditor
            noteId={noteId}
            initialContent={content}
            onContentChange={setContent}
            placeholder="Start writing..."
        />
    );
}
```

### 2. Using the Hook Directly

```tsx
import { useTextDiff } from '@/features/notes/hooks/useTextDiff';

function CustomEditor({ noteId, content }: Props) {
    const {
        isDirty,
        pendingDiffs,
        processAIResponse,
        acceptAll,
        saveChanges,
    } = useTextDiff({
        noteId,
        content,
        onContentChange: (newContent) => console.log(newContent),
    });

    const handleAIRequest = async () => {
        const aiResponse = await callYourAIService(content);
        const result = processAIResponse(aiResponse);

        if (result.success) {
            console.log(`Processed ${result.validCount} diffs`);
        }
    };

    return (
        <div>
            <button onClick={handleAIRequest}>Get AI Suggestions</button>
            <button onClick={acceptAll} disabled={!pendingDiffs.length}>
                Accept All
            </button>
            <button onClick={saveChanges} disabled={!isDirty}>
                Save
            </button>
        </div>
    );
}
```

### 3. Standalone Components

```tsx
import {
    DiffReviewPanel,
    VersionHistoryModal,
    SaveIndicator,
} from '@/features/notes/components/textDiff';

function MyEditor() {
    const [showHistory, setShowHistory] = useState(false);

    return (
        <>
            <SaveIndicator
                isDirty={true}
                isSaving={false}
                lastSaved={new Date()}
                onSave={() => console.log('save')}
            />

            <DiffReviewPanel
                noteId="note-123"
                onSaveAll={() => console.log('accept all')}
            />

            <VersionHistoryModal
                noteId="note-123"
                currentContent="Current text"
                open={showHistory}
                onOpenChange={setShowHistory}
            />
        </>
    );
}
```

## AI Model Instructions

### System Prompt

```
You are a text editing assistant. When making changes to text, you MUST use one of two diff formats:

1. SEARCH/REPLACE FORMAT - Use for small, specific changes
2. LINE RANGE FORMAT - Use for replacing entire sections

Choose the format that makes the most sense for each change.
```

### Search/Replace Format

````markdown
Use this format for finding and replacing specific text:

```diff
- [exact text to find and remove]
+ [new text to replace it with]
```

**Rules:**
- Each diff block can contain multiple line pairs
- The "- " prefix indicates text to remove
- The "+ " prefix indicates text to add
- Empty lines use just "-" or "+" without content
- System will try exact match first, then fuzzy match (whitespace-tolerant)
- If multiple matches found, the diff will fail (be specific!)

**Examples:**

```diff
- Hello world
+ Hello, world!
```

```diff
- This is
- old text
+ This is
+ new text
```
````

### Line Range Format

````markdown
Use this format for replacing entire line ranges:

```replace
START_LINE: 5
END_LINE: 12
---
New content
goes here
line by line
```

**Rules:**
- `START_LINE` and `END_LINE` are 1-based line numbers (inclusive)
- Everything after `---` is the replacement content
- The entire line range will be deleted and replaced
- Use this for large blocks or when line numbers are clearer than text matching

**Example:**

```replace
START_LINE: 1
END_LINE: 3
---
This is the new content
that replaces lines 1-3
```
````

### Complete AI Prompt Example

````
You are editing a document. Suggest improvements using diff blocks.

ALWAYS use code blocks with the ```diff or ```replace syntax.

User's text:
"""
{user_content_with_line_numbers}
"""

User's request:
"{user_request}"

Your response should include:
1. A brief explanation of changes
2. One or more diff blocks showing the changes

Example response:

I'll improve the grammar and clarity:

```diff
- Hello world
+ Hello, world!
```

```diff
- This is a test.
+ This is an example.
```
````

## API Reference

### `useTextDiff(options)`

Hook for managing text diffs.

**Options:**
- `noteId: string` - Unique note identifier
- `content: string` - Current note content
- `onContentChange?: (content: string) => void` - Callback when content changes

**Returns:**
```typescript
{
    // State
    session: DiffSession | undefined;
    isDirty: boolean;
    pendingDiffs: ParsedDiff[];
    acceptedDiffs: ParsedDiff[];
    currentContent: string;

    // Actions
    processAIResponse: (aiResponse: string) => Result;
    acceptSingleDiff: (diffId: string) => void;
    acceptAll: () => Promise<Result>;
    saveChanges: () => Promise<Result>;
    discardChanges: () => void;
    rejectDiff: (diffId: string) => void;
}
```

### Diff Types

```typescript
type SearchReplaceDiff = {
    type: 'search_replace';
    id: string;
    searchText: string;
    replaceText: string;
    status: 'pending' | 'accepted' | 'rejected' | 'error';
    matchInfo?: {
        found: boolean;
        matchType: 'exact' | 'fuzzy' | 'none' | 'multiple';
        startIndex?: number;
        endIndex?: number;
        actualText?: string;
    };
    error?: string;
};

type LineRangeDiff = {
    type: 'line_range';
    id: string;
    startLine: number;
    endLine: number;
    replaceText: string;
    status: 'pending' | 'accepted' | 'rejected' | 'error';
    matchInfo?: {
        found: boolean;
        actualLines?: string[];
    };
    error?: string;
};
```

## Database Schema

### `note_versions` Table

```sql
CREATE TABLE note_versions (
    id UUID PRIMARY KEY,
    note_id UUID REFERENCES notes(id),
    version_number INTEGER,
    content TEXT,
    label TEXT,
    folder_name TEXT,
    tags TEXT[],
    metadata JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ,
    change_type TEXT, -- 'manual', 'ai_edit', 'ai_accept_all', 'ai_accept_partial'
    change_metadata JSONB
);
```

**Trigger:** Auto-creates versions on note UPDATE (max 10 versions)

## Testing

### Test the System

1. Navigate to `/notes/test-diff` (create this route)
2. Type some text in the editor
3. Click "AI Edit (Demo)" to simulate AI response
4. Review the suggested changes
5. Accept/reject individual diffs or accept all
6. Save changes
7. Click "History" to view version history

### Manual Testing Steps

```bash
# 1. Run the database migration
# (In Supabase dashboard or via migration tool)

# 2. Start your dev server
npm run dev

# 3. Navigate to your notes page
# The textDiff system is now available
```

## Advanced Usage

### Custom AI Integration

```typescript
import { parseAIResponse } from '@/lib/redux/features/textDiff';

async function getAISuggestions(content: string, prompt: string) {
    // Call your AI service
    const response = await fetch('/api/ai/edit', {
        method: 'POST',
        body: JSON.stringify({ content, prompt }),
    });

    const { text } = await response.json();

    // Parse the response
    const diffs = parseAIResponse(text);

    return diffs;
}
```

### Version Restore

```typescript
import { restoreNoteVersion } from '@/features/notes/service/noteVersionsService';

async function restoreVersion(noteId: string, versionNumber: number) {
    await restoreNoteVersion(noteId, versionNumber);
    // Refresh your UI
    window.location.reload();
}
```

## Troubleshooting

### Diffs not matching
- **Issue**: "No match found" or "Multiple matches found"
- **Solution**: Be more specific in search text, or use line range format

### Version history not showing
- **Issue**: No versions appear in history modal
- **Solution**: Ensure database trigger is installed and note has been saved at least once

### Save button not appearing
- **Issue**: Changes made but no save button
- **Solution**: Check that Redux store is properly configured with `textDiffSlice`

## Future Enhancements

- [ ] Real-time collaboration with WebSockets
- [ ] Conflict resolution when multiple users edit
- [ ] Batch diff operations
- [ ] Diff suggestions based on writing style
- [ ] Export diff history as patches
- [ ] Undo/redo with Ctrl+Z support
