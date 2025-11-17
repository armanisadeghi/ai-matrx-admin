# Prompt Execution Engine - Redux Architecture

## 🎯 Overview

Centralized Redux-based prompt execution system that:
- Caches prompts (no duplicate fetches)
- Manages multiple concurrent execution instances
- Handles ALL variable replacement logic in one place
- Ensures consistent run tracking and DB persistence
- Supports user/org/project-scoped variables
- Eliminates closure bugs through centralized state

---

## 📐 Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     UI COMPONENTS                            │
│  (PromptRunPage, PromptRunner, Optimizers, etc.)           │
└────────────────┬────────────────────────────────────────────┘
                 │ dispatch thunks
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                   SMART THUNKS                               │
│  - loadPrompt (cache-aware)                                 │
│  - startPromptInstance (create execution instance)          │
│  - executeMessage (run with variable replacement)           │
│  - completeExecution (finalize & save to DB)                │
└────────────────┬────────────────────────────────────────────┘
                 │ updates state
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                  REDUX SLICES                                │
│  - promptCacheSlice (existing - prompt objects)             │
│  - promptExecutionSlice (NEW - execution instances)         │
│  - socketResponseSlice (existing - streaming)               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                   SELECTORS                                  │
│  - Smart memoized selectors for computed values             │
│  - Variable-replaced messages                                │
│  - Run statistics                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

```
lib/redux/prompt-execution/
├── ARCHITECTURE.md (this file)
├── slice.ts (main execution slice)
├── thunks/
│   ├── loadPromptThunk.ts (smart cache-aware loading)
│   ├── startInstanceThunk.ts (create execution instance)
│   ├── executeMessageThunk.ts (core execution logic)
│   ├── completeExecutionThunk.ts (finalize & save)
│   └── fetchScopedVariablesThunk.ts (user/org/project vars)
├── selectors/
│   ├── instanceSelectors.ts (get instance state)
│   ├── variableSelectors.ts (computed variables)
│   └── messageSelectors.ts (messages with vars replaced)
├── services/
│   ├── variableResolver.ts (centralized variable logic)
│   ├── runPersistence.ts (DB operations)
│   └── messageBuilder.ts (build chat messages)
├── sagas/ (optional - for complex async flows)
│   └── executionSaga.ts
├── types.ts
└── index.ts (barrel exports)
```

---

## 🔑 Core Types

```typescript
// Instance represents a single prompt execution (may have multiple messages)
interface ExecutionInstance {
  // Identity
  instanceId: string; // UUID - created on init
  promptId: string;
  runId: string | null; // null until first message sent
  
  // Status
  status: 'idle' | 'initializing' | 'executing' | 'streaming' | 'completed' | 'error';
  createdAt: number;
  updatedAt: number;
  
  // Configuration
  settings: Record<string, any>; // Model config from prompt
  executionConfig: {
    auto_run: boolean;
    allow_chat: boolean;
    show_variables: boolean;
    apply_variables: boolean;
    track_in_runs: boolean;
  };
  
  // Variables
  variables: {
    // User-provided values (from UI)
    userValues: Record<string, string>;
    
    // Scoped variables (fetched from DB - user/org/project level)
    scopedValues: Record<string, string>;
    
    // Runtime computed variables
    computedValues: Record<string, string>;
    
    // Final merged values (computed by selector)
    // merged = { ...scopedValues, ...userValues, ...computedValues }
  };
  
  // Conversation
  conversation: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
      taskId?: string;
      timestamp: string;
      metadata?: any;
    }>;
    
    // Current message being composed
    currentInput: string;
    
    // Resources/attachments
    resources: Resource[];
  };
  
  // Execution tracking
  execution: {
    currentTaskId: string | null;
    messageStartTime: number | null;
    timeToFirstToken: number | undefined;
    lastMessageStats: {
      timeToFirstToken?: number;
      totalTime?: number;
      tokens?: number;
    } | null;
  };
  
  // Run tracking (links to ai_runs table)
  runTracking: {
    runId: string | null;
    sourceType: string;
    sourceId: string;
    runName: string | null;
    totalTokens: number;
    totalCost: number;
  };
  
  // UI state (optional - can be in component state too)
  ui: {
    expandedVariable: string | null;
    showVariables: boolean;
  };
}

// State shape
interface PromptExecutionState {
  // All active instances (keyed by instanceId)
  instances: {
    [instanceId: string]: ExecutionInstance;
  };
  
  // Quick lookup maps
  instancesByPromptId: {
    [promptId: string]: string[]; // instanceIds
  };
  instancesByRunId: {
    [runId: string]: string; // instanceId
  };
  
  // Scoped variables cache (fetched once per session)
  scopedVariables: {
    user: Record<string, string> | null;
    org: Record<string, string> | null;
    project: Record<string, string> | null;
    fetchedAt: number | null;
  };
}
```

