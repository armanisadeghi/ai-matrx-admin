# Redux Architecture Examples
## Concrete Implementation Patterns

---

## 📐 Architecture Diagrams

### Current Flow (Problematic)

```
┌─────────────────────────────────────────────────────────────────┐
│ AICodeEditorModal Component                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Local State: [resources, setResources]                   │  │
│  │ Local State: [chatInput, setChatInput]                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ useAICodeEditor Hook                                     │  │
│  │  - Special variables logic (useEffect)                   │  │
│  │  - Response processing (useEffect)                       │  │
│  │  - Resource management (useState)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PromptInput Component                                    │  │
│  │  - File upload logic                                     │  │
│  │  - Clipboard paste handling                              │  │
│  │  - Resource state management                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────┐
         │ Redux (Just Storage)            │
         │  - instances[runId]             │
         │  - resources[runId] (unused!)   │
         └─────────────────────────────────┘
```

### Proposed Flow (Centralized)

```
┌─────────────────────────────────────────────────────────────────┐
│ AICodeEditorModal Component (Thin)                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ dispatch(addResource({ runId, resource }))               │  │
│  │ dispatch(processCodeResponse({ runId, response }))       │  │
│  │ const resources = useSelector(selectResources)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────────────┐
         │ Redux Thunks (Business Logic)                   │
         │                                                  │
         │  ┌────────────────────────────────────────────┐ │
         │  │ populateSpecialVariables()                 │ │
         │  │  - Auto-detects code editor variables      │ │
         │  │  - Populates from context                  │ │
         │  └────────────────────────────────────────────┘ │
         │                                                  │
         │  ┌────────────────────────────────────────────┐ │
         │  │ processCodeEditorResponse()                │ │
         │  │  - Parse → Validate → Apply → Diff        │ │
         │  └────────────────────────────────────────────┘ │
         │                                                  │
         │  ┌────────────────────────────────────────────┐ │
         │  │ uploadAndAddResource()                     │ │
         │  │  - Upload file                             │ │
         │  │  - Add to resources                        │ │
         │  │  - Track progress                          │ │
         │  └────────────────────────────────────────────┘ │
         │                                                  │
         └──────────────────┬───────────────────────────────┘
                            │
                            ▼
         ┌─────────────────────────────────────────────────┐
         │ Utilities (Pure Functions)                      │
         │                                                  │
         │  - parseCodeEdits()                             │
         │  - validateEdits()                              │
         │  - applyCodeEdits()                             │
         │  - serializeResources()                         │
         │  - buildSpecialVariables()                      │
         └──────────────────┬───────────────────────────────┘
                            │
                            ▼
         ┌─────────────────────────────────────────────────┐
         │ Redux State (Single Source of Truth)            │
         │                                                  │
         │  instances: {                                    │
         │    [runId]: { variables, messages, ... }        │
         │  }                                               │
         │  resources: {                                    │
         │    [runId]: [resource1, resource2, ...]         │
         │  }                                               │
         │  codeEditorState: {                             │
         │    [runId]: { processedResponse, state }        │
         │  }                                               │
         └─────────────────────────────────────────────────┘
```

---

## 💻 Code Examples

### Example 1: Resource Management (Before & After)

#### BEFORE: Component manages everything

```typescript
// AICodeEditorModal.tsx (OLD)
export function AICodeEditorModal({ ... }) {
  const [resources, setResources] = useState<Resource[]>([]);
  
  const handleResourceAdd = useCallback((resource: Resource) => {
    setResources(prev => [...prev, resource]);
  }, []);
  
  const handleResourceRemove = useCallback((index: number) => {
    setResources(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const handlePasteImage = useCallback(async (file: File) => {
    try {
      const results = await uploadMultipleToPrivateUserAssets([file]);
      if (results && results.length > 0) {
        setResources(prev => [...prev, { type: "file", data: results[0] }]);
      }
    } catch (error) {
      console.error("Failed to upload:", error);
    }
  }, [uploadMultipleToPrivateUserAssets]);
  
  // Then pass resources to PromptInput
  return (
    <PromptInput
      resources={resources}
      onResourcesChange={setResources}
      // ...
    />
  );
}
```

#### AFTER: Redux manages everything

