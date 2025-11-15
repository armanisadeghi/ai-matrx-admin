# Quick Actions Migration Plan

## Current State

Quick Actions are currently **hard-coded** in `UnifiedContextMenu.tsx`:
- Notes
- Tasks
- Chat
- Data
- Files

These trigger Redux actions via `useQuickActions` hook but are not stored in the database.

## Goal

Move Quick Actions to the database as `prompt_shortcuts` with `placement_type = 'quick-action'`.

## Benefits

1. **Consistency** - All context menu items managed in one place
2. **Flexibility** - Admins can customize, reorder, or disable quick actions
3. **Extensibility** - Easy to add new quick actions without code changes
4. **Keyboard Shortcuts** - Can assign keyboard shortcuts to quick actions
5. **Scope Mapping** - Quick actions can receive context data

## Migration Steps

### Phase 1: Database Setup

1. **Create Quick Action Categories**
   ```sql
   INSERT INTO shortcut_categories (id, placement_type, label, description, icon_name, color, sort_order)
   VALUES 
     ('quick-notes', 'quick-action', 'Notes', 'Quick note capture', 'StickyNote', 'yellow', 1),
     ('quick-tasks', 'quick-action', 'Tasks', 'Task management', 'CheckSquare', 'blue', 2),
     ('quick-chat', 'quick-action', 'Chat', 'AI assistant', 'MessageSquare', 'purple', 3),
     ('quick-data', 'quick-action', 'Data', 'Database access', 'Database', 'green', 4),
     ('quick-files', 'quick-action', 'Files', 'File browser', 'FolderOpen', 'orange', 5);
   ```

2. **Create Placeholder Prompt Builtins**
   Since quick actions don't execute prompts but trigger UI actions, we need a different approach:
   - Option A: Create "system action" prompt builtins that trigger Redux actions
   - Option B: Add a `action_type` field to `prompt_shortcuts` to indicate non-prompt actions
   - **Recommended**: Option B - Add `action_type` field

3. **Add `action_type` Column**
   ```sql
   ALTER TABLE prompt_shortcuts 
   ADD COLUMN action_type TEXT NULL 
   CHECK (action_type IN ('prompt', 'redux-action', 'url-redirect', 'modal-trigger'));
   
   -- Default to 'prompt' for existing shortcuts
   UPDATE prompt_shortcuts SET action_type = 'prompt' WHERE action_type IS NULL;
   ```

4. **Add `action_payload` Column**
   ```sql
   ALTER TABLE prompt_shortcuts 
   ADD COLUMN action_payload JSONB NULL;
   ```

### Phase 2: Create Quick Action Shortcuts

```sql
INSERT INTO prompt_shortcuts (
  category_id,
  label,
  description,
  icon_name,
  keyboard_shortcut,
  action_type,
  action_payload,
  sort_order,
  is_active
)
VALUES 
  (
    'quick-notes',
    'Notes',
    'Quick capture',
    'StickyNote',
    'Ctrl+Shift+N',
    'redux-action',
    '{"action": "quickActions/openNotes"}',
    1,
    true
  ),
  (
    'quick-tasks',
    'Tasks',
    'Manage tasks',
    'CheckSquare',
    'Ctrl+Shift+T',
    'redux-action',
    '{"action": "quickActions/openTasks"}',
    2,
    true
  ),
  (
    'quick-chat',
    'Chat',
    'AI assistant',
    'MessageSquare',
    'Ctrl+Shift+C',
    'redux-action',
    '{"action": "quickActions/openChat"}',
    3,
    true
  ),
  (
    'quick-data',
    'Data',
    'View tables',
    'Database',
    'Ctrl+Shift+D',
    'redux-action',
    '{"action": "quickActions/openData"}',
    4,
    true
  ),
  (
    'quick-files',
    'Files',
    'Browse files',
    'FolderOpen',
    'Ctrl+Shift+F',
    'redux-action',
    '{"action": "quickActions/openFiles"}',
    5,
    true
  );
```

### Phase 3: Update `useShortcutExecution` Hook

Modify to handle different action types:

```typescript
export function useShortcutExecution() {
  const { execute, streamingText, isExecuting, error } = usePromptExecution();
  const { openPrompt } = usePromptRunner();
  const dispatch = useAppDispatch();

  const executeShortcut = useCallback(
    async (
      shortcut: PromptShortcut & { prompt_builtin: PromptBuiltin | null },
      context: ShortcutExecutionContext
    ) => {
      // Check action type
      if (shortcut.action_type === 'redux-action') {
        // Dispatch Redux action
        const payload = shortcut.action_payload as { action: string; [key: string]: any };
        dispatch({ type: payload.action, payload });
        return null;
      }

      if (shortcut.action_type === 'url-redirect') {
        // Redirect to URL
        const payload = shortcut.action_payload as { url: string };
        window.location.href = payload.url;
        return null;
      }

      // Default: prompt execution
      // ... existing prompt execution logic
    },
    [execute, openPrompt, dispatch]
  );

  return { executeShortcut, streamingText, isExecuting, error };
}
```

### Phase 4: Update UnifiedContextMenu

Remove hard-coded Quick Actions section - they'll load automatically from the database!

```typescript
// BEFORE: Hard-coded Quick Actions
{shouldShowPlacement('quick-action') && (
  <ContextMenuSub>
    <ContextMenuSubTrigger>
      <Zap className="h-4 w-4 mr-2" />
      Quick Actions
    </ContextMenuSubTrigger>
    <ContextMenuSubContent className="w-56">
      <ContextMenuItem onSelect={() => openQuickNotes()}>
        <StickyNote className="h-4 w-4 mr-2" />
        <div className="flex flex-col">
          <span>Notes</span>
          <span className="text-xs text-muted-foreground">Quick capture</span>
        </div>
      </ContextMenuItem>
      {/* ... more hard-coded items */}
    </ContextMenuSubContent>
  </ContextMenuSub>
)}

// AFTER: Loaded from database
// Quick Actions will appear automatically in the dynamic sections!
```

### Phase 5: Admin UI

Quick Actions will now be manageable in the admin panel:
- Create/edit quick action shortcuts
- Assign keyboard shortcuts
- Reorder items
- Enable/disable items
- Add new quick actions without code changes

## Backward Compatibility

1. Keep `useQuickActions` hook functional for any other parts of the app
2. Add a feature flag to toggle between hard-coded and DB-driven quick actions
3. Gradual migration - test with a subset of users first

## Testing Checklist

- [ ] Create quick action categories in DB
- [ ] Create quick action shortcuts in DB
- [ ] Update schema to add `action_type` and `action_payload`
- [ ] Update `useShortcutExecution` to handle Redux actions
- [ ] Test all quick actions work from context menu
- [ ] Test keyboard shortcuts work
- [ ] Test admin UI for managing quick actions
- [ ] Remove hard-coded Quick Actions from `UnifiedContextMenu`
- [ ] Update documentation

## Timeline

- **Week 1**: Schema changes, create categories and shortcuts
- **Week 2**: Update hooks and execution logic
- **Week 3**: Update UnifiedContextMenu, testing
- **Week 4**: Admin UI testing, rollout

## Notes

- This pattern can be extended to other hard-coded actions
- Consider adding `action_type = 'custom-component'` for rendering custom React components
- Consider adding permission checks for quick actions

