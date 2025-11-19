# Universal Prompt Editor

A self-contained, reusable prompt editor component that works seamlessly with all three prompt-related tables: `prompts`, `prompt_templates`, and `prompt_builtins`.

## Features

- **✅ Universal Data Model**: Single interface works with all three tables
- **✅ Self-Contained State**: Manages all editing state internally
- **✅ Full Feature Parity**: System messages, user/assistant messages, variables, tools, model settings
- **✅ Dirty State Management**: Prevents accidental data loss
- **✅ Save Integration**: Built-in save button with loading states
- **✅ Type-Safe**: Full TypeScript support with proper types
- **✅ Zero Breaking Changes**: Uses existing `FullScreenEditor` component

## Quick Start

### Basic Usage

```tsx
import { UniversalPromptEditor, normalizePromptData } from '@/features/prompts/components/universal-editor';

function MyComponent() {
    const [isOpen, setIsOpen] = useState(false);
    const [models, setModels] = useState([]);
    const [tools, setTools] = useState([]);
    
    // Load your prompt from database
    const myPrompt = await fetchPromptFromDatabase();
    
    // Normalize it to the universal format
    const promptData = normalizePromptData(myPrompt, 'prompt');
    
    const handleSave = async (updatedPrompt) => {
        // Save back to database
        await updatePromptInDatabase(updatedPrompt.id, updatedPrompt);
        setIsOpen(false);
    };
    
    return (
        <>
            <button onClick={() => setIsOpen(true)}>Edit Prompt</button>
            
            <UniversalPromptEditor
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                promptData={promptData}
                models={models}
                availableTools={tools}
                onSave={handleSave}
            />
        </>
    );
}
```

## Complete Examples

### Example 1: Editing a Prompt

```tsx
import { UniversalPromptEditor, normalizePromptData } from '@/features/prompts/components/universal-editor';
import { createClient } from '@/utils/supabase/client';

function PromptEditor({ promptId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [promptData, setPromptData] = useState(null);
    const [models, setModels] = useState([]);
    const supabase = createClient();
    
    useEffect(() => {
        // Load models
        async function loadModels() {
            const { data } = await supabase.from('ai_models').select('*');
            setModels(data || []);
        }
        loadModels();
        
        // Load prompt
        async function loadPrompt() {
            const { data } = await supabase
                .from('prompts')
                .select('*')
                .eq('id', promptId)
                .single();
            
            if (data) {
                setPromptData(normalizePromptData(data, 'prompt'));
            }
        }
        loadPrompt();
    }, [promptId]);
    
    const handleSave = async (updated) => {
        const { error } = await supabase
            .from('prompts')
            .update({
                name: updated.name,
                description: updated.description,
                messages: updated.messages,
                variable_defaults: updated.variable_defaults,
                settings: updated.settings,
            })
            .eq('id', promptId);
        
        if (!error) {
            toast.success('Prompt saved successfully');
            setIsOpen(false);
        }
    };
    
    if (!promptData) return null;
    
    return (
        <UniversalPromptEditor
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            promptData={promptData}
            models={models}
            onSave={handleSave}
        />
    );
}
```

### Example 2: Editing a Template

```tsx
import { UniversalPromptEditor, normalizePromptData } from '@/features/prompts/components/universal-editor';

function TemplateEditor({ templateId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [templateData, setTemplateData] = useState(null);
    const supabase = createClient();
    
    useEffect(() => {
        async function loadTemplate() {
            const { data } = await supabase
                .from('prompt_templates')
                .select('*')
                .eq('id', templateId)
                .single();
            
            if (data) {
                setTemplateData(normalizePromptData(data, 'template'));
            }
        }
        loadTemplate();
    }, [templateId]);
    
    const handleSave = async (updated) => {
        await supabase
            .from('prompt_templates')
            .update({
                name: updated.name,
                description: updated.description,
                category: updated.category, // Template-specific field
                messages: updated.messages,
                variable_defaults: updated.variable_defaults,
                settings: updated.settings,
            })
            .eq('id', templateId);
        
        setIsOpen(false);
    };
    
    if (!templateData) return null;
    
    return (
        <UniversalPromptEditor
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            promptData={templateData}
            models={models}
            onSave={handleSave}
        />
    );
}
```

### Example 3: Editing a Builtin

```tsx
import { UniversalPromptEditor, normalizePromptData } from '@/features/prompts/components/universal-editor';

function BuiltinEditor({ builtinId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [builtinData, setBuiltinData] = useState(null);
    
    useEffect(() => {
        async function loadBuiltin() {
            const { data } = await supabase
                .from('prompt_builtins')
                .select('*')
                .eq('id', builtinId)
                .single();
            
            if (data) {
                setBuiltinData(normalizePromptData(data, 'builtin'));
            }
        }
        loadBuiltin();
    }, [builtinId]);
    
    const handleSave = async (updated) => {
        await supabase
            .from('prompt_builtins')
            .update({
                name: updated.name,
                description: updated.description,
                is_active: updated.is_active, // Builtin-specific field
                messages: updated.messages,
                variable_defaults: updated.variable_defaults,
                settings: updated.settings,
            })
            .eq('id', builtinId);
        
        setIsOpen(false);
    };
    
    if (!builtinData) return null;
    
    return (
        <UniversalPromptEditor
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            promptData={builtinData}
            models={models}
            availableTools={tools}
            onSave={handleSave}
        />
    );
}
```

