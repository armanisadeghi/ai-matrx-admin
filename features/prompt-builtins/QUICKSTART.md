# Quick Start Guide - Prompt Builtins

This guide will get you up and running with the Prompt Builtins system in 5 minutes.

---

## What You Need to Know

**Three Core Concepts:**

1. **Categories** - Organize shortcuts (like folders)
2. **Builtins** - Reusable prompt templates with variables
3. **Shortcuts** - Connect categories to builtins, map app scopes to prompt variables

**The Scope Mapping Magic:**

Your app provides 3 scopes → Shortcut maps them → Prompt receives its specific variables

```
App Scopes              Scope Mapping           Prompt Variables
-----------             -------------           ----------------
selection: "hello"  →   selection: "text"   →   text: "hello"
content: {...}      →   content: "data"     →   data: {...}
context: {...}      →   (not mapped)        →   (uses default)
```

---

## Quick Example

### 1. Create a Category

```typescript
import { createShortcutCategory } from '@/features/prompt-builtins';

const category = await createShortcutCategory({
  placement_type: 'menu',
  label: 'Quick Actions',
  icon_name: 'Zap',
  color: 'purple',
});
```

### 2. Create a Builtin

```typescript
import { createPromptBuiltin } from '@/features/prompt-builtins';

const builtin = await createPromptBuiltin({
  name: 'Summarize Text',
  messages: [
    { role: 'system', content: 'You summarize text concisely.' },
    { role: 'user', content: 'Summarize: {{input_text}}' }
  ],
  variable_defaults: [
    { name: 'input_text', defaultValue: 'No text provided' }
  ],
});
```

### 3. Create a Shortcut

```typescript
import { createPromptShortcut } from '@/features/prompt-builtins';

const shortcut = await createPromptShortcut({
  prompt_builtin_id: builtin.id,
  category_id: category.id,
  label: 'Summarize Selection',
  icon_name: 'FileText',
  scope_mappings: {
    selection: 'input_text'  // Map app's selection to prompt's input_text
  },
});
```

### 4. Execute the Shortcut

```typescript
import { 
  getPromptExecutionData, 
  preparePromptExecution 
} from '@/features/prompt-builtins';

async function handleClick(shortcutId: string) {
  // Get execution data
  const execData = await getPromptExecutionData(shortcutId);
  
  // Provide app scope
  const appScope = {
    selection: 'Your selected text here',
    content: null,
    context: null,
  };
  
  // Prepare execution
  const prepared = preparePromptExecution(execData, appScope);
  
  // Execute (use your prompt system)
  await yourPromptExecutor(prepared);
}
```

---

## API Quick Reference

### List All Categories
```typescript
GET /api/admin/shortcut-categories?placement_type=menu&is_active=true
```

### Create a Builtin
```typescript
POST /api/admin/prompt-builtins
Body: {
  name: "My Prompt",
  messages: [...],
  variable_defaults: [...]
}
```

### Update a Shortcut
```typescript
PUT /api/admin/prompt-shortcuts/[id]
Body: {
  label: "New Label",
  scope_mappings: { selection: "text" }
}
```

---

## Common Patterns

### Pattern 1: Button with No Selection

```typescript
// Button that always uses context, not selection
const shortcut = await createPromptShortcut({
  // ...
  scope_mappings: {
    content: 'current_item',
    context: 'app_state'
  },
  // selection not mapped - will use default
});
```

### Pattern 2: Card with Auto-Scoped Title

```typescript
// For placement_type: 'card', title/description auto-scope
const shortcut = await createPromptShortcut({
  // ...
  placement_type: 'card',
  scope_mappings: {
    content: 'card_data'  // Card's title/description included
  },
});
```

### Pattern 3: Context Menu with Selection

```typescript
// Menu item that needs highlighted text
const shortcut = await createPromptShortcut({
  // ...
  placement_type: 'menu',
  scope_mappings: {
    selection: 'highlighted_text'
  },
});
```

---

## Placement Types

Use these constants from `PLACEMENT_TYPES`:

```typescript
import { PLACEMENT_TYPES, PLACEMENT_TYPE_META } from '@/features/prompt-builtins';

// Available types:
PLACEMENT_TYPES.MENU          // 'menu' - Context menus
PLACEMENT_TYPES.BUTTON        // 'button' - Pre-programmed buttons
PLACEMENT_TYPES.CARD          // 'card' - Visual cards
PLACEMENT_TYPES.QUICK_ACTION  // 'quick-action' - Quick triggers
PLACEMENT_TYPES.MODAL         // 'modal' - Modal interfaces

// Get metadata for UI:
const meta = PLACEMENT_TYPE_META['menu'];
// { label: 'Context Menu', description: '...', icon: 'Menu' }
```

---

## Scope Mapping Rules

**Valid scope keys:** `selection`, `content`, `context`

**Values:** Variable names from the prompt's `variable_defaults`

**Examples:**

```typescript
// ✅ Good - maps selection to existing variable
scope_mappings: {
  selection: 'user_input'  // 'user_input' exists in variable_defaults
}

// ✅ Good - can map same variable twice (weird but valid)
scope_mappings: {
  selection: 'text',
  content: 'text'
}

// ❌ Bad - invalid scope key
scope_mappings: {
  myScope: 'text'  // Only selection/content/context allowed
}

// ❌ Bad - variable doesn't exist in prompt
scope_mappings: {
  selection: 'nonexistent_var'  // Must exist in variable_defaults
}
```

---

## Debugging Tips

### Check What Scopes Are Mapped

```typescript
import { getScopeMappingSummary } from '@/features/prompt-builtins';

const summary = getScopeMappingSummary(scopeMappings, appScope);
console.log(summary);
// {
//   selection: { mapped: true, variableName: 'text', hasValue: true },
//   content: { mapped: false, hasValue: false },
//   context: { mapped: false, hasValue: false }
// }
```

### Preview Variable Substitution

```typescript
import { substituteVariables } from '@/features/prompt-builtins';

const message = 'Hello {{name}}, you have {{count}} items';
const variables = { name: 'Alice', count: '5' };
const result = substituteVariables(message, variables);
// "Hello Alice, you have 5 items"
```

---

## Common Issues

### Issue: "Variable not found"
**Cause:** Scope mapping references a variable that doesn't exist in the prompt
**Fix:** Check that the variable name in `scope_mappings` matches exactly with a variable in `variable_defaults`

### Issue: "Scope value is NOT AVAILABLE"
**Cause:** App didn't provide a value for a mapped scope
**Fix:** Either provide the scope value, or don't map it (will use default)

### Issue: "Category hierarchy broken"
**Cause:** Parent category ID doesn't exist
**Fix:** Ensure parent_category_id references an existing category

---

## Next Steps

1. **Try the Quick Example** above to create your first shortcut
2. **Read the README** for comprehensive documentation
3. **Check PENDING_TASKS.md** to see what's being built next
4. **Review SHORTCUTS_CONTEXT_MENU.md** for context menu specifics

---

## Need Help?

- Types: `features/prompt-builtins/types.ts`
- Constants: `features/prompt-builtins/constants.ts`
- Services: `features/prompt-builtins/services/admin-service.ts`
- Utils: `features/prompt-builtins/utils/execution.ts`
- Full Docs: `features/prompt-builtins/README.md`

