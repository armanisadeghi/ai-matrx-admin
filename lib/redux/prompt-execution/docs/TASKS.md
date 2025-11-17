# Redux Prompt Execution Engine - Implementation Tasks

## ✅ DONE

- [x] Redux slice created with all actions
- [x] Selectors created (closure-bug-proof)
- [x] Thunks created (startInstance, executeMessage, complete, fetchScoped)
- [x] Hook created (usePromptInstance)
- [x] Added to rootReducer
- [x] Zero linter errors
- [x] Database schema verified (no changes needed!)

---

## 🚀 PRIORITY 1: Core Integration (3-4 hours)

### Task 1.1: Test Redux Slice in Isolation (30 min)
**File:** Test in browser console or create test component

```typescript
// In any component, test:
import { startPromptInstance } from '@/lib/redux/prompt-execution';

// Should create instance and return ID
const instanceId = await dispatch(startPromptInstance({
  promptId: 'existing-prompt-id',
  variables: { test: 'value' },
})).unwrap();

console.log('Instance created:', instanceId);
```

**Verification:**
- Check Redux DevTools shows `promptExecution.instances[id]` created
- Check `promptCache.prompts[promptId]` shows cached prompt
- No errors in console

---

### Task 1.2: Migrate PromptRunPage.tsx (2-3 hours)

**Current file:** `features/prompts/components/PromptRunPage.tsx`

**Changes needed:**

1. **Add imports:**
```typescript
import {
  startPromptInstance,
  executeMessage,
  updateVariable,
  setCurrentInput,
} from '@/lib/redux/prompt-execution';
import { usePromptInstance } from '@/lib/redux/prompt-execution/hooks';
```

2. **Replace state management:**
```typescript
// REMOVE these ~100 lines:
const [variableDefaults, setVariableDefaults] = useState(...);
const [chatInput, setChatInput] = useState("");
const [conversationMessages, setConversationMessages] = useState(...);
const [isTestingPrompt, setIsTestingPrompt] = useState(false);
// ... etc

// REPLACE with:
const [instanceId, setInstanceId] = useState<string | null>(null);
const {
  instance,
  displayMessages,
  variables,
  sendMessage,
  updateVariable: updateVar,
  setInput,
} = usePromptInstance(instanceId);
```

3. **Initialize instance on mount:**
```typescript
useEffect(() => {
  const init = async () => {
    try {
      const id = await dispatch(startPromptInstance({
        promptId: promptData.id,
        executionConfig: {
          track_in_runs: true,
          allow_chat: true,
        },
        runId: urlRunId || undefined,
      })).unwrap();
      
      setInstanceId(id);
    } catch (err) {
      console.error('Failed to start instance:', err);
    }
  };
  
  init();
}, [promptData.id, urlRunId]);
```

4. **Replace execution logic:**
```typescript
// REMOVE handleSendTestMessage (80 lines)

// REPLACE with:
const handleSendMessage = async () => {
  if (!instanceId) return;
  await sendMessage();
};
```

5. **Update variable handler:**
```typescript
const handleVariableValueChange = (name: string, value: string) => {
  updateVar(name, value);
};
```

**Verification:**
- Page loads without errors
- Variables update in Redux (check DevTools)
- Messages send correctly
- Streaming works
- Check `ai_runs` and `ai_tasks` tables for records

---

## 🔧 PRIORITY 2: Socket Integration & Completion (1-2 hours)

### Task 2.1: Add Socket Response Listener

Currently missing: Auto-detect when streaming completes and call `completeExecutionThunk`

**File:** Create `lib/redux/prompt-execution/middleware/completionMiddleware.ts`

