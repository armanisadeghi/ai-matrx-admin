# Prompt Builtins System

Complete bidirectional system for managing **Prompts → Builtins → Shortcuts**.

## Architecture

```
Categories (1) ──> (N) Shortcuts (N) ──> (1) Builtins (N) ──> (1) User Prompts
```

- **Categories**: Organize shortcuts by placement type (context-menu, card, button, etc.)
- **Shortcuts**: UI triggers that execute builtins with contextual data
- **Builtins**: Reusable prompt templates with variables and settings
- **User Prompts**: Source prompts that can be converted to builtins (tracked via `source_prompt_id`)

## Components

### Shared (`/components`)

**`ShortcutFormFields.tsx`** - Reusable shortcut form
- Used in: `ConvertToBuiltinModal`, `LinkBuiltinToShortcutModal`
- Fields: label, category, description, icon, scopes, mappings, execution options
- Compact mode for modals

**`LinkBuiltinToShortcutModal.tsx`** - Builtin → Shortcut
- Two tabs: Create New | Link Existing
- Auto-configures scope mappings from builtin variables
- Triggered from `PromptBuiltinsTableManager`

**`SelectBuiltinForShortcutModal.tsx`** - Shortcut → Existing Builtin
- Split-pane: Builtin list (left) + Preview (right)
- Search/filter by source type (converted/generated)
- Scope mapping editor in preview pane
- Triggered from `ShortcutsTableManager` → "Connect" → "Browse Builtins"

### Admin (`/admin`)

**`PromptBuiltinsTableManager.tsx`** - Manage builtins
- Actions: Link Shortcut, Edit, Delete
- Shows usage count and source tracking
- Opens `LinkBuiltinToShortcutModal` for linking shortcuts

**`ShortcutsTableManager.tsx`** - Manage shortcuts
- "Connect" dropdown for unconnected shortcuts:
  - Select Prompt → `SelectPromptForBuiltinModal`
  - Browse Builtins → `SelectBuiltinForShortcutModal`
- Full CRUD with filters

**`SelectPromptForBuiltinModal.tsx`** - Convert prompt to builtin
- Browse user prompts
- AI generation option
- Auto-links to shortcut if provided

### Prompts (`/features/prompts/components/layouts`)

**`ConvertToBuiltinModal.tsx`** - Prompt → Builtin → Shortcut
- Check for existing builtins
- Convert/update builtin
- Three shortcut options: Link Existing, Create New, Skip
- Uses `ShortcutFormFields` for consistency

## Three Entry Points

### 1. Prompt → Builtin → Shortcut ✅
**Path**: `/ai/prompts` → PromptCard → Admin Settings → "Convert to Builtin"

**Flow**:
1. `ConvertToBuiltinModal` opens
2. Check existing builtins from this prompt
3. Convert/update builtin
4. Choose: Link existing shortcut, Create new, or Skip
5. Success → Navigate to admin or complete

### 2. Shortcut → Builtin ✅
**Path**: `/administration/prompt-builtins` → Shortcuts Table → "Connect" dropdown

**Flow**:
- **Option A**: Select Prompt → Convert → Link
- **Option B**: Browse Builtins → Select → Link

### 3. Builtin → Shortcut ✅
**Path**: `/administration/prompt-builtins` → Prompt Builtins tab → "Link Shortcut"

**Flow**:
1. `LinkBuiltinToShortcutModal` opens
2. Choose: Create New or Link Existing
3. Configure scope mappings
4. Success → Shortcut linked

## Scope Mapping System

Maps contextual data from UI components to prompt variables:

```typescript
// Shortcut Config
{
  available_scopes: ['selection', 'content', 'context'],
  scope_mappings: {
    selection: 'user_query',      // Maps selected text
    content: 'document_text',     // Maps content
    context: 'related_items'      // Maps context
  }
}

// Builtin Config
{
  variableDefaults: [
    { name: 'user_query', value: '' },
    { name: 'document_text', value: '' },
    { name: 'related_items', value: [] }
  ]
}
```

At runtime: Available scopes → Mapped to variables → Passed to builtin → Executed

## Execution Configuration

Shortcuts control prompt execution:
- `result_display`: modal-full | modal-compact | inline | sidebar | flexible-panel
- `auto_run`: Run immediately (true) or show preview (false)
- `allow_chat`: Enable conversation (true) or one-shot (false)
- `show_variables`: Display variable form (true) or hide (false)
- `apply_variables`: Use variable values (true) or ignore (false)

## Database Schema

**`shortcut_categories`**: `id`, `placement_type`, `parent_category_id`, `label`, `icon_name`, `color`, `sort_order`, `is_active`

**`prompt_builtins`**: `id`, `name`, `description`, `messages`, `variable_defaults`, `tools`, `settings`, `source_prompt_id`, `source_prompt_snapshot_at`, `is_active`, `created_by_user_id`

**`prompt_shortcuts`**: `id`, `prompt_builtin_id`, `category_id`, `label`, `description`, `icon_name`, `keyboard_shortcut`, `sort_order`, `scope_mappings`, `available_scopes`, `result_display`, `auto_run`, `allow_chat`, `show_variables`, `apply_variables`, `is_active`

## API Endpoints

