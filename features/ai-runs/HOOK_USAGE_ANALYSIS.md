# useAiRun Hook - Purpose & Usage Analysis

## 🎯 Purpose of useAiRun

**YES - The entire purpose of `useAiRun` is to SAVE and MANAGE conversation runs in the database.**

The hook provides a complete lifecycle management system for AI conversation runs:

### Core Responsibilities:

1. **🗄️ Database Persistence**
   - Creates run records in `ai_runs` table
   - Saves messages to run history
   - Creates task records in `ai_tasks` table
   - Tracks metrics (tokens, cost, timing)

2. **📊 Run Management**
   - Load existing runs
   - Update run metadata
   - Delete runs
   - Toggle star/favorite status

3. **💬 Message History**
   - Add user messages to run
   - Add assistant responses to run
   - Maintain conversation context

4. **📈 Task Tracking**
   - Create task records for each API call
   - Update task status during streaming
   - Complete tasks with final metrics
   - Calculate costs and aggregate stats

---

## 🔍 What Gets Saved

When you use `useAiRun`, the following data is persisted to Supabase:

### Run Record (`ai_runs` table)
```typescript
{
  id: UUID,
  user_id: UUID,
  source_type: 'prompt' | 'chat' | 'action' | etc.,
  source_id: UUID,  // Reference to prompt/chat/action
  name: string,
  description?: string,
  settings: {
    model_id: string,
    temperature: number,
    // ... other model config
  },
  variable_values: {
    [variableName]: value
  },
  messages: [
    { role, content, timestamp, metadata },
    // ... all conversation messages
  ],
  total_tokens: number,
  total_cost: number,
  status: 'active' | 'completed' | 'error',
  is_starred: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Task Records (`ai_tasks` table)
```typescript
{
  task_id: UUID,
  run_id: UUID,  // Links to ai_runs
  service: 'chat_service',
  task_name: 'direct_chat',
  model_id: string,
  request_data: { /* full API payload */ },
  response_text: string,
  status: 'pending' | 'streaming' | 'completed' | 'error',
  tokens_total: number,
  time_to_first_token: number,
  total_time: number,
  cost: number,  // Server-calculated
  created_at: timestamp,
  completed_at: timestamp
}
```

---

## 🚨 Critical: Two Types of Prompt Execution

### ✅ Type 1: WITH Run Tracking (uses `useAiRun`)

**Components:**
- ✅ Full page `PromptRunner` (`features/prompts/components/PromptRunner.tsx`)
- ✅ Modal `PromptRunner` (`features/prompts/components/modal/PromptRunner.tsx`)
- ✅ `ActionConversationModal` (Matrx Actions)

**Behavior:**
```typescript
const { run, createRun, createTask, addMessage, completeTask } = useAiRun(runId);

// First message
const newRun = await createRun({
  source_type: 'prompt',
  source_id: promptId,
  name: 'Generated name',
  settings: modelConfig,
  variable_values: { ... }
});

// For each message
await createTask({ task_id, ... }, run.id);
await addMessage({ role: 'user', content, ... }, run.id);
// ... stream response ...
await addMessage({ role: 'assistant', content, ... }, run.id);
await completeTask(task_id, { tokens, cost, ... });
```

**Result:**
- ✅ Run saved to database
- ✅ All messages saved
- ✅ All tasks tracked
- ✅ Metrics calculated
- ✅ Shows in "Runs" sidebar
- ✅ Can reload/continue later
- ✅ Full history available

---

### ❌ Type 2: WITHOUT Run Tracking (uses `usePromptExecution` or direct socket)

**Components:**
- ❌ `usePromptExecution` hook (used by many components)
- ❌ `PromptGenerator` (Action system)
- ❌ `SystemPromptOptimizer`
- ❌ `FullPromptOptimizer`
- ❌ `GeneratePromptForSystemModal`
- ❌ `GeneratePromptForBuiltinModal`
- ❌ `PromptAppRenderer` (some modes)

**Behavior:**
```typescript
const { execute, streamingText } = usePromptExecution();

// Execute without run tracking
execute({
  promptData: myPrompt,
  variables: { ... }
});

// OR direct socket dispatch
dispatch(createAndSubmitTask({
  service: 'chat_service',
  taskName: 'direct_chat',
  taskData: { chat_config }
}));
```

**Result:**
- ❌ NO run record created
- ❌ NO messages saved
- ❌ NO task tracking
- ❌ NO metrics stored
- ❌ NOT in "Runs" sidebar
- ❌ Cannot reload/continue
- ❌ History lost when component unmounts

**Why?**
- These are typically **one-shot utility executions**
- Example: "Generate a prompt" - you just need the output once
- Example: "Optimize system prompt" - temporary transformation
- Saving every utility execution would clutter the runs list

---

## 📝 When Does Saving Happen?

### Full Timeline with useAiRun:

```
User sends first message
    ↓
1. createRun() - IMMEDIATELY saves run record ✅
    ↓
2. createTask() - IMMEDIATELY saves task record ✅
    ↓
3. addMessage() - IMMEDIATELY saves user message ✅
    ↓
4. dispatch(createAndSubmitTask) - Starts streaming
    ↓
5. updateTask() - PERIODICALLY during streaming (debounced) ✅
    ↓
6. Response completes
    ↓
7. addMessage() - IMMEDIATELY saves assistant message ✅
    ↓
8. completeTask() - IMMEDIATELY saves final metrics ✅
    ↓
User sends follow-up message
    ↓
9. createTask() - New task for follow-up ✅
    ↓
10. addMessage() - Save user message ✅
    ↓
