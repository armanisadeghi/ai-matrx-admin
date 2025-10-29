# Socket.IO Execution Fix

## Problem

The programmatic prompt execution system was incorrectly using direct Next.js API calls instead of Socket.IO, causing a 404 error:

```
Error: 404 The model `596384c7-913c-47b-9aef-02eec511f62b` does not exist
```

This occurred because:
1. The system was trying to use `/api/prompts/execute` endpoint directly
2. Model IDs were being passed incorrectly to the frontend API
3. The authentication and task management system wasn't being used

## Solution

Converted the execution system to use **Socket.IO** (same as `PromptRunner`):

### Changes Made

#### 1. **PromptExecutionService** (`features/prompts/services/prompt-execution-service.ts`)

- **Removed**: Direct API fetch calls via `/api/prompts/execute`
- **Added**: Redux store integration with `dispatch` and `getState`
- **Added**: `setStore()` method to initialize with Redux
- **Changed**: Execution method from `executePrompt()` to `executePromptViaSocket()`
- **Uses**: `createAndSubmitTask` thunk from Socket.IO
- **Uses**: Proper selector pattern for streaming responses

#### 2. **usePromptExecution Hook** (`features/prompts/hooks/usePromptExecution.ts`)

- **Added**: `useAppDispatch` hook
- **Added**: `useEffect` to initialize service with Redux store on mount
- **Ensures**: Service has access to dispatch and getState before execution

#### 3. **API Route Removed**

- **Deleted**: `app/api/prompts/execute/route.ts` (no longer needed)

### Technical Details

The service now:

1. **Submits tasks via Socket.IO** using `createAndSubmitTask`:
```typescript
await this.dispatch!(createAndSubmitTask({
  service: 'chat_service',
  taskName: 'direct_chat',
  taskData: { chat_config: chatConfig },
  customTaskId: taskId
}));
```

2. **Polls for responses** using Redux selectors:
```typescript
const streamingText = selectPrimaryResponseTextByTaskId(taskId)(state);
const isResponseEnded = selectPrimaryResponseEndedByTaskId(taskId)(state);
```

3. **Provides progress updates** during streaming
4. **Handles timeouts** (2-minute default)

### Selector Pattern

**Important**: The Socket.IO selectors follow this pattern:
```typescript
// ❌ Wrong
const text = selectPrimaryResponseTextByTaskId(state, taskId);

// ✅ Correct
const text = selectPrimaryResponseTextByTaskId(taskId)(state);
```

The selectors are **factory functions** that take the taskId first, then return a selector that takes the state.

## Benefits

✅ **Consistent execution** - Uses the same proven Socket.IO infrastructure as PromptRunner  
✅ **Proper authentication** - Leverages existing Socket.IO auth  
✅ **Real-time streaming** - Gets live updates as AI generates response  
✅ **Task management** - Integrates with ai_runs and ai_tasks tables  
✅ **Error handling** - Benefits from Socket.IO's error handling and reconnection logic

## Testing

The System Prompt Optimizer now correctly:
1. Submits tasks via Socket.IO
2. Streams AI responses in real-time
3. Uses the correct model and settings from the prompt configuration
4. Handles errors gracefully

## Files Modified

- `features/prompts/services/prompt-execution-service.ts` - Core service rewritten for Socket.IO
- `features/prompts/hooks/usePromptExecution.ts` - Added Redux store initialization
- `app/api/prompts/execute/route.ts` - **Deleted** (no longer needed)

---

**Date**: 2025-10-29  
**Issue**: 404 model not found error  
**Root Cause**: Using direct API calls instead of Socket.IO  
**Resolution**: Converted to Socket.IO execution pattern matching PromptRunner