```typescript
// AICodeEditorModal.tsx (NEW)
export function AICodeEditorModal({ ... }) {
  const dispatch = useAppDispatch();
  
  // Resources come from Redux
  const resources = useAppSelector(state => 
    runId ? selectResources(state, runId) : EMPTY_ARRAY
  );
  
  // Simple action dispatches
  const handleResourceAdd = useCallback((resource: Resource) => {
    if (runId) {
      dispatch(addResource({ runId, resource }));
    }
  }, [runId, dispatch]);
  
  const handleResourceRemove = useCallback((index: number) => {
    if (runId) {
      dispatch(removeResource({ runId, index }));
    }
  }, [runId, dispatch]);
  
  // Upload is now a thunk
  const handlePasteImage = useCallback(async (file: File) => {
    if (!runId) return;
    
    try {
      await dispatch(uploadAndAddImageResource({
        runId,
        file,
        bucket: 'userContent',
        path: 'code-editor-attachments',
      })).unwrap();
    } catch (error) {
      console.error("Failed to upload:", error);
    }
  }, [runId, dispatch]);
  
  // PromptInput now just needs runId
  return (
    <PromptInput
      runId={runId}
      // No resources prop needed!
      // ...
    />
  );
}
```

**Benefits:**
- ✅ No local state management
- ✅ Resources accessible from anywhere in app
- ✅ Upload logic centralized
- ✅ Easier to test
- ✅ Redux DevTools visibility

---

### Example 2: Special Variables (Before & After)

#### BEFORE: Hook manages population

```typescript
// useAICodeEditor.ts (OLD)
export function useAICodeEditor({ currentCode, selection, context, ... }) {
  // Populate special variables when prompt is loaded
  useEffect(() => {
    if (runId && cachedPrompt) {
      const promptVariables = cachedPrompt.variableDefaults || [];
      const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);

      if (requiredSpecialVars.length > 0) {
        const codeContext: CodeEditorContext = {
          currentCode,
          selection,
          context,
        };

        const specialVars = buildSpecialVariables(codeContext, requiredSpecialVars);
        logSpecialVariablesUsage(cachedPrompt.name, specialVars);

        Object.entries(specialVars).forEach(([name, value]) => {
          dispatch(updateVariable({
            runId,
            variableName: name,
            value,
          }));
        });
      }
    }
  }, [runId, cachedPrompt, currentCode, selection, context, dispatch]);
  
  // Similar logic duplicated in handleSubmit!
  const handleSubmit = useCallback(async (userInput: string = '') => {
    // ... 
    // Same special variable population again
    const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);
    if (requiredSpecialVars.length > 0) {
      const codeContext: CodeEditorContext = {
        currentCode,
        selection,
        context,
      };
      const specialVars = buildSpecialVariables(codeContext, requiredSpecialVars);
      Object.entries(specialVars).forEach(([name, value]) => {
        dispatch(updateVariable({ runId, variableName: name, value }));
      });
    }
    // ...
  }, [/* many dependencies */]);
}
```

#### AFTER: Thunk manages population

```typescript
// useAICodeEditor.ts (NEW)
export function useAICodeEditor({ currentCode, selection, context, ... }) {
  // Single effect, calls centralized thunk
  useEffect(() => {
    if (runId) {
      dispatch(populateSpecialVariables({
        runId,
        codeContext: { currentCode, selection, context }
      }));
    }
  }, [runId, currentCode, selection, context, dispatch]);
  
  // handleSubmit is simpler
  const handleSubmit = useCallback(async (userInput: string = '') => {
    if (!runId) return;
    
    // Refresh special variables before execution
    await dispatch(populateSpecialVariables({
      runId,
      codeContext: { currentCode, selection, context }
    }));
    
    // Execute message (variables are already in Redux)
    await dispatch(executeMessage({ runId, userInput }));
  }, [runId, currentCode, selection, context, dispatch]);
}
```

**Benefits:**
- ✅ No duplication
- ✅ Logic testable independently
- ✅ Can be called from anywhere
- ✅ Consistent behavior

---

### Example 3: Response Processing (Before & After)

#### BEFORE: Complex logic in hook

