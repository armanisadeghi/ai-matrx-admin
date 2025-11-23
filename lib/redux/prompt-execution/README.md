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
      [instanceId]: ExecutionInstance // Active execution sessions
    },
    instancesByPromptId: {
      [promptId]: string[] // Quick lookups
    },
    instancesByRunId: {
      [runId]: string // Link runs to instances
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

### Core Concept: Execution Instance

An **instance** represents a single prompt execution session that may contain multiple messages (conversation). Each instance is identified by a unique `instanceId` and tracks:

- Configuration & settings
- Variables (user, scoped, computed)
- Conversation messages
- Execution state
- Run tracking (links to `ai_runs` table)

---

## API Reference

### Thunks (Async Actions)

#### `startPromptInstance(payload)`

Creates a new execution instance with cache-aware prompt loading. **Supports both custom prompts and prompt builtins.**

```typescript
// Execute a custom prompt
const instanceId = await dispatch(startPromptInstance({
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

// Execute a prompt builtin
const builtinInstanceId = await dispatch(startPromptInstance({
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
4. Returns `instanceId` for tracking

**Note:** The `promptSource` parameter determines which table to query:
- `'prompts'` (default) - Custom user-created prompts
- `'prompt_builtins'` - System/built-in prompts

---

#### `executeMessage(payload)`

Executes a message for an instance (core execution engine).

```typescript
await dispatch(executeMessage({
  instanceId: 'abc-123',
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
  instanceId: 'abc-123',
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

// result.instanceId, result.brokerResolvedCount, etc.
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
dispatch(removeInstance({ instanceId }));
dispatch(setInstanceStatus({ instanceId, status, error? }));

// Variables
dispatch(updateVariable({ instanceId, variableName, value }));
dispatch(updateVariables({ instanceId, variables }));

// Conversation
dispatch(setCurrentInput({ instanceId, input }));
dispatch(addMessage({ instanceId, message }));
dispatch(clearConversation({ instanceId }));

// Execution tracking
dispatch(startExecution({ instanceId, taskId }));
dispatch(startStreaming({ instanceId }));
dispatch(completeExecution({ instanceId, stats }));

// Run tracking
dispatch(setRunId({ instanceId, runId, runName }));

// UI state
dispatch(setExpandedVariable({ instanceId, variableName }));
dispatch(toggleShowVariables({ instanceId }));
```

---

### Selectors

#### Basic Selectors

```typescript
selectInstance(state, instanceId)
selectAllInstances(state)
selectInstancesByPromptId(state, promptId)
selectInstanceByRunId(state, runId)
selectScopedVariables(state)
```

#### Computed Selectors (Memoized)

```typescript
// Variables
selectMergedVariables(state, instanceId)
// Returns: { ...defaults, ...scoped, ...user, ...computed }

// Messages
selectTemplateMessages(state, instanceId) // From prompt
selectConversationMessages(state, instanceId) // User/assistant
selectResolvedMessages(state, instanceId) // All with vars replaced
selectSystemMessage(state, instanceId) // System prompt only
selectDisplayMessages(state, instanceId) // Conversation + streaming

// Streaming
selectStreamingTextForInstance(state, instanceId)
selectIsResponseEndedForInstance(state, instanceId)
selectLiveStreamingStats(state, instanceId)

// Status
selectIsReadyToExecute(state, instanceId)
selectHasUnsavedChanges(state, instanceId)

// Stats
selectInstanceStats(state, instanceId)
selectModelConfig(state, instanceId)
```

---

### React Hook

#### `usePromptInstance(instanceId)`

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
} = usePromptInstance(instanceId);
```

---

## Types

### Core Types

```typescript
interface ExecutionInstance {
  // Identity
  instanceId: string; // UUID
  promptId: string;
  
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
  const [instanceId, setInstanceId] = useState<string | null>(null);
  
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
    
    setInstanceId(id);
    
    // Execute immediately
    await dispatch(executeMessage({ instanceId: id })).unwrap();
  };
  
  return <Button onClick={handleAnalyze}>Analyze</Button>;
}

// Execute a prompt builtin
function BuiltinExecutor({ builtinId }: { builtinId: string }) {
  const dispatch = useAppDispatch();
  
  const handleExecute = async () => {
    const id = await dispatch(startPromptInstance({
      promptId: builtinId,
      promptSource: 'prompt_builtins', // ← Specify builtin source
      variables: { input: 'value' },
      executionConfig: { track_in_runs: true },
    })).unwrap();
    
    await dispatch(executeMessage({ instanceId: id })).unwrap();
  };
  
  return <Button onClick={handleExecute}>Execute Builtin</Button>;
}
```

---

### Conversational Interface

```typescript
function ChatInterface({ promptId }: { promptId: string }) {
  const dispatch = useAppDispatch();
  const [instanceId, setInstanceId] = useState<string | null>(null);
  
  const {
    displayMessages,
    isExecuting,
    currentInput,
    sendMessage,
    setInput,
  } = usePromptInstance(instanceId);
  
  useEffect(() => {
    dispatch(startPromptInstance({
      promptId,
      executionConfig: { 
        allow_chat: true,
        track_in_runs: true 
      },
    }))
      .unwrap()
      .then(setInstanceId);
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
  const [instanceId, setInstanceId] = useState<string | null>(null);
  
  const { variables, updateVariable, isReady, sendMessage } = 
    usePromptInstance(instanceId);
  
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
      .then(setInstanceId);
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
  
  console.log('Instance created:', result.instanceId);
  console.log('Broker resolved:', result.brokerResolvedCount, 'variables');
  
  // Execute the prompt
  await dispatch(executeMessage({ 
    instanceId: result.instanceId 
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
  [(state, instanceId) => selectInstance(state, instanceId)],
  (instance) => ({
    ...instance.variables.userValues // ✅ ALWAYS CURRENT!
  })
);

// Thunk gets fresh variables
const variables = selectMergedVariables(getState(), instanceId);
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
