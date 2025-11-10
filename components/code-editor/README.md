# AI Code Editor System

A complete AI-powered code editing system with SEARCH/REPLACE blocks, diff viewing, and confirmation.

## Features

- ✅ **AI-Powered Editing**: Uses your configured prompts to generate precise code changes
- ✅ **SEARCH/REPLACE Format**: Structured format that ensures accurate code modifications
- ✅ **Diff Viewing**: See before/after comparisons with syntax highlighting
- ✅ **Validation**: Ensures search patterns exist and are unique before applying
- ✅ **Multiple Prompts**: Support for context-specific prompts (generic vs specialized)
- ✅ **Streaming**: Real-time response streaming from AI
- ✅ **Error Handling**: Comprehensive error messages and recovery

## Usage

### Basic Usage

```typescript
import { AICodeEditorModal } from '@/components/code-editor/AICodeEditorModal';

function MyComponent() {
  const [code, setCode] = useState('// your code here');
  const [showEditor, setShowEditor] = useState(false);

  return (
    <>
      <Button onClick={() => setShowEditor(true)}>
        Edit with AI
      </Button>

      <AICodeEditorModal
        open={showEditor}
        onOpenChange={setShowEditor}
        currentCode={code}
        language="typescript"
        promptContext="generic" // or "prompt-app-ui"
        onCodeChange={(newCode) => setCode(newCode)}
      />
    </>
  );
}
```

### With Custom Prompt

```typescript
<AICodeEditorModal
  open={showEditor}
  onOpenChange={setShowEditor}
  currentCode={code}
  language="python"
  promptId="your-custom-prompt-id"
  onCodeChange={(newCode) => setCode(newCode)}
  title="Python Code Optimizer"
  description="Describe how you want to optimize this Python code"
/>
```

### Available Prompt Contexts

- `generic`: General-purpose code editing for any language
- `prompt-app-ui`: Specialized for React components in Prompt Apps

To add more contexts, edit `utils/code-editor/codeEditorPrompts.ts`

## Architecture

### Components

**AICodeEditorModal** (`components/code-editor/AICodeEditorModal.tsx`)
- Main modal component
- Handles user input, prompt execution, and change confirmation
- Manages the full workflow from input → processing → review → apply

### Utilities

**parseCodeEdits** (`utils/code-editor/parseCodeEdits.ts`)
- Extracts SEARCH/REPLACE blocks from AI responses
- Validates edit structure
- Returns structured `CodeEdit` objects

**applyCodeEdits** (`utils/code-editor/applyCodeEdits.ts`)
- Applies SEARCH/REPLACE operations to code
- Validates uniqueness of search patterns
- Returns modified code or errors

**generateDiff** (`utils/code-editor/generateDiff.ts`)
- Creates unified diff view
- Calculates addition/deletion statistics
- Formats diffs for display

**codeEditorPrompts** (`utils/code-editor/codeEditorPrompts.ts`)
- Centralized prompt configuration
- Maps contexts to prompt IDs
- Makes it easy to add new prompts

## Workflow

1. **User Input**: User describes desired changes in natural language
2. **Processing**: Modal executes configured prompt with current code
3. **Parsing**: AI response is parsed to extract SEARCH/REPLACE blocks
4. **Validation**: Searches are validated against current code
5. **Application**: Changes are applied to generate preview
6. **Review**: User sees diff view and can review changes
7. **Confirmation**: User approves or cancels changes
8. **Complete**: Changes are applied to parent component

## AI Response Format

The AI must return responses in this format:

```
SEARCH:
<<<
[exact code to find]
>>>

REPLACE:
<<<
[replacement code]
>>>
```

### Multiple Changes

```
SEARCH:
<<<
const [count, setCount] = useState(0);
>>>

REPLACE:
<<<
const [count, setCount] = useState(0);
const [loading, setLoading] = useState(false);
>>>

---

SEARCH:
<<<
<button onClick={handleClick}>
  Click me
</button>
>>>

REPLACE:
<<<
<button onClick={handleClick} disabled={loading}>
  {loading ? 'Loading...' : 'Click me'}
</button>
>>>
```

## Creating Custom Prompts

### 1. Create the Prompt in your system