```typescript
// useAICodeEditor.ts (OLD)
const [parsedEdits, setParsedEdits] = useState<...>(null);
const [modifiedCode, setModifiedCode] = useState('');
const [errorMessage, setErrorMessage] = useState('');

// Massive useEffect handling response processing
useEffect(() => {
  if (rawAIResponse && !isExecuting && state === 'processing') {
    const parsed = parseCodeEdits(rawAIResponse);
    setParsedEdits(parsed);

    if (!parsed.success || parsed.edits.length === 0) {
      console.log('📝 No code edits found');
      setState('input');
      return;
    }

    const validation = validateEdits(currentCode, parsed.edits);

    if (validation.warnings.length > 0) {
      console.log('⚠️ Fuzzy Matching Applied:');
      validation.warnings.forEach(w => console.log(`  - ${w}`));
    }

    if (!validation.valid) {
      console.error('❌ Edit validation failed');
      setState('error');
      let errorMsg = `⚠️ INVALID CODE EDITS\n\n`;
      // ... 20+ lines of error formatting
      setErrorMessage(errorMsg);
      return;
    }

    const result = applyCodeEdits(currentCode, parsed.edits);

    if (result.warnings.length > 0) {
      console.log('✓ Applied with fuzzy matching:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

    if (!result.success) {
      setState('error');
      let errorMsg = `Error Applying Edits:\n\n`;
      result.errors.forEach((err, i) => {
        errorMsg += `${i + 1}. ${err}\n`;
      });
      setErrorMessage(errorMsg);
      return;
    }

    setModifiedCode(result.code || '');
    setState('review');
  }
}, [rawAIResponse, isExecuting, state, currentCode]);
```

#### AFTER: Simple thunk call

```typescript
// useAICodeEditor.ts (NEW)

// Response processing in useEffect - just dispatch thunk
useEffect(() => {
  if (rawAIResponse && !isExecuting && state === 'processing') {
    dispatch(processCodeEditorResponse({
      runId,
      aiResponse: rawAIResponse,
      currentCode
    }));
  }
}, [rawAIResponse, isExecuting, state, currentCode, runId, dispatch]);

// Read results from Redux
const codeEditorState = useAppSelector(state =>
  runId ? selectCodeEditorState(state, runId) : null
);

const { processedResponse, editorState } = codeEditorState || {};
```

**Benefits:**
- ✅ Hook is dramatically simpler
- ✅ Processing logic is pure and testable
- ✅ Can be reused in other contexts
- ✅ Clear separation of concerns

---

### Example 4: PromptInput Refactor

#### BEFORE: Manages resources internally

```typescript
// PromptInput.tsx (OLD)
export function PromptInput({
  resources = [],
  onResourcesChange,
  enablePasteImages,
  uploadBucket,
  uploadPath,
  ...
}) {
  // Upload logic in component
  const { uploadMultipleToPrivateUserAssets } = useFileUploadWithStorage(
    uploadBucket,
    uploadPath
  );
  
  const handleResourceSelected = useCallback((resource: any) => {
    if (onResourcesChange) {
      onResourcesChange((prev: Resource[]) => [...prev, resource]);
    }
  }, [onResourcesChange]);
  
  const handleRemoveResource = useCallback((index: number) => {
    if (onResourcesChange) {
      onResourcesChange((prev: Resource[]) => prev.filter((_, i) => i !== index));
    }
  }, [onResourcesChange]);
  
  const handlePasteImage = useCallback(async (file: File) => {
    try {
      const results = await uploadMultipleToPrivateUserAssets([file]);
      if (results && results.length > 0 && onResourcesChange) {
        onResourcesChange((prev: Resource[]) => [
          ...prev,
          { type: "file", data: results[0] }
        ]);
      }
    } catch (error) {
      console.error("Failed to upload pasted image:", error);
    }
  }, [onResourcesChange, uploadMultipleToPrivateUserAssets]);
  
  // ... rest of component
}
```

#### AFTER: Redux manages resources