---

## 🔄 Execution Flow

### 1. **Initialize Instance**

```typescript
// Component calls:
const instanceId = await dispatch(startPromptInstance({
  promptId: 'text-analyzer',
  executionConfig: {
    auto_run: true,
    allow_chat: true,
    track_in_runs: true,
  },
  variables: { text: selectedText },
})).unwrap();

// Thunk does:
// 1. Check if prompt cached, fetch if needed
// 2. Generate instanceId (UUID)
// 3. Fetch scoped variables if not cached
// 4. Create ExecutionInstance in state
// 5. Return instanceId for component to track
```

### 2. **Execute Message**

```typescript
// Component calls:
await dispatch(executeMessage({
  instanceId,
  userInput: "Analyze this", // optional additional input
})).unwrap();

// Thunk does:
// 1. Get instance from state
// 2. Get prompt from cache
// 3. Merge all variable sources:
//    - scopedValues (user/org/project)
//    - userValues (from UI)
//    - computedValues (runtime)
// 4. Replace variables in ALL messages (centralized!)
// 5. Build conversation history
// 6. Create runId if first message (track_in_runs=true)
// 7. Create task in ai_tasks
// 8. Dispatch socket task
// 9. Update instance with taskId
```

### 3. **Stream Response** (handled by existing socket middleware)

```typescript
// Socket middleware updates socketResponse state
// Component uses selector:
const streamingText = useAppSelector(state =>
  selectStreamingTextForInstance(state, instanceId)
);

// Selector internally:
// 1. Gets instance.execution.currentTaskId
// 2. Reads from socketResponse[taskId]
```

### 4. **Complete Execution**

```typescript
// Triggered automatically by socket end event OR manual dispatch
await dispatch(completeExecution({
  instanceId,
})).unwrap();

// Thunk does:
// 1. Calculate final stats
// 2. Add assistant message to instance
// 3. Complete task in ai_tasks (server calculates cost)
// 4. Add message to ai_runs
// 5. Update instance status to 'completed'
```

### 5. **Cleanup** (optional)

```typescript
// When component unmounts or user navigates away
dispatch(cleanupInstance({ instanceId }));

// Removes instance from state (unless marked for persistence)
```

---

## 🧩 Key Selectors

```typescript
// Get instance
export const selectInstance = (state, instanceId) => 
  state.promptExecution.instances[instanceId];

// Get merged variables (computed)
export const selectMergedVariables = createSelector(
  [selectInstance],
  (instance) => {
    if (!instance) return {};
    return {
      ...instance.variables.scopedValues,
      ...instance.variables.userValues,
      ...instance.variables.computedValues,
    };
  }
);

// Get messages with variables replaced (computed)
export const selectResolvedMessages = createSelector(
  [
    (state, instanceId) => selectInstance(state, instanceId),
    (state, instanceId) => selectMergedVariables(state, instanceId),
    (state, instanceId) => {
      const instance = selectInstance(state, instanceId);
      return state.promptCache.prompts[instance?.promptId];
    }
  ],
  (instance, variables, prompt) => {
    if (!instance || !prompt) return [];
    
    // Build full message array (template + conversation)
    const templateMessages = prompt.messages || [];
    const conversationMessages = instance.conversation.messages;
    
    // Replace variables in ALL messages
    return [...templateMessages, ...conversationMessages].map(msg => ({
      ...msg,
      content: replaceVariablesInText(msg.content, variables),
    }));
  }
);

// Get streaming text for instance
export const selectStreamingTextForInstance = (state, instanceId) => {
  const instance = selectInstance(state, instanceId);
  if (!instance?.execution.currentTaskId) return '';
  
  return selectPrimaryResponseTextByTaskId(
    instance.execution.currentTaskId
  )(state);
};
```

---

## 🎯 Benefits of This Architecture

### 1. **Single Source of Truth**
- ✅ All variable logic in one place
- ✅ No closure bugs (state always fresh)
- ✅ Consistent behavior everywhere

### 2. **Smart Caching**
```typescript
// Prompt fetched once
dispatch(startPromptInstance({ promptId: 'X' })); // Fetches
dispatch(startPromptInstance({ promptId: 'X' })); // Uses cache!

// Scoped variables fetched once
dispatch(fetchScopedVariables()); // Fetches once per session
```

### 3. **Multiple Concurrent Instances**
```typescript
// User can have multiple prompt executions running simultaneously
const instance1 = await dispatch(startPromptInstance({ promptId: 'A' }));
const instance2 = await dispatch(startPromptInstance({ promptId: 'B' }));
const instance3 = await dispatch(startPromptInstance({ promptId: 'A' })); // Same prompt, different instance!

// Each tracked independently in Redux
```

