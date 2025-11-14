# Prompt Builtins Feature

## Overview

The Prompt Builtins system provides a flexible, database-driven way to trigger pre-configured AI prompts throughout the application. It supports multiple placement types (context menus, buttons, cards, etc.) and uses a powerful scope mapping system to connect application context to prompt variables.

---

## System Architecture

### Three Core Tables

1. **`shortcut_categories`** - Visual organization for shortcuts
2. **`prompt_builtins`** - Reusable prompt templates
3. **`prompt_shortcuts`** - UI triggers that connect categories to builtins

### Two Database Views/Functions

1. **`context_menu_view`** - Optimized view for rendering menus
2. **`get_prompt_execution_data()`** - Function to fetch execution data

---

## Key Concepts

### Placement Types

Shortcuts can be placed in different parts of the UI:

- **`menu`** - Context menus for AI actions
- **`button`** - Pre-programmed buttons
- **`card`** - Cards with auto-scoped title/description
- **`quick-action`** - Quick functionality triggers
- **`modal`** - Modal interfaces

See `constants.ts` for the full list and metadata.

### Scope Mapping System

**The Critical Concept:**

The application always provides **3 hardcoded scopes**:
- `selection` (e.g., highlighted text)
- `content` (e.g., current card/item)
- `context` (e.g., surrounding data)

Each prompt builtin has its own unique **variable names** defined in `variable_defaults`.

The **scope_mappings** in a shortcut maps the app's 3 scopes to the prompt's specific variables:

```typescript
// Example scope_mappings
{
  "selection": "highlighted_text",  // App's selection → prompt's highlighted_text
  "content": "current_card",        // App's content → prompt's current_card
  "context": "deck_info"            // App's context → prompt's deck_info
}
```

At runtime:
1. App provides values for the 3 scopes
2. System maps them to prompt variables using scope_mappings
3. Remaining variables get filled from variable_defaults
4. Prompt is executed with all variables populated

---

## File Structure

```
features/prompt-builtins/
├── constants.ts              # Placement types and scope constants
├── types.ts                  # TypeScript type definitions
├── index.ts                  # Barrel exports
├── services/
│   └── admin-service.ts      # All CRUD operations and queries
├── utils/
│   ├── execution.ts          # Scope mapping and execution utilities
│   └── validation.ts         # Validation utilities (placeholders)
├── components/               # (To be created)
├── hooks/                    # (To be created)
├── admin/                    # (To be created)
├── DB.md                     # Database documentation
├── SHORTCUTS_CONTEXT_MENU.md # Implementation guide
├── PENDING_TASKS.md          # Task tracking
└── README.md                 # This file
```

---

## API Routes

All admin CRUD operations are available via REST API:

### Shortcut Categories
- `GET /api/admin/shortcut-categories` - List all categories
- `POST /api/admin/shortcut-categories` - Create category
- `GET /api/admin/shortcut-categories/[id]` - Get single category
- `PUT /api/admin/shortcut-categories/[id]` - Update category
- `DELETE /api/admin/shortcut-categories/[id]` - Delete category

### Prompt Builtins
- `GET /api/admin/prompt-builtins` - List all builtins
- `POST /api/admin/prompt-builtins` - Create builtin
- `GET /api/admin/prompt-builtins/[id]` - Get single builtin
- `PUT /api/admin/prompt-builtins/[id]` - Update builtin
- `DELETE /api/admin/prompt-builtins/[id]` - Delete builtin

### Prompt Shortcuts
- `GET /api/admin/prompt-shortcuts` - List all shortcuts
- `POST /api/admin/prompt-shortcuts` - Create shortcut
- `GET /api/admin/prompt-shortcuts/[id]` - Get single shortcut
- `PUT /api/admin/prompt-shortcuts/[id]` - Update shortcut
- `DELETE /api/admin/prompt-shortcuts/[id]` - Delete shortcut

Query parameters support filtering by:
- `placement_type` (categories)
- `is_active` (all tables)
- `category_id` (shortcuts)
- `prompt_builtin_id` (shortcuts)
- `with_relations` (shortcuts) - includes category and builtin data
- `with_counts` (categories) - includes shortcut counts

---

## Service Layer

The `admin-service.ts` provides all database operations:

### Shortcut Categories
```typescript
import { fetchShortcutCategories, createShortcutCategory } from '@/features/prompt-builtins';

const categories = await fetchShortcutCategories({ placement_type: 'menu' });
const newCategory = await createShortcutCategory({
  placement_type: 'menu',
  label: 'Text Operations',
  icon_name: 'FileText',
  color: 'blue',
});
```

### Prompt Builtins
```typescript
import { fetchPromptBuiltins, createPromptBuiltin } from '@/features/prompt-builtins';

const builtins = await fetchPromptBuiltins({ is_active: true });
const newBuiltin = await createPromptBuiltin({
  name: 'Summarize Text',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Summarize: {{text}}' }
  ],
  variable_defaults: [
    { name: 'text', defaultValue: '' }
  ],
});
```

### Prompt Shortcuts
```typescript
import { createPromptShortcut } from '@/features/prompt-builtins';

const shortcut = await createPromptShortcut({
  prompt_builtin_id: 'builtin-id',
  category_id: 'category-id',
  label: 'Summarize Selection',
  scope_mappings: {
    selection: 'text'  // Map app's selection to prompt's 'text' variable
  },
});
```

### Context Menu Operations
```typescript
import { fetchContextMenuView, getPromptExecutionData } from '@/features/prompt-builtins';

// Load menu structure
const menuRows = await fetchContextMenuView('menu');

// Get execution data when user clicks
const execData = await getPromptExecutionData(shortcutId);
```

