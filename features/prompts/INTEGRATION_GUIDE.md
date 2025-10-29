# Integration Guide - Adding Programmatic Prompts to Your Features

This guide shows you how to add AI prompt capabilities to existing features in AI Matrx.

## Prerequisites

1. Have prompts created in the database (via `/ai/prompts`)
2. Know the prompt IDs you want to use
3. Understand what variables your prompts need

## Step-by-Step Integration

### Step 1: Identify Where to Add AI

Common places to add prompt execution:
- ✅ Toolbar buttons
- ✅ Context menus
- ✅ Action panels
- ✅ Form submissions
- ✅ Page headers
- ✅ Card footers

### Step 2: Choose Your Approach

#### Option A: Button Component (Recommended for most cases)

```tsx
import { PromptExecutionButton } from '@/features/prompts';
import { Sparkles } from 'lucide-react';

export function MyFeature() {
  const [content, setContent] = useState('');

  return (
    <div>
      {/* Your existing UI */}
      <PromptExecutionButton
        config={{
          promptId: 'your-prompt-id',
          variables: {
            content: { type: 'hardcoded', value: content }
          },
          output: { type: 'canvas' }
        }}
        label="AI Enhance"
        icon={Sparkles}
      />
    </div>
  );
}
```

#### Option B: Hook (For custom logic)

```tsx
import { usePromptExecution } from '@/features/prompts';

export function MyFeature() {
  const { execute, isExecuting } = usePromptExecution();
  const [content, setContent] = useState('');

  const handleAIProcess = async () => {
    const result = await execute({
      promptId: 'your-prompt-id',
      variables: {
        content: { type: 'hardcoded', value: content }
      },
      output: {
        type: 'plain-text',
        onComplete: (text) => {
          setContent(text); // Update your state
        }
      }
    });
  };

  return (
    <button onClick={handleAIProcess} disabled={isExecuting}>
      Process with AI
    </button>
  );
}
```

#### Option C: Context Menu (For right-click actions)

```tsx
import { PromptContextMenu } from '@/features/prompts';

export function MyFeature() {
  const [content, setContent] = useState('');

  return (
    <PromptContextMenu
      options={[
        {
          label: 'Summarize',
          config: {
            promptId: 'summarize-prompt-id',
            variables: {
              text: { type: 'context', path: 'content' }
            }
          }
        },
        {
          label: 'Improve',
          config: {
            promptId: 'improve-prompt-id',
            variables: {
              text: { type: 'context', path: 'content' }
            }
          }
        }
      ]}
      context={{ content }}
    >
      <div className="p-4">{content}</div>
    </PromptContextMenu>
  );
}
```

## Real-World Integration Examples

### Example 1: Notes Feature

Add AI capabilities to the notes feature:

```tsx
// app/(authenticated)/notes/components/NoteEditor.tsx
import { PromptExecutionButton } from '@/features/prompts';
import { Sparkles, FileText, Languages } from 'lucide-react';

export function NoteEditor({ note, onUpdate }) {
  return (
    <div className="space-y-4">
      {/* Existing editor */}
      <textarea value={note.content} onChange={...} />
      
      {/* AI Actions */}
      <div className="flex gap-2">
        <PromptExecutionButton
          config={{
            promptId: 'improve-writing',
            variables: {
              text: { type: 'hardcoded', value: note.content }
            },
            output: {
              type: 'plain-text',
              onComplete: (improved) => {
                onUpdate({ ...note, content: improved });
              }
            }
          }}
          label="Improve"
          icon={Sparkles}
          size="sm"
        />
        
        <PromptExecutionButton
          config={{
            promptId: 'summarize-text',
            variables: {
              text: { type: 'hardcoded', value: note.content }
            },
            output: { type: 'canvas' }
          }}
          label="Summarize"
          icon={FileText}
          size="sm"
          variant="outline"
        />
      </div>
    </div>
  );
}
```

### Example 2: File Manager

Add AI analysis to file content:

```tsx
// components/FileManager/FileActions.tsx
import { usePromptExecution } from '@/features/prompts';

export function FileActions({ file, fileContent }) {
  const { execute } = usePromptExecution();

  const analyzeFile = async () => {
    await execute({
      promptId: 'analyze-file-content',
      variables: {
        filename: { type: 'hardcoded', value: file.name },
        content: { type: 'hardcoded', value: fileContent },
        fileType: { type: 'hardcoded', value: file.type }
      },
      output: {
        type: 'canvas',
        options: { title: `Analysis: ${file.name}` }
      }
    });
  };

  return <button onClick={analyzeFile}>Analyze with AI</button>;
}
```

