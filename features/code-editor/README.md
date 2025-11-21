# AI Code Editor System

Modern, intelligent code editing system powered by AI with automatic variable population and Redux integration.

---

## Features

✅ **Prompt Builtins** - System-wide prompts accessible to all users  
✅ **Special Variables** - Automatic population of code context  
✅ **Redux Integration** - Bulletproof state management  
✅ **Smart Caching** - Never refetch prompts  
✅ **Variable Auto-Detection** - Only populates what prompts need  

---

## Special Variables System

### Overview

The system automatically detects and populates special variables based on what each prompt needs. Variables are **only included if the prompt defines them**.

### Supported Special Variables

| Variable | Description | Current Status | Fallback |
|----------|-------------|----------------|----------|
| `current_code` | Full current file content | ✅ Implemented | - |
| `content` | Alias for `current_code` | ✅ Implemented | - |
| `selection` | Highlighted/selected text | 🚧 Prepared | Falls back to `current_code` |
| `context` | Multi-file context | 🚧 Prepared | Falls back to `current_code` |

### How It Works

1. **Prompt Definition** (in database):
```json
{
  "variable_defaults": [
    {
      "name": "current_code",
      "type": "long_text",
      "required": true
    },
    {
      "name": "selection",
      "type": "long_text",
      "required": false
    }
  ]
}
```

2. **Automatic Detection**:
```typescript
// System checks what variables the prompt needs
const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);
// Result: ['current_code', 'selection']
```

3. **Auto-Population**:
```typescript
// System builds only what's needed
const specialVars = buildSpecialVariables(
  { currentCode, selection, context },
  requiredSpecialVars
);
// Result: { current_code: "...", selection: "..." }
// (context is NOT included because prompt doesn't need it)
```

4. **UI Hiding**:
```typescript
// Special variables are automatically hidden from UI
const displayVariables = filterOutSpecialVariables(promptVariables);
// Users never see or edit special variables
```

---

## Usage

### Basic Usage

```typescript
import { AICodeEditorModal } from '@/features/code-editor/components/AICodeEditorModal';

<AICodeEditorModal
  open={isOpen}
  onOpenChange={setIsOpen}
  currentCode={code}
  language="typescript"
  onCodeChange={setCode}
/>
```

### With Selection (Future)

```typescript
<AICodeEditorModal
  open={isOpen}
  onOpenChange={setIsOpen}
  currentCode={fullCode}
  selection={highlightedText} // ← Automatically used if prompt needs it
  language="typescript"
  onCodeChange={setCode}
/>
```

### With Context (Future Multi-File)

```typescript
<AICodeEditorModal
  open={isOpen}
  onOpenChange={setIsOpen}
  currentCode={currentFile}
  context={otherFilesContent} // ← For multi-file understanding
  language="typescript"
  onCodeChange={setCode}
/>
```

### With Custom Builtin

```typescript
<AICodeEditorModal
  open={isOpen}
  onOpenChange={setIsOpen}
  currentCode={code}
  builtinId="your-custom-builtin-uuid"
  language="python"
  onCodeChange={setCode}
/>
```

### With Prompt Selection

```typescript
<AICodeEditorModal
  open={isOpen}
  onOpenChange={setIsOpen}
  currentCode={code}
  allowPromptSelection={true} // ← Shows dropdown
  language="typescript"
  onCodeChange={setCode}
/>
```

---

## Creating New Prompt Builtins

### 1. Create in Database

```sql
INSERT INTO prompt_builtins (id, name, messages, variable_defaults, settings)
VALUES (
  'uuid-here',
  'SQL Optimizer',
  '[...]', -- Your messages
  '[
    {
      "name": "current_code",
      "type": "long_text",
      "required": true,
      "description": "Current SQL query"
    },
    {
      "name": "database_type",
      "type": "select",
      "required": false,
      "options": ["PostgreSQL", "MySQL", "SQLite"]
    }
  ]',
  '{...}' -- Model settings
);
```

### 2. Add to Config

```typescript
// features/code-editor/utils/codeEditorPrompts.ts

export const CODE_EDITOR_PROMPT_BUILTINS = {
  // ... existing builtins
  SQL_OPTIMIZER: {
    id: 'uuid-here',
    name: 'SQL Optimizer',
    description: 'Optimizes SQL queries',
    useCase: 'sql',
  },
};
```

### 3. Done!

The builtin is now:
- ✅ Available in the dropdown (if `allowPromptSelection={true}`)
- ✅ Automatically fetched and cached
- ✅ Special variables auto-populated
- ✅ Regular variables shown in UI
- ✅ Integrated with Redux execution engine

---

## Special Variables API

### Core Functions

```typescript
// Check if a variable is special (auto-managed)
isSpecialVariable('current_code'); // true
isSpecialVariable('user_input');   // false

// Build special variables for a prompt
const specialVars = buildSpecialVariables(
  { currentCode, selection, context },
  ['current_code', 'selection'] // What prompt needs
);

// Filter special variables from UI display
const userVariables = filterOutSpecialVariables(allVariables);

// Get which special variables a prompt needs
const needed = getRequiredSpecialVariables(promptVariables);
// Returns: ['current_code', 'content']
```

