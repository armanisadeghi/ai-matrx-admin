# Programmatic Prompt Execution System

A comprehensive system for executing AI prompts programmatically from anywhere in the AI Matrx application.

## Overview

This system allows you to run prompts with flexible input sources and output handlers, making it easy to integrate AI capabilities throughout your app using simple, reusable patterns.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Variable Sources](#variable-sources)
- [Output Handlers](#output-handlers)
- [Components](#components)
- [Examples](#examples)
- [API Reference](#api-reference)

---

## Quick Start

### 1. Simple Button Execution

```tsx
import { PromptExecutionButton } from '@/features/prompts';
import { Sparkles } from 'lucide-react';

export function MyComponent() {
  return (
    <PromptExecutionButton
      config={{
        promptId: 'your-prompt-id',
        variables: {
          topic: { type: 'hardcoded', value: 'TypeScript' }
        }
      }}
      label="Generate Content"
      icon={Sparkles}
    />
  );
}
```

### 2. Using the Hook

```tsx
import { usePromptExecution } from '@/features/prompts';

export function MyComponent() {
  const { execute, isExecuting, result } = usePromptExecution();

  const handleClick = async () => {
    const result = await execute({
      promptId: 'your-prompt-id',
      variables: {
        topic: { type: 'hardcoded', value: 'React' }
      },
      output: {
        type: 'plain-text',
        onComplete: (text) => console.log(text)
      }
    });
  };

  return (
    <button onClick={handleClick} disabled={isExecuting}>
      {isExecuting ? 'Processing...' : 'Execute Prompt'}
    </button>
  );
}
```

### 3. Context Menu Integration

```tsx
import { PromptContextMenu } from '@/features/prompts';
import { FileText, Sparkles } from 'lucide-react';

export function ContentArea({ content }) {
  return (
    <PromptContextMenu
      options={[
        {
          label: 'Summarize',
          icon: FileText,
          config: {
            promptId: 'summarize-prompt-id',
            variables: {
              content: { type: 'context', path: 'text' }
            }
          }
        },
        {
          label: 'Improve',
          icon: Sparkles,
          config: {
            promptId: 'improve-prompt-id',
            variables: {
              text: { type: 'context', path: 'text' }
            }
          }
        }
      ]}
      context={{ text: content }}
    >
      <div className="p-4">{content}</div>
    </PromptContextMenu>
  );
}
```

---

## Core Concepts

### Prompts

Prompts are templates stored in the database with:
- **Messages**: System, user, and assistant messages
- **Variables**: Placeholders like `{{variable_name}}`
- **Settings**: Model configuration (temperature, max tokens, etc.)

### Variable Resolution

Variables can come from multiple sources and are resolved before execution:

```typescript
{
  topic: { type: 'hardcoded', value: 'AI' },
  userName: { type: 'runtime', getValue: () => getUserName() },
  selection: { type: 'context', path: 'selectedText' },
  previousResult: { type: 'previous-result', resultPath: 'data.summary' }
}
```

### Output Handling

Define how to handle execution results:

```typescript
{
  type: 'plain-text',
  onComplete: (text) => {
    // Handle the result
  }
}
```

---

## Variable Sources

### 1. Hardcoded Values

```typescript
{
  topic: { type: 'hardcoded', value: 'TypeScript' }
}
```

### 2. Runtime Functions

```typescript
{
  currentDate: {
    type: 'runtime',
    getValue: () => new Date().toISOString()
  }
}
```

### 3. Async Functions

```typescript
{
  userData: {
    type: 'function',
    fn: async (context) => {
      const data = await fetchUserData();
      return data.name;
    }
  }
}
```

### 4. Context Values

```typescript
// In component:
context={{ selectedText: 'Hello World', user: { name: 'John' } }}

// In config:
{
  text: { type: 'context', path: 'selectedText' },
  name: { type: 'context', path: 'user.name' }
}
```

### 5. Redux State

```typescript
{
  currentTheme: {
    type: 'redux',
    selector: (state) => state.theme.mode
  }
}
```

### 6. Broker Values

```typescript
{
  sharedData: {
    type: 'broker',
    brokerId: 'shared-content'
  }
}
```

### 7. Previous Results

```typescript
{
  summary: {
    type: 'previous-result',
    resultPath: 'text' // or 'data.field'
  }
}
```

### 8. User Input

```typescript
{
  customInput: {
    type: 'user-input',
    prompt: 'Enter your text',
    default: 'Default value'
  }
}
```

---

## Output Handlers

### Plain Text

```typescript
{
  type: 'plain-text',
  onComplete: (text) => {
    console.log(text);
  }
}
```

### Markdown

```typescript
{
  type: 'markdown',
  onComplete: (html) => {
    // Rendered markdown HTML
  }
}
```

### JSON

```typescript
{
  type: 'json',
  schema: { /* optional JSON schema */ },
  onComplete: (data) => {
    console.log(data.field);
  }
}
```

### Streaming

```typescript
{
  type: 'stream',
  onChunk: (chunk) => {
    console.log('Chunk:', chunk);
  },
  onComplete: (fullText) => {
    console.log('Complete:', fullText);
  }
}
```

### Canvas

```typescript
{
  type: 'canvas',
  options: {
    title: 'AI Result',
    type: 'html'
  }
}
```

### Toast Notification

```typescript
{
  type: 'toast',
  successMessage: 'Analysis complete!'
}
```

### Custom Handler

```typescript
{
  type: 'custom',
  handler: async (result) => {
    // Do anything with the result
    await saveToDatabase(result.text);
    updateUI(result.data);
  }
}
```

---

## Components

### PromptExecutionButton

Button component for triggering prompt execution.

```tsx
<PromptExecutionButton
  config={{
    promptId: 'prompt-id',
    variables: { /* ... */ },
    output: { /* ... */ }
  }}
  label="Execute"
  variant="default"
  size="default"
  icon={Sparkles}
  tooltip="Execute AI prompt"
  onExecutionComplete={(result) => {
    console.log('Result:', result);
  }}
/>
```

**Props:**
- `config`: Prompt execution configuration
- `label`: Button text
- `variant`: Button style ('default' | 'outline' | 'ghost' | 'link')
- `size`: Button size ('default' | 'sm' | 'lg' | 'icon')
- `icon`: Lucide icon component
- `tooltip`: Tooltip text
- `disabled`: Whether button is disabled
- `fullWidth`: Make button full width
- `onExecutionStart`: Callback when execution starts
- `onExecutionComplete`: Callback when execution completes

### PromptExecutionIconButton

Icon-only variant for compact UIs.

```tsx
<PromptExecutionIconButton
  config={{ /* ... */ }}
  icon={Sparkles}
  tooltip="Generate content"
/>
```

### PromptContextMenu

Context menu with prompt options.

```tsx
<PromptContextMenu
  options={[
    {
      label: 'Summarize',
      icon: FileText,
      config: { /* ... */ },
      group: 'content',
      visible: true // or (context) => boolean
    }
  ]}
  context={{ /* data for prompts */ }}
>
  <div>Right-click me</div>
</PromptContextMenu>
```

### TextSelectionPromptMenu

Specialized context menu for text selection.

```tsx
<TextSelectionPromptMenu
  options={[
    {
      label: 'Improve Text',
      config: {
        promptId: 'improve-id',
        variables: {
          text: { type: 'context', path: 'selectedText' }
        }
      }
    }
  ]}
>
  <div>Select text and right-click</div>
</TextSelectionPromptMenu>
```

---

## Examples

### Example 1: Content Generation Button

```tsx
import { PromptExecutionButton, createHardcodedMap } from '@/features/prompts';
import { Sparkles } from 'lucide-react';

export function ContentGenerator() {
  return (
    <PromptExecutionButton
      config={{
        promptId: 'content-generator-id',
        variables: createHardcodedMap({
          topic: 'Web Development',
          tone: 'professional',
          length: 'medium'
        }),
        output: {
          type: 'canvas',
          options: { title: 'Generated Content' }
        }
      }}
      label="Generate Content"
      icon={Sparkles}
      variant="default"
    />
  );
}
```

### Example 2: Dynamic Variable from State

```tsx
import { usePrompt } from '@/features/prompts';
import { useState } from 'react';

export function CodeReviewer() {
  const [code, setCode] = useState('');
  const { execute, isExecuting, result } = usePrompt('code-review-id');

  const handleReview = async () => {
    await execute({
      variables: {
        code: { type: 'hardcoded', value: code },
        language: { type: 'hardcoded', value: 'typescript' }
      },
      output: {
        type: 'plain-text',
        onComplete: (review) => {
          console.log('Review:', review);
        }
      }
    });
  };

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={handleReview} disabled={isExecuting}>
        Review Code
      </button>
      {result && <div>{result.text}</div>}
    </div>
  );
}
```

### Example 3: Chained Prompts

```tsx
import { usePromptExecution } from '@/features/prompts';

export function ChainedAnalysis() {
  const { execute } = usePromptExecution();

  const runAnalysis = async (text: string) => {
    // Step 1: Summarize
    const summaryResult = await execute({
      promptId: 'summarize-id',
      variables: {
        text: { type: 'hardcoded', value: text }
      }
    });

    // Step 2: Analyze summary
    const analysisResult = await execute({
      promptId: 'analyze-id',
      variables: {
        content: { type: 'hardcoded', value: summaryResult.text }
      }
    });

    // Step 3: Generate recommendations
    const recommendsResult = await execute({
      promptId: 'recommend-id',
      variables: {
        analysis: { type: 'hardcoded', value: analysisResult.text }
      },
      output: {
        type: 'json',
        onComplete: (data) => {
          console.log('Recommendations:', data);
        }
      }
    });

    return recommendsResult;
  };

  return <button onClick={() => runAnalysis('...')}>Run Analysis</button>;
}
```

### Example 4: Context Menu with Selection

```tsx
import { TextSelectionPromptMenu } from '@/features/prompts';
import { FileText, Sparkles, Languages } from 'lucide-react';

export function ArticleEditor({ article }) {
  return (
    <TextSelectionPromptMenu
      options={[
        {
          label: 'Summarize Selection',
          icon: FileText,
          config: {
            promptId: 'summarize-id',
            variables: {
              text: { type: 'context', path: 'selectedText' }
            },
            output: { type: 'canvas' }
          }
        },
        {
          label: 'Improve Writing',
          icon: Sparkles,
          config: {
            promptId: 'improve-id',
            variables: {
              text: { type: 'context', path: 'selectedText' }
            }
          }
        },
        {
          label: 'Translate',
          icon: Languages,
          group: 'translation',
          config: {
            promptId: 'translate-id',
            variables: {
              text: { type: 'context', path: 'selectedText' },
              targetLang: { type: 'hardcoded', value: 'Spanish' }
            }
          }
        }
      ]}
    >
      <div className="prose">{article}</div>
    </TextSelectionPromptMenu>
  );
}
```

### Example 5: Progress Tracking

```tsx
import { usePromptExecution } from '@/features/prompts';
import { useState } from 'react';

export function ProgressExample() {
  const { execute, progress, isExecuting } = usePromptExecution();
  const [streamedText, setStreamedText] = useState('');

  const handleExecute = async () => {
    await execute({
      promptId: 'analysis-id',
      variables: { /* ... */ },
      onProgress: (progress) => {
        console.log('Status:', progress.status);
        if (progress.streamedText) {
          setStreamedText(progress.streamedText);
        }
      }
    });
  };

  return (
    <div>
      <button onClick={handleExecute}>Execute</button>
      {isExecuting && (
        <div>
          <p>Status: {progress?.status}</p>
          <p>Message: {progress?.message}</p>
          <div>{streamedText}</div>
        </div>
      )}
    </div>
  );
}
```

---

## API Reference

### Types

See `features/prompts/types/execution.ts` for complete type definitions.

### Hooks

#### `usePromptExecution()`

Main hook for prompt execution.

**Returns:**
- `execute(config)` - Execute a prompt
- `isExecuting` - Whether currently executing
- `progress` - Current progress state
- `result` - Latest execution result
- `error` - Latest error
- `reset()` - Reset state
- `cancel()` - Cancel execution

#### `usePrompt(promptId, baseConfig)`

Pre-configured hook for a specific prompt.

**Returns:** Same as `usePromptExecution()` but with simplified `execute(overrides)`.

### Services

#### `executePrompt(config)`

One-off prompt execution function.

```typescript
const result = await executePrompt({
  promptId: 'my-prompt',
  variables: { /* ... */ }
});
```

---

## Best Practices

1. **Reuse Prompts**: Create reusable prompts in the database rather than hardcoding
2. **Type Safety**: Use TypeScript for variable source maps
3. **Error Handling**: Always provide `onError` callback for production
4. **Loading States**: Use `isExecuting` to show loading UI
5. **Context Data**: Keep context objects clean and well-structured
6. **Variable Naming**: Use clear, descriptive variable names in prompts
7. **Output Handlers**: Choose appropriate output handlers for your use case

---

## Troubleshooting

### Variables Not Resolving

- Check that variable names match exactly (case-sensitive)
- Ensure context path is correct
- Verify variable sources are properly configured

### Execution Fails

- Verify prompt ID exists in database
- Check that all required variables have sources
- Ensure model configuration is valid
- Check browser console for detailed errors

### Streaming Issues

- Verify API route is configured correctly
- Check that model supports streaming
- Ensure network connection is stable

---

## Contributing

When adding new features to the prompt execution system:

1. Update types in `types/execution.ts`
2. Add tests for new functionality
3. Update this documentation
4. Provide examples in the examples section

---

## License

Part of the AI Matrx application.

