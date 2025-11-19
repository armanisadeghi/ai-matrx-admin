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

## Critical Enhancements (Priority Order)

### Phase 1: Foundation Components (Build reusable pieces first)

**1.1 Enhanced Category Selector** ⭐ HIGH PRIORITY
- [ ] Create `CategorySelector.tsx` - Universal dropdown that shows placement_type context
  - Display format: `[Context Menu] > Parent > Child Category`
  - Replace `HierarchicalCategorySelector` usage everywhere
  - Group by placement_type with visual separation
  - Show placement badge inline with selected category
  - **Files to update**: `ShortcutFormFields.tsx`, `PromptBuiltinEditPanel.tsx`, `ConvertToBuiltinModal.tsx`
  - **Current issue**: Duplicate category names across placement types cause confusion

**1.2 Redesigned Scope Mapping Editor** ⭐ HIGH PRIORITY
- [ ] Rebuild `ScopeMappingEditor.tsx` as compact table format
  - **Column 1**: Scope checkbox (selection, content, context)
  - **Column 2**: Arrow icon (→)
  - **Column 3**: Variable dropdown (from builtin)
  - One row per available scope, clean and tight
  - Remove current excessive padding and cards
  - Add dynamic row addition if custom scopes needed
  - **Files using it**: `ShortcutFormFields.tsx`, `LinkBuiltinToShortcutModal.tsx`, `SelectBuiltinForShortcutModal.tsx`, `ConvertToBuiltinModal.tsx`

**1.3 Builtin Selector Modal** 
- [ ] Create `BuiltinSelectorModal.tsx` - Clean builtin browsing interface
  - Replace inline builtin selection in `PromptBuiltinEditPanel`
  - Modal with search, filters (converted/generated), preview pane
  - Show variables as compact badges, not wasteful lists
  - Side-by-side buttons: "Edit" | "Create New" | "Select"
  - Reuse in `SelectBuiltinForShortcutModal` logic

### Phase 2: Unified CRUD Architecture (Consolidate edit logic)

**2.1 Category Form Component**
- [ ] Create `CategoryFormFields.tsx` - Reusable category form
  - Extract from `PromptBuiltinEditPanel.tsx` (lines 60-200)
  - Used in: Create modal, Edit modal, Inline editing
  - Props: `formData`, `onChange`, `compact` mode
  - Remove Card wrappers for space efficiency

**2.2 Shortcut Form Component** ✅ EXISTS (needs review)
- [ ] Review `ShortcutFormFields.tsx` for space optimization
  - Reduce padding in compact mode (3px → 2px)
  - Execution options: 2x2 grid with tighter switches
  - Integrate new CategorySelector and ScopeMappingEditor

**2.3 Builtin Form Component**
- [ ] Create `BuiltinFormFields.tsx` - Reusable builtin form
  - Extract from various edit panels
  - Handle messages, variables, settings, tools
  - Compact mode for modals, full mode for pages

**2.4 Unified Edit Modals**
- [ ] Create `CategoryEditModal.tsx` - Uses CategoryFormFields
- [ ] Create `ShortcutEditModal.tsx` - Uses ShortcutFormFields  
- [ ] Create `BuiltinEditModal.tsx` - Uses BuiltinFormFields
- [ ] Replace all Dialog implementations to use these modals
  - **Benefits**: Single source of truth, consistent UX, easier maintenance

### Phase 3: UI Polish & Space Optimization

**3.1 Edit Modal Space Reduction**
- [ ] Remove excessive padding from `PromptBuiltinEditDialog`
  - Current: Cards with padding inside padded modals
  - Target: Direct form fields with minimal padding
  - DialogContent: p-4 → p-3, max space for content
  - Remove Card wrappers, use simple dividers
  - Compact labels and inputs (text-sm consistently)

**3.2 Inline Table Actions** 
- [ ] `PromptBuiltinsTableManager`: Add inline quick actions
  - "Link Shortcut" → Opens `LinkBuiltinToShortcutModal` ✅ DONE
  - "Quick Edit" → Popover with name/description edit
  - "Toggle Active" → Direct toggle without modal
- [ ] `ShortcutsTableManager`: Add inline quick actions  
  - "Connect" dropdown ✅ DONE
  - "Quick Edit" → Popover for label/category change
  - "View Builtin" → Quick preview popover
- [ ] `ShortcutCategoriesManager` (if exists): Inline actions
  - "Quick Edit" → Name and placement change
  - "Add Child" → Create subcategory directly

**3.3 Tree Component Enhancement**
- [ ] Review `PromptBuiltinsManager` tree structure
  - Verify placement_type is first level (currently correct)
  - Ensure CategorySelector respects this hierarchy
  - Add placement_type badge to tree nodes for clarity
  - Test category selection with duplicate names across placements
  - Document placement_type importance in code comments

### Phase 4: Testing & Documentation

**4.1 Testing**
- [ ] Test all three entry point flows with new components
- [ ] Verify category selection across all forms
- [ ] Test scope mapping with various builtin configurations
- [ ] Ensure inline actions work without full page refresh
- [ ] Mobile responsive testing for all modals

**4.2 Documentation**
- [ ] Update README with new component architecture
- [ ] Document CategorySelector usage and placement_type importance
- [ ] Add comments to ScopeMappingEditor explaining table structure
- [ ] Update component dependencies diagram

## Implementation Notes

**Current Component Usage Map**:
- `HierarchicalCategorySelector`: 5 files (needs replacement)
- `ScopeMappingEditor`: 4 files (needs rebuild)
- `PromptBuiltinEditPanel`: 2 files (needs extraction to FormFields)
- `PromptBuiltinEditDialog`: 2 files (needs consolidation)

**Space Savings Target**:
- Modal padding: 4px → 3px (25% reduction)
- Card removal: ~64px saved per card
- Compact inputs: h-10 → h-9 (10% height reduction)
- Scope mapping: ~200px → ~120px (40% reduction)

**Dependencies**:
1. Phase 1 must complete before Phase 2 (FormFields need new selectors)
2. Phase 2 must complete before Phase 3.1 (modals need FormFields)
3. Phase 3.2 can run parallel to 3.1
4. Phase 4 runs after all implementation complete 