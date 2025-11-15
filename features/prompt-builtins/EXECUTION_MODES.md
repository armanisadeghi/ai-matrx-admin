# Execution Modes System

## Overview

The prompt-builtins system now has a **comprehensive execution configuration** that controls HOW and WHERE shortcuts execute. This system is fully database-driven and type-safe.

---

## Two-Tier Configuration System

### 1. **Execution Context** (WHERE it executes)

Defines **where** and **how** the prompt runs:

| Context | Description | UI Component | Use Case |
|---------|-------------|--------------|----------|
| `modal` | Opens in PromptRunnerModal with full UI | PromptRunnerModal | Complex prompts needing chat/interaction |
| `inline` | Executes and shows result with text manipulation options | TextActionResultModal | Text transformation, editing |
| `background` | Executes silently without UI | None | Automation, logging |
| `sidebar` | Opens in sidebar panel | Sidebar Panel | Quick access without taking full screen |
| `toast` | Shows result in toast notification | Toast | Quick info, status updates |

**Default**: `modal`

### 2. **Modal Mode** (HOW the modal behaves)

When `execution_context = 'modal'`, this controls **how** the modal behaves:

| Mode | Description | User Interaction | Use Case |
|------|-------------|------------------|----------|
| `auto-run` | Auto-starts, allows conversation | Pre-filled vars, can chat | AI actions, text tools |
| `auto-run-one-shot` | Auto-starts, no follow-up | Pre-filled vars, one response | Quick transformations |
| `manual-with-hidden-variables` | User adds instructions, vars hidden | Can add message, vars hidden | Template-style prompts |
| `manual-with-visible-variables` | User edits vars and adds instructions | Can edit vars & add message | Flexible customization |
| `manual` | Standard prompt runner | Full control | Power users |

**Default**: `auto-run`

### 3. **Additional Flags**

- **`allow_chat`**: Whether to allow conversation (default: `true`)
- **`allow_initial_message`**: Whether to prompt user for initial message (default: `false`)

---

## Database Schema

```sql
-- New columns in prompt_shortcuts table
ALTER TABLE public.prompt_shortcuts
ADD COLUMN execution_context TEXT DEFAULT 'modal'
  CHECK (execution_context IN ('modal', 'inline', 'background', 'sidebar', 'toast')),
ADD COLUMN modal_mode TEXT DEFAULT 'auto-run'
  CHECK (modal_mode IN ('auto-run', 'auto-run-one-shot', 'manual-with-hidden-variables', 'manual-with-visible-variables', 'manual')),
ADD COLUMN allow_chat BOOLEAN DEFAULT true,
ADD COLUMN allow_initial_message BOOLEAN DEFAULT false;
```

---

## TypeScript Types

```typescript
// Execution Context
export type ExecutionContext = 
  | 'modal'      // Opens in PromptRunnerModal
  | 'inline'     // Inline text manipulation
  | 'background' // Silent execution
  | 'sidebar'    // Sidebar panel
  | 'toast';     // Toast notification

// Modal Mode (from prompts/types/modal.ts)
export type PromptExecutionMode = 
  | 'auto-run'
  | 'auto-run-one-shot'
  | 'manual-with-hidden-variables'
  | 'manual-with-visible-variables'
  | 'manual';

// Combined Configuration
export interface ShortcutExecutionConfig {
  context: ExecutionContext;
  modalMode: PromptExecutionMode;
  allowChat?: boolean;
  allowInitialMessage?: boolean;
}
```

---

## Usage

### In Database

When creating/updating shortcuts:

```typescript
await createPromptShortcut({
  label: 'Summarize Text',
  category_id: 'ai-actions-category',
  prompt_builtin_id: 'summarizer-builtin',
  execution_context: 'modal',        // Opens in modal
  modal_mode: 'auto-run',            // Auto-starts with chat
  allow_chat: true,                  // Allow conversation
  allow_initial_message: false,      // Don't prompt for message
  // ... other fields
});
```

### In Code

The execution hook automatically uses the shortcut's configuration:

