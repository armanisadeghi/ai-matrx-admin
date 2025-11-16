# Getting Started with AI Text Diff System

## Quick Start Guide

### 1. Apply the Database Migration

Run this SQL migration in your Supabase dashboard or CLI:
```bash
supabase/migrations/create_note_versions_system.sql
```

This creates the `note_versions` table and automatic versioning triggers.

### 2. Test the System

#### Option A: Demo Environment (Testing Only)
Visit: **`/notes/experimental/diff`**

- Click "Load Sample Diff"
- See diffs appear
- Test accept/reject
- Verify it works

#### Option B: Real Note Editing (Production)
Visit: **`/notes/ai-edit`**

1. **Select a note** from the main notes page first
2. Navigate to `/notes/ai-edit`
3. **Edit content** in the textarea
4. **Select text** you want AI to improve
5. **Right-click** → "Update Text" (once context menu is wired up)
6. **Review AI diffs** in right panel
7. **Accept/Reject** individual or all changes
8. **Save** when ready

### 3. What's Working Now

✅ **Infrastructure Complete**:
- Diff parsing engine
- Text matching (strict → fuzzy)
- Redux state management
- UI components (DiffViewer, DiffControls, DiffHistory)
- Database versioning system
- Error handling in UI

✅ **Real Integration**:
- `NoteDiffEditor` component
- Connected to actual notes
- Save with AI metadata
- Version tracking

### 4. What Still Needs Integration

⏳ **Context Menu** - Add "Update Text" option to context menu
⏳ **AI Prompt Execution** - Wire up `update-text` system prompt
⏳ **Response Handler** - Parse AI response and show diffs

## How to Complete Integration

### Step 1: Add Context Menu Item

In your context menu component (wherever text selection menus are), add:

```typescript
{
  label: "Update with AI",
  icon: Sparkles,
  onClick: async () => {
    const selectedText = window.getSelection()?.toString();
    if (!selectedText) return;
    
    // Execute update-text prompt
    const result = await executeUpdateTextPrompt({
      current_text: noteContent,
      user_selection: selectedText,
      user_feedback: "Improve this text"
    });
    
    // Send response to diff handler
    if (window.__noteEditorHandleAIDiff) {
      window.__noteEditorHandleAIDiff(result.text);
    }
  }
}
```

### Step 2: Execute AI Prompt

Use your existing `usePromptExecution` hook:

```typescript
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';

const { execute } = usePromptExecution();

const executeUpdateTextPrompt = async ({
  current_text,
  user_selection,
  user_feedback
}) => {
  const result = await execute({
    promptData: updateTextPromptData, // Your update-text system prompt
    variables: {
      current_text: { type: 'hardcoded', value: current_text },
      user_selection: { type: 'hardcoded', value: user_selection },
      user_feedback: { type: 'hardcoded', value: user_feedback },
    },
  });
  
  return result;
};
```

### Step 3: Configure AI to Return Diffs

Make sure your `update-text` system prompt instructs the AI to return diffs in this format:

```
SEARCH:
<<<
[exact text to find]
>>>
REPLACE:
<<<
[improved text]
>>>
```

## Testing the Full Workflow

1. **Open a note**: `/notes` → select/create note
2. **Go to AI editor**: `/notes/ai-edit`
3. **Type some content** in the editor
4. **Select text** you want to improve
5. **Right-click** → "Update with AI" (once wired)
6. **Wait for AI** to generate diffs
7. **Review changes** in right panel
8. **Accept** changes you like
9. **Reject** changes you don't want
10. **Save** the note
11. **Check history**: Version is auto-created with AI metadata

## Key Routes

- `/notes` - Main notes interface
- `/notes/ai-edit` - AI-assisted editor (production)
- `/notes/experimental/diff` - Testing sandbox (demo only)

## Troubleshooting

**"No pending changes"**
- System is working, just no AI diffs loaded yet
- Need to wire up context menu to trigger AI

**"All diffs failed to match"**
- AI's search text doesn't match your content exactly
- Try regenerating with more context
- Check that AI is seeing the current text, not old text

**"No note selected"**
- Go to `/notes` first
- Select or create a note
- Then navigate to `/notes/ai-edit`

## Next Steps for Production

1. ✅ Apply migration
2. ⏳ Wire up context menu
3. ⏳ Test AI prompt format
4. ⏳ Add keyboard shortcuts (optional)
5. ⏳ Add to main note editor tabs (optional)

Once context menu is wired up, the system is fully functional!

