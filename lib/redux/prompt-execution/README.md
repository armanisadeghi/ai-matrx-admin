# Prompt Execution Engine

**Complete Redux-based system for prompt execution with dual-mode architecture, resource handling, comprehensive debugging, and guaranteed correctness.**

## System Status

**Production Ready** | Last Updated: 2024

### Core Capabilities

- ✅ **Dual-Mode Architecture** - Template (Mode 1) → Conversation (Mode 2) transition
- ✅ **Resource Handling** - Per-message attachment with XML formatting
- ✅ **Variable Resolution** - Multi-source merging with zero closure bugs
- ✅ **Message Construction** - Single utility guarantees execution/debug consistency
- ✅ **Debug Visibility** - Complete state inspection with API payload preview
- ✅ **Run Tracking** - Automatic database persistence
- ✅ **Performance Optimized** - Isolated state maps prevent re-renders
- ✅ **Multiple Concurrent Instances** - Full multi-execution support

### Known Issues

None. System is production-ready.

### Pending Enhancements

- [ ] Resource type extensibility framework
- [ ] Variable validation engine
- [ ] Execution replay capability
- [ ] Performance metrics dashboard

---

## Core Architecture

### Dual-Mode Execution Model

**Mode 1: Templated First Message**
- Template + user input + resources → combined message
- Variables replaced throughout
- After send: resources cleared, variables hidden, → Mode 2

**Mode 2: Ongoing Conversation**
- User input + resources → message
- Uses conversation history
- No template, variables hidden
- Resources cleared after each send

### Message Construction Pipeline

```
Input Sources → Message Builder → Variable Replacement → Resource Formatting → API Payload
     ↓               ↓                    ↓                      ↓                ↓
currentInput    buildFinalMessage()  replaceVariables()  formatResourcesToXml() socket.io
resources          (utility)           (merged vars)        (XML wrapper)      submission
variables       
template
```

**Critical:** `buildFinalMessage()` utility is used by BOTH execution and debug, guaranteeing consistency.

### State Structure

Isolated state maps minimize re-renders:

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

### Execution Instance (Run)

An **instance** = single prompt execution session with multiple messages (conversation).

**Lifecycle:**
1. Created via `startPromptInstance()` → assigns `runId`
2. Mode 1: First message with template + variables
3. After send: → Mode 2 (conversation mode)
4. Mode 2: Subsequent messages use conversation history
5. Persisted to `ai_runs` table (if `track_in_runs: true`)

**State Location:**
- **Stable data**: `instances[runId]` (config, messages, tracking)
- **High-freq data**: Isolated maps (currentInput, resources, uiState)
- **System message**: Template (not in conversation history)

### Resource Handling

**Architecture:**
- Resources are **per-message**, not per-conversation
- Stored in isolated map: `resources[runId]`
- Cleared after EVERY message send
- Formatted to XML via `formatResourcesToXml()`
- Appended to message content before variable replacement

**Flow:**
```
User attaches → resources[runId] → fetchResourcesData() → formatResourcesToXml() → appendResourcesToMessage() → Send → clearResources()
```

### System Message Architecture

**Storage:**
- Lives in `templateMessages` (from prompt)
- NOT stored in `instance.messages[]` (conversation history)
- Doesn't change during conversation

**Usage:**
- **Always included** at start of API payload
- Variables replaced on every request
- Visible in debug for clarity

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

**Core execution engine.** Handles Mode 1/2 logic, resources, variables, and database persistence.

```typescript
const taskId = await dispatch(executeMessage({
  runId: 'abc-123',
  userInput: 'Optional override', // Uses currentInput if not provided
})).unwrap();
```

**Execution Flow:**
1. Get fresh Redux state (eliminates closure bugs)
2. Determine mode: `isFirstMessage` check
3. Build message via `buildFinalMessage()`:
   - Mode 1: Template + input + resources
   - Mode 2: Input + resources
4. Replace variables in complete message
5. Add message to `instance.messages[]`
6. **Clear currentInput and resources** (per-message)
7. **Hide variables** (if Mode 1 → Mode 2 transition)
8. Create/update run in `ai_runs` (first message only)
9. Build API payload with system message
10. Create task in `ai_tasks`
11. Submit to socket.io
12. Return `taskId`

**Post-Send State:**
- `currentInput[runId]` = '' (cleared)
- `resources[runId]` = [] (cleared)
- `uiState[runId].showVariables` = false (if was Mode 1)

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
├── README.md                    # This file - single source of truth
├── slice.ts                     # Redux slice + isolated state maps
├── selectors.ts                 # Memoized selectors
├── types.ts                     # TypeScript definitions
├── builtins.ts                  # Builtin prompt configurations
├── index.ts                     # Barrel exports
├── hooks/
│   └── usePromptInstance.ts     # React hook wrapper
├── thunks/
│   ├── startInstanceThunk.ts    # Instance creation + cache
│   ├── executeMessageThunk.ts   # Core execution (Mode 1/2)
│   ├── completeExecutionThunk.ts # Finalization
│   ├── fetchScopedVariablesThunk.ts
│   ├── specialVariablesThunk.ts
│   └── resourceThunks.ts        # Resource upload/add
└── utils/
    └── message-builder.ts       # Shared message construction utility