```typescript
const { executeShortcut } = useShortcutExecution();

// Shortcut's execution config is respected automatically
await executeShortcut(shortcut, {
  scopes: {
    selection: selectedText,
    content: fullContent,
    context: additionalContext,
  },
});

// Execution behavior is determined by:
// - shortcut.execution_context
// - shortcut.modal_mode
// - shortcut.allow_chat
// - shortcut.allow_initial_message
```

---

## Examples

### Example 1: AI Text Transformation (Inline)

```typescript
{
  label: 'Make Professional',
  execution_context: 'inline',       // Show result with replace/insert options
  modal_mode: 'auto-run',            // Ignored for inline
  allow_chat: false,                 // Ignored for inline
}
```

**Behavior**: Executes, shows `TextActionResultModal` with replace/insert options.

---

### Example 2: Complex AI Assistant (Modal with Chat)

```typescript
{
  label: 'AI Assistant',
  execution_context: 'modal',        // Opens modal
  modal_mode: 'auto-run',            // Auto-starts
  allow_chat: true,                  // Allow conversation
  allow_initial_message: false,      // Don't prompt for message
}
```

**Behavior**: Opens `PromptRunnerModal`, auto-runs, allows multi-turn conversation.

---

### Example 3: Quick Transformation (One-Shot)

```typescript
{
  label: 'Summarize',
  execution_context: 'modal',        // Opens modal
  modal_mode: 'auto-run-one-shot',   // Auto-starts, one response
  allow_chat: false,                 // No follow-up
  allow_initial_message: false,      // Don't prompt
}
```

**Behavior**: Opens modal, executes, shows result, closes after one response.

---

### Example 4: Background Automation

```typescript
{
  label: 'Log to Database',
  execution_context: 'background',   // Silent execution
  modal_mode: 'auto-run',            // Ignored for background
  allow_chat: false,                 // Ignored for background
}
```

**Behavior**: Executes silently, no UI shown, returns result programmatically.

---

### Example 5: Toast Notification

```typescript
{
  label: 'Quick Summary',
  execution_context: 'toast',        // Show in toast
  modal_mode: 'auto-run',            // Ignored for toast
  allow_chat: false,                 // Ignored for toast
}
```

**Behavior**: Executes, shows result in toast notification.

---

## Helper Functions

```typescript
import { 
  requiresModalUI, 
  requiresInlineUI, 
  showsResults 
} from '@/features/prompt-builtins';

// Check if modal UI is needed
if (requiresModalUI(shortcut.execution_context)) {
  // Open PromptRunnerModal
}

// Check if inline UI is needed
if (requiresInlineUI(shortcut.execution_context)) {
  // Show TextActionResultModal
}

// Check if results should be shown
if (showsResults(shortcut.execution_context)) {
  // Display result to user
}
```

---

## Migration Steps

1. **Run database migration**: `add_execution_config.sql`
2. **Update the view**: `shortcuts_by_placement_view_v2.sql`
3. **Types are already updated** ✅
4. **Hooks are already updated** ✅
5. **UnifiedContextMenu is already updated** ✅

---

## Benefits

✅ **Type-Safe**: All modes defined in TypeScript  
✅ **Database-Driven**: Admins can change execution behavior without code changes  
✅ **Flexible**: Supports multiple execution contexts  
✅ **Consistent**: Single source of truth for execution modes  
✅ **Extensible**: Easy to add new contexts/modes  
✅ **Backward Compatible**: Defaults ensure old shortcuts work  

---

## Future Enhancements

- 🔮 **Sidebar Context**: Implement sidebar panel execution
- 🔮 **Toast Context**: Implement toast notification display
- 🔮 **Custom Contexts**: Allow custom execution contexts via plugins
- 🔮 **Conditional Execution**: Execute different contexts based on conditions
- 🔮 **Execution History**: Track which context/mode was used

---

## Admin UI

The admin UI should include dropdowns for:

1. **Execution Context** dropdown (modal, inline, background, sidebar, toast)
2. **Modal Mode** dropdown (only shown when context = 'modal')
3. **Allow Chat** checkbox (only shown when context = 'modal')
4. **Allow Initial Message** checkbox (only shown when context = 'modal')

**Smart UI**: Hide irrelevant fields based on execution_context selection.

