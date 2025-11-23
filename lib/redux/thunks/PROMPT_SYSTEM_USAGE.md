# Prompt System Usage Guide

## Overview

The new prompt system provides a clean, organized architecture for working with prompts from both `prompts` and `prompt_builtins` tables. It handles fetching, caching, and execution with clear separation of concerns.

## Architecture Layers

### 1. Fetch & Cache Layer
Handles database fetching and cache updates.

### 2. Get Prompt Layer (Cache-First)
Main interface for retrieving prompts. Automatically handles caching and fetching.

### 3. Execute Layer
Core execution logic. No fetching or UI concerns.

---

## Usage Examples

### 1. Fetching Prompts

#### Fetch from 'prompts' table
```typescript
import { fetchPrompt } from '@/lib/redux/thunks/promptSystemThunks';

// Basic fetch (will cache automatically)
const result = await dispatch(fetchPrompt({ 
  promptId: 'text-analyzer' 
})).unwrap();

// Force fetch (skip cache)
const result = await dispatch(fetchPrompt({ 
  promptId: 'text-analyzer',
  forceFetch: true 
})).unwrap();
```

#### Fetch from 'prompt_builtins' table
```typescript
import { fetchBuiltinPrompt } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(fetchBuiltinPrompt({ 
  promptId: 'code-reviewer' 
})).unwrap();
```

#### Fetch from either table (unified)
```typescript
import { fetchPromptFromTable } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(fetchPromptFromTable({ 
  promptId: 'my-prompt',
  source: 'prompts' // or 'prompt_builtins'
})).unwrap();
```

---

### 2. Getting Prompts (Cache-First - Recommended)

**This is the main interface for the application layer.**

#### Get user prompt
```typescript
import { getUserPrompt } from '@/lib/redux/thunks/promptSystemThunks';

// Check cache first, fetch if not cached
const result = await dispatch(getUserPrompt({ 
  promptId: 'text-analyzer' 
})).unwrap();

const promptData = result.promptData; // Use this for execution
const fromCache = result.fromCache;   // true if from cache
```

#### Get builtin prompt
```typescript
import { getBuiltinPrompt } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(getBuiltinPrompt({ 
  promptId: 'code-reviewer' 
})).unwrap();
```

#### Get from either source
```typescript
import { getPrompt } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(getPrompt({ 
  promptId: 'my-prompt',
  source: 'prompts' // or 'prompt_builtins'
})).unwrap();

// Allow stale cache (don't refetch if marked as stale)
const result = await dispatch(getPrompt({ 
  promptId: 'my-prompt',
  source: 'prompts',
  allowStale: true 
})).unwrap();
```

---

### 3. Executing Prompts

#### Execute user prompt
```typescript
import { executeUserPrompt } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(executeUserPrompt({
  promptId: 'text-analyzer',
  variables: { 
    text: 'Hello world',
    tone: 'professional' 
  },
  initialMessage: 'Please analyze this text'
})).unwrap();

console.log(result.response);     // AI response text
console.log(result.taskId);       // Task ID for tracking
console.log(result.metadata);     // Performance metrics
```

#### Execute builtin prompt
```typescript
import { executeBuiltinPrompt } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(executeBuiltinPrompt({
  promptId: 'code-reviewer',
  variables: { 
    code: 'function test() { return true; }' 
  }
})).unwrap();
```

#### Execute with context message
```typescript
import { executeUserPrompt } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(executeUserPrompt({
  promptId: 'text-analyzer',
  variables: { text: 'Hello world' },
  contextMessage: 'The user is analyzing marketing copy for a tech startup',
  initialMessage: 'Analyze this text for clarity and impact'
})).unwrap();

// Message order will be:
// 1. System message (from prompt)
// 2. Context message (user role)
// 3. Initial message (user role)
```

#### Execute with model overrides
```typescript
import { executeUserPrompt } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(executeUserPrompt({
  promptId: 'text-analyzer',
  variables: { text: 'Hello' },
  modelOverrides: {
    temperature: 0.3,
    max_tokens: 2000,
    model_id: 'gpt-4-turbo'
  }
})).unwrap();
```

