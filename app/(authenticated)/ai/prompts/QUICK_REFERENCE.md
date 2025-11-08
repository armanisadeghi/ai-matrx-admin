# Custom UI System - Quick Reference Guide

## 🎯 Quick Start

### Minimal Working Example

```typescript
'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import { selectPrimaryResponseTextByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { v4 as uuidv4 } from 'uuid';

export function MinimalCustomUI({ promptData }) {
  const dispatch = useAppDispatch();
  const [taskId, setTaskId] = useState(null);
  const [userInput, setUserInput] = useState('');
  
  const response = useAppSelector(state => 
    taskId ? selectPrimaryResponseTextByTaskId(state, taskId) : ""
  );
  
  const handleRun = async () => {
    const newTaskId = uuidv4();
    setTaskId(newTaskId);
    
    await dispatch(createAndSubmitTask({
      service: "chat_service",
      taskName: "direct_chat",
      taskData: {
        chat_config: {
          model_id: promptData.settings.model_id,
          messages: [
            ...promptData.messages,
            { role: "user", content: userInput }
          ],
          stream: true,
        }
      },
      customTaskId: newTaskId,
    }));
  };
  
  return (
    <div>
      <input value={userInput} onChange={e => setUserInput(e.target.value)} />
      <button onClick={handleRun}>Run</button>
      <EnhancedChatMarkdown content={response} taskId={taskId} />
    </div>
  );
}
```

---

## 📚 Core Concepts

### 1. Prompt Structure

```typescript
{
  id: "uuid",
  name: "My Prompt",
  messages: [
    { role: "system", content: "You are a {{role}}" },
    { role: "user", content: "{{user_input}}" }
  ],
  variableDefaults: [
    { name: "role", defaultValue: "helper" },
    { name: "user_input", defaultValue: "" }
  ],
  settings: {
    model_id: "gpt-4",
    temperature: 0.7,
    max_tokens: 1000
  }
}
```

### 2. Variable Resolution

```typescript
// Simple string replacement
const resolved = content.replace(/{{variable_name}}/g, value);

// For all variables:
let resolvedContent = message.content;
Object.entries(variables).forEach(([key, value]) => {
  resolvedContent = resolvedContent.replace(
    new RegExp(`{{${key}}}`, 'g'), 
    value
  );
});
```

### 3. Task Submission

```typescript
// 1. Generate task ID
const taskId = uuidv4();

// 2. Build config
const chatConfig = {
  model_id: "gpt-4",
  messages: resolvedMessages,
  stream: true,
  ...otherSettings
};

// 3. Submit via Redux
await dispatch(createAndSubmitTask({
  service: "chat_service",
  taskName: "direct_chat",
  taskData: { chat_config: chatConfig },
  customTaskId: taskId,
}));
```

### 4. Consume Streaming Response

```typescript
// In component:
const text = useAppSelector(state => 
  selectPrimaryResponseTextByTaskId(state, taskId)
);

const isDone = useAppSelector(state =>
  selectPrimaryResponseEndedByTaskId(state, taskId)
);
```

---

## 🔧 Common Patterns

### Pattern: Modal Execution

```typescript
import { usePromptRunnerModal } from '@/features/prompts/hooks/usePromptRunnerModal';
import { PromptRunnerModal } from '@/features/prompts/components/modal/PromptRunnerModal';

function MyComponent({ promptData }) {
  const modal = usePromptRunnerModal();
  
  const handleQuickRun = () => {
    modal.open({
      promptData,
      mode: 'auto-run',
      variables: { topic: 'AI' }
    });
  };
  
  return (
    <>
      <button onClick={handleQuickRun}>Quick Run</button>
      {modal.config && <PromptRunnerModal isOpen={modal.isOpen} onClose={modal.close} {...modal.config} />}
    </>
  );
}
```

### Pattern: With AI Runs Tracking

