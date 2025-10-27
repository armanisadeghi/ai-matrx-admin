# Prompt Runs - Save & Resume Implementation Plan

## Overview
Allow users to save their prompt conversations (runs) and resume them later. Each run preserves the full conversation history, variable values used, and model settings.

---

## Database Schema

### SQL Migration

```sql
-- ============================================================================
-- PROMPT RUNS TABLE
-- ============================================================================
-- Stores individual prompt run sessions with conversation history
-- ============================================================================

CREATE TABLE public.prompt_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign Keys
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Run Metadata
  name TEXT, -- User-provided name or auto-generated (e.g., "Run - Oct 27, 2024 3:45 PM")
  description TEXT, -- Optional user description
  
  -- Conversation Data (JSONB for flexibility)
  messages JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of {role, content, taskId, metadata}
  variable_values JSONB NOT NULL DEFAULT '{}'::JSONB, -- Object: { variableName: value }
  
  -- Settings Snapshot (preserved at time of creation)
  settings JSONB NOT NULL DEFAULT '{}'::JSONB, -- Model settings used (model_id, temperature, etc.)
  
  -- Status & Metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  message_count INTEGER DEFAULT 0, -- Cached count for quick filtering
  is_starred BOOLEAN DEFAULT FALSE, -- User can star important runs
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, -- For sorting by recent activity
  
  -- Indexes for performance
  CONSTRAINT prompt_runs_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by user
CREATE INDEX idx_prompt_runs_user_id ON public.prompt_runs(user_id);

-- Fast lookup by prompt
CREATE INDEX idx_prompt_runs_prompt_id ON public.prompt_runs(prompt_id);

-- Fast lookup by user + prompt (common query pattern)
CREATE INDEX idx_prompt_runs_user_prompt ON public.prompt_runs(user_id, prompt_id);

-- Sort by recent activity
CREATE INDEX idx_prompt_runs_last_message_at ON public.prompt_runs(last_message_at DESC);

-- Filter by status
CREATE INDEX idx_prompt_runs_status ON public.prompt_runs(status) WHERE status = 'active';

-- Filter starred runs
CREATE INDEX idx_prompt_runs_starred ON public.prompt_runs(is_starred) WHERE is_starred = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.prompt_runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own runs
CREATE POLICY "Users can view their own prompt runs"
  ON public.prompt_runs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own runs
CREATE POLICY "Users can create their own prompt runs"
  ON public.prompt_runs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own runs
CREATE POLICY "Users can update their own prompt runs"
  ON public.prompt_runs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own runs
CREATE POLICY "Users can delete their own prompt runs"
  ON public.prompt_runs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompt_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompt_runs_updated_at
  BEFORE UPDATE ON public.prompt_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_runs_updated_at();

-- Auto-update message_count when messages change
CREATE OR REPLACE FUNCTION update_prompt_runs_message_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.message_count = jsonb_array_length(NEW.messages);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompt_runs_message_count
  BEFORE INSERT OR UPDATE OF messages ON public.prompt_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_runs_message_count();

-- ============================================================================
-- HELPER VIEWS (Optional - for analytics)
-- ============================================================================

-- View for recent runs with prompt details
CREATE OR REPLACE VIEW prompt_runs_with_details AS
SELECT 
  pr.id,
  pr.name,
  pr.message_count,
  pr.is_starred,
  pr.last_message_at,
  pr.created_at,
  p.name as prompt_name,
  p.id as prompt_id
FROM prompt_runs pr
JOIN prompts p ON pr.prompt_id = p.id
WHERE pr.status = 'active'
ORDER BY pr.last_message_at DESC;
```

---

## Implementation Plan

### Phase 1: Backend Services

#### 1.1 Create Service Layer (`features/prompts/services/prompt-runs-service.ts`)

```typescript
// Key functions needed:
- createRun(promptId, initialData) → Create new run
- updateRun(runId, messages) → Update conversation
- getRun(runId) → Fetch single run
- listRunsForPrompt(promptId) → Get all runs for a prompt
- listRecentRuns(userId, limit) → Get user's recent runs across all prompts
- deleteRun(runId) → Soft delete (set status = 'deleted')
- starRun(runId, isStarred) → Toggle star
- renameRun(runId, name) → Update run name
```

#### 1.2 Create Server Actions (`actions/prompt-runs.actions.ts`)

```typescript
- createPromptRun()
- updatePromptRun()
- getPromptRun()
- listPromptRuns()
- deletePromptRun()
- toggleStarRun()
```

