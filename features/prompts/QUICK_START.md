# Quick Start Guide - Programmatic Prompt Execution

Get started with the programmatic prompt execution system in 5 minutes.

## Installation

No installation needed! The system is already integrated into your AI Matrx application.

## Basic Usage

### 1. As a Button

The simplest way to use the system - just add a button:

```tsx
import { PromptExecutionButton } from '@/features/prompts';
import { Sparkles } from 'lucide-react';

export function MyFeature() {
  return (
    <PromptExecutionButton
      config={{
        promptId: 'your-prompt-id-from-database',
        variables: {
          topic: { type: 'hardcoded', value: 'AI' }
        }
      }}
      label="Generate"
      icon={Sparkles}
    />
  );
}
```

### 2. With Custom Logic

Use the hook for more control:

```tsx
import { usePromptExecution } from '@/features/prompts';

export function MyFeature() {
  const { execute, isExecuting } = usePromptExecution();

  const handleClick = async () => {
    const result = await execute({
      promptId: 'your-prompt-id',
      variables: {
        name: { type: 'hardcoded', value: 'John' }
      },
      output: {
        type: 'plain-text',
        onComplete: (text) => console.log(text)
      }
    });
  };

  return <button onClick={handleClick}>Execute</button>;
}
```

### 3. As a Context Menu

Add AI capabilities to right-click menus:

```tsx
import { PromptContextMenu } from '@/features/prompts';

export function ContentEditor({ content }) {
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
        }
      ]}
      context={{ content }}
    >
      <div>{content}</div>
    </PromptContextMenu>
  );
}
```

## Common Patterns

### Hard-coded Values

```tsx
variables: {
  topic: { type: 'hardcoded', value: 'TypeScript' }
}
```

### From Component State

```tsx
const [userText, setUserText] = useState('');

// Later in execute:
variables: {
  text: { type: 'hardcoded', value: userText }
}
```

### From Functions

```tsx
variables: {
  timestamp: {
    type: 'runtime',
    getValue: () => new Date().toISOString()
  }
}
```

### From Context

```tsx
// Pass context:
context={{ user: { name: 'John' }, selectedText: 'Hello' }}

// Use in variables:
variables: {
  userName: { type: 'context', path: 'user.name' },
  selection: { type: 'context', path: 'selectedText' }
}
```

## Output Handling

### Show in Canvas

```tsx
output: {
  type: 'canvas',
  options: { title: 'Result' }
}
```

### Handle as Text

```tsx
output: {
  type: 'plain-text',
  onComplete: (text) => {
    // Do something with text
  }
}
```

### Parse as JSON

```tsx
output: {
  type: 'json',
  onComplete: (data) => {
    console.log(data.field);
  }
}
```

### Show Toast

```tsx
output: {
  type: 'toast',
  successMessage: 'Done!'
}
```

## Next Steps

- Read the [full documentation](./README.md)
- Check out the [examples](./examples/)
- Explore the [API reference](./README.md#api-reference)

## Tips

1. **Create reusable prompts** in the database rather than hardcoding
2. **Use context** to pass data from your UI to prompts
3. **Handle errors** with the `onError` callback
4. **Show loading states** using `isExecuting`
5. **Track progress** with the `onProgress` callback

## Common Issues

### Prompt not found
- Verify the promptId exists in your database
- Check that the user has access to the prompt

### Variables not working
- Variable names are case-sensitive
- Ensure they match the `{{variable}}` format in your prompt
- Check that all variables have sources defined

### Execution hangs
- Check browser console for errors
- Verify API route is accessible
- Ensure model configuration is valid

## Need Help?

- Check the [full README](./README.md)
- Look at the [examples](./examples/)
- Review the [prompt runner implementation](../../../app/(authenticated)/ai/prompts/run/[id]/page.tsx)