Example system message for code editing:

```
You are a code editor assistant. When the user requests changes:
1. Analyze the provided code
2. Provide changes in SEARCH/REPLACE format
3. Explain each change briefly

Format:
SEARCH:
<<<
[exact code to find - must match perfectly including whitespace]
>>>

REPLACE:
<<<
[complete replacement code]
>>>

Rules:
- Include enough context to make searches unique
- Match whitespace exactly
- One change per SEARCH/REPLACE block
- Separate multiple blocks with ---
```

### 2. Add to Configuration

Edit `utils/code-editor/codeEditorPrompts.ts`:

```typescript
export const CODE_EDITOR_PROMPTS = {
  // ... existing prompts
  MY_CUSTOM_EDITOR: {
    id: 'your-prompt-id-here',
    name: 'My Custom Code Editor',
    description: 'Description of what it does',
    useCase: 'my-custom-context',
  },
} as const;
```

### 3. Update Context Type

In `codeEditorPrompts.ts`, update the `getCodeEditorPromptId` function:

```typescript
export function getCodeEditorPromptId(
  context: 'prompt-app-ui' | 'generic' | 'my-custom-context' | string
): string {
  switch (context) {
    case 'my-custom-context':
      return CODE_EDITOR_PROMPTS.MY_CUSTOM_EDITOR.id;
    // ... other cases
  }
}
```

### 4. Use It

```typescript
<AICodeEditorModal
  promptContext="my-custom-context"
  // ... other props
/>
```

## Integration Examples

### In a Code Editor Component

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { AICodeEditorModal } from '@/components/code-editor/AICodeEditorModal';
import CodeBlock from '@/components/mardown-display/code/CodeBlock';

export function MyCodeEditor() {
  const [code, setCode] = useState('function hello() {\n  console.log("world");\n}');
  const [showAI, setShowAI] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2>Code Editor</h2>
        <Button onClick={() => setShowAI(true)} variant="outline" size="sm">
          <Sparkles className="w-4 h-4 mr-2" />
          AI Edit
        </Button>
      </div>

      <CodeBlock
        code={code}
        language="javascript"
        onCodeChange={setCode}
      />

      <AICodeEditorModal
        open={showAI}
        onOpenChange={setShowAI}
        currentCode={code}
        language="javascript"
        promptContext="generic"
        onCodeChange={setCode}
      />
    </div>
  );
}
```

### In a Form Component

```typescript
// For editing configuration code, SQL queries, etc.
<AICodeEditorModal
  open={showEditor}
  onOpenChange={setShowEditor}
  currentCode={sqlQuery}
  language="sql"
  promptContext="generic"
  onCodeChange={setSqlQuery}
  title="SQL Query Editor"
  description="Describe how to modify this SQL query"
/>
```

## Troubleshooting

### "Search block not found in code"

**Cause**: The AI's SEARCH block doesn't exactly match any part of your code
**Solution**: The SEARCH text must match character-for-character, including whitespace

### "Multiple matches found"

**Cause**: The SEARCH block appears more than once in the code
**Solution**: Include more surrounding context in the SEARCH block to make it unique

### "No valid SEARCH/REPLACE blocks found"

**Cause**: The AI response doesn't follow the expected format
**Solution**: Check your prompt's system message to ensure it instructs the AI on the format

### Response is slow

**Cause**: Large code files take longer to process
**Solution**: Consider:
- Using a faster model
- Breaking code into smaller chunks
- Optimizing the prompt to be more concise

## Best Practices

1. **Include Context**: More context in SEARCH blocks = more reliable matches
2. **Test Prompts**: Test your custom prompts with various code samples
3. **Handle Errors**: Always provide clear error messages to users
4. **Preview Changes**: Always show diffs before applying changes
5. **Keep Prompts Updated**: Update prompt instructions based on common failure modes

## Future Enhancements

Potential improvements:
- [ ] Support for multi-file edits
- [ ] Undo/redo functionality
- [ ] History of AI edits
- [ ] AI suggestions without user prompt
- [ ] Integration with git for commit messages
- [ ] Batch operations on multiple files
- [ ] Custom diff algorithms (Myers, patience, histogram)

