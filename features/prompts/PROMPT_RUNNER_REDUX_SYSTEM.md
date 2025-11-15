# Prompt Runner Redux System

## Overview

The Prompt Runner now uses a centralized Redux-based system for modal management and prompt caching. This provides significant benefits:

✅ **Single Modal Instance** - One global modal rendered in `OverlayController`  
✅ **Automatic Caching** - Prompts fetched once, cached for entire session  
✅ **Simple API** - Just call `openPrompt()` from anywhere  
✅ **No Prop Drilling** - No need to pass modal state through components  
✅ **No Local State** - Components don't manage modal state  
✅ **Instant Loading** - Cached prompts open instantly (no loading state)  

---

## Quick Start

### Basic Usage

```tsx
import { usePromptRunner } from '@/features/prompts';

function MyComponent() {
  const { openPrompt, closePrompt, isOpen } = usePromptRunner();

  const handleClick = () => {
    // With prompt ID (auto-caches)
    openPrompt({
      promptId: 'text-analyzer',
      mode: 'auto-run',
      variables: { text: selectedText }
    });
  };

  return <Button onClick={handleClick}>Analyze Text</Button>;
}
```

### With Prompt Data (Skip Cache)

```tsx
const handleClick = () => {
  openPrompt({
    promptData: myPromptObject, // Use existing prompt object
    mode: 'manual',
    variables: { topic: 'AI' }
  });
};
```

---

## Execution Modes

The system supports multiple execution modes for different use cases:

### 1. `auto-run` (Most Common)
- Automatically executes with pre-filled variables
- Allows follow-up conversation
- Shows full chat interface

```tsx
openPrompt({
  promptId: 'summarizer',
  mode: 'auto-run',
  variables: { text: selectedText }
});
```

### 2. `auto-run-one-shot`
- Automatically executes
- No follow-up conversation (one-and-done)
- User can copy result and close

```tsx
openPrompt({
  promptId: 'quick-formatter',
  mode: 'auto-run-one-shot',
  variables: { code: selectedCode }
});
```

### 3. `manual-with-hidden-variables`
- User adds instructions/message
- Variables are pre-filled but hidden
- Good for contextual prompts

```tsx
openPrompt({
  promptId: 'contextual-helper',
  mode: 'manual-with-hidden-variables',
  variables: { context: pageContext }
});
```

### 4. `manual-with-visible-variables`
- User can edit variables
- User can add instructions
- Full control over inputs

```tsx
openPrompt({
  promptId: 'flexible-analyzer',
  mode: 'manual-with-visible-variables',
  variables: { text: '', style: 'formal' }
});
```

### 5. `manual` (Default)
- Standard prompt runner
- No pre-filled values
- User fills everything

```tsx
openPrompt({
  promptId: 'my-prompt',
  mode: 'manual'
});
```

---

## Architecture

### Redux Slices

#### 1. **promptCacheSlice** - Prompt Caching
```typescript
// State Structure
{
  prompts: {
    [promptId]: {
      id, name, messages, variables, settings,
      fetchedAt, status
    }
  },
  fetchStatus: {
    [promptId]: 'idle' | 'loading' | 'success' | 'error'
  }
}
```

**Actions:**
- `cachePrompt(prompt)` - Add/update prompt in cache
- `setFetchStatus(promptId, status)` - Update fetch status
- `removePrompt(promptId)` - Remove from cache
- `clearCache()` - Clear all cached prompts

**Selectors:**
- `selectCachedPrompt(state, promptId)` - Get cached prompt
- `selectIsPromptCached(state, promptId)` - Check if cached
- `selectPromptFetchStatus(state, promptId)` - Get fetch status

#### 2. **promptRunnerSlice** - Modal Management
```typescript
// State Structure
{
  activeModal: {
    isOpen: boolean,
    config: PromptRunnerModalConfig | null,
    taskId: string | null,
    openedAt: number | null
  }
}
```

**Actions:**
- `openPromptModal(config)` - Open modal with config
- `closePromptModal()` - Close active modal
- `setPromptTaskId(taskId)` - Set Socket.IO task ID
- `updatePromptConfig(partialConfig)` - Update modal config

**Selectors:**
- `selectIsPromptModalOpen(state)` - Is modal open?
- `selectPromptModalConfig(state)` - Get modal config
- `selectPromptModalTaskId(state)` - Get task ID

### Smart Thunk

#### `openPrompt(config)` - Intelligent Prompt Opening

This thunk handles the entire flow:

1. **Check if `promptData` provided** → Use it directly
2. **If `promptId` provided**:
   - Check cache first
   - Use cached version if available (instant!)
   - Fetch from database only if not cached
   - Cache the result for future use
3. **Open modal** with resolved prompt data