```typescript
import { useAiRun } from '@/features/ai-runs/hooks/useAiRun';

function MyComponent({ promptData }) {
  const { run, createRun, createTask } = useAiRun();
  
  const handleRunWithTracking = async () => {
    // Create run
    const newRun = await createRun({
      source_type: 'prompt',
      source_id: promptData.id,
      name: 'My Analysis',
      settings: promptData.settings,
    });
    
    // Create task
    const taskId = uuidv4();
    await createTask({
      task_id: taskId,
      service: 'chat_service',
      task_name: 'direct_chat',
      model_id: promptData.settings.model_id,
      request_data: chatConfig,
    }, newRun.id);
    
    // Submit to socket
    await dispatch(createAndSubmitTask({
      service: "chat_service",
      taskName: "direct_chat",
      taskData: { chat_config: chatConfig },
      customTaskId: taskId,
    }));
  };
}
```

---

## 📋 Required Imports

```typescript
// Redux
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';

// Socket.IO
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import { 
  selectPrimaryResponseTextByTaskId,
  selectPrimaryResponseEndedByTaskId 
} from '@/lib/redux/socket-io/selectors/socket-response-selectors';

// AI Runs
import { useAiRun } from '@/features/ai-runs/hooks/useAiRun';

// Components
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';

// Utils
import { v4 as uuidv4 } from 'uuid';

// Types
import type { PromptMessage, PromptVariable } from '@/features/prompts/types/core';
```

---

## 🎨 Component Props

### PromptData (from database)

```typescript
interface PromptData {
  id: string;
  name: string;
  description?: string;
  messages: PromptMessage[];
  variableDefaults?: PromptVariable[];
  settings: {
    model_id: string;  // REQUIRED
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
  };
}
```

### EnhancedChatMarkdown

```typescript
<EnhancedChatMarkdown
  content={string}              // The markdown text
  taskId={string | null}        // Socket task ID
  isStreamActive={boolean}      // Is still streaming?
  role="assistant"              // 'user' | 'assistant' | 'system'
  type="message"                // Display type
  hideCopyButton={boolean}      // Hide copy button
  allowFullScreenEditor={boolean}
  className={string}
  onContentChange={(newContent) => {}}  // Optional edit callback
/>
```

### PromptRunnerModal

```typescript
interface PromptRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptData: PromptData;
  mode?: 'auto-run' | 'auto-run-one-shot' | 'manual-with-hidden-variables' 
       | 'manual-with-visible-variables' | 'manual';
  variables?: Record<string, string>;
  initialMessage?: string;
  title?: string;
  runId?: string;
  onExecutionComplete?: (result) => void;
}
```

---

## 🗄️ Database Tables

### prompts (existing)

```sql
- id: UUID
- user_id: UUID
- name: TEXT
- description: TEXT
- messages: JSONB         -- Array of {role, content, metadata?}
- variable_defaults: JSONB -- Array of {name, defaultValue, customComponent?}
- settings: JSONB         -- {model_id, temperature, max_tokens, ...}
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### prompt_custom_uis (new)

```sql
- id: UUID
- user_id: UUID
- prompt_id: UUID → prompts(id)
- name: TEXT
- description: TEXT
- component_code: TEXT    -- The JSX/TSX code
- component_type: TEXT    -- 'react' | 'template' | 'json-schema'
- execution_mode: TEXT    -- 'auto-run' | 'manual' | etc
- auto_submit: BOOLEAN
- show_variables: BOOLEAN
- is_public: BOOLEAN
- status: TEXT            -- 'draft' | 'active' | 'archived'
- validated: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### ai_runs (existing)

```sql
- id: UUID
- user_id: UUID
- source_type: TEXT       -- 'prompt' | 'chat' | 'applet' | etc
- source_id: UUID         -- The prompt ID
- name: TEXT
- messages: JSONB         -- Full conversation history
- settings: JSONB
- variable_values: JSONB
- total_tokens: INTEGER
- total_cost: DECIMAL
- message_count: INTEGER
- task_count: INTEGER
- is_starred: BOOLEAN
- status: TEXT            -- 'active' | 'archived' | 'deleted'
- created_at: TIMESTAMPTZ
- last_message_at: TIMESTAMPTZ
```

### ai_tasks (existing)