```typescript
import { Middleware } from '@reduxjs/toolkit';
import { selectInstance } from '../slice';
import { selectIsResponseEndedForInstance } from '../selectors';
import { completeExecutionThunk } from '../thunks/completeExecutionThunk';

export const executionCompletionMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Listen for socket response updates
  if (action.type?.includes('socketResponse')) {
    const state = store.getState();
    
    // Check all active instances
    Object.keys(state.promptExecution.instances).forEach(instanceId => {
      const instance = selectInstance(state, instanceId);
      
      if (
        instance?.status === 'streaming' &&
        instance.execution.currentTaskId &&
        selectIsResponseEndedForInstance(state, instanceId)
      ) {
        // Streaming just completed - finalize
        const streamingText = state.socketResponse[instance.execution.currentTaskId]?.response || '';
        const timeToFirstToken = instance.execution.timeToFirstToken;
        const totalTime = instance.execution.messageStartTime 
          ? Date.now() - instance.execution.messageStartTime
          : 0;
        
        store.dispatch(completeExecutionThunk({
          instanceId,
          responseText: streamingText,
          timeToFirstToken,
          totalTime,
        }));
      }
    });
  }
  
  return result;
};
```

**Add to store:**
```typescript
// lib/redux/store.ts
import { executionCompletionMiddleware } from './prompt-execution/middleware/completionMiddleware';

// In middleware array:
.concat(
  sagaMiddleware,
  loggerMiddleware,
  socketMiddleware,
  storageMiddleware,
  entitySagaMiddleware,
  executionCompletionMiddleware, // ADD THIS
)
```

---

### Task 2.2: Fix Database Column Names

**Issue:** Thunks may use wrong column names

**Files to check:**
- `thunks/executeMessageThunk.ts` (line ~100-120)
- `thunks/completeExecutionThunk.ts` (line ~70-90)

**Corrections needed:**

```typescript
// WRONG:
.eq('task_id', taskId)  // ❌ This is the UUID column, not unique

// CORRECT:
.eq('task_id', taskId)  // ✅ Actually this IS correct per CURRENT_DB.md

// Verify these match your schema:
await supabase.from('ai_tasks').insert({
  task_id: taskId,           // ✅ Matches schema
  run_id: runId,             // ✅ Matches
  user_id: userId,           // ✅ Matches
  service: 'chat_service',   // ✅ Matches
  task_name: 'direct_chat',  // ✅ Matches
  model_id: modelId,         // ✅ This should be UUID not string
  // ... rest
});
```

**ACTION:** Verify `model_id` is passed as UUID, not string

---

## 🧪 PRIORITY 3: Testing & Validation (1 hour)

### Task 3.1: Manual Testing Checklist

Using migrated PromptRunPage:

- [ ] Load page with existing prompt
- [ ] Instance creates in Redux (check DevTools)
- [ ] Prompt cached (check `state.promptCache`)
- [ ] Variables display correctly
- [ ] Update a variable → Check Redux state updates
- [ ] Send first message:
  - [ ] Run created in `ai_runs` table
  - [ ] Task created in `ai_tasks` table
  - [ ] Message uses UPDATED variable values (not initial!)
  - [ ] Streaming works
  - [ ] Response appears in UI
  - [ ] Task completes in database
  - [ ] Stats recorded
- [ ] Send second message:
  - [ ] Uses same run
  - [ ] New task created
  - [ ] Conversation history maintained
  - [ ] Cost/tokens aggregate correctly
- [ ] Reload page with runId in URL:
  - [ ] Loads existing run
  - [ ] Shows conversation history
  - [ ] Can continue conversation
- [ ] Redux DevTools:
  - [ ] All actions visible
  - [ ] Can time-travel through states
  - [ ] State is serializable

---

### Task 3.2: Verify Database Records

```sql
-- Check run created correctly
SELECT id, name, source_type, source_id, variable_values, total_tokens, total_cost
FROM ai_runs
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 5;

-- Check tasks linked correctly
SELECT t.task_id, t.status, t.tokens_total, t.cost, t.total_time, r.name as run_name
FROM ai_tasks t
JOIN ai_runs r ON r.id = t.run_id
WHERE t.user_id = 'your-user-id'
ORDER BY t.created_at DESC
LIMIT 10;

-- Verify aggregates match
SELECT 
  r.name,
  r.total_tokens as run_total,
  SUM(t.tokens_total) as tasks_total,
  r.total_cost as run_cost,
  SUM(t.cost) as tasks_cost
FROM ai_runs r
LEFT JOIN ai_tasks t ON t.run_id = r.id
WHERE r.user_id = 'your-user-id'
GROUP BY r.id, r.name, r.total_tokens, r.total_cost
ORDER BY r.created_at DESC
LIMIT 5;
```