### Example 3: Workflows

Add AI nodes to workflows:

```tsx
// features/workflows/components/AIPromptNode.tsx
import { usePrompt } from '@/features/prompts';

export function AIPromptNode({ nodeData, onOutputChange }) {
  const { execute } = usePrompt(nodeData.promptId);

  const handleExecute = async (inputs: Record<string, string>) => {
    // Convert inputs to variable sources
    const variables = Object.entries(inputs).reduce((acc, [key, value]) => {
      acc[key] = { type: 'hardcoded', value };
      return acc;
    }, {} as VariableSourceMap);

    const result = await execute({
      variables,
      output: {
        type: 'plain-text',
        onComplete: (text) => {
          onOutputChange({ result: text });
        }
      }
    });
  };

  return <div>AI Node: {nodeData.promptName}</div>;
}
```

### Example 4: Chat Enhancement

Add quick AI actions to chat:

```tsx
// features/chat/components/MessageActions.tsx
import { PromptContextMenu } from '@/features/prompts';
import { Sparkles, Languages, FileText } from 'lucide-react';

export function MessageActions({ message }) {
  return (
    <PromptContextMenu
      options={[
        {
          label: 'Translate',
          icon: Languages,
          config: {
            promptId: 'translate-text',
            variables: {
              text: { type: 'context', path: 'message' },
              targetLang: { type: 'hardcoded', value: 'Spanish' }
            }
          }
        },
        {
          label: 'Summarize',
          icon: FileText,
          config: {
            promptId: 'summarize-text',
            variables: {
              text: { type: 'context', path: 'message' }
            }
          }
        },
        {
          label: 'Expand',
          icon: Sparkles,
          config: {
            promptId: 'expand-text',
            variables: {
              text: { type: 'context', path: 'message' }
            }
          }
        }
      ]}
      context={{ message: message.content }}
    >
      <div className="message">{message.content}</div>
    </PromptContextMenu>
  );
}
```

## Variable Source Patterns

### Pattern 1: Component State

```tsx
const [text, setText] = useState('');

// Use in prompt:
variables: {
  content: { type: 'hardcoded', value: text }
}
```

### Pattern 2: Props

```tsx
function MyComponent({ userId, userEmail }) {
  return (
    <PromptExecutionButton
      config={{
        promptId: 'personalized-prompt',
        variables: {
          userId: { type: 'hardcoded', value: userId },
          email: { type: 'hardcoded', value: userEmail }
        }
      }}
    />
  );
}
```

### Pattern 3: Runtime Functions

```tsx
variables: {
  currentDate: {
    type: 'runtime',
    getValue: () => new Date().toLocaleDateString()
  },
  randomId: {
    type: 'runtime',
    getValue: () => Math.random().toString(36)
  }
}
```

### Pattern 4: Async Data

```tsx
variables: {
  userData: {
    type: 'function',
    fn: async () => {
      const data = await fetchUserData();
      return data.preferences;
    }
  }
}
```

### Pattern 5: Redux State

```tsx
variables: {
  theme: {
    type: 'redux',
    selector: (state) => state.theme.mode
  },
  currentUser: {
    type: 'redux',
    selector: (state) => state.auth.user?.name || 'Guest'
  }
}
```

## Output Handler Patterns

### Pattern 1: Update Component State

```tsx
const [result, setResult] = useState('');

output: {
  type: 'plain-text',
  onComplete: (text) => setResult(text)
}
```

### Pattern 2: Show in Canvas

```tsx
output: {
  type: 'canvas',
  options: {
    title: 'AI Result',
    type: 'html'
  }
}
```

### Pattern 3: Parse and Use JSON

```tsx
output: {
  type: 'json',
  onComplete: (data) => {
    setTitle(data.title);
    setDescription(data.description);
    setKeywords(data.keywords);
  }
}
```

### Pattern 4: Stream to UI

```tsx
const [streamedText, setStreamedText] = useState('');

output: {
  type: 'stream',
  onChunk: (chunk) => {
    setStreamedText(prev => prev + chunk);
  },
  onComplete: (fullText) => {
    saveToDatabase(fullText);
  }
}
```

### Pattern 5: Silent Execution with Toast

```tsx
output: {
  type: 'custom',
  handler: async (result) => {
    await saveToDatabase(result.text);
    toast.success('AI processing complete!');
  }
}
```

## Best Practices

### 1. Create Reusable Prompts

Instead of creating many similar prompts, create one flexible prompt:

