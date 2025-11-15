# Execution Configuration V2 - Boolean-Based System

## 🎯 Overview

We've replaced the confusing string-based execution modes with **clear boolean flags**. This makes the system much more intuitive and flexible!

---

## ✅ What Changed

### Before (Confusing)
```typescript
execution_context: 'modal'           // WHERE it runs
modal_mode: 'auto-run'               // HOW modal behaves
allow_chat: true                     // Redundant with modal_mode!
allow_initial_message: false         // More redundancy!
```

### After (Clear!)
```typescript
result_display: 'modal'              // WHERE to show results
auto_run: true                       // Run immediately?
allow_chat: true                     // Allow conversation?
show_variables: false                // Show variable form?
apply_variables: true                // Apply variables?
```

---

## 📊 New Boolean Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `result_display` | `'modal' \| 'inline' \| 'background' \| 'sidebar' \| 'toast'` | `'modal'` | WHERE to display results |
| `auto_run` | `boolean` | `true` | Run immediately (`true`) or wait for user (`false`) |
| `allow_chat` | `boolean` | `true` | Allow conversation (`true`) or one-shot (`false`) |
| `show_variables` | `boolean` | `false` | Show variable form (`true`) or hide (`false`) |
| `apply_variables` | `boolean` | `true` | Apply variables (`true`) or ignore (`false`) |

---

## 🔄 Migration from Old System

### Old Mode → New Booleans

| Old Mode | auto_run | allow_chat | show_variables | apply_variables |
|----------|----------|------------|----------------|-----------------|
| `auto-run` | `true` | `true` | `false` | `true` |
| `auto-run-one-shot` | `true` | `false` | `false` | `true` |
| `manual-with-hidden-variables` | `false` | `true` | `false` | `true` |
| `manual-with-visible-variables` | `false` | `true` | `true` | `true` |
| `manual` | `false` | `true` | `false` | `false` |

### Helper Function
```typescript
import { convertLegacyMode } from '@/features/prompt-builtins';

// Convert old mode string to new booleans
const config = convertLegacyMode('auto-run');
// → { auto_run: true, allow_chat: true, show_variables: false, apply_variables: true }
```

---

## 🗄️ Database Migration

Run these SQL files in order:

```bash
# 1. Update schema (drop old columns, add new boolean columns)
psql -f features/prompt-builtins/sql/execution_config_v2.sql

# 2. Update the view
psql -f features/prompt-builtins/sql/shortcuts_by_placement_view_v3.sql
```

### What the Migration Does:
1. Drops `modal_mode` column (confusing!)
2. Drops `allow_initial_message` column (redundant!)
3. Renames `execution_context` → `result_display` (clearer!)
4. Keeps `allow_chat` (good name!)
5. Adds `auto_run` column
6. Adds `show_variables` column
7. Adds `apply_variables` column

---

## 💡 Examples

### Example 1: AI Text Transformation

```typescript
{
  result_display: 'inline',     // Show inline result modal
  auto_run: true,               // Run immediately
  allow_chat: false,            // One-shot (no conversation)
  show_variables: false,        // Hide variable form
  apply_variables: true,        // Apply scope-mapped variables
}
```

**Behavior**: Runs immediately, shows `TextActionResultModal` with replace/insert options, one response only.

---

### Example 2: Conversational AI Assistant

```typescript
{
  result_display: 'modal',      // Open in full modal
  auto_run: true,               // Run immediately
  allow_chat: true,             // Allow conversation
  show_variables: false,        // Hide variable form
  apply_variables: true,        // Apply scope-mapped variables
}
```

**Behavior**: Opens `PromptRunnerModal`, runs immediately, allows multi-turn chat.

---

### Example 3: Manual Prompt with Visible Variables

```typescript
{
  result_display: 'modal',      // Open in full modal
  auto_run: false,              // Wait for user to click "Run"
  allow_chat: true,             // Allow conversation
  show_variables: true,         // Show variable form for editing
  apply_variables: true,        // Pre-fill variables from scopes
}
```

**Behavior**: Opens modal, shows pre-filled variable form, user can edit before running.

---

### Example 4: Background Automation

```typescript
{
  result_display: 'background', // No UI
  auto_run: true,               // Run immediately (always true for background)
  allow_chat: false,            // N/A for background
  show_variables: false,        // N/A for background
  apply_variables: true,        // Apply variables for execution
}
```

**Behavior**: Executes silently, no UI shown, returns result programmatically.

---

### Example 5: Pure Manual Mode (No Variables)

```typescript
{
  result_display: 'modal',      // Open in full modal
  auto_run: false,              // Wait for user to click "Run"
  allow_chat: true,             // Allow conversation
  show_variables: false,        // Don't show variable form
  apply_variables: false,       // Don't apply any variables
}
```

**Behavior**: Standard manual prompt runner, user types everything from scratch.

---

## 🔧 How It Works

### In the Execution Hook

The hook automatically converts boolean flags to the appropriate modal mode:

```typescript
// Determine modal mode based on boolean flags
let mode: PromptExecutionMode;

if (shortcut.auto_run) {
  // Auto-run modes
  mode = shortcut.allow_chat ? 'auto-run' : 'auto-run-one-shot';
} else {
  // Manual modes
  if (shortcut.show_variables) {
    mode = 'manual-with-visible-variables';
  } else if (shortcut.apply_variables) {
    mode = 'manual-with-hidden-variables';
  } else {
    mode = 'manual';
  }
}
```

### Result Display Logic

```typescript
const resultDisplay = shortcut.result_display || 'modal';

if (resultDisplay === 'inline') {
  // Show TextActionResultModal
} else if (resultDisplay === 'modal') {
  // Open PromptRunnerModal with calculated mode
} else if (resultDisplay === 'background') {
  // Execute silently
} else if (resultDisplay === 'toast') {
  // Show in toast (TODO)
}
```

---

## ✅ Benefits

1. **🎯 Clearer Intent**: Each boolean has a single, clear purpose
2. **🔧 More Flexible**: Can combine flags in ways string modes couldn't support
3. **📊 Better UI**: Admin can use checkboxes instead of dropdown with confusing options
4. **🐛 Less Confusion**: No more duplicate flags with unclear relationships
5. **📈 Extensible**: Easy to add new boolean flags without breaking existing modes

---

## 🎨 Admin UI Recommendations

### Form Layout

```tsx
<Select label="Result Display">
  <option value="modal">Modal</option>
  <option value="inline">Inline</option>
  <option value="background">Background</option>
  <option value="sidebar">Sidebar</option>
  <option value="toast">Toast</option>
</Select>

{resultDisplay === 'modal' && (
  <>
    <Checkbox label="Auto-run" checked={autoRun} />
    <Checkbox label="Allow chat" checked={allowChat} />
    <Checkbox label="Show variables" checked={showVariables} />
    <Checkbox label="Apply variables" checked={applyVariables} />
  </>
)}

{resultDisplay === 'inline' && (
  <p className="text-sm text-muted-foreground">
    Inline mode: Executes and shows result with text manipulation options.
    Modal settings don't apply.
  </p>
)}
```

### Smart UI
- Only show boolean checkboxes when `result_display === 'modal'`
- Disable `show_variables` when `apply_variables === false` (no variables to show!)
- Show helpful hints for each combination

---

## 🚀 Migration Checklist

- [x] Create SQL migration (`execution_config_v2.sql`)
- [x] Update database view (`shortcuts_by_placement_view_v3.sql`)
- [x] Update TypeScript types (`PromptShortcut`, `CreatePromptShortcutInput`, etc.)
- [x] Update execution modes types (`execution-modes.ts`)
- [x] Update hook (`useContextMenuShortcuts.ts`)
- [x] Update execution hook (`useShortcutExecution.ts`)
- [x] Update UnifiedContextMenu
- [x] Export new types from index
- [ ] Update admin UI to use checkboxes instead of mode dropdown
- [ ] Test all execution configurations
- [ ] Update documentation

---

## 🎓 Key Takeaways

1. **`result_display`**: WHERE to show results (modal, inline, background, sidebar, toast)
2. **`auto_run`**: Whether to run immediately or wait for user
3. **`allow_chat`**: Whether to allow conversation or one-shot
4. **`show_variables`**: Whether to show variable form
5. **`apply_variables`**: Whether to apply variables at all

**Simple, clear, and powerful!** 🎉