#### Execute from either source
```typescript
import { executePromptById } from '@/lib/redux/thunks/promptSystemThunks';

const result = await dispatch(executePromptById({
  promptId: 'my-prompt',
  source: 'prompts', // or 'prompt_builtins'
  variables: { key: 'value' },
  initialMessage: 'Run this prompt'
})).unwrap();
```

---

## Complete Workflow Example

```typescript
import { 
  getPrompt, 
  executePromptById 
} from '@/lib/redux/thunks/promptSystemThunks';

// In a component or service
async function analyzeText(text: string) {
  try {
    // 1. Get the prompt (cache-first, auto-fetches if needed)
    const { promptData } = await dispatch(getPrompt({
      promptId: 'text-analyzer',
      source: 'prompts'
    })).unwrap();
    
    console.log('Prompt loaded:', promptData.name);
    
    // 2. Execute the prompt
    const result = await dispatch(executePromptById({
      promptId: 'text-analyzer',
      source: 'prompts',
      variables: { text },
      contextMessage: 'User needs professional tone analysis',
      initialMessage: 'Analyze the tone and suggest improvements'
    })).unwrap();
    
    console.log('Analysis:', result.response);
    console.log('Took:', result.metadata?.totalTime, 'ms');
    
    return result;
    
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}
```

---

## Key Benefits

### For Application Developers
- **Simple API**: Call `getPrompt` or `executePrompt` - that's it
- **No Cache Management**: Redux handles caching automatically
- **No Fetching Logic**: Just get/execute, system handles the rest
- **Consistent Behavior**: Same API for all prompt types

### For System Maintainers
- **Single Source of Truth**: All fetch logic in one place
- **Clear Separation**: Fetch → Get → Execute layers
- **Easy Testing**: Each layer can be tested independently
- **Reusable Logic**: Core logic shared across all prompt types

---

## Migration from Old System

### Old Way
```typescript
// Had to manually check cache
const cached = selectCachedPrompt(state, promptId);
if (!cached) {
  await dispatch(openPrompt({ promptId }));
}
// Then execute somehow...
```

### New Way
```typescript
// Just execute - system handles everything
const result = await dispatch(executeUserPrompt({
  promptId: 'text-analyzer',
  variables: { text: 'Hello' }
})).unwrap();
```

---

## Best Practices

1. **Use Get Layer in UI**: When showing prompt details before execution
   ```typescript
   const { promptData } = await dispatch(getUserPrompt({ promptId })).unwrap();
   // Show promptData.name, description, etc.
   ```

2. **Use Execute Layer for Direct Execution**: When running prompts programmatically
   ```typescript
   const result = await dispatch(executeUserPrompt({ 
     promptId, 
     variables 
   })).unwrap();
   ```

3. **Use Source-Specific Wrappers**: Prefer `getUserPrompt` over `getPrompt` for clarity
   ```typescript
   // Good - Clear intent
   await dispatch(getUserPrompt({ promptId }));
   
   // Less clear
   await dispatch(getPrompt({ promptId, source: 'prompts' }));
   ```

4. **Handle Errors Properly**:
   ```typescript
   try {
     const result = await dispatch(executeUserPrompt({ ... })).unwrap();
   } catch (error) {
     console.error('Execution failed:', error);
     // Show error to user
   }
   ```

---

## TypeScript Types

All types are exported from `promptSystemThunks.ts`:

```typescript
import type {
  PromptSource,
  FetchPromptPayload,
  FetchPromptResult,
  GetPromptPayload,
  ExecutePromptPayload,
  ExecutePromptResult,
} from '@/lib/redux/thunks/promptSystemThunks';
```

---

## Testing

```typescript
import { executeUserPrompt } from '@/lib/redux/thunks/promptSystemThunks';

// Mock test
it('should execute prompt with variables', async () => {
  const result = await store.dispatch(executeUserPrompt({
    promptId: 'test-prompt',
    variables: { foo: 'bar' },
    initialMessage: 'Test message'
  })).unwrap();
  
  expect(result.response).toBeDefined();
  expect(result.taskId).toBeDefined();
  expect(result.promptId).toBe('test-prompt');
});
```