### Phase 2: Route Structure

```
Current:
/ai/prompts/run/[id]           → New run (current implementation)

New:
/ai/prompts/run/[id]           → New run OR continue mode (check for existing runs)
/ai/prompts/run/[id]/[runId]   → Resume specific run
/ai/prompts/runs               → Browse all runs across all prompts
/ai/prompts/[id]/runs          → Browse runs for specific prompt
```

### Phase 3: Component Updates

#### 3.1 Update `PromptRunner.tsx`

**Auto-Save Logic:**
1. Create run on first message submission
2. Auto-save after each message exchange completes
3. Store `runId` in component state
4. Update URL to include runId after creation (optional - could stay on current URL)

**Load Logic:**
1. Check if `runId` param exists
2. If yes, load run data and populate conversation
3. If no, start fresh

**Key State Changes:**
```typescript
const [currentRunId, setCurrentRunId] = useState<string | null>(runId || null);
const [runName, setRunName] = useState<string>("");
```

**Auto-Save Implementation:**
```typescript
// After response completes:
useEffect(() => {
  if (isResponseEnded && conversationMessages.length > 0) {
    if (currentRunId) {
      // Update existing run
      updatePromptRun(currentRunId, {
        messages: conversationMessages,
        last_message_at: new Date()
      });
    } else {
      // Create new run
      const newRun = await createPromptRun({
        prompt_id: promptData.id,
        messages: conversationMessages,
        variable_values: variableDefaults,
        settings: promptData.settings,
        name: generateRunName()
      });
      setCurrentRunId(newRun.id);
    }
  }
}, [isResponseEnded, conversationMessages]);
```

#### 3.2 Create Sidebar Component (`PromptRunsSidebar.tsx`)

**Features:**
- List of all runs for current prompt
- Show run name, date, message count
- Star toggle button
- Delete button (with confirmation)
- Search/filter by name
- Sort by date, name, or starred
- Click to load run

**Mobile Behavior:**
- Drawer that slides from left
- Toggle button in header
- Shows on top of conversation (overlay)

**Desktop Behavior:**
- Can be toggled open/closed
- Takes ~300px when open
- Shows alongside conversation

### Phase 4: UI Components

#### 4.1 Runs List Item (`PromptRunListItem.tsx`)

```tsx
Features:
- Run name (truncated)
- Timestamp (relative: "2 hours ago")
- Message count badge
- Star icon (filled if starred)
- Preview of last message (truncated)
- Delete button (shows on hover)
- Active state if currently selected
```

#### 4.2 Run Header Controls (`PromptRunHeader.tsx`)

```tsx
Add to existing header:
- Run name (editable inline)
- "New Run" button (clear and start fresh)
- Save/Auto-save indicator
- Run list toggle button (mobile/desktop)
```

#### 4.3 Empty States

**No Runs Yet:**
```
📝 No saved runs yet
Start a conversation to create your first run
```

**No Matching Search:**
```
🔍 No runs found
Try a different search term
```

### Phase 5: Features to Implement

#### 5.1 Name Generation

**Auto-generate names:**
```typescript
function generateRunName(firstUserMessage?: string): string {
  if (firstUserMessage) {
    // Extract topic from first 50 chars
    const preview = firstUserMessage.slice(0, 50).trim();
    return preview + (firstUserMessage.length > 50 ? '...' : '');
  }
  // Fallback to timestamp
  return `Run - ${new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })}`;
}
```

#### 5.2 Search & Filter

- Search by run name
- Filter by starred
- Sort by: Recent, Oldest, Name (A-Z), Most messages

#### 5.3 Bulk Actions

- Archive multiple runs
- Delete multiple runs
- Export runs (future)

#### 5.4 Run Details Modal (Optional)

- View full run metadata
- Edit name and description
- View model settings used
- View variable values used
- Export conversation (copy as text, markdown, JSON)

---

## UI/UX Flow

### User Journey: First Run

1. User navigates to `/ai/prompts/run/[promptId]`
2. Fills in variables (if any)
3. Sends first message
4. System creates run automatically with auto-generated name
5. Conversation continues normally
6. After each message, run is auto-saved
7. User can edit run name at any time
8. "Saved" indicator shows briefly after each auto-save

### User Journey: Resume Run

1. User navigates to `/ai/prompts/run/[promptId]`
2. Clicks "Previous Runs" button in header
3. Sidebar opens showing list of runs
4. User clicks on a run
5. System loads conversation history
6. Variables are hidden (conversation already started)
7. User can continue conversation
8. Updates are auto-saved

