# Text Diff Feature

AI-driven text editing with diff visualization, version history, and smart change management.

## Overview

The Text Diff system enables collaborative editing between users and AI by:
- Parsing AI-generated diff responses
- Applying changes with strict → fuzzy matching fallback
- Visualizing before/after changes
- Managing version history automatically
- Providing granular accept/reject controls

## Quick Start

### 1. Initialize a Diff Session

```typescript
import { useDiffHandler } from '@/features/text-diff';

function MyEditor() {
  const diffHandler = useDiffHandler({
    onSaveCallback: async (text) => {
      // Save the text to your backend
      await updateNote(noteId, { content: text });
    },
  });

  useEffect(() => {
    // Initialize with your content
    diffHandler.initialize('note-123', 'note', initialText);
  }, []);
}
```

### 2. Process AI Responses

```typescript
// When AI returns a diff response
const result = diffHandler.processAIResponse(aiResponseText);

if (result.success) {
  console.log(`Parsed ${result.diffCount} diffs`);
}
```

### 3. Display Diffs

```typescript
import { DiffViewer, DiffControls } from '@/features/text-diff/components';
import { useAppSelector } from '@/lib/redux';
import { selectPendingDiffs } from '@/lib/redux/slices/textDiffSlice';

function DiffUI() {
  const pendingDiffs = useAppSelector(selectPendingDiffs);
  const diffHandler = useDiffHandler();

  return (
    <div>
      {pendingDiffs.map((diff) => (
        <DiffViewer
          key={diff.id}
          diff={diff}
          onAccept={diffHandler.accept}
          onReject={diffHandler.reject}
        />
      ))}
    </div>
  );
}
```

## AI Diff Format

The system supports two diff formats:

### Search/Replace Format

```
SEARCH:
<<<
[exact text to find]
>>>
REPLACE:
<<<
[replacement text]
>>>
```

### Line-Based Format

```
LINES:
<<<
START: 5
END: 12
>>>
REPLACE:
<<<
new content
goes here
>>>
```

## Matching Strategy

1. **Exact Match**: Tries to find exact text (including whitespace)
2. **Fuzzy Match**: If exact fails, tries whitespace-insensitive matching
3. **Validation**: Ensures exactly 1 match found (0 or >1 = error)

## Components

### DiffViewer

Displays a single diff with before/after and accept/reject buttons.

```typescript
<DiffViewer
  diff={pendingDiff}
  onAccept={(id) => console.log('Accepted:', id)}
  onReject={(id) => console.log('Rejected:', id)}
  showLineNumbers={true}
/>
```

### DiffControls

Control panel for bulk actions and save/undo operations.

```typescript
<DiffControls
  pendingCount={3}
  acceptedCount={2}
  rejectedCount={1}
  isDirty={true}
  onAcceptAll={() => {}}
  onRejectAll={() => {}}
  onSave={() => {}}
  onUndo={() => {}}
  canUndo={true}
/>
```

### DiffHistory

Timeline view of version history with restore functionality.

```typescript
<DiffHistory
  noteId="note-123"
  onRestoreVersion={(versionNumber) => {
    console.log('Restoring version:', versionNumber);
  }}
/>
```

## Redux State

### Selectors

```typescript
import {
  selectDiffState,
  selectPendingDiffs,
  selectAcceptedDiffs,
  selectIsDirty,
  selectCurrentText,
  selectCanUndo,
} from '@/lib/redux/slices/textDiffSlice';

const diffState = useAppSelector(selectDiffState);
const pending = useAppSelector(selectPendingDiffs);
const isDirty = useAppSelector(selectIsDirty);
```

### Actions

```typescript
import {
  initializeDiffSession,
  addPendingDiffs,
  acceptDiff,
  rejectDiff,
  acceptAllDiffs,
  rejectAllDiffs,
  undoLastAccept,
  markSaved,
} from '@/lib/redux/slices/textDiffSlice';

// Accept a single diff
dispatch(acceptDiff('diff-1'));

// Accept all
dispatch(acceptAllDiffs());

// Undo
dispatch(undoLastAccept());
```

## Version History

Versions are created automatically via database trigger on note updates.

