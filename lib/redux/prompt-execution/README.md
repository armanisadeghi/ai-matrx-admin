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

---

## Architecture

### State Structure

```typescript
{
  promptExecution: {
    instances: {
      [runId]: ExecutionInstance // Active execution sessions (keyed by runId)
    },
    runsByPromptId: {
      [promptId]: string[] // runIds for quick lookups
    },
    scopedVariables: {
      user: Record<string, string> | null,
      org: Record<string, string> | null,
      project: Record<string, string> | null,
      fetchedAt: number | null,
      status: 'idle' | 'loading' | 'loaded' | 'error'
    }
  },
  actionCache: {
    actions: {
      [actionId]: CachedAction // Cached prompt actions
    },
    fetchStatus: {...},
    errors: {...}
  }
}
```

### Core Concept: Execution Instance (Run)

An **instance** represents a single prompt execution session that may contain multiple messages (conversation). Each instance is identified by a unique `runId` and tracks:

- Configuration & settings
- Variables (user, scoped, computed)
- Conversation messages
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

// Alternative: Manual configuration
const builtinRunId = await dispatch(startPromptInstance({
  promptId: 'builtin-uuid',
  promptSource: 'prompt_builtins', // ← Specify builtin source
  variables: { input: 'value' },
  executionConfig: { track_in_runs: true },
})).unwrap();
```

**What it does:**
1. Fetches prompt from cache or database (supports both `prompts` and `prompt_builtins` tables)
2. Creates execution instance in Redux
3. Initializes variables with defaults, user values, and computed values
4. Returns `runId` for tracking

**Note:** The `promptSource` parameter determines which table to query:
- `'prompts'` (default) - Custom user-created prompts
- `'prompt_builtins'` - System/built-in prompts

**Prompt ID Format:**
- For custom prompts: Always use the UUID directly
- For prompt builtins: Always use the UUID directly (recommended)
  - Optional: The system includes `resolveBuiltinId()` in `builtins.ts` that can resolve by key or name, but this is not integrated into the execution engine. If needed, the app should resolve to UUID before calling `startPromptInstance`.

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
2. Merges variables from all sources via selectors
3. Replaces variables in ALL messages
4. Creates run in `ai_runs` table (if first message & tracking enabled)
5. Creates task in `ai_tasks` table
6. Submits to socket.io for streaming
7. Returns `taskId`

**Variable Resolution Flow:**
```
Computed Variables (current_date, etc.)
    ↓ overrides
User Values (from UI)
    ↓ overrides
Scoped Values (project → org → user)
    ↓ overrides
Prompt Defaults
```

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
1. Adds assistant message to conversation
2. Completes task in `ai_tasks` table
3. Updates run in `ai_runs` table with new message
4. Updates instance state with final statistics

---

#### `startPromptAction(payload)`

Executes a prompt action with broker resolution.

```typescript
const result = await dispatch(startPromptAction({
  actionId: 'generate-brief-uuid',
  context: {
    userId: 'user-uuid',
    workspaceId: 'workspace-uuid',
    projectId: 'project-uuid',
  },
  userProvidedVariables: {
    custom_field: 'Override value', // Highest precedence
  },
  initialMessage: 'Optional message',
  runId: 'existing-run-id', // Optional
})).unwrap();

// result.runId, result.brokerResolvedCount, etc.
```

**What it does:**
1. Loads action (cache-aware)
2. Loads referenced prompt
3. Resolves brokers for context
4. Maps broker values to variable names
5. Applies hardcoded overrides from action
6. Merges with user-provided values
7. Executes via `startPromptInstance`

**Variable Precedence:**
```
User Input > Hardcoded (Action) > Broker > Prompt Default
```

---

#### `fetchScopedVariables(payload)`

Fetches user/org/project-level variables (session-cached).

```typescript
await dispatch(fetchScopedVariables({
  userId: 'user-uuid',
  orgId: 'org-uuid',
  projectId: 'project-uuid',
  force: false, // true = ignore cache
})).unwrap();
```

---

### Synchronous Actions

```typescript
// Instance management
dispatch(createInstance(instance));
dispatch(removeInstance({ runId }));
dispatch(setInstanceStatus({ runId, status, error? }));

