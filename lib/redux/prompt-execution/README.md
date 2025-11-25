# Prompt Execution Engine

**Centralized Redux-based system for executing prompts with intelligent caching, variable resolution, and run tracking.**

## Overview

The Prompt Execution Engine is a Redux slice that manages ALL prompt executions in the application. It eliminates closure bugs, provides smart caching, supports multiple concurrent instances, and ensures consistent run tracking.

### Key Features

- ✅ **Single Source of Truth** - All execution state in Redux
- ✅ **Zero Closure Bugs** - Variables always fresh from state
- ✅ **Smart Caching** - Prompts and actions never refetched unnecessarily
- ✅ **Multiple Concurrent Instances** - Run many prompts simultaneously
- ✅ **Scoped Variables** - User/org/project-level auto-population
- ✅ **Guaranteed Run Tracking** - Database persistence built-in
- ✅ **Broker Integration** - Context-aware variable resolution
- ✅ **TypeScript Native** - Fully typed with inference
- ✅ **Optimized Re-renders** - Isolated state maps prevent unnecessary updates

---

## Architecture

### State Structure

The state is designed to minimize re-renders by separating high-frequency update data from stable data:

```typescript
{
  promptExecution: {
    // Core instances (stable - rarely change after creation)
    instances: {
      [runId]: ExecutionInstance
    },
    
    // HIGH-FREQUENCY UPDATE MAPS (isolated for performance)
    currentInputs: {
      [runId]: string  // User typing - changes every keystroke
    },
    resources: {
      [runId]: any[]   // Attachments - changes on user interaction
    },
    uiState: {
      [runId]: {       // UI controls - changes on user interaction
        expandedVariable: string | null,
        showVariables: boolean
      }
    },
    
    // Lookups
    runsByPromptId: {
      [promptId]: string[]
    },
    
    // Session-cached
    scopedVariables: {
      user: Record<string, string> | null,
      org: Record<string, string> | null,
      project: Record<string, string> | null,
      fetchedAt: number | null,
      status: 'idle' | 'loading' | 'loaded' | 'error'
    }
  }
}
```

### Why Isolated State Maps?

**Problem:** When `currentInput` was inside `ExecutionInstance`, every keystroke mutated the instance object reference, causing ALL components subscribing to the instance to re-render.

**Solution:** Moving `currentInput`, `resources`, and `uiState` to top-level maps means:
- Typing in input field only updates `currentInputs[runId]`
- Components using `selectMessages` or `selectInstance` don't re-render
- Each piece of data has its own selector with stable references

```typescript
// ✅ GOOD: Component only re-renders when input changes
const currentInput = useAppSelector(state => selectCurrentInput(state, runId));

// ❌ OLD: Component re-rendered on ANY instance change
const currentInput = instance?.conversation.currentInput; // DON'T DO THIS
```

### Core Concept: Execution Instance (Run)

An **instance** represents a single prompt execution session that may contain multiple messages (conversation). Each instance is identified by a unique `runId` and tracks:

- Configuration & settings
- Variables (user, scoped, computed)
- Message history (only changes during execution)
- Execution state
- Run tracking (links to `ai_runs` table)

**Note:** An instance IS a run - we use `runId` as the primary identifier to align these concepts.

---

## API Reference

### Thunks (Async Actions)

#### `startPromptInstance(payload)`

Creates a new execution instance with cache-aware prompt loading. **Supports both custom prompts and prompt builtins.**

```typescript
// Execute a custom prompt
const runId = await dispatch(startPromptInstance({
  promptId: 'text-analyzer-uuid',
  promptSource: 'prompts', // Optional: defaults to 'prompts'
  executionConfig: {
    auto_run: false,
    allow_chat: true,
    show_variables: true,
    apply_variables: true,
    track_in_runs: true,
  },
  variables: { text: 'Initial value' },
  initialMessage: 'Optional initial user message',
  runId: 'existing-run-id', // Optional: continue existing run
})).unwrap();

// Execute a prompt builtin (recommended approach)
import { createBuiltinConfig } from '@/lib/redux/prompt-execution/builtins';

const builtinRunId = await dispatch(startPromptInstance(
  createBuiltinConfig('prompt-app-auto-create', {
    variables: { input: 'value' },
    executionConfig: { track_in_runs: true },
  })
)).unwrap();
```