```typescript
// PromptInputV2.tsx (NEW)
export function PromptInputV2({
  runId,  // <-- Main change: just need runId!
  enablePasteImages,
  uploadBucket = 'userContent',
  uploadPath = 'prompt-attachments',
  ...
}) {
  const dispatch = useAppDispatch();
  
  // Resources from Redux
  const resources = useAppSelector(state =>
    runId ? selectResources(state, runId) : EMPTY_ARRAY
  );
  
  // Simple action dispatches
  const handleResourceSelected = useCallback((resource: Resource) => {
    if (runId) {
      dispatch(addResource({ runId, resource }));
    }
  }, [runId, dispatch]);
  
  const handleRemoveResource = useCallback((index: number) => {
    if (runId) {
      dispatch(removeResource({ runId, index }));
    }
  }, [runId, dispatch]);
  
  // Upload via thunk
  const handlePasteImage = useCallback(async (file: File) => {
    if (!runId) return;
    
    try {
      await dispatch(uploadAndAddImageResource({
        runId,
        file,
        bucket: uploadBucket,
        path: uploadPath,
      })).unwrap();
    } catch (error) {
      console.error("Failed to upload:", error);
      toast.error('Upload failed');
    }
  }, [runId, uploadBucket, uploadPath, dispatch]);
  
  // ... rest of component (much simpler!)
}
```

**Benefits:**
- ✅ Drastically simpler component
- ✅ No prop drilling
- ✅ Resources accessible from anywhere
- ✅ Upload progress can be tracked
- ✅ Undo/redo becomes possible

---

## 🔄 Data Flow Comparison

### Current: Props Drilling Hell

```typescript
// Deep prop drilling
<PromptRunPage>
  ↓ [resources, setResources]
  <PromptExecutor>
    ↓ [resources, setResources]
    <PromptInput
      resources={resources}
      onResourcesChange={setResources}
    >
      ↓ resources needed here
      <ResourcePicker />
      <ResourceChips />
    </PromptInput>
  </PromptExecutor>
</PromptRunPage>
```

### Proposed: Redux Context

```typescript
// No prop drilling - everything through Redux
<PromptRunPage>
  ↓ [just runId]
  <PromptExecutor runId={runId}>
    ↓ [just runId]
    <PromptInputV2 runId={runId}>
      ↓ [just runId - resources from Redux]
      <ResourcePicker runId={runId} />
      <ResourceChips runId={runId} />
    </PromptInputV2>
  </PromptExecutor>
</PromptRunPage>

// Any component can access resources:
const resources = useAppSelector(state => selectResources(state, runId));
```

---

## 🎯 Real-World Usage Examples

### Example: Adding Resource from File Picker

```typescript
// ResourcePickerButton.tsx (NEW)
export function ResourcePickerButton({ runId }: { runId: string }) {
  const dispatch = useAppDispatch();
  
  const handleFileSelect = async (file: File) => {
    try {
      // Thunk handles everything
      await dispatch(uploadAndAddFileResource({
        runId,
        file,
        bucket: 'userContent',
        path: 'attachments',
      })).unwrap();
      
      toast.success('File added');
    } catch (error) {
      toast.error('Upload failed');
    }
  };
  
  return <FilePicker onSelect={handleFileSelect} />;
}
```

### Example: Displaying Resources

```typescript
// ResourceChips.tsx (NEW)
export function ResourceChips({ runId }: { runId: string }) {
  const dispatch = useAppDispatch();
  
  // Resources from Redux
  const resources = useAppSelector(state => 
    selectResources(state, runId)
  );
  
  const handleRemove = (index: number) => {
    dispatch(removeResource({ runId, index }));
  };
  
  return (
    <div className="flex gap-2">
      {resources.map((resource, idx) => (
        <ResourceChip
          key={idx}
          resource={resource}
          onRemove={() => handleRemove(idx)}
        />
      ))}
    </div>
  );
}
```

### Example: Using Resources in Message Execution

```typescript
// executeMessageThunk.ts
export const executeMessage = createAsyncThunk(
  'promptExecution/executeMessage',
  async ({ runId, userInput }, { getState, dispatch }) => {
    const state = getState();
    
    // Get resources from Redux (already there!)
    const resources = selectResources(state, runId);
    
    // Build message with resources
    let message = userInput;
    if (resources.length > 0) {
      const resourceContext = serializeResourcesForAPI(resources);
      message = resourceContext + '\n\n' + message;
    }
    
    // Execute...
  }
);
```

---

## 🧪 Testing Examples