// Variables
dispatch(updateVariable({ runId, variableName, value }));
dispatch(updateVariables({ runId, variables }));

// Conversation
dispatch(setCurrentInput({ runId, input }));
dispatch(addMessage({ runId, message }));
dispatch(clearConversation({ runId }));

// Execution tracking
dispatch(startExecution({ runId, taskId }));
dispatch(startStreaming({ runId }));
dispatch(completeExecution({ runId, stats }));

// Run tracking
dispatch(setRunId({ runId, runName }));

// UI state
dispatch(setExpandedVariable({ runId, variableName }));
dispatch(toggleShowVariables({ runId }));
```

---

### Selectors

#### Basic Selectors

```typescript
selectInstance(state, runId)
selectAllInstances(state)
selectInstancesByPromptId(state, promptId)
selectInstanceByRunId(state, runId)
selectScopedVariables(state)
```

#### Computed Selectors (Memoized)

```typescript
// Variables
selectMergedVariables(state, runId)
// Returns: { ...defaults, ...scoped, ...user, ...computed }

// Messages
selectTemplateMessages(state, runId) // From prompt
selectConversationMessages(state, runId) // User/assistant
selectResolvedMessages(state, runId) // All with vars replaced
selectSystemMessage(state, runId) // System prompt only
selectDisplayMessages(state, runId) // Conversation + streaming

// Streaming
selectStreamingTextForInstance(state, runId)
selectIsResponseEndedForInstance(state, runId)
selectLiveStreamingStats(state, runId)

// Status
selectIsReadyToExecute(state, runId)
selectHasUnsavedChanges(state, runId)

// Stats
selectInstanceStats(state, runId)
selectModelConfig(state, runId)
```

---

### React Hook

#### `usePromptInstance(runId)`

Convenience hook for components.

```typescript
const {
  // State
  instance,
  displayMessages,
  variables,
  isReady,
  isExecuting,
  isStreaming,
  hasError,
  streamingText,
  stats,
  liveStats,
  currentInput,
  runId,
  
  // Actions
  sendMessage,
  updateVariable,
  updateVariables,
  setInput,
  clearConversation,
  setExpandedVariable,
  toggleShowVariables,
} = usePromptInstance(runId);
```

---

## Types

### Core Types

```typescript
interface ExecutionInstance {
  // Identity
  runId: string; // UUID - the instance IS the run, one concept
  promptId: string;
  promptSource: 'prompts' | 'prompt_builtins'; // Which table the prompt came from
  
  // Status
  status: ExecutionStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  
  // Configuration
  settings: Record<string, any>; // Model config
  executionConfig: ExecutionConfig;
  
  // Variables
  variables: ExecutionVariables;
  
  // Conversation
  conversation: {
    messages: ConversationMessage[];
    currentInput: string;
    resources: any[];
  };
  
  // Execution tracking
  execution: ExecutionTracking;
  
  // Run tracking (DB)
  runTracking: RunTracking;
  
  // UI state
  ui: {
    expandedVariable: string | null;
    showVariables: boolean;
  };
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
  auto_run: boolean; // Execute immediately
  allow_chat: boolean; // Enable multi-turn conversation
  show_variables: boolean; // Show variables panel
  apply_variables: boolean; // Replace variables in messages
  track_in_runs: boolean; // Save to ai_runs table
}

interface ExecutionVariables {
  userValues: Record<string, string>; // From UI
  scopedValues: Record<string, string>; // From DB (user/org/project)
  computedValues: Record<string, string>; // Runtime (current_date, etc.)
}
```

---

## Database Integration

### Required Tables (Existing)

The engine works with your **existing** database schema:

- ✅ **`prompts`** - Prompt definitions
- ✅ **`prompt_builtins`** - System prompts
- ✅ **`ai_runs`** - Run tracking with messages, variables, stats
- ✅ **`ai_tasks`** - Task tracking with metrics, cost calculation
- ✅ **`prompt_actions`** - Action definitions with broker mappings

**No schema changes required for core functionality.**

### Optional Tables (Scoped Variables)

For automatic variable population (e.g., `{{user_name}}`, `{{org_name}}`):

```sql
-- Optional: User-level variables
CREATE TABLE user_variables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Optional: Org-level variables
CREATE TABLE org_variables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, key)
);