### Adding New Special Variables

To add a new special variable (e.g., `file_path`):

1. **Add to constant**:
```typescript
// features/code-editor/utils/specialVariables.ts
export const SPECIAL_VARIABLE_NAMES = {
  CURRENT_CODE: 'current_code',
  CONTENT: 'content',
  SELECTION: 'selection',
  CONTEXT: 'context',
  FILE_PATH: 'file_path', // ← Add here
} as const;
```

2. **Update interface**:
```typescript
export interface CodeEditorContext {
  currentCode: string;
  selection?: string;
  context?: string;
  filePath?: string; // ← Add here
}
```

3. **Add population logic**:
```typescript
export function buildSpecialVariables(...) {
  // ... existing code
  
  if (requiredVariables.includes(SPECIAL_VARIABLE_NAMES.FILE_PATH)) {
    specialVars[SPECIAL_VARIABLE_NAMES.FILE_PATH] = codeContext.filePath || '';
  }
  
  return specialVars;
}
```

4. **Use it**:
```typescript
<AICodeEditorModal
  currentCode={code}
  filePath="/path/to/file.ts" // ← Automatically used if needed
  // ...
/>
```

---

## Architecture

### Component Flow

```
AICodeEditorModal
  ↓
startPromptInstance (Redux)
  ↓
Fetch builtin from prompt_builtins
  ↓
Cache in Redux
  ↓
Detect special variables needed
  ↓
Auto-populate special variables
  ↓
Filter special variables from UI
  ↓
Show only user-editable variables
  ↓
executeMessage (Redux)
  ↓
Update special variables with latest values
  ↓
Merge all variables
  ↓
Replace {{variables}} in messages
  ↓
Stream AI response
```

### File Structure

```
features/code-editor/
├── README.md (this file)
├── components/
│   ├── AICodeEditorModal.tsx (main component)
│   ├── DiffView.tsx (diff visualization)
│   └── code-block/
├── utils/
│   ├── codeEditorPrompts.ts (builtin config)
│   ├── specialVariables.ts (auto-population logic)
│   ├── parseCodeEdits.ts (AI response parsing)
│   ├── applyCodeEdits.ts (code modification)
│   └── generateDiff.ts (diff generation)
└── types/ (TypeScript definitions)
```

---

## Benefits

### For Prompt Creators

- ✅ **Automatic Context** - Just define variables, system populates them
- ✅ **Flexible** - Use `current_code` or `content`, system handles both
- ✅ **Future-Proof** - `selection` and `context` work when implemented
- ✅ **Clean Prompts** - No manual code injection needed

### For Developers

- ✅ **Zero Config** - Pass props, system handles rest
- ✅ **Optional Features** - Selection/context ignored if not needed
- ✅ **Type Safe** - Full TypeScript support
- ✅ **Extensible** - Easy to add new special variables

### For Users

- ✅ **Simple UI** - Only see variables they need to edit
- ✅ **Consistent** - Same experience across all prompts
- ✅ **Fast** - Automatic caching and optimization
- ✅ **Reliable** - Redux state management eliminates bugs

---

## Future Features

### 🚧 Selection Support

**Goal**: Allow users to highlight code and edit just that section.

**Implementation Plan**:
1. Add Monaco Editor integration
2. Capture selection state
3. Pass `selection` prop to modal
4. System auto-populates if prompt needs it

### 🚧 Multi-File Context

**Goal**: AI understands multiple files for better edits.

**Implementation Plan**:
1. Add file tree interface
2. Collect related files
3. Build context string
4. Pass `context` prop to modal
5. System auto-populates if prompt needs it

### 🚧 Diff-Based Editing

**Goal**: AI returns patches instead of full code.

**Implementation Plan**:
1. Add diff-specific prompts
2. Parse patch format
3. Apply patches intelligently
4. Show merged result

---

## Troubleshooting

### Special Variables Not Populating

**Check**:
1. Is the variable defined in the prompt's `variable_defaults`?
2. Is the variable name spelled correctly? (case-sensitive)
3. Is the prop passed to `AICodeEditorModal`?

**Debug**:
```typescript
// Enable logging
logSpecialVariablesUsage(promptName, specialVars);
```

### Variables Showing in UI

**Problem**: Special variables appearing in variable editor.

**Fix**: Check `specialVariables.ts` has the variable name in `SPECIAL_VARIABLE_NAMES`.

### Stale Code in Variables

**Problem**: Special variables have old code.

**Fix**: System auto-updates before execution. Check console for update logs.

---

## Summary

The special variables system is:
- ✅ **Automatic** - Detects needs, populates accordingly
- ✅ **Efficient** - Only includes what's needed
- ✅ **Extensible** - Easy to add new variables
- ✅ **Future-Ready** - Prepared for selection/context features
- ✅ **Developer-Friendly** - Simple API, powerful results

**Just pass the props, system handles the rest!** 🎉