... repeat 4-8 ...
```

**Key Points:**
- ✅ **First message creates the run** - Run exists from the start
- ✅ **Each message saves immediately** - No batching
- ✅ **Tasks save immediately** - Created before socket dispatch
- ✅ **Updates during streaming** - Debounced (500ms) to avoid spam
- ✅ **Completion saves final state** - Metrics, cost, tokens

---

## 🔍 Current Usage Breakdown

### Components WITH Run Tracking ✅

#### 1. Full Page PromptRunner
**File:** `features/prompts/components/PromptRunner.tsx`
**Line:** 137
```typescript
const { run, createRun, createTask, updateTask, completeTask, addMessage } = useAiRun(urlRunId || undefined);
```
**Purpose:** Main prompt testing interface with full conversation history

#### 2. Modal PromptRunner  
**File:** `features/prompts/components/modal/PromptRunner.tsx`
**Line:** 137
```typescript
const { run, createRun, createTask, updateTask, completeTask, addMessage } = useAiRun(initialRunId || undefined);
```
**Purpose:** Modal version for context menus, cards, shortcuts

#### 3. Action Conversation Modal
**File:** `features/matrx-actions/components/ActionConversationModal.tsx`
```typescript
const { run, createRun, createTask, completeTask, addMessage } = useAiRun(runId);
```
**Purpose:** Matrx Actions with conversation tracking

---

### Components WITHOUT Run Tracking ❌

#### 1. usePromptExecution Hook
**File:** `features/prompts/hooks/usePromptExecution.ts`
**Used by:** Context menus, shortcuts, quick actions (when not using modal)

#### 2. Prompt Generator
**File:** `features/prompts/components/actions/PromptGenerator.tsx`
**Purpose:** Generate new prompts from existing ones (utility)

#### 3. System Prompt Optimizer
**File:** `features/prompts/components/actions/SystemPromptOptimizer.tsx`
**Purpose:** Optimize system prompts (utility)

#### 4. Full Prompt Optimizer
**File:** `features/prompts/components/actions/FullPromptOptimizer.tsx`
**Purpose:** Optimize entire prompts (utility)

#### 5. Admin Prompt Generation Modals
**Files:**
- `components/admin/GeneratePromptForSystemModal.tsx`
- `features/prompt-builtins/admin/GeneratePromptForBuiltinModal.tsx`
**Purpose:** Admin utilities for generating prompts

#### 6. Prompt Builder (Testing)
**File:** `features/prompts/components/builder/PromptBuilder.tsx`
**Purpose:** Quick test button in builder (not full runs)

---

## 🎯 Design Decision: Why Two Patterns?

### Pattern 1: WITH Run Tracking (Conversational)
**Use When:**
- ✅ User expects to see conversation history
- ✅ Multiple back-and-forth messages
- ✅ Need to track metrics/costs
- ✅ Want to star/favorite runs
- ✅ Need to reload/continue later

**Examples:**
- Testing a prompt with follow-up questions
- Running a recipe/prompt app
- Having a conversation with AI

### Pattern 2: WITHOUT Run Tracking (Utility)
**Use When:**
- ✅ One-shot execution (no follow-up)
- ✅ Utility/tool usage (not conversation)
- ✅ Would clutter runs list
- ✅ Don't need history
- ✅ Temporary transformations

**Examples:**
- "Generate a prompt for me"
- "Optimize this text"
- "Analyze this code"
- Quick inline actions

---

## 🚨 Important Implications

### If a component does NOT use `useAiRun`:

1. ❌ **No database record** - Run doesn't exist after execution
2. ❌ **No message history** - Lost when component unmounts  
3. ❌ **No metrics** - Can't see tokens/cost later
4. ❌ **Not in sidebar** - Won't appear in runs list
5. ❌ **Can't reload** - Can't come back to it
6. ❌ **Can't continue** - Can't add follow-up messages

### This is **BY DESIGN** for utility functions!

---

## 📊 Summary Table

| Feature | WITH useAiRun ✅ | WITHOUT useAiRun ❌ |
|---------|-----------------|---------------------|
| Database record | ✅ Saved | ❌ None |
| Message history | ✅ Saved | ❌ Lost on unmount |
| Task tracking | ✅ All tasks | ❌ No tracking |
| Metrics/Cost | ✅ Calculated | ❌ Not saved |
| Runs sidebar | ✅ Appears | ❌ Not listed |
| Can reload | ✅ Yes | ❌ No |
| Follow-up messages | ✅ Yes | ❌ No (new execution) |
| URL persistence | ✅ Via runId | ❌ No |

---

## 🔧 How to Add Run Tracking to a Component

If you want a component to save runs, wrap it with `useAiRun`:

```typescript
// Before (no tracking)
const { execute, streamingText } = usePromptExecution();

// After (with tracking)
const { run, createRun, createTask, addMessage, completeTask } = useAiRun();

// In your execution logic
if (!run) {
  const newRun = await createRun({
    source_type: 'prompt',
    source_id: promptId,
    name: 'My Run',
    settings: modelConfig,
  });
}

const taskId = uuidv4();
await createTask({ task_id: taskId, ... }, run.id);
await addMessage({ role: 'user', content }, run.id);
// ... execute ...
await addMessage({ role: 'assistant', content }, run.id);
await completeTask(taskId, { tokens, cost });
```

---

## 🎯 Recommendations

### Current Setup is GOOD ✅

Your two-pattern approach is correct:
- ✅ Conversational interfaces → Use `useAiRun`
- ✅ Utility executions → Direct socket or `usePromptExecution`

### Key Insight

**`useAiRun` is your "save conversation" switch.**
- Turn it ON → Full history, metrics, persistence
- Leave it OFF → Quick utility, no clutter

Both patterns have their place! 🎉