```
System: You are a helpful writing assistant.

User: Improve the following text for {{tone}} communication:

{{text}}
```

Then use different values for `tone`:

```tsx
// Professional version
variables: {
  text: { type: 'hardcoded', value: content },
  tone: { type: 'hardcoded', value: 'professional' }
}

// Casual version
variables: {
  text: { type: 'hardcoded', value: content },
  tone: { type: 'hardcoded', value: 'casual' }
}
```

### 2. Handle Loading States

```tsx
const { execute, isExecuting } = usePromptExecution();

return (
  <div>
    <button onClick={handleExecute} disabled={isExecuting}>
      {isExecuting ? 'Processing...' : 'Execute'}
    </button>
    
    {isExecuting && (
      <div className="text-sm text-gray-500">
        AI is thinking...
      </div>
    )}
  </div>
);
```

### 3. Provide User Feedback

```tsx
const handleExecute = async () => {
  const result = await execute({
    promptId: 'my-prompt',
    variables: { /* ... */ },
    onProgress: (progress) => {
      console.log(progress.status, progress.message);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });
  
  if (result.success) {
    toast.success('AI processing complete!');
  }
};
```

### 4. Chain Prompts for Complex Tasks

```tsx
const runComplexTask = async (input: string) => {
  // Step 1: Extract key info
  const extraction = await execute({
    promptId: 'extract-info',
    variables: { text: { type: 'hardcoded', value: input } }
  });
  
  // Step 2: Analyze extracted info
  const analysis = await execute({
    promptId: 'analyze-info',
    variables: { 
      info: { type: 'hardcoded', value: extraction.text }
    }
  });
  
  // Step 3: Generate recommendations
  const recommendations = await execute({
    promptId: 'generate-recommendations',
    variables: {
      analysis: { type: 'hardcoded', value: analysis.text }
    }
  });
  
  return recommendations;
};
```

### 5. Use Context for Dynamic Data

```tsx
<PromptContextMenu
  options={menuOptions}
  context={{
    documentId,
    documentTitle,
    selectedText: getSelection(),
    userRole,
    timestamp: new Date().toISOString()
  }}
>
  {children}
</PromptContextMenu>
```

## Testing Your Integration

### 1. Test with Real Data

```tsx
// Don't just test with "test" - use real content
const testContent = `
This is a real paragraph with actual content that represents
what users will actually be inputting into the system. It should
be long enough to test the AI's capabilities properly.
`;
```

### 2. Test Error Cases

```tsx
// Invalid prompt ID
await execute({ promptId: 'non-existent', ... });

// Missing variables
await execute({ 
  promptId: 'valid-id',
  variables: {} // Missing required variables
});

// Network issues
// Disconnect network and try execution
```

### 3. Test Loading States

- Verify loading indicators appear
- Ensure buttons are disabled during execution
- Check that progress updates work
- Confirm completion feedback is shown

## Common Issues & Solutions

### Issue: Variables not working
**Solution:** Check that variable names match exactly (case-sensitive)

### Issue: Prompt not executing
**Solution:** Verify prompt ID exists and user has access

### Issue: Output not appearing
**Solution:** Check output handler configuration and callbacks

### Issue: Slow execution
**Solution:** Ensure streaming is enabled, check network

### Issue: Memory leaks
**Solution:** Use proper cleanup in useEffect hooks

## Migration Guide

### Replacing Old AI Calls

If you have existing AI implementation:

```tsx
// OLD:
const response = await fetch('/api/ai-generate', {
  method: 'POST',
  body: JSON.stringify({ prompt: 'Generate...', content })
});

// NEW:
await execute({
  promptId: 'generate-content',
  variables: {
    content: { type: 'hardcoded', value: content }
  }
});
```

## Checklist for Integration

- [ ] Identify where to add AI capabilities
- [ ] Create or identify prompts to use
- [ ] Decide on variable sources
- [ ] Choose output handler
- [ ] Add button/hook/context menu
- [ ] Test with real data
- [ ] Handle loading states
- [ ] Handle errors
- [ ] Add user feedback
- [ ] Test edge cases

## Next Steps

1. Start with simple button integration
2. Test with one or two prompts
3. Expand to more features
4. Add context menus where appropriate
5. Build complex workflows as needed

## Need Help?

- Review the [examples](./examples/)
- Check the [README](./README.md)
- Look at [PromptRunner](../../../app/(authenticated)/ai/prompts/run/[id]/page.tsx) for reference
- Test with the [Quick Start guide](./QUICK_START.md)