### Builtins
- `GET /api/admin/prompt-builtins` - List (with filters)
- `GET /api/admin/prompt-builtins/:id` - Get details
- `POST /api/admin/prompt-builtins` - Create
- `PUT /api/admin/prompt-builtins/:id` - Update
- `DELETE /api/admin/prompt-builtins/:id` - Delete
- `POST /api/admin/prompt-builtins/convert-from-prompt` - Convert

### Shortcuts
- `GET /api/admin/prompt-shortcuts?with_relations=true` - List with relations
- `POST /api/admin/prompt-shortcuts` - Create
- `PUT /api/admin/prompt-shortcuts/:id` - Update
- `DELETE /api/admin/prompt-shortcuts/:id` - Delete

### Categories
- `GET /api/admin/shortcut-categories?with_counts=true` - List with stats
- `POST /api/admin/shortcut-categories` - Create
- `PUT /api/admin/shortcut-categories/:id` - Update

### User Prompts
- `GET /api/admin/prompt-builtins/user-prompts` - List for conversion

## Services (`/services/admin-service.ts`)

**Categories**: `fetchShortcutCategories`, `createShortcutCategory`, `updateShortcutCategory`, `deleteShortcutCategory`, `fetchCategoriesWithShortcutCounts`

**Builtins**: `fetchPromptBuiltins`, `getPromptBuiltinById`, `createPromptBuiltin`, `updatePromptBuiltin`, `deletePromptBuiltin`, `getBuiltinsBySourcePromptId`

**Shortcuts**: `fetchPromptShortcuts`, `createPromptShortcut`, `updatePromptShortcut`, `deletePromptShortcut`, `fetchShortcutsWithRelations`, `getPromptExecutionData`

All functions include error handling via `getUserFriendlyError()`.

## Testing

### Manual Test Flows

**Flow 1**: Create prompt → Convert to builtin → Create shortcut
**Flow 2a**: Create shortcut → Select prompt → Convert → Link
**Flow 2b**: Create shortcut → Browse builtins → Link
**Flow 3a**: Select builtin → Create new shortcut
**Flow 3b**: Select builtin → Link existing shortcut

### Verification

- ✅ All three flows work end-to-end
- ✅ Scope mappings save correctly
- ✅ Usage tracking updates
- ✅ Filters and search work
- ✅ Active/inactive states toggle
- ✅ Deletion blocked for in-use builtins
- ✅ Source tracking preserved

### Common Issues

**Shortcut not appearing**: Check `is_active` on shortcut/category, verify placement type matches component

**Variables not mapping**: Review `available_scopes` and `scope_mappings`, ensure `apply_variables` is enabled

**Cannot delete builtin**: Disconnect all shortcuts first, or delete shortcuts

**Execution fails**: Verify builtin has valid messages, check model config, confirm RLS policies

## Admin Panel

**Path**: `/administration/prompt-builtins`

**Tabs**:
1. Categories & Shortcuts (Tree view with sidebar)
2. Shortcuts Table (Table view with filters)
3. Prompt Builtins (Builtin templates table)

## Notes

- One builtin can power multiple shortcuts
- Builtins track source prompt via `source_prompt_id`
- Soft delete pattern (uses `is_active` flag)
- All components fully typed with TypeScript
- Zero linter errors
- Reusable `ShortcutFormFields` ensures consistency
- Snake_case in DB, camelCase in UI (auto-transformed)

## Future Enhancements

- [ ] Bulk operations (import/export shortcuts and builtins)
- [ ] Version history tracking for builtins
- [ ] Template library for common prompt patterns
- [ ] Analytics dashboard (usage stats, performance metrics)
- [ ] A/B testing for prompt variations
- [ ] Collaborative editing with permissions
- [ ] Public sharing and community library
- [ ] Advanced filtering (by tags, usage count, date ranges)
- [ ] Keyboard shortcuts for power users
- [ ] Drag-and-drop reordering in tree view
- [ ] Duplicate detection and merge suggestions
- [ ] Prompt performance benchmarking
- [ ] Auto-suggest scope mappings based on variable names
- [ ] Builtin dependency tracking (if one builtin references another)
- [ ] Scheduled execution for shortcuts

## Critical Enhancements (NOW)

- [ ] Edit Shortcut modal has poor ux, starting with the massive wasted space around the edge of the entire modal with cards that then add more padding.
- [ ] Reusable Category selection dropdown - universal component that will properly show the actual hierarchy
    - Update all usage across the app where category is selected
- [ ] Clean up ui for selection of Scopes and scoope mappings, eliminate massive wasted space and bad ux
    - Simple checklist, then a single input... if you type into it and click + to add, a new empty input appears
    - Tabular structure so each scope is a row...
    - The row includes what we currently have for Scope Mappings, with a column for selecting the variable, et.
    - One row per scope. Simple, clean, efficient and still does everything the system can do now.
- [ ] Clean up prompt builtin selection from Edit Shortcut. Better ux that allows easy selection/search of a prompt, possibly via a simple modal that allows search, filter, and other options in an easy way and then has to come back with the one you want. buttons for edit and create can be easily side by side to save space. The list of variables can definitely be shown with a better ui that doens't waste space and is not confusing, especially if it's already being shown elsewhere for selection.
- [ ] All of the tables in the admin need to have things that they can do directly from the table. Right now
- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 