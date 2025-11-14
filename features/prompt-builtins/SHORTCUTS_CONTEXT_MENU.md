# Context Menu Implementation Guide

## Overview
This guide explains how to implement the context menu system using the database views and functions.

---

## Step 1: Load the Menu (On Menu Open)

**Query:**
```sql
SELECT * FROM context_menu_view;
```

**What You Get:**
```typescript
interface MenuRow {
  // Category info
  category_id: string;
  parent_category_id: string | null;
  category_label: string;
  category_description: string | null;
  category_icon: string;
  category_color: string;
  category_sort_order: number;
  category_depth: number;
  category_sort_path: number[];
  category_path: string;
  category_metadata: Record<string, any>;
  
  // Shortcut info (null if this is just a category header)
  shortcut_id: string | null;
  prompt_builtin_id: string | null;
  shortcut_label: string | null;
  shortcut_description: string | null;
  shortcut_icon: string | null;
  keyboard_shortcut: string | null;
  shortcut_sort_order: number | null;
  scope_mappings: Record<string, string> | null;
  
  // Flags
  is_standalone: boolean;
  
  // Preview
  prompt_name: string | null;
}
```

**What You Do:**
1. Fetch all rows once when the menu opens
2. Group rows by `category_id` to build the hierarchy
3. For standalone items (`is_standalone === true`), render shortcuts without a category wrapper
4. Use `category_sort_path` to maintain proper nested ordering
5. Render each shortcut as a menu item using `shortcut_label`, `shortcut_icon`, etc.

---

## Step 2: Handle Menu Item Click

**Query:**
```sql
SELECT * FROM get_prompt_execution_data($1);
```

**Parameters:**
- `$1`: The `shortcut_id` from the clicked menu item

**What You Get:**
```typescript
interface PromptExecutionData {
  shortcut_id: string;
  shortcut_label: string;
  scope_mappings: Record<string, string>; // e.g., { selection: "highlighted_text", content: "current_card" }
  prompt_builtin_id: string;
  prompt_name: string;
  messages: Array<{role: string; content: string}>; // The prompt template
  variable_defaults: Record<string, any> | null; // Default values for variables
  tools: any[] | null; // Tool configurations
  settings: Record<string, any> | null; // Model settings (temperature, etc.)
}
```

**What You Do:**
1. Get the current scope from your application context:
   ```typescript
   const currentScope = {
     selection: "highlighted text here" | null,
     content: { /* current item data */ },
     context: { /* broader context data */ }
   };
   ```

2. Map scope to prompt variables using `scope_mappings`:
   ```typescript
   const promptVariables: Record<string, any> = {};
   
   for (const [scopeLevel, variableName] of Object.entries(data.scope_mappings)) {
     // scopeLevel will be "selection", "content", or "context"
     // variableName will be the prompt variable name like "highlighted_text"
     promptVariables[variableName] = currentScope[scopeLevel];
   }
   ```

3. Merge with `variable_defaults` for any missing variables:
   ```typescript
   const finalVariables = {
     ...data.variable_defaults,
     ...promptVariables // User's scope overrides defaults
   };
   ```

4. Execute the prompt:
   ```typescript
   executePrompt({
     messages: data.messages,
     variables: finalVariables,
     tools: data.tools,
     settings: data.settings
   });
   ```

---

## Example: Complete Flow

### Menu Render
```typescript
// Load menu
const menuData = await supabase
  .from('context_menu_view')
  .select('*');

// Build hierarchy
const menuStructure = buildMenuHierarchy(menuData);

// Render
menuStructure.forEach(category => {
  if (category.is_standalone) {
    // Render shortcuts directly, no category wrapper
    category.shortcuts.forEach(shortcut => renderMenuItem(shortcut));
  } else {
    // Render category header, then shortcuts
    renderCategoryHeader(category);
    category.shortcuts.forEach(shortcut => renderMenuItem(shortcut));
  }
});
```

### Menu Item Click
```typescript
async function handleMenuItemClick(shortcutId: string) {
  // 1. Get execution data
  const { data } = await supabase
    .rpc('get_prompt_execution_data', { p_shortcut_id: shortcutId });
  
  if (!data || data.length === 0) return;
  
  const executionData = data[0];
  
  // 2. Get current scope from your app
  const currentScope = {
    selection: getSelectedText(),
    content: getCurrentItem(),
    context: getContextData()
  };
  
  // 3. Map scope to variables
  const variables: Record<string, any> = {};
  for (const [scopeLevel, varName] of Object.entries(executionData.scope_mappings)) {
    variables[varName] = currentScope[scopeLevel];
  }
  
  // 4. Merge with defaults
  const finalVariables = {
    ...executionData.variable_defaults,
    ...variables
  };
  
  // 5. Execute
  await executePrompt({
    messages: executionData.messages,
    variables: finalVariables,
    tools: executionData.tools,
    settings: executionData.settings
  });
}
```

---

## Scope Mapping Examples

### Example 1: Flashcard "I'm confused" button
```json
{
  "scope_mappings": {
    "content": "current_card",
    "context": "deck_info"
  }
}
```
Current scope:
```typescript
{
  selection: null,
  content: { id: "card_123", question: "What is mitochondria?", answer: "..." },
  context: { deckId: "bio_101", totalCards: 50 }
}
```
Resulting variables:
```typescript
{
  current_card: { id: "card_123", question: "What is mitochondria?", answer: "..." },
  deck_info: { deckId: "bio_101", totalCards: 50 }
}
```

### Example 2: Code editor "Explain this"
```json
{
  "scope_mappings": {
    "selection": "code_snippet",
    "content": "current_file",
    "context": "project_files"
  }
}
```
Current scope:
```typescript
{
  selection: "function calculateTotal() { ... }",
  content: { filename: "cart.ts", fullContent: "..." },
  context: { openFiles: [...], projectPath: "..." }
}
```
Resulting variables:
```typescript
{
  code_snippet: "function calculateTotal() { ... }",
  current_file: { filename: "cart.ts", fullContent: "..." },
  project_files: { openFiles: [...], projectPath: "..." }
}
```

---

## Performance Notes

- **Menu view is lightweight** - No heavy JSONB fields, renders fast
- **Execution function is optimized** - Single query with covering indexes
- **Cache menu data** - Only re-fetch when menu structure changes
- **Execution is lazy** - Heavy prompt data only loaded on click

---

## TypeScript Types

```typescript
// Menu rendering
interface CategoryNode {
  category_id: string;
  label: string;
  icon: string;
  color: string;
  depth: number;
  is_standalone: boolean;
  shortcuts: MenuItem[];
  children: CategoryNode[];
}

interface MenuItem {
  shortcut_id: string;
  label: string;
  description: string | null;
  icon: string | null;
  keyboard_shortcut: string | null;
  prompt_builtin_id: string;
}

// Prompt execution
interface ScopeMapping {
  selection?: string;
  content?: string;
  context?: string;
}

interface PromptExecution {
  messages: Array<{ role: string; content: string }>;
  variables: Record<string, any>;
  tools: any[] | null;
  settings: Record<string, any> | null;
}

interface CurrentScope {
  selection: string | null;
  content: any;
  context: any;
}
```