### 4. **Scoped Variables Support**
```typescript
// Fetch user/org/project variables once
await dispatch(fetchScopedVariables({
  userId: currentUser.id,
  orgId: currentUser.org_id,
  projectId: currentProject?.id,
}));

// Now available to ALL instances automatically
// Variables like {{user_name}}, {{org_name}}, etc. work everywhere
```

### 5. **Guaranteed Run Tracking**
```typescript
// If track_in_runs: true, run WILL be created and saved
// No exceptions, no missed tracking
// All handled in thunk, not component
```

### 6. **Easy Testing**
```typescript
// Redux DevTools shows full execution flow
// Can replay actions
// Can inspect state at any point
// Time-travel debugging!
```

---

## 🔧 Migration Strategy

### Phase 1: Build Core Infrastructure (Week 1)
1. Create `promptExecutionSlice` with types
2. Build core thunks (loadPrompt, startInstance, executeMessage)
3. Create selectors for computed values
4. Add scoped variables support

### Phase 2: Migrate PromptRunPage (Week 1-2)
1. Replace local state with Redux
2. Use thunks instead of manual logic
3. Test thoroughly
4. Keep old code as fallback initially

### Phase 3: Migrate Other Components (Week 2-3)
1. PromptRunner modal
2. Optimizers (SystemPromptOptimizer, FullPromptOptimizer)
3. Generators (PromptGenerator)
4. Testing components

### Phase 4: Cleanup (Week 3)
1. Remove old execution code
2. Remove duplicate variable logic
3. Update documentation
4. Performance optimization

---

## 📊 Performance Considerations

### Caching Strategy
- ✅ Prompts cached indefinitely (or until manual invalidation)
- ✅ Scoped variables cached per session
- ✅ Instances cleaned up after inactivity (configurable)

### Selector Memoization
- ✅ All selectors use `createSelector` (Reselect)
- ✅ Only recompute when dependencies change
- ✅ No unnecessary renders

### State Size Management
```typescript
// Auto-cleanup old instances
const MAX_INSTANCES = 50; // Configurable
const MAX_INSTANCE_AGE = 30 * 60 * 1000; // 30 minutes

// Saga monitors and cleans up
function* cleanupOldInstancesSaga() {
  while (true) {
    yield delay(60000); // Check every minute
    const state = yield select();
    const now = Date.now();
    
    Object.values(state.promptExecution.instances).forEach(instance => {
      if (
        instance.status === 'completed' &&
        now - instance.updatedAt > MAX_INSTANCE_AGE
      ) {
        yield put(removeInstance({ instanceId: instance.instanceId }));
      }
    });
  }
}
```

---

## 🚀 Example Usage

### Simple Execution
```typescript
// Component
function MyComponent() {
  const dispatch = useAppDispatch();
  
  const handleExecute = async () => {
    // Start instance
    const instanceId = await dispatch(startPromptInstance({
      promptId: 'text-analyzer',
      variables: { text: selectedText },
      executionConfig: { auto_run: true, track_in_runs: true },
    })).unwrap();
    
    // Execute (auto-runs if auto_run: true)
    await dispatch(executeMessage({ instanceId })).unwrap();
  };
  
  return <Button onClick={handleExecute}>Analyze</Button>;
}
```

### With Streaming UI
```typescript
function StreamingComponent({ instanceId }: { instanceId: string }) {
  const instance = useAppSelector(state => 
    selectInstance(state, instanceId)
  );
  const streamingText = useAppSelector(state => 
    selectStreamingTextForInstance(state, instanceId)
  );
  const isStreaming = instance?.status === 'streaming';
  
  return (
    <div>
      {isStreaming && <div>{streamingText}</div>}
      {instance?.conversation.messages.map(msg => (
        <Message key={msg.timestamp} {...msg} />
      ))}
    </div>
  );
}
```

### Conversation Flow
```typescript
function ConversationComponent({ instanceId }: { instanceId: string }) {
  const dispatch = useAppDispatch();
  const [input, setInput] = useState('');
  
  const handleSend = async () => {
    await dispatch(executeMessage({
      instanceId,
      userInput: input,
    })).unwrap();
    setInput('');
  };
  
  return (
    <div>
      <Messages instanceId={instanceId} />
      <Input value={input} onChange={e => setInput(e.target.value)} />
      <Button onClick={handleSend}>Send</Button>
    </div>
  );
}
```

---

## 🎉 Summary

This architecture provides:
- ✅ **Single execution engine** for all prompts
- ✅ **Zero duplicate fetches** via smart caching
- ✅ **No closure bugs** via centralized state
- ✅ **Multiple concurrent runs** via instance management
- ✅ **Scoped variables** via cached fetch
- ✅ **Guaranteed tracking** via thunk enforcement
- ✅ **Easy debugging** via Redux DevTools
- ✅ **Future-proof** via extensible design

**Ready to implement!** 🚀