### Tracking AI vs User Changes

```typescript
// Before updating a note with AI changes
await supabase
  .from('notes')
  .update({
    content: newContent,
    metadata: {
      ...note.metadata,
      last_change_source: 'ai',
      last_change_type: 'ai_diff',
      last_diff_metadata: { diffCount: 3 }
    }
  })
  .eq('id', noteId);
```

### Fetching History

```typescript
import { fetchNoteVersions } from '@/lib/redux/slices/noteVersionsSlice';

// Dispatch fetch
dispatch(fetchNoteVersions(noteId));

// Select versions
const versions = useAppSelector(selectNoteVersions(noteId));
```

### Restoring Versions

```typescript
import { restoreNoteVersion } from '@/lib/redux/slices/noteVersionsSlice';

// Restore to version 5
await dispatch(restoreNoteVersion({ 
  noteId: 'note-123', 
  versionNumber: 5 
})).unwrap();
```

## Integration with System Prompts

Example: Integrating with `update-text` functionality:

```typescript
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';
import { useDiffHandler } from '@/features/text-diff';

function NoteEditorWithAI({ noteId, noteContent }) {
  const { execute, streamingText, isExecuting } = usePromptExecution();
  const diffHandler = useDiffHandler({
    onSaveCallback: async (text) => {
      // Update note with AI metadata
      await supabase
        .from('notes')
        .update({
          content: text,
          metadata: {
            last_change_source: 'ai',
            last_change_type: 'ai_diff'
          }
        })
        .eq('id', noteId);
    }
  });

  // Initialize diff session
  useEffect(() => {
    diffHandler.initialize(noteId, 'note', noteContent);
  }, [noteId]);

  const handleAIUpdate = async () => {
    // Execute 'update-text' prompt
    const result = await execute({
      promptData: updateTextPromptData,
      variables: {
        current_text: { type: 'hardcoded', value: noteContent },
        user_feedback: { type: 'hardcoded', value: userFeedback },
      },
      onExecutionComplete: (response) => {
        // Process the AI diff response
        diffHandler.processAIResponse(response.text);
      }
    });
  };

  return (
    <div>
      {/* Your editor UI */}
      <Button onClick={handleAIUpdate}>
        Request AI Updates
      </Button>
      
      {/* Diff UI */}
      <DiffUI />
    </div>
  );
}
```

## Database Schema

### note_versions Table

```sql
CREATE TABLE note_versions (
  id UUID PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  label TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  change_source TEXT NOT NULL DEFAULT 'user', -- 'user' | 'ai' | 'system'
  change_type TEXT,
  diff_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- **Auto-versioning**: Triggered on note updates
- **Max versions**: 10 per note (automatic cleanup)
- **Change tracking**: Source (user/ai/system) and type
- **Full snapshots**: Complete content for easy restoration

## Testing

Visit `/notes/experimental/diff` for a live demo environment with:
- Sample text and diffs
- Real-time diff parsing
- Full accept/reject workflow
- Version history visualization

## Best Practices

1. **Initialize Once**: Set up diff session when component mounts
2. **Process Immediately**: Parse AI responses as soon as they arrive
3. **Save Metadata**: Always track change source (user vs AI)
4. **Handle Errors**: Check parse results before adding diffs
5. **User Control**: Never auto-accept diffs without user review
6. **Version Limits**: System auto-maintains 10 versions per note
7. **Testing**: Use experimental route before production integration

## Troubleshooting

### Diffs Not Parsing

- Check AI response format matches SEARCH/REPLACE or LINES format
- Ensure delimiters are on their own lines
- Verify delimiters match (<<< with >>>, not <<< with >>)

### No Matches Found

- Check that search text exactly matches content (or is close for fuzzy matching)
- Verify line numbers are within valid range
- Check for extra/missing whitespace in search pattern

### Multiple Matches

- Make search pattern more specific
- Include more surrounding context in search block
- Consider using line-based replacement instead

## Future Enhancements

- Inline diff annotations in editor
- Side-by-side visual diff mode
- Batch diff application with conflict resolution
- Diff branching and merge capabilities
- Custom diff formats and parsers