### Before: Hard to test (needs component mount)

```typescript
// Can't easily test this without mounting component
describe('Resource Management', () => {
  it('should add resource', () => {
    const { result } = renderHook(() => useAICodeEditor({ ... }));
    
    // Hard to test - need to mock component lifecycle
    // Need to trigger effects manually
    // State is internal to hook
  });
});
```

### After: Easy to test (pure functions & thunks)

```typescript
// Test utility directly
describe('serializeResourcesForAPI', () => {
  it('should serialize file resources', () => {
    const resources = [
      { type: 'file', data: { filename: 'test.txt' } }
    ];
    
    const result = serializeResourcesForAPI(resources);
    
    expect(result).toBe('[Attachment 1: test.txt]');
  });
});

// Test thunk with mock store
describe('uploadAndAddFileResource', () => {
  it('should upload and add resource', async () => {
    const store = mockStore();
    const file = new File(['test'], 'test.txt');
    
    await store.dispatch(uploadAndAddFileResource({
      runId: 'test-run',
      file,
      bucket: 'test',
      path: 'test'
    }));
    
    const actions = store.getActions();
    expect(actions).toContainEqual(
      addResource({ runId: 'test-run', resource: expect.any(Object) })
    );
  });
});
```

---

## 📊 Performance Comparison

### Current Architecture
```
User types in input → setState() → Component re-renders
User adds resource → setState() → Component re-renders
AI responds → setState() many times → Many re-renders
```

### Proposed Architecture
```
User types in input → dispatch() → Only subscribed components re-render
User adds resource → dispatch() → Only ResourceChips re-renders
AI responds → dispatch() → Only message display re-renders
```

**Why it's faster:**
- Redux subscriptions are more granular
- Components only re-render when their selected slice changes
- Memoization works better with Redux selectors
- Fewer parent → child re-renders

---

## 🎓 Learning Resources

### For developers implementing this:

1. **Redux Toolkit Best Practices**
   - [Creating Slices](https://redux-toolkit.js.org/api/createSlice)
   - [Async Thunks](https://redux-toolkit.js.org/api/createAsyncThunk)
   - [Selectors](https://redux-toolkit.js.org/api/createSelector)

2. **Testing Redux**
   - [Testing Utilities](https://redux.js.org/usage/writing-tests)
   - [Mock Store](https://github.com/reduxjs/redux-mock-store)

3. **Performance Optimization**
   - [Reselect](https://github.com/reduxjs/reselect)
   - [React-Redux Performance](https://react-redux.js.org/api/hooks#performance)

---

## 🚀 Quick Start Guide

### Step 1: Create your first utility

```typescript
// lib/redux/prompt-execution/utils/myUtil.ts
export function myPureFunction(input: string): string {
  // Pure function - no side effects
  return input.toUpperCase();
}
```

### Step 2: Create your first thunk

```typescript
// lib/redux/prompt-execution/thunks/myThunk.ts
import { createAsyncThunk } from '@reduxjs/toolkit';

export const myThunk = createAsyncThunk(
  'promptExecution/myThunk',
  async ({ runId, data }, { dispatch, getState }) => {
    const state = getState();
    // Do async work
    const result = await someAsyncWork(data);
    // Dispatch actions
    dispatch(someAction({ runId, result }));
    return result;
  }
);
```

### Step 3: Use in component

```typescript
// components/MyComponent.tsx
export function MyComponent({ runId }: { runId: string }) {
  const dispatch = useAppDispatch();
  
  const handleClick = async () => {
    try {
      const result = await dispatch(myThunk({ runId, data: '...' })).unwrap();
      toast.success('Success!');
    } catch (error) {
      toast.error('Failed!');
    }
  };
  
  return <button onClick={handleClick}>Do Something</button>;
}
```

---

## 🎉 Conclusion

This refactoring will:
- ✅ Reduce component complexity by 50%+
- ✅ Improve testability dramatically
- ✅ Enable new features (undo/redo, persistence, etc.)
- ✅ Make debugging easier (Redux DevTools)
- ✅ Improve code reusability
- ✅ Standardize patterns across the app

**The key insight:** Business logic belongs in Redux, not components. Components should be thin presentation layers that dispatch actions and select state.