**What it does:**
1. Fetches prompt from cache or database
2. Creates execution instance in Redux
3. Initializes isolated state maps (`currentInputs`, `resources`, `uiState`)
4. Returns `runId` for tracking

---

#### `executeMessage(payload)`

Executes a message for an instance (core execution engine).

```typescript
const taskId = await dispatch(executeMessage({
  runId: 'abc-123',
  userInput: 'Optional additional input', // Appends to current input
})).unwrap();
```

**What it does:**
1. Gets fresh state from Redux (eliminates closure bugs!)
2. Reads `currentInput` from isolated map
3. Merges variables from all sources via selectors
4. Replaces variables in ALL messages
5. Creates run in `ai_runs` table (if first message & tracking enabled)
6. Creates task in `ai_tasks` table
7. Submits to socket.io for streaming
8. Clears `currentInput` after sending
9. Returns `taskId`

---

#### `completeExecutionThunk(payload)`

Finalizes execution when streaming completes.

```typescript
await dispatch(completeExecutionThunk({
  runId: 'abc-123',
  responseText: 'AI response text',
  timeToFirstToken: 250,
  totalTime: 1500,
})).unwrap();
```

**What it does:**
1. Adds assistant message to `messages` array
2. Updates `updatedAt` timestamp (only time it's updated!)
3. Completes task in `ai_tasks` table
4. Updates run in `ai_runs` table with new message

---

### Synchronous Actions

```typescript
// Instance management
dispatch(createInstance(instance));
dispatch(removeInstance({ runId }));
dispatch(setInstanceStatus({ runId, status, error? }));

// Input (ISOLATED - high frequency)
dispatch(setCurrentInput({ runId, input }));
dispatch(clearCurrentInput({ runId }));

// Resources (ISOLATED)
dispatch(setResources({ runId, resources }));
dispatch(addResource({ runId, resource }));
dispatch(removeResource({ runId, index }));
dispatch(clearResources({ runId }));

// UI State (ISOLATED)
dispatch(setExpandedVariable({ runId, variableName }));
dispatch(toggleShowVariables({ runId }));
dispatch(setShowVariables({ runId, show }));

// Variables
dispatch(updateVariable({ runId, variableName, value }));
dispatch(updateVariables({ runId, variables }));

// Messages
dispatch(addMessage({ runId, message }));
dispatch(clearConversation({ runId }));

// Execution tracking
dispatch(startExecution({ runId, taskId }));
dispatch(startStreaming({ runId }));
dispatch(completeExecution({ runId, stats }));

// Run tracking
dispatch(setRunId({ runId, runName, savedToDatabase }));
```

---

### Selectors

#### Basic Selectors (Stable References)

All basic selectors return stable references for null/undefined cases:

```typescript
// Core instance
selectInstance(state, runId)           // ExecutionInstance | null
selectAllInstances(state)              // Record<string, ExecutionInstance>
selectInstancesByPromptId(state, promptId)

// ISOLATED selectors (high-frequency data)
selectCurrentInput(state, runId)       // string (never null)
selectResources(state, runId)          // any[] (stable empty array)
selectUIState(state, runId)            // InstanceUIState (stable default)
selectMessages(state, runId)           // ConversationMessage[] (stable empty)

// Granular instance data
selectInstanceStatus(state, runId)     // ExecutionStatus | null
selectInstanceError(state, runId)      // string | null
selectUserVariables(state, runId)      // Record<string, string>
selectExecutionTracking(state, runId)
selectRunTracking(state, runId)
selectExecutionConfig(state, runId)
selectScopedVariables(state)
```

#### Computed Selectors (Memoized)

```typescript
// Variables
selectMergedVariables(state, runId)
// Returns: { ...defaults, ...scoped, ...user, ...computed }

// Messages
selectTemplateMessages(state, runId)   // From prompt
selectConversationMessages(state, runId) // User/assistant
selectResolvedMessages(state, runId)   // All with vars replaced
selectSystemMessage(state, runId)      // System prompt only
selectDisplayMessages(state, runId)    // Conversation + streaming

// Streaming
selectStreamingTextForInstance(state, runId)
selectIsResponseEndedForInstance(state, runId)
selectLiveStreamingStats(state, runId)

// Status (derived)
selectIsExecuting(state, runId)        // boolean
selectIsStreaming(state, runId)        // boolean
selectHasError(state, runId)           // boolean
selectIsReadyToExecute(state, runId)   // boolean
selectHasUnsavedChanges(state, runId)  // boolean

// UI (from isolated state)
selectExpandedVariable(state, runId)   // string | null
selectShowVariables(state, runId)      // boolean

// Stats
selectInstanceStats(state, runId)
selectModelConfig(state, runId)
```

---

### React Hook

#### `usePromptInstance(runId)`

Convenience hook for components. Uses granular selectors to minimize re-renders.

```typescript
const {
  // Core (stable)
  instance,
  runId,
  
  // Messages
  displayMessages,
  messages,
  
  // Variables
  variables,
  
  // Status (memoized)
  isReady,
  isExecuting,
  isStreaming,
  hasError,
  
  // Streaming
  streamingText,
  
  // Stats
  stats,
  liveStats,
  
  // ISOLATED state (high-frequency)
  currentInput,
  resources,
  
  // UI state (isolated)
  expandedVariable,
  showVariables,
  
  // Actions
  sendMessage,
  updateVariable,
  updateVariables,
  setInput,
  clearConversation,
  setExpandedVariable,
  toggleShowVariables,
  setResources,
  addResource,
  removeResource,
} = usePromptInstance(runId);
```

---

## Types

### Core Types

```typescript
interface ExecutionInstance {
  // Identity
  runId: string;
  promptId: string;
  promptSource: 'prompts' | 'prompt_builtins';
  
  // Status
  status: ExecutionStatus;
  error: string | null;
  
  // Timestamps
  createdAt: number;  // Set once on creation
  updatedAt: number;  // Only updated on execution completion
  
  // Configuration
  settings: Record<string, any>;
  executionConfig: ExecutionConfig;
  
  // Variables
  variables: ExecutionVariables;
  
  // Messages (directly on instance, not nested)
  messages: ConversationMessage[];
  
  // Execution tracking
  execution: ExecutionTracking;
  
  // Run tracking (DB)
  runTracking: RunTracking;
  
  // NOTE: currentInput, resources, uiState are in ISOLATED top-level maps
}

interface InstanceUIState {
  expandedVariable: string | null;
  showVariables: boolean;
}

type ExecutionStatus = 
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'executing'
  | 'streaming'
  | 'completed'
  | 'error';

interface ExecutionConfig {
  auto_run: boolean;
  allow_chat: boolean;
  show_variables: boolean;
  apply_variables: boolean;
  track_in_runs: boolean;
}

interface ExecutionVariables {
  userValues: Record<string, string>;
  scopedValues: Record<string, string>;
  computedValues: Record<string, string>;
}
```

---

## Usage Examples

### Simple One-Shot Execution

```typescript
function QuickAnalyzer({ text }: { text: string }) {
  const dispatch = useAppDispatch();
  const [runId, setRunId] = useState<string | null>(null);
  
  const handleAnalyze = async () => {
    const id = await dispatch(startPromptInstance({
      promptId: 'text-analyzer',
      variables: { text },
      executionConfig: { track_in_runs: true },
    })).unwrap();
    
    setRunId(id);
    await dispatch(executeMessage({ runId: id })).unwrap();
  };
  
  return <Button onClick={handleAnalyze}>Analyze</Button>;
}
```

### Conversational Interface

```typescript
function ChatInterface({ promptId }: { promptId: string }) {
  const dispatch = useAppDispatch();
  const [runId, setRunId] = useState<string | null>(null);
  
  const {
    displayMessages,
    isExecuting,
    currentInput,  // From isolated selector
    sendMessage,
    setInput,
  } = usePromptInstance(runId);
  
  useEffect(() => {
    dispatch(startPromptInstance({
      promptId,
      executionConfig: { 
        allow_chat: true,
        track_in_runs: true 
      },
    }))
      .unwrap()
      .then(setRunId);
  }, [promptId]);
  
  const handleSend = async () => {
    if (!currentInput.trim() || isExecuting) return;
    await sendMessage();
  };
  
  return (
    <div>
      <MessageList messages={displayMessages} />
      <Input 
        value={currentInput} 
        onChange={(e) => setInput(e.target.value)}
        disabled={isExecuting}
      />
      <Button onClick={handleSend} disabled={isExecuting}>
        {isExecuting ? 'Sending...' : 'Send'}
      </Button>
    </div>
  );
}
```

### Direct Selector Usage (Advanced)

For maximum performance, use selectors directly instead of the hook:

```typescript
function OptimizedInput({ runId }: { runId: string }) {
  const dispatch = useAppDispatch();
  
  // Only re-renders when currentInput changes
  const currentInput = useAppSelector(state => selectCurrentInput(state, runId));
  
  return (
    <Input 
      value={currentInput}
      onChange={(e) => dispatch(setCurrentInput({ runId, input: e.target.value }))}
    />
  );
}

function MessageDisplay({ runId }: { runId: string }) {
  // Only re-renders when messages change (not on input typing!)
  const messages = useAppSelector(state => selectMessages(state, runId));
  
  return <MessageList messages={messages} />;
}
```

---

## Performance Optimization

### Selector Architecture

The selectors are designed for minimal re-renders:

| Selector | Re-renders when... |
|----------|-------------------|
| `selectCurrentInput` | User types |
| `selectMessages` | Message added (execution) |
| `selectResources` | Attachment added/removed |
| `selectUIState` | UI toggle clicked |
| `selectInstance` | Status change, execution complete |
| `selectInstanceStatus` | Status changes only |

### Stable References

All selectors return stable references for empty/null cases:

```typescript
// These always return the SAME reference when data is missing
selectCurrentInput(state, 'missing') // '' (always same string)
selectMessages(state, 'missing')     // [] (always same array)
selectResources(state, 'missing')    // [] (always same array)
selectUIState(state, 'missing')      // { expandedVariable: null, showVariables: false }
```

This prevents unnecessary re-renders from new object/array creation.

### updatedAt Optimization

`updatedAt` is ONLY updated when execution completes (message added), not on:
- Input typing ❌
- Variable changes ❌
- UI state changes ❌
- Status changes ❌

This prevents components that depend on the instance from re-rendering during user interaction.

---

## File Structure

```
lib/redux/prompt-execution/
├── README.md (this file)
├── slice.ts (main Redux slice with isolated state maps)
├── selectors.ts (memoized selectors)
├── types.ts (TypeScript definitions)
├── builtins.ts (builtin prompts configuration)
├── index.ts (barrel exports)
├── hooks/
│   └── usePromptInstance.ts
└── thunks/
    ├── startInstanceThunk.ts
    ├── executeMessageThunk.ts
    ├── completeExecutionThunk.ts
    ├── fetchScopedVariablesThunk.ts
    └── startPromptActionThunk.ts
```

---

## Summary

The Prompt Execution Engine provides a **bulletproof** foundation for all prompt executions:

- ✅ Eliminates closure bugs through centralized state
- ✅ Smart caching prevents redundant database queries
- ✅ Supports multiple concurrent execution instances
- ✅ Guarantees run tracking when enabled
- ✅ Handles complex variable resolution automatically
- ✅ **Isolated state maps prevent re-renders during typing**
- ✅ **Granular selectors for maximum performance**
- ✅ Fully typed with excellent DX
- ✅ Production-ready with comprehensive error handling

**Built for scale, reliability, and developer experience.**