### User Journey: Browse All Runs

1. User navigates to `/ai/prompts/runs`
2. Sees all runs grouped by prompt
3. Can search, filter, sort
4. Click to open run in runner
5. Can star, rename, or delete runs

---

## Auto-Save Behavior

### When to Save

✅ **Save After:**
- First message pair (user + assistant)
- Every subsequent message exchange
- User edits run name
- User stars/unstars run

❌ **Don't Save:**
- When loading initial state
- During streaming (wait for completion)
- If no messages yet

### Save Indicator

```tsx
// Show in header
{isSaving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
{showSaved && <Check className="w-3 h-3 text-green-500" />}
```

---

## Data Structure Examples

### Run Object

```typescript
interface PromptRun {
  id: string;
  prompt_id: string;
  user_id: string;
  name: string;
  description?: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    taskId?: string;
    metadata?: {
      timeToFirstToken?: number;
      totalTime?: number;
      tokens?: number;
    };
  }>;
  variable_values: Record<string, string>;
  settings: {
    model_id: string;
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  status: 'active' | 'archived' | 'deleted';
  message_count: number;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Pagination**: Load runs in chunks (20 at a time)
2. **Debouncing**: Debounce auto-save by 500ms
3. **Optimistic Updates**: Update UI before server confirms
4. **Lazy Loading**: Only load full message history when run is opened
5. **Caching**: Cache run list in Redux or React Query
6. **Indexes**: Properly indexed database queries

### Database Queries

**Most Common:**
```sql
-- Get recent runs for prompt
SELECT id, name, message_count, last_message_at, is_starred
FROM prompt_runs
WHERE prompt_id = $1 AND user_id = $2 AND status = 'active'
ORDER BY last_message_at DESC
LIMIT 20;

-- Get single run with messages
SELECT *
FROM prompt_runs
WHERE id = $1 AND user_id = $2;
```

---

## Mobile Considerations

### Sidebar Behavior

- Full-screen drawer on mobile
- Slide from left animation
- Close with swipe gesture or X button
- Show run count badge on toggle button

### Touch Interactions

- Swipe to delete run (like iOS)
- Long press for options menu
- Pull to refresh run list

---

## Future Enhancements

### Phase 2+ Features

- [ ] Share runs with other users
- [ ] Export run as PDF/Markdown
- [ ] Run templates (save as reusable template)
- [ ] Compare two runs side-by-side
- [ ] Run analytics (total time, token usage, etc.)
- [ ] Tags/categories for runs
- [ ] Run folders/collections
- [ ] Collaborative runs (multiple users)
- [ ] Run version history (track edits)
- [ ] Scheduled runs (automation)

---

## Testing Checklist

### Functionality

- [ ] Create run on first message
- [ ] Auto-save after each message
- [ ] Load existing run
- [ ] Edit run name
- [ ] Star/unstar run
- [ ] Delete run
- [ ] Search runs
- [ ] Filter runs
- [ ] Sort runs
- [ ] Mobile sidebar
- [ ] Desktop sidebar

### Edge Cases

- [ ] No internet during save (queue and retry)
- [ ] Concurrent updates to same run
- [ ] Very long conversations (1000+ messages)
- [ ] Special characters in run names
- [ ] Empty variable values
- [ ] Model settings change between runs

### Performance

- [ ] Large run lists (500+ runs)
- [ ] Fast auto-save (< 100ms perceived)
- [ ] Smooth sidebar animations
- [ ] No layout shift when loading runs

---

## Implementation Priority

### Must Have (MVP)

1. Database schema and migrations ✓
2. Basic CRUD operations
3. Auto-save functionality
4. Load existing run
5. Run list sidebar (basic)
6. Mobile drawer

### Should Have

7. Star runs
8. Search runs
9. Rename runs
10. Delete runs with confirmation
11. Auto-generate names from first message
12. Save indicator

### Nice to Have

13. Sort and filter options
14. Run details modal
15. Export conversation
16. Bulk actions
17. Advanced search

---

## Success Metrics

- **Adoption**: % of users who create runs
- **Retention**: % of users who return to saved runs
- **Engagement**: Average messages per run
- **Satisfaction**: User feedback on save/resume experience

---

## Notes

- Keep the UI minimal and clean
- Auto-save should be invisible (just works)
- Make resuming runs as seamless as starting new ones
- Prioritize mobile experience (many users on mobile)
- Consider offline functionality for future

