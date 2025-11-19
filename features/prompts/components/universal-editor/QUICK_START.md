# Quick Start - Drop-in Editors

Three ready-to-use editor components with **zero configuration** needed.

## Installation

```tsx
import { PromptEditor, TemplateEditor, BuiltinEditor } from '@/features/prompts/components/universal-editor';
```

## Usage

### 1. Prompt Editor

```tsx
function MyComponent() {
    const [isOpen, setIsOpen] = useState(false);
    const [promptId, setPromptId] = useState('some-id');
    
    return (
        <>
            <button onClick={() => setIsOpen(true)}>Edit Prompt</button>
            
            <PromptEditor
                promptId={promptId}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSaveSuccess={() => {
                    console.log('Saved!');
                    // Refresh your list, close modal, etc.
                }}
            />
        </>
    );
}
```

**That's it!** The editor:
- ✅ Loads the prompt from database
- ✅ Loads models and tools
- ✅ Manages all state internally
- ✅ Saves changes back to database
- ✅ Shows loading states
- ✅ Handles errors
- ✅ Calls your callback on success

### 2. Template Editor

```tsx
<TemplateEditor
    templateId={templateId}
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onSaveSuccess={() => loadTemplates()}
/>
```

### 3. Builtin Editor

```tsx
<BuiltinEditor
    builtinId={builtinId}
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onSaveSuccess={() => loadBuiltins()}
/>
```

## Real-World Example

Here's how it's used in `PromptBuiltinsTableManager`:

**Before** (30+ lines of state management, data loading, save handlers):
```tsx
const [models, setModels] = useState([]);
const [tools, setTools] = useState([]);
const [builtin, setBuiltin] = useState(null);
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);

const loadData = async () => { /* 20 lines */ };
const handleSave = async (data) => { /* 15 lines */ };

useEffect(() => { /* load data */ }, []);

return (
    <ComplexEditor
        builtin={builtin}
        models={models}
        tools={tools}
        loading={loading}
        saving={saving}
        onSave={handleSave}
        // ...10 more props
    />
);
```

**After** (4 lines):
```tsx
<BuiltinEditor
    builtinId={editingBuiltinId}
    isOpen={true}
    onClose={() => setEditingBuiltinId(null)}
    onSaveSuccess={handleBuiltinSaved}
/>
```

## API

### All Three Editors Share the Same Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `promptId` / `templateId` / `builtinId` | `string` | ✅ | The ID to edit |
| `isOpen` | `boolean` | ✅ | Whether modal is open |
| `onClose` | `() => void` | ✅ | Close callback |
| `onSaveSuccess` | `() => void` | ❌ | Called after successful save |
| `initialSelection` | `object` | ❌ | Initial tab/message to show |

### Initial Selection Examples

```tsx
// Open directly to variables tab
<PromptEditor
    initialSelection={{ type: 'variables' }}
    {...otherProps}
/>

// Open to specific message
<PromptEditor
    initialSelection={{ type: 'message', index: 2 }}
    {...otherProps}
/>

// Open to settings
<PromptEditor
    initialSelection={{ type: 'settings' }}
    {...otherProps}
/>
```

## Features (All Built-in)

Each editor includes:

- ✅ **Full-screen modal** with proper animations
- ✅ **System message editor** with AI optimizer
- ✅ **Message management** (add/edit/delete user/assistant messages)
- ✅ **Variable editor** with custom components (textarea, toggle, radio, etc.)
- ✅ **Tools panel** (if model supports it)
- ✅ **Model selector** with all settings
- ✅ **Right-click context menu** for content blocks
- ✅ **Dirty state tracking** with unsaved changes warning
- ✅ **Auto-save button** with loading state
- ✅ **Error handling** with toast notifications
- ✅ **Loading spinner** while fetching data

## When to Use What

### Use Ready-to-Use Editors (`PromptEditor`, `TemplateEditor`, `BuiltinEditor`)
✅ **95% of use cases** - When you just need to edit an existing record

### Use Core Editor (`UniversalPromptEditor`)
❌ Only if you need custom data loading or save logic

## Migration Guide

### Before
```tsx
// Old way - managing everything manually
<PromptSettingsModal
    isOpen={isOpen}
    onClose={onClose}
    promptId={prompt.id}
    promptName={prompt.name}
    promptDescription={prompt.description}
    variableDefaults={prompt.variableDefaults}
    messages={prompt.messages}
    settings={prompt.settings}
    models={models}
    availableTools={tools}
    onUpdate={(id, data) => { /* save logic */ }}
    onLocalStateUpdate={() => {}}
/>
```

### After
```tsx
// New way - component handles everything
<PromptEditor
    promptId={prompt.id}
    isOpen={isOpen}
    onClose={onClose}
    onSaveSuccess={() => refreshList()}
/>
```

## Performance

- Data loads only when modal opens (not pre-loaded)
- Parallel requests for models, tools, and prompt data
- Optimized re-renders with proper state management
- No unnecessary API calls

## Error Handling

All errors are handled automatically with user-friendly messages:
- Failed to load data → Toast error + modal closes
- Failed to save → Toast error + modal stays open
- Not found → Toast error + modal closes
- Network error → Toast error with details

## TypeScript Support

Full type safety out of the box:

```tsx
import type { PromptEditor } from '@/features/prompts/components/universal-editor';

// All props are properly typed
// IntelliSense works perfectly
// No manual type definitions needed
```

## Summary

1. Import the editor you need
2. Pass an ID and control open/close state
3. **Done!**

The editor handles:
- ✅ Data loading
- ✅ State management
- ✅ Validation
- ✅ Saving
- ✅ Error handling
- ✅ Loading states
- ✅ Success feedback

You just render it and it works.