features/prompts/utils/
├── resource-formatting.ts       # XML formatting for resources
├── resource-data-fetcher.ts     # Fetch table data, etc.
└── variable-resolver.ts         # Variable replacement logic

components/debug/
├── PromptExecutionDebugPanel.tsx  # Complete state visibility
├── ResourceDebugIndicator.tsx     # Resource preview
├── DebugIndicator.tsx            # General debug
└── DebugIndicatorManager.tsx     # Central manager

features/prompts/components/smart/
└── SmartPromptInput.tsx         # Main input component with debug toolbar
```

---

## Message Builder Utility

**Location:** `lib/redux/prompt-execution/utils/message-builder.ts`

**Purpose:** Single source of truth for message construction. Used by BOTH execution engine and debug components.

**Function:**
```typescript
buildFinalMessage({
  isFirstMessage: boolean,
  isLastTemplateMessageUser: boolean,
  lastTemplateMessage?: { role, content },
  userInput: string,
  resources: Resource[],
  variables: Record<string, string>
}): Promise<{
  finalContent: string,
  baseContent: string,
  resourcesXml: string,
  hasResources: boolean
}>
```

**Logic:**
1. Mode 1: Combine template + input (if applicable)
2. Mode 2: Just use input
3. Fetch resource data (tables, files)
4. Format resources to XML
5. Append resources to message
6. Replace variables in complete message
7. Return final content + metadata

**Guarantee:** What debug shows = what gets executed (same utility, same logic).

---

## Debug System

### Components

**PromptExecutionDebugPanel** - Complete state inspector
- Overview: Mode, status, counts
- Template Messages: Initial prompt structure
- Conversation History: Messages + system message (highlighted)
- **Current User Message Preview**: Exact message to be sent (with resources)
- Current State Details: Input, variables, resources, UI state
- **API Payload**: Exact array sent to LLM (most important)

**ResourceDebugIndicator** - Resource preview
- Resource list by type
- Message preview with resources
- Proper scrolling, copy functionality

**Debug Toolbar** - In SmartPromptInput
- "State & API" button → Opens PromptExecutionDebugPanel
- "Resources (N)" button → Opens ResourceDebugIndicator (when resources exist)
- Always visible when debug mode enabled

### Access

1. Enable debug mode: `dispatch(toggleDebugMode())`
2. Blue toolbar appears at top of input
3. Click "State & API" for complete state
4. Click "Resources" for resource preview

### Architecture

**Redux-driven:** All debug components read from Redux selectors (not props).
```typescript
// Inside debug component:
const instance = useAppSelector(state => selectInstance(state, runId));
const messages = useAppSelector(state => selectMessages(state, runId));
// ... uses SAME selectors as execution engine
```

**Single prop:** Only `runId` needed. Everything else from Redux.

---

## Key Architectural Decisions

### Why Isolated State Maps?

**Problem:** `currentInput` inside instance → every keystroke caused all subscribers to re-render.

**Solution:** Top-level maps (`currentInputs`, `resources`, `uiState`) → only affected components re-render.

### Why System Message Not in Conversation History?

**Reason:** Doesn't change during conversation, no need to store repeatedly. Lives in template, always included in API calls.

### Why Resources Cleared After Send?

**Reason:** Resources are per-message, not per-conversation. Each message can have different attachments. Keeping them would confuse users.

### Why Variables Hidden After First Message?

**Reason:** Variables only apply to initial template (Mode 1). After first send, conversation is dynamic (Mode 2). Template variables cannot apply to subsequent messages.

### Why Single Message Builder Utility?

**Reason:** Guarantees debug preview matches execution. Both use same utility, impossible to diverge.

---

## Testing & Verification

### Debug Panel Sections to Verify

1. **Overview** - Correct mode (1 or 2), accurate counts
2. **Template Messages** - Prompt structure with variables marked
3. **Conversation History** - System message shown, all messages present
4. **Current User Message Preview** - Generate to see exact message with resources
5. **Current State Details** - Verify variables, resources, input
6. **API Payload** - Most critical: shows EXACTLY what LLM receives

### Common Issues to Check

**Variables not replacing?**
- Check "Current State Details" → Variables section
- Verify names match template `{{variable_name}}`
- Check "API Payload" to see if replacement occurred

**Resources not showing?**
- Check "Current State Details" → Resources section
- Verify resources in Redux state
- Click "Resources" button for XML preview

**Wrong mode behavior?**
- Check "Overview" → Mode indicator
- Verify conversation history length (`isFirstMessage` = length === 0)

---

## Summary

**Production-ready dual-mode prompt execution system with:**

✅ Mode 1 (Template) → Mode 2 (Conversation) architecture
✅ Per-message resource handling with XML formatting  
✅ Multi-source variable resolution (defaults, scoped, user, computed)
✅ Single message builder utility guarantees consistency
✅ Complete debug visibility (state + API payload)
✅ Isolated state maps for performance
✅ Zero closure bugs via Redux centralization
✅ Automatic run tracking with database persistence

**Single source of truth for message construction. Debuggable at every step. Built for reliability.**