```sql
- id: UUID
- run_id: UUID → ai_runs(id)
- task_id: UUID           -- Socket.IO task ID
- service: TEXT           -- 'chat_service'
- task_name: TEXT         -- 'direct_chat'
- model_id: TEXT
- request_data: JSONB     -- The chat_config
- response_text: TEXT
- tokens_total: INTEGER
- cost: DECIMAL
- time_to_first_token: INTEGER
- total_time: INTEGER
- status: TEXT            -- 'pending' | 'streaming' | 'completed' | 'failed'
- created_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
```

---

## 🚀 Execution Modes

```typescript
type ExecutionMode = 
  | 'auto-run'                      // Auto-submit, allow follow-ups
  | 'auto-run-one-shot'             // Auto-submit, no follow-ups
  | 'manual-with-hidden-variables'  // User adds instructions, variables hidden
  | 'manual-with-visible-variables' // User edits everything
  | 'manual';                       // Standard prompt runner
```

---

## ⚠️ Common Mistakes

### ❌ Wrong: Direct LLM calls
```typescript
// DON'T do this
const response = await openai.chat.completions.create({...});
```

### ✅ Right: Socket.IO via Redux
```typescript
// DO this
await dispatch(createAndSubmitTask({
  service: "chat_service",
  taskName: "direct_chat",
  taskData: { chat_config: {...} }
}));
```

---

### ❌ Wrong: String concatenation for streaming
```typescript
// DON'T do this
const [response, setResponse] = useState('');
socket.on('data', chunk => setResponse(response + chunk));
```

### ✅ Right: Use Redux selectors
```typescript
// DO this
const response = useAppSelector(state =>
  selectPrimaryResponseTextByTaskId(state, taskId)
);
```

---

### ❌ Wrong: Missing model_id
```typescript
// DON'T do this
const chatConfig = {
  messages: messages,
  stream: true
};
```

### ✅ Right: Always include model_id
```typescript
// DO this
const chatConfig = {
  model_id: promptData.settings.model_id,
  messages: messages,
  stream: true,
  ...promptData.settings
};
```

---

## 📞 Support & References

- **Full Documentation**: `/app/(authenticated)/ai/prompts/CUSTOM_UI_SYSTEM.md`
- **Prompt Types**: `/features/prompts/types/core.ts`
- **Modal Hook**: `/features/prompts/hooks/usePromptRunnerModal.ts`
- **AI Runs Hook**: `/features/ai-runs/hooks/useAiRun.ts`
- **Socket Selectors**: `/lib/redux/socket-io/selectors/socket-response-selectors.ts`
- **Submit Task**: `/lib/redux/socket-io/thunks/submitTaskThunk.ts`

---

## 🎓 Learning Path

1. **Start Simple**: Use `PromptRunnerModal` for quick executions
2. **Add Tracking**: Integrate `useAiRun` for conversation history
3. **Custom UI**: Build your own component with Redux/Socket.IO
4. **Advanced**: Dynamic component loading from database

---

## 💡 Pro Tips

1. **Always use uuidv4** for task IDs - don't let Redux generate them
2. **Match taskId** between `createTask()` and `createAndSubmitTask()`
3. **Use EnhancedChatMarkdown** - it handles all the hard parts
4. **Test streaming** - make sure `stream: true` is in config
5. **Check selectors** - responses are keyed by taskId
6. **Track in AI Runs** - free analytics and conversation history
7. **Validate before submit** - check for required fields (especially `model_id`)
8. **Handle errors** - wrap in try/catch and show user-friendly messages

---

## 🔍 Debugging

```typescript
// 1. Check if task was created
console.log('Task ID:', taskId);

// 2. Check Redux state
const state = store.getState();
console.log('Task:', state.socketTasks.tasks[taskId]);
console.log('Response:', state.socketResponse[listenerId]);

// 3. Check selectors
console.log('Text:', selectPrimaryResponseTextByTaskId(state, taskId));
console.log('Ended:', selectPrimaryResponseEndedByTaskId(state, taskId));

// 4. Check socket connection
const connection = state.socketConnections.connections['primary'];
console.log('Connected:', connection?.connectionStatus === 'connected');
```

---

**Remember**: Everything flows through Redux + Socket.IO. If you're not using these, you're doing it wrong! 🎯