-- Optional: Project-level variables
CREATE TABLE project_variables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, key)
);
```

---

## Usage Examples

### Simple One-Shot Execution

```typescript
function QuickAnalyzer({ text }: { text: string }) {
  const dispatch = useAppDispatch();
  const [runId, setRunId] = useState<string | null>(null);
  
  const handleAnalyze = async () => {
    // Start instance (custom prompt)
    const id = await dispatch(startPromptInstance({
      promptId: 'text-analyzer',
      variables: { text },
      executionConfig: { 
        auto_run: false,
        track_in_runs: true 
      },
    })).unwrap();
    
    setRunId(id);
    
    // Execute immediately
    await dispatch(executeMessage({ runId: id })).unwrap();
  };
  
  return <Button onClick={handleAnalyze}>Analyze</Button>;
}

// Execute a prompt builtin (recommended)
import { createBuiltinConfig } from '@/lib/redux/prompt-execution/builtins';

function BuiltinExecutor() {
  const dispatch = useAppDispatch();
  
  const handleExecute = async () => {
    const runId = await dispatch(startPromptInstance(
      createBuiltinConfig('prompt-app-auto-create', {
        variables: { input: 'value' },
        executionConfig: { track_in_runs: true },
      })
    )).unwrap();
    
    await dispatch(executeMessage({ runId })).unwrap();
  };
  
  return <Button onClick={handleExecute}>Execute Builtin</Button>;
}
```

---

### Conversational Interface

```typescript
function ChatInterface({ promptId }: { promptId: string }) {
  const dispatch = useAppDispatch();
  const [runId, setRunId] = useState<string | null>(null);
  
  const {
    displayMessages,
    isExecuting,
    currentInput,
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

---

### Variable-Rich Prompt

```typescript
function PromptWithVariables({ promptId }: { promptId: string }) {
  const dispatch = useAppDispatch();
  const [runId, setRunId] = useState<string | null>(null);
  
  const { variables, updateVariable, isReady, sendMessage } = 
    usePromptInstance(runId);
  
  useEffect(() => {
    dispatch(startPromptInstance({
      promptId,
      variables: { name: 'John', age: '30' }, // Initial values
      executionConfig: { 
        show_variables: true,
        apply_variables: true 
      },
    }))
      .unwrap()
      .then(setRunId);
  }, [promptId]);
  
  return (
    <div>
      <Input
        label="Name"
        value={variables.name || ''}
        onChange={(e) => updateVariable('name', e.target.value)}
      />
      <Input
        label="Age"
        value={variables.age || ''}
        onChange={(e) => updateVariable('age', e.target.value)}
      />
      <Button onClick={() => sendMessage()} disabled={!isReady}>
        Execute
      </Button>
    </div>
  );
}
```

---

### Action Execution with Brokers

```typescript
async function executeGenerateBrief(workspaceId: string, projectId: string) {
  const result = await dispatch(startPromptAction({
    actionId: 'generate-brief-uuid',
    context: {
      userId: currentUser.id,
      workspaceId,
      projectId,
    },
    // Broker automatically resolves:
    // - workspace_name
    // - project_name
    // - client_name
    // etc.
  })).unwrap();
  
  console.log('Instance created:', result.runId);
  console.log('Broker resolved:', result.brokerResolvedCount, 'variables');
  
  // Execute the prompt
  await dispatch(executeMessage({ 
    runId: result.runId 
  })).unwrap();
}
```

---

## Variable Resolution System

### Priority Order

Variables are resolved in this order (highest to lowest precedence):

1. **Computed Variables** - Runtime values (e.g., `current_date`)
2. **User Values** - Set via UI or API
3. **Scoped Variables** - Project → Org → User
4. **Broker Values** - Resolved from context (actions only)
5. **Hardcoded Values** - Set in action config (actions only)
6. **Prompt Defaults** - Defined in prompt

### Computed Variables

Always available, auto-generated:

```typescript
{
  current_date: '2024-01-15',
  current_time: '14:30:00',
  current_datetime: '2024-01-15T14:30:00.000Z',
}
```

---

## Why This Architecture?

### Problem: Closure Bugs (Before)

```typescript
// Component captures stale state in closure
const [variables, setVariables] = useState({ text: 'Hello' });

const replaceVariables = (content: string) => {
  // ❌ Uses OLD variables value from closure!
  return content.replace(/\{\{text\}\}/, variables.text);
};

// User updates variables
setVariables({ text: 'Updated' });

// But replaceVariables still uses 'Hello'! 💥
```

### Solution: Redux Selectors (After)

```typescript
// Selector ALWAYS reads fresh state
export const selectMergedVariables = createSelector(
  [(state, runId) => selectInstance(state, runId)],
  (instance) => ({
    ...instance.variables.userValues // ✅ ALWAYS CURRENT!
  })
);

// Thunk gets fresh variables
const variables = selectMergedVariables(getState(), runId);
// ✅ No closure over stale state possible!
```

**Benefits:**
- ✅ Single source of truth
- ✅ Always fresh state
- ✅ Memoized for performance
- ✅ Time-travel debugging (Redux DevTools)

---

## Performance Considerations

### Caching Strategy

- **Prompts** - Cached indefinitely in `promptCacheSlice`
- **Actions** - Cached indefinitely in `actionCacheSlice`
- **Scoped Variables** - Session-cached (5 minute TTL)
- **Instances** - Can be cleaned up after completion

### Selector Memoization

All selectors use `createSelector` (Reselect):
- Only recompute when inputs change
- Prevent unnecessary re-renders
- Efficient even with many instances

---

## Integration Checklist

### 1. Add to Redux Store

```typescript
// lib/redux/rootReducer.ts
import promptExecutionReducer from './prompt-execution/slice';
import actionCacheReducer from './prompt-execution/actionCacheSlice';

export const createRootReducer = () => combineReducers({
  // ... existing reducers ...
  promptExecution: promptExecutionReducer,
  actionCache: actionCacheReducer,
});
```

### 2. Use in Components

```typescript
import { 
  startPromptInstance, 
  executeMessage,
  usePromptInstance 
} from '@/lib/redux/prompt-execution';
```

### 3. Test with Redux DevTools

Monitor state changes, time-travel debug, export/import state for bug reproduction.

---

## File Structure

```
lib/redux/prompt-execution/
├── README.md (this file)
├── slice.ts (main Redux slice)
├── actionCacheSlice.ts (action caching)
├── selectors.ts (memoized selectors)
├── types.ts (TypeScript definitions)
├── builtins.ts (builtin prompts configuration)
├── index.ts (barrel exports)
├── ACTIONS_MIGRATION.sql (database migration for actions)
├── hooks/
│   ├── index.ts
│   └── usePromptInstance.ts
└── thunks/
    ├── index.ts
    ├── startInstanceThunk.ts
    ├── executeMessageThunk.ts
    ├── completeExecutionThunk.ts
    ├── fetchScopedVariablesThunk.ts
    └── startPromptActionThunk.ts
```

---

## Builtin Prompts Configuration

The `builtins.ts` file provides a centralized registry of system prompt builtins with O(1) lookup capabilities.

**What This Provides:**
- ✅ Metadata/info about builtin prompts (id, name, description, key, context flag)
- ✅ Fast UUID lookups by key or name
- ❌ Does NOT contain actual prompt data (messages, variables, settings)
- 💡 To execute a builtin, pass its UUID to `startPromptInstance` with `promptSource: 'prompt_builtins'`

### Available Builtins

```typescript
import { PROMPT_BUILTINS } from '@/lib/redux/prompt-execution/builtins';

// Direct UUID access (recommended)
const autoCreateId = PROMPT_BUILTINS.PROMPT_APP_AUTO_CREATE.id;
// '4b9563db-7a95-476d-b2c7-b76385d35e9c'

// All builtin properties (metadata only)
PROMPT_BUILTINS.PROMPT_APP_AUTO_CREATE
// {
//   id: '4b9563db-7a95-476d-b2c7-b76385d35e9c',
//   name: 'Prompt App Auto Creator',
//   description: 'Specialized for auto creating Prompt Apps',
//   key: 'prompt-app-auto-create',
//   context: false,
// }
```

### Available Builtins

- `PROMPT_APP_AUTO_CREATE` - Standard prompt app creator
- `PROMPT_APP_AUTO_CREATE_LIGHTNING` - Fast prompt app creator
- `PROMPT_APP_UI` - Prompt app UI editor
- `GENERIC_CODE` - General-purpose code editor
- `CODE_EDITOR_DYNAMIC_CONTEXT` - Code editor with context management

### Utility Functions

#### Recommended: `createBuiltinConfig()`

**The easiest way to execute builtin prompts** - ensures correct configuration:

```typescript
import { createBuiltinConfig } from '@/lib/redux/prompt-execution/builtins';

// Simple execution
await dispatch(startPromptInstance(
  createBuiltinConfig('prompt-app-auto-create')
)).unwrap();

// With variables
await dispatch(startPromptInstance(
  createBuiltinConfig('prompt-app-auto-create', {
    variables: { 
      name: 'My App',
      description: 'A cool app' 
    }
  })
)).unwrap();

// With full configuration
await dispatch(startPromptInstance(
  createBuiltinConfig('prompt-app-auto-create', {
    variables: { name: 'My App' },
    executionConfig: { 
      track_in_runs: true,
      allow_chat: false 
    },
    initialMessage: 'Custom instructions'
  })
)).unwrap();
```

#### Other Helper Functions

```typescript
import { 
  getBuiltinId,           // Returns: UUID string
  getBuiltinInfoById,     // Returns: PromptBuiltin info object
  getBuiltinInfoByKey,    // Returns: PromptBuiltin info object
  resolveBuiltinId        // Returns: UUID string
} from '@/lib/redux/prompt-execution/builtins';

// Get UUID by key (O(1))
const id = getBuiltinId('prompt-app-auto-create');
// → '4b9563db-7a95-476d-b2c7-b76385d35e9c'

// Get builtin metadata/info by key (O(1))
const info = getBuiltinInfoByKey('prompt-app-auto-create');
// → { id: '...', name: '...', description: '...', key: '...', context: false }

// Get builtin metadata/info by UUID (O(1))
const info = getBuiltinInfoById('4b9563db-7a95-476d-b2c7-b76385d35e9c');
// → { id: '...', name: '...', description: '...', key: '...', context: false }

// Resolve any identifier (UUID, key, or name) to UUID (O(1))
const id = resolveBuiltinId('Prompt App Auto Creator'); // by name
const id = resolveBuiltinId('prompt-app-auto-create');  // by key
const id = resolveBuiltinId('4b9563db-7a95-476d-b2c7-b76385d35e9c'); // by UUID
```

**Important Distinction:**
- `getBuiltinId()` and `resolveBuiltinId()` return **UUID strings** only
- `getBuiltinInfoById()` and `getBuiltinInfoByKey()` return **metadata objects** (id, name, description, key, context)
- ⚠️ **None of these return actual prompt data from the database** - use `startPromptInstance` thunk for that

**Best Practice:** Use `createBuiltinConfig()` for executing builtins - it's the cleanest, safest, and most maintainable approach.

---

## Summary

The Prompt Execution Engine provides a **bulletproof** foundation for all prompt executions:

- ✅ Eliminates closure bugs through centralized state
- ✅ Smart caching prevents redundant database queries
- ✅ Supports multiple concurrent execution instances
- ✅ Guarantees run tracking when enabled
- ✅ Handles complex variable resolution automatically
- ✅ Integrates broker system for context-aware actions
- ✅ Fully typed with excellent DX
- ✅ Production-ready with comprehensive error handling

**Built for scale, reliability, and developer experience.**