---

## Execution Utilities

The `utils/execution.ts` file provides helpers for executing prompts:

```typescript
import {
  preparePromptExecution,
  createEmptyScope,
  mapScopeToVariables,
} from '@/features/prompt-builtins';

// Create application scope
const appScope = {
  selection: 'highlighted text here',
  content: { id: '123', title: 'Card Title' },
  context: { deckId: 'abc' },
};

// Get execution data
const execData = await getPromptExecutionData(shortcutId);

// Prepare for execution
const prepared = preparePromptExecution(execData, appScope);

// Now execute with prepared.messages, prepared.variables, etc.
```

---

## Validation Utilities

The `utils/validation.ts` file contains placeholder functions for:

- `validateScopeMappings()` - Ensure mappings reference valid variables
- `validatePromptBuiltin()` - Validate prompt structure
- `validateShortcutReferences()` - Ensure references exist
- `validateCategoryHierarchy()` - Prevent circular hierarchies

**Note:** These are currently placeholders to be implemented in a later phase.

---

## Type Definitions

All types are exported from `types.ts`:

### Core Types
- `ShortcutCategory` - Category table structure
- `PromptBuiltin` - Builtin table structure
- `PromptShortcut` - Shortcut table structure
- `ScopeMapping` - Scope mapping structure
- `ApplicationScope` - Runtime scope values

### Input Types
- `CreateShortcutCategoryInput`
- `UpdateShortcutCategoryInput`
- `CreatePromptBuiltinInput`
- `UpdatePromptBuiltinInput`
- `CreatePromptShortcutInput`
- `UpdatePromptShortcutInput`

### View Types
- `ContextMenuRow` - Row from context_menu_view
- `PromptExecutionData` - Result from get_prompt_execution_data()

---

## Constants

The `constants.ts` file exports:

- `PLACEMENT_TYPES` - Placement type constants
- `PLACEMENT_TYPE_META` - UI metadata for each placement type
- `SCOPE_LEVELS` - The 3 hardcoded scope levels
- `SCOPE_UNAVAILABLE_VALUES` - Default unavailable markers

---

## Usage Examples

### Creating a Complete Shortcut Flow

```typescript
// 1. Create a category
const category = await createShortcutCategory({
  placement_type: 'menu',
  label: 'Text Operations',
  icon_name: 'FileText',
  color: 'blue',
  sort_order: 1,
});

// 2. Create a prompt builtin
const builtin = await createPromptBuiltin({
  name: 'Explain Selection',
  description: 'Explains the selected text in simple terms',
  messages: [
    { role: 'system', content: 'You are a helpful teacher.' },
    { role: 'user', content: 'Explain this in simple terms: {{selected_text}}' }
  ],
  variable_defaults: [
    { name: 'selected_text', defaultValue: 'No text selected' }
  ],
});

// 3. Create a shortcut linking them
const shortcut = await createPromptShortcut({
  prompt_builtin_id: builtin.id,
  category_id: category.id,
  label: 'Explain This',
  description: 'Get a simple explanation of the selected text',
  icon_name: 'HelpCircle',
  scope_mappings: {
    selection: 'selected_text'  // Map selection to the prompt's variable
  },
  sort_order: 1,
});
```

### Executing a Shortcut

```typescript
// When user clicks the shortcut
async function handleShortcutClick(shortcutId: string) {
  // 1. Get execution data
  const execData = await getPromptExecutionData(shortcutId);
  if (!execData) return;
  
  // 2. Get current application scope
  const appScope = {
    selection: getCurrentSelection(),
    content: getCurrentContent(),
    context: getCurrentContext(),
  };
  
  // 3. Prepare execution
  const prepared = preparePromptExecution(execData, appScope);
  
  // 4. Execute prompt (using your prompt execution system)
  await executePrompt({
    messages: prepared.messages,
    variables: prepared.variables,
    tools: prepared.tools,
    settings: prepared.settings,
  });
}
```

---

## Soft Delete Pattern

All tables use `is_active` as a soft delete flag:

```typescript
// Soft delete (recommended)
await deactivatePromptShortcut(id);

// Reactivate
await activatePromptShortcut(id);

// Hard delete (use with caution)
await deletePromptShortcut(id);
```

---

## Next Steps

1. ✅ Constants and types defined
2. ✅ Service layer complete
3. ✅ Admin API routes created
4. ✅ Execution utilities created
5. ✅ Validation placeholders created
6. 🔲 Admin UI components (pending)
7. 🔲 Context menu component (pending)
8. 🔲 Button/Card placement components (pending)
9. 🔲 Validation implementations (later phase)
10. 🔲 Testing and integration (pending)

---

## Related Documentation

- **DB.md** - Database schema details
- **SHORTCUTS_CONTEXT_MENU.md** - Context menu implementation guide
- **PENDING_TASKS.md** - Current task list

---

## Best Practices

1. **Always validate scope_mappings** - Ensure mapped variable names exist in the prompt's variable_defaults
2. **Use soft deletes** - Prefer `is_active = false` over hard deletes
3. **Test scope mapping** - Verify that scope values are correctly mapped to prompt variables
4. **Handle empty scopes** - Use `SCOPE_UNAVAILABLE_VALUES` for consistency
5. **Organize categories** - Use `sort_order` to control menu structure
6. **Document prompts** - Add clear descriptions to help admins understand purpose

---

## Support

For questions or issues, refer to:
- Type definitions in `types.ts`
- Implementation examples in `SHORTCUTS_CONTEXT_MENU.md`
- Service documentation in `services/admin-service.ts`

