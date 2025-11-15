# Prompt Builtins System - Developer Guide

## What is This?

A database-driven system for triggering pre-configured AI prompts from anywhere in the app (context menus, buttons, cards, etc.). Admins configure shortcuts through a UI, and developers integrate them into app features.

---

## Core Architecture

### 3 Database Tables

1. **`shortcut_categories`** - Folders/groups for organizing shortcuts (hierarchical)
2. **`prompt_builtins`** - AI prompt templates (messages, variables, settings)
3. **`prompt_shortcuts`** - UI triggers that link categories to builtins

### 2 Key Views/Functions

1. **`context_menu_view`** - Optimized for rendering menus (joins all 3 tables)
2. **`get_prompt_execution_data(shortcut_id)`** - Fetches everything needed to execute a prompt

---

## Critical Concept: Scope Mapping

**The Problem:** Your app has context (selected text, current card, etc.). Each prompt has different variable names.

**The Solution:** Scope mapping connects app context to prompt variables.

```typescript
// App always provides 3 scopes:
const appScopes = {
  selection: "user's highlighted text",
  content: "current card data", 
  context: "all visible cards"
};

// Prompt has its own variables:
const promptVariables = ["highlighted_text", "card_info", "deck_context"];

// Shortcut's scope_mappings bridges them:
const scopeMappings = {
  selection: "highlighted_text",  // Map app's selection → prompt's highlighted_text
  content: "card_info",            // Map app's content → prompt's card_info
  context: "deck_context"          // Map app's context → prompt's deck_context
};
```

**At runtime:**
1. Call `get_prompt_execution_data(shortcut_id)` to get the mapped prompt
2. Use `mapScopeToVariables(appScopes, scopeMappings, variableDefaults)` to populate variables
3. Execute with `usePromptExecution` hook

---

## File Locations

### Admin UI
- **Main Page:** `app/(authenticated)/(admin-auth)/administration/prompt-builtins/page.tsx`
  - Tab 1: Tree view (categories & shortcuts)
  - Tab 2: Shortcuts table
  - Tab 3: Prompt builtins manager

### Core Files
```
features/prompt-builtins/
├── types.ts                     # All TypeScript interfaces
├── constants.ts                 # PLACEMENT_TYPES, SCOPE_LEVELS
├── index.ts                     # Barrel exports
├── services/admin-service.ts    # All CRUD operations
├── utils/
│   ├── execution.ts             # mapScopeToVariables(), preparePromptExecution()
│   ├── validation.ts            # Validation utilities
│   └── error-handler.ts         # Error formatting
└── admin/                       # Admin UI components
    ├── PromptBuiltinsManager.tsx
    ├── ShortcutsTableManager.tsx
    ├── PromptBuiltinsTableManager.tsx
    ├── PromptBuiltinEditDialog.tsx
    ├── PromptBuiltinEditPanel.tsx
    └── SelectPromptForBuiltinModal.tsx
```

### API Routes
```
/api/admin/shortcut-categories       (GET, POST)
/api/admin/shortcut-categories/[id]  (GET, PUT, DELETE)
/api/admin/prompt-builtins           (GET, POST)
/api/admin/prompt-builtins/[id]      (GET, PUT, DELETE)
/api/admin/prompt-shortcuts          (GET, POST)
/api/admin/prompt-shortcuts/[id]     (GET, PUT, DELETE)
```

---

## How to Integrate

### 1. Context Menu (Not Yet Implemented)
```typescript
import { useContextMenu } from '@/features/prompt-builtins/hooks';

function MyComponent() {
  const { menuItems, executeShortcut } = useContextMenu({
    placementType: 'menu',
    scopes: {
      selection: selectedText,
      content: currentCard,
      context: allCards
    }
  });
  
  return <ContextMenu items={menuItems} onExecute={executeShortcut} />;
}
```

### 2. Button Placement (Not Yet Implemented)
```typescript
import { PromptButton } from '@/features/prompt-builtins/components';

<PromptButton 
  shortcutId="abc-123"
  scopes={{ selection: text, content: data }}
/>
```

### 3. Direct Execution (Available Now)
```typescript
import { getPromptExecutionData } from '@/features/prompt-builtins/services';
import { mapScopeToVariables } from '@/features/prompt-builtins/utils';
import { usePromptExecution } from '@/hooks/usePromptExecution';

const executionData = await getPromptExecutionData(shortcutId);
const variables = mapScopeToVariables(appScopes, executionData.scope_mappings, executionData.variableDefaults);
executePrompt({ ...executionData, variables });
```

---

## Key Types

```typescript
// From types.ts
interface PromptShortcut {
  id: string;
  prompt_builtin_id: string;
  category_id: string;
  label: string;
  scope_mappings: ScopeMapping | null;  // Critical!
  available_scopes: string[] | null;    // Which scopes are valid
  keyboard_shortcut: string | null;
  is_active: boolean;
}

interface ScopeMapping {
  selection?: string;  // Variable name for selection scope
  content?: string;    // Variable name for content scope
  context?: string;    // Variable name for context scope
  [key: string]: string | undefined;  // Custom scopes
}

interface PromptBuiltin {
  id: string;
  name: string;
  messages: PromptMessage[];
  variableDefaults: PromptVariable[];
  settings: PromptSettings;
  source_prompt_id: string | null;  // If converted from user prompt
}
```

---

## Placement Types

Defined in `constants.ts`:
- **`menu`** - Context menus
- **`button`** - Button triggers
- **`card`** - Card-based UI
- **`quick-action`** - Quick access
- **`modal`** - Modal interfaces

Each has metadata (label, icon, description) in `PLACEMENT_TYPE_META`.

---

## Admin Features

Admins can:
- ✅ Create/organize categories (hierarchical)
- ✅ Create/edit shortcuts (including scope mappings)
- ✅ Create prompt builtins (convert from existing prompts OR generate with AI)
- ✅ Edit builtins directly (messages, variables, settings)
- ✅ Track which shortcuts use which builtins
- ✅ See if converted prompts have drifted from source

---

## SQL Helpers

```sql
-- Fetch menu structure
SELECT * FROM context_menu_view 
WHERE placement_type = 'menu' AND is_active = true;

-- Get execution data
SELECT * FROM get_prompt_execution_data('shortcut-id-here');

-- Convert user prompt to builtin
SELECT convert_prompt_to_builtin('prompt-id', 'user-id');

-- Check if builtins have drifted from source
SELECT * FROM check_builtin_drift();

-- Update builtin from source prompt
SELECT update_builtin_from_source('builtin-id');
```

---

## Important Notes

1. **`available_scopes`** - Each shortcut declares which scope keys it accepts. UI context must match.
2. **`scope_mappings`** - The actual key→variable mapping. Can be `null` if no scoping needed.
3. **Variable Defaults** - Database field is `variable_defaults` (snake_case), transformed to `variableDefaults` (camelCase) in UI.
4. **Soft Delete** - Never hard delete. Set `is_active = false`.
5. **Source Tracking** - `source_prompt_id` links builtins back to original user prompts for sync/drift detection.

---

## Next Steps for Developers

1. **Implement Context Menu** - `components/ContextMenu.tsx`, `hooks/useContextMenu.ts`
2. **Implement Button Placement** - `components/PromptButton.tsx`
3. **Implement Card Placement** - `components/PromptCard.tsx`
4. **Add Keyboard Shortcuts** - Global listener for `keyboard_shortcut` field
5. **Integration Examples** - Add to actual app pages (text editors, dashboards, etc.)

See `TASKS.md` for detailed pending work.