---

## 🔄 PRIORITY 4: Migrate Other Components (2-3 hours)

Once PromptRunPage works, migrate these in order:

### Task 4.1: PromptRunner Modal
**File:** `features/prompts/components/modal/PromptRunner.tsx`
- Already partially uses `usePromptExecutionCore`
- Should be easier than PromptRunPage
- Similar pattern

### Task 4.2: SystemPromptOptimizer
**File:** `features/prompts/components/actions/prompt-optimizers/SystemPromptOptimizer.tsx`
- Currently uses direct socket dispatch
- Replace with Redux engine
- Set `track_in_runs: false` (utility execution)

### Task 4.3: FullPromptOptimizer
**File:** `features/prompts/components/actions/prompt-optimizers/FullPromptOptimizer.tsx`
- Same as SystemPromptOptimizer
- Set `track_in_runs: false`

### Task 4.4: PromptGenerator
**File:** `features/prompts/components/actions/prompt-generator/PromptGenerator.tsx`
- Same pattern
- Set `track_in_runs: false`

---

## 🎯 PRIORITY 5: Optional Features (Future)

### Task 5.1: Scoped Variables
- Create database tables (see DATABASE_SCHEMA.md)
- Already have `fetchScopedVariables` thunk
- Just needs tables created

### Task 5.2: Instance Cleanup Saga
- Auto-remove completed instances after 30 minutes
- Keep state manageable

### Task 5.3: Batch Operations
- Execute multiple prompts in sequence
- Useful for workflows

---

## ❓ CLARIFYING QUESTIONS

Before starting implementation, please confirm:

1. **PromptRunPage Migration:** Should I migrate this first as proof-of-concept?

2. **model_id Type:** In your `ai_tasks` table, is `model_id` a UUID or text/string?
   - Schema shows `model_id uuid null`
   - But prompts might reference models by UUID or by name
   - How do you want to handle this?

3. **User ID:** How do I get current user ID in thunks?
   ```typescript
   const userId = (await supabase.auth.getUser()).data.user?.id;
   // Or is there a better way in your app?
   ```

4. **Scoped Variables:** Do you want me to implement this now, or skip for later?
   - Need `user_variables`, `org_variables`, `project_variables` tables
   - Already have the fetch logic, just need tables

5. **Testing:** Should I create automated tests, or is manual testing sufficient for now?

6. **Error Handling:** For database errors during execution:
   - Continue execution and log error?
   - Fail the execution?
   - Retry?

---

## 📊 EFFORT ESTIMATE

| Priority | Tasks | Time | Status |
|----------|-------|------|--------|
| P1 - Core Integration | 1.1, 1.2 | 3-4h | Ready |
| P2 - Socket & DB | 2.1, 2.2 | 1-2h | Ready |
| P3 - Testing | 3.1, 3.2 | 1h | Ready |
| P4 - Other Components | 4.1-4.4 | 2-3h | After P1-P3 |
| P5 - Optional | 5.1-5.3 | 2-4h | Later |

**Total for core functionality:** ~5-7 hours
**Total with all components:** ~8-12 hours

---

## 🚀 RECOMMENDED START

1. **Answer clarifying questions** (above)
2. **Task 1.1:** Test slice in isolation (30 min)
3. **Task 1.2:** Migrate PromptRunPage (2-3 hours)
4. **Task 3.1:** Manual testing (1 hour)
5. **Task 2.1:** Add completion middleware (30 min)
6. **Task 4.1-4.4:** Migrate other components (2-3 hours)

Ready to start? Let me know answers to questions and I'll begin implementation!