## API Reference

### `UniversalPromptEditor` Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | Whether the editor modal is open |
| `onClose` | `() => void` | ✅ | Callback when editor is closed |
| `promptData` | `UniversalPromptData` | ✅ | The prompt data to edit |
| `models` | `any[]` | ✅ | Array of available AI models |
| `availableTools` | `any[]` | ❌ | Array of available tools |
| `onSave` | `(updated: UniversalPromptData) => void \| Promise<void>` | ✅ | Callback when user saves changes |
| `isSaving` | `boolean` | ❌ | Whether save operation is in progress |
| `initialSelection` | `MessageItem \| null` | ❌ | Initial view selection in editor |

### `UniversalPromptData` Interface

```typescript
interface UniversalPromptData {
    id?: string;
    name: string;
    description?: string;
    messages: PromptMessage[];
    variable_defaults?: PromptVariable[];
    tools?: string[];
    settings?: PromptSettings & { model_id?: string };
    sourceType: 'prompt' | 'template' | 'builtin';
    
    // Table-specific fields (optional)
    category?: string;
    is_active?: boolean;
    is_featured?: boolean;
    source_prompt_id?: string;
}
```

### Helper Functions

#### `normalizePromptData(record, sourceType)`

Converts a database record to the universal format.

```typescript
const promptData = normalizePromptData(dbRecord, 'prompt');
```

#### `denormalizePromptData(data)`

Converts universal format back to database format (removes internal fields).

```typescript
const dbData = denormalizePromptData(universalData);
```

## Features

### Full Editing Capabilities

- ✅ **System Message**: Edit the system/developer message
- ✅ **User/Assistant Messages**: Add, edit, delete conversation messages
- ✅ **Variables**: Create and manage prompt variables with custom components
- ✅ **Tools**: Add/remove tools (if model supports them)
- ✅ **Model Settings**: Change model and configure all settings (temperature, max_tokens, etc.)
- ✅ **Context Menu**: Insert content blocks via right-click

### Built-in Features

- ✅ **Dirty State Tracking**: Warns before closing with unsaved changes
- ✅ **Save Button**: Integrated save button with loading state
- ✅ **Auto-Reset**: Resets state when promptData changes
- ✅ **Model Capabilities**: Automatically adapts UI based on model features
- ✅ **System Prompt Optimizer**: AI-powered system message optimization

## Architecture

```
UniversalPromptEditor (State Management)
    └── FullScreenEditor (UI Component)
        ├── System Message Editor
        ├── Message List Editor
        ├── Model Settings Panel
        ├── Variables Manager
        └── Tools Manager
```

The `UniversalPromptEditor` is a **smart wrapper** that:
1. Manages all state internally
2. Handles data normalization
3. Provides save/cancel logic
4. Delegates UI rendering to `FullScreenEditor`

## Integration Notes

### Loading Models and Tools

```typescript
// Fetch models from database
const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_enabled', true)
    .order('sort_order');

// Fetch tools from database
const { data: tools } = await supabase
    .from('ai_tools')
    .select('*')
    .eq('is_active', true);
```

### Handling Save Operations

The `onSave` callback receives the complete updated prompt object. You're responsible for:
1. Validating the data (optional)
2. Saving to the appropriate table
3. Handling errors
4. Closing the editor on success

```typescript
const handleSave = async (updated: UniversalPromptData) => {
    try {
        // Validate
        if (!updated.name.trim()) {
            toast.error('Name is required');
            return;
        }
        
        // Save
        const { error } = await supabase
            .from(updated.sourceType === 'prompt' ? 'prompts' : 
                  updated.sourceType === 'template' ? 'prompt_templates' : 
                  'prompt_builtins')
            .update({ ...denormalizePromptData(updated) })
            .eq('id', updated.id);
        
        if (error) throw error;
        
        toast.success('Saved successfully');
        setIsOpen(false);
    } catch (error) {
        toast.error('Failed to save');
    }
};
```

## Benefits

1. **DRY Principle**: Single editor for all three tables
2. **Consistency**: Same editing experience everywhere
3. **Maintainability**: Changes benefit all use cases
4. **Type Safety**: Full TypeScript support
5. **Feature Parity**: All features work identically
6. **Easy Integration**: Simple props API
7. **Zero Breaking Changes**: Builds on existing components

## Migration from Old Patterns

**Before** (managing state manually):

```tsx
const [developerMessage, setDeveloperMessage] = useState('');
const [messages, setMessages] = useState([]);
const [model, setModel] = useState('');
// ... 20+ more state variables
```

**After** (using UniversalPromptEditor):

```tsx
<UniversalPromptEditor
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    promptData={normalizePromptData(dbRecord, 'prompt')}
    models={models}
    onSave={handleSave}
/>
```

## Future Enhancements

Potential improvements that maintain backward compatibility:

- [ ] Optional read-only mode
- [ ] Custom validation hooks
- [ ] Undo/redo functionality  
- [ ] Auto-save capability
- [ ] Version history integration
- [ ] Export/import prompt JSON
- [ ] Bulk variable operations
- [ ] Template variable suggestions

## Support

For issues or questions about the Universal Prompt Editor, contact the development team or review the source code in:
- `features/prompts/components/universal-editor/`