```typescript
// The thunk you dispatch
dispatch(openPrompt({
  promptId: 'text-analyzer',
  mode: 'auto-run',
  variables: { text: selectedText }
}));
```

### usePromptRunner Hook

Simple hook that wraps the Redux actions:

```typescript
export function usePromptRunner() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsPromptModalOpen);
  const config = useAppSelector(selectPromptModalConfig);

  const openPrompt = (config) => dispatch(openPrompt(config));
  const closePrompt = () => dispatch(closePromptModal());

  return { openPrompt, closePrompt, isOpen, config };
}
```

### OverlayController

Single location where `PromptRunnerModal` is rendered:

```tsx
{isPromptModalOpen && promptModalConfig && (
  <PromptRunnerModal
    isOpen={true}
    onClose={handleClosePromptModal}
    {...promptModalConfig}
  />
)}
```

---

## Migration Guide

### Before (Old Way)
```tsx
// ❌ OLD: Local state management
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState(null);

  const handleClick = () => {
    setModalConfig({
      promptId: 'analyzer',
      variables: { text }
    });
    setIsOpen(true);
  };

  return (
    <>
      <Button onClick={handleClick}>Analyze</Button>
      
      {isOpen && (
        <PromptRunnerModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          {...modalConfig}
        />
      )}
    </>
  );
}
```

### After (New Way)
```tsx
// ✅ NEW: Redux-based
function MyComponent() {
  const { openPrompt } = usePromptRunner();

  const handleClick = () => {
    openPrompt({
      promptId: 'analyzer',
      variables: { text }
    });
  };

  return <Button onClick={handleClick}>Analyze</Button>;
}
```

**Benefits:**
- 15 lines → 10 lines
- No modal rendering
- No state management
- Automatic caching
- Cleaner code

---

## Advanced Features

### Pre-fetching Prompts

For commonly used prompts, pre-fetch after login:

```tsx
import { prefetchPrompt } from '@/lib/redux/thunks/openPromptThunk';

// After user login
dispatch(prefetchPrompt('text-analyzer'));
dispatch(prefetchPrompt('code-reviewer'));
dispatch(prefetchPrompt('summarizer'));
```

### Execution Callbacks

Track execution completion via Socket.IO selectors:

```tsx
const taskId = useAppSelector(selectPromptModalTaskId);
const isEnded = useAppSelector(state => 
  selectPrimaryResponseEndedByTaskId(taskId)(state)
);

useEffect(() => {
  if (isEnded) {
    console.log('Execution complete!');
    // Handle completion
  }
}, [isEnded]);
```

### Cache Management

```tsx
import { clearCache, removePrompt } from '@/lib/redux/slices/promptCacheSlice';

// Clear all cached prompts (on logout)
dispatch(clearCache());

// Remove specific prompt
dispatch(removePrompt('old-prompt-id'));
```

---

## Key Components Migrated

✅ **UnifiedContextMenu** - AI Tools section  
✅ **PromptBuilder** - Test modal  
✅ **PromptRunnerModalTester** - Example tester  
✅ **OverlayController** - Global renderer  

---

## Best Practices

### 1. **Use Prompt ID when possible**
```tsx
// ✅ Good - automatic caching
openPrompt({ promptId: 'analyzer', mode: 'auto-run' });

// ⚠️ Only use promptData when necessary
openPrompt({ promptData: customPrompt, mode: 'manual' });
```

### 2. **Choose the right mode**
- Quick actions → `auto-run-one-shot`
- Contextual AI tools → `auto-run`
- User customization → `manual-with-visible-variables`

### 3. **Pre-fill variables**
```tsx
openPrompt({
  promptId: 'analyzer',
  variables: {
    text: selectedText,
    style: 'detailed',
    format: 'markdown'
  }
});
```

### 4. **Don't render PromptRunnerModal**
```tsx
// ❌ Don't do this anymore
<PromptRunnerModal isOpen={isOpen} {...config} />

// ✅ Just call openPrompt
openPrompt(config);
```

---

## Future Enhancements

- 🔄 Multiple simultaneous modals (if needed)
- 📊 Analytics/tracking for prompt usage
- 🔐 Permission-based prompt access
- ⚡ WebSocket-based cache invalidation
- 📦 Prompt versioning support

---

## Questions?

Check the implementation:
- **Hook**: `features/prompts/hooks/usePromptRunner.ts`
- **Slices**: `lib/redux/slices/promptCacheSlice.ts` & `promptRunnerSlice.ts`
- **Thunk**: `lib/redux/thunks/openPromptThunk.ts`
- **Controller**: `components/overlays/OverlayController.tsx`
- **Examples**: `features/prompts/components/modal/PromptRunnerModalTester.tsx`

