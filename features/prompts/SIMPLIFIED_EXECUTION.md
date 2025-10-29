# Simplified Prompt Execution System

## What Changed

**Removed all the overcomplicated stuff** and made it work exactly like `PromptRunner`:

### Before (Overcomplicated)
- Service class with refs
- Complex store access patterns  
- Unnecessary abstractions

### After (Simple)
- Direct `dispatch()` + selectors
- Standard Redux patterns
- No refs, no services, just hooks

## The Hook Now

```typescript
export function usePromptExecution() {
  const dispatch = useAppDispatch();
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  // Watch streaming text via selector
  const streamingText = useAppSelector(state => 
    currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ''
  );
  
  const execute = async (config) => {
    // 1. Fetch prompt
    // 2. Replace variables  
    // 3. Dispatch task
    await dispatch(createAndSubmitTask({
      service: 'chat_service',
      taskName: 'direct_chat',
      taskData: { chat_config: chatConfig },
      customTaskId: taskId
    })).unwrap();
    
    // Done - streaming happens via selectors
  };
  
  return { execute, isExecuting, streamingText, error, reset };
}
```

## Usage

```typescript
const { execute, isExecuting, streamingText } = usePromptExecution();

// Execute
await execute({
  promptId: 'my-prompt-id',
  variables: {
    myVar: { type: 'hardcoded', value: 'hello' }
  }
});

// Watch streaming text automatically via selector
console.log(streamingText); // Updates in real-time
```

## Modal Close Fix

Changed Dialog `onOpenChange` to only close on explicit user action:
```typescript
<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
```

This prevents the dialog from closing when buttons inside are clicked.

---

**Bottom line**: Stop overengineering. Use dispatch, use selectors, done.

