# Refactor Compact Modal - Eliminate Duplication

## The Problem You Identified (You're Right!)

### Issue 1: Duplicate Components
I created `PromptCompactModal-new.tsx` instead of refactoring the existing `PromptCompactModal.tsx`.

**Why this is bad:**
- ❌ Two versions of the same component
- ❌ Future updates need to happen in two places
- ❌ Confusion about which to use
- ❌ Not leveraging existing usage

### Issue 2: Duplicate Code Edit Logic
The code edit parsing/handling logic exists in:
- `ContextAwareCodeEditorModal.tsx`
- `ContextAwareCodeEditorCompact.tsx`

**Why this is bad:**
- ❌ ~150 lines of duplicated logic
- ❌ Bug fixes need to happen twice
- ❌ Not DRY (Don't Repeat Yourself)

---

## The Right Solution

### 1. Refactor Existing `PromptCompactModal`

**Keep the same props** (backward compatible), but change internals to wrap `PromptRunner`:

```typescript
// features/prompts/components/results-display/PromptCompactModal.tsx

export default function PromptCompactModal({
  isOpen,
  onClose,
  promptData,
  executionConfig,
  variables,
  title,
  preloadedResult,  // Keep for backward compat
  taskId,           // Keep for backward compat
}: PromptCompactModalProps) {
  const { isOpen: isCanvasOpen } = useCanvas();
  
  // Draggable logic
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  // ...drag handlers...
  
  // Smart sizing based on canvas
  const modalWidth = isCanvasOpen 
    ? 'min(85vw, 1400px)'  // Wide for canvas
    : 'min(90vw, 768px)';   // Compact
  
  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]" onClick={onClose} />
      
      <div
        className="fixed z-[9999] transition-all"
        style={{ width: modalWidth, ... }}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-[#1e1e1e] rounded-3xl ...">
          {/* Draggable Header */}
          <div className="px-5 py-3.5 border-b ...">
            <GripVertical />
            {title}
            <X onClick={onClose} />
          </div>
          
          {/* Core: PromptRunner (same as PromptRunnerModal) */}
          <div className="flex-1">
            <PromptRunner
              promptData={promptData}
              executionConfig={executionConfig}
              variables={variables}
              onExecutionComplete={onExecutionComplete}
              onClose={onClose}
              isActive={isOpen}
              // ✅ Canvas automatically works!
              // ✅ Streaming automatically works!
              // ✅ Conversation automatically works!
            />
          </div>
        </div>
      </div>
    </>
  );
}
```

**Changes:**
- ✅ Wraps `PromptRunner` (like `PromptRunnerModal` does)
- ✅ Keeps draggable logic (unique to compact)
- ✅ Keeps same props interface
- ✅ All existing usage continues working
- ✅ Canvas support comes free

### 2. Delete `PromptCompactModal-new.tsx`

Once the refactor is done, delete the duplicate:
```bash
rm features/prompts/components/results-display/PromptCompactModal-new.tsx
```

### 3. Extract Code Edit Logic to Hook

Create a **shared hook** for code edit handling:

```typescript
// features/code-editor/hooks/useCodeEditHandler.ts

export interface UseCodeEditHandlerOptions {
  language: string;
  currentCode: () => string;  // Ref getter
  onCodeChange: (newCode: string, version: number) => void;
  onVersionUpdate: (content: string, summary?: string) => void;
  incrementVersion: () => number;
}

export function useCodeEditHandler({
  language,
  currentCode,
  onCodeChange,
  onVersionUpdate,
  incrementVersion,
}: UseCodeEditHandlerOptions) {
  const { open: openCanvas, close: closeCanvas } = useCanvas();
  
  const handleResponseComplete = useCallback((result: any) => {
    const { response } = result;
    if (!response) return;
    
    // Parse code edits
    const parsed = parseCodeEdits(response);
    if (!parsed.success || parsed.edits.length === 0) return;
    
    // Validate edits
    const validation = validateEdits(currentCode(), parsed.edits);
    if (!validation.valid) {
      openCanvas({
        type: 'code_edit_error',
        data: {
          errors: validation.errors,
          warnings: validation.warnings,
          rawResponse: response,
          onClose: () => closeCanvas(),
        },
        metadata: { title: 'Code Edit Error' },
      });
      return;
    }
    
    // Apply edits
    const result_apply = applyCodeEdits(currentCode(), parsed.edits);
    if (!result_apply.success) {
      // Show errors...
      return;
    }
    
    const newCode = result_apply.code || '';
    const diffStats = getDiffStats(currentCode(), newCode);
    
    // Build rich title
    const titleNode = (
      <>
        <span className="truncate">Code Preview</span>
        {parsed.edits.length > 0 && (
          <Badge variant="outline" className="...">
            {parsed.edits.length} edit{parsed.edits.length !== 1 ? 's' : ''}
          </Badge>
        )}
        {diffStats && (
          <>
            <Badge variant="outline" className="... text-green-600">
              +{diffStats.additions}
            </Badge>
            <Badge variant="outline" className="... text-red-600">
              -{diffStats.deletions}
            </Badge>
          </>
        )}
      </>
    );
    
    // Open canvas with preview
    openCanvas({
      type: 'code_preview',
      data: {
        originalCode: currentCode(),
        modifiedCode: newCode,
        language,
        edits: parsed.edits,
        explanation: parsed.explanation,
        onApply: () => {
          const nextVersion = incrementVersion();
          onVersionUpdate(newCode, parsed.explanation || 'Applied code edits');
          onCodeChange(newCode, nextVersion);
        },
        onDiscard: () => closeCanvas(),
        onCloseModal: () => {
          // Close modal callback passed from component
        },
      },
      metadata: {
        title: titleNode as ReactNode,
        subtitle: parsed.explanation?.length < 100 ? parsed.explanation : undefined,
      },
    });
  }, [language, openCanvas, closeCanvas, currentCode, onCodeChange, onVersionUpdate, incrementVersion]);
  
  return { handleResponseComplete };
}
```

### 4. Use Hook in Both Modals

```typescript
// ContextAwareCodeEditorModal.tsx

export function ContextAwareCodeEditorModal({...}: Props) {
  const currentCodeRef = useRef(code);
  const currentVersionRef = useRef(1);
  
  const { handleResponseComplete } = useCodeEditHandler({
    language,
    currentCode: () => currentCodeRef.current,
    onCodeChange,
    onVersionUpdate: (content, summary) => {
      if (updateContextRef.current) {
        updateContextRef.current(content, summary);
      }
      currentCodeRef.current = content;
    },
    incrementVersion: () => {
      const next = currentVersionRef.current + 1;
      currentVersionRef.current = next;
      return next;
    },
  });
  
  // Use the hook's handler
  return (
    <ContextAwarePromptRunner
      onResponseComplete={handleResponseComplete}
      // ...
    />
  );
}
```

```typescript
// ContextAwareCodeEditorCompact.tsx (if we keep it separate)

export function ContextAwareCodeEditorCompact({...}: Props) {
  // Same exact usage as above!
  const { handleResponseComplete } = useCodeEditHandler({
    // Same config
  });
  
  return (
    <ContextAwarePromptCompactModal
      onResponseComplete={handleResponseComplete}
      // ...
    />
  );
}
```

---

## Benefits of Refactor

### Before (Bad)
```
PromptCompactModal.tsx (311 lines)
  └─ Uses usePromptExecutionCore (no canvas)

PromptCompactModal-new.tsx (180 lines) ❌ DUPLICATE
  └─ Wraps PromptRunner (has canvas)

ContextAwareCodeEditorModal.tsx (324 lines)
  └─ ~150 lines of code edit logic

ContextAwareCodeEditorCompact.tsx (301 lines)
  └─ ~150 lines of code edit logic ❌ DUPLICATE
```

### After (Good)
```
PromptCompactModal.tsx (refactored)
  └─ Wraps PromptRunner (canvas works!)
  └─ All existing usage works ✅

useCodeEditHandler.ts (NEW hook)
  └─ ~150 lines of SHARED logic ✅
  
ContextAwareCodeEditorModal.tsx (smaller)
  └─ Uses useCodeEditHandler hook
  
ContextAwareCodeEditorCompact.tsx (smaller)
  └─ Uses useCodeEditHandler hook
```

**Savings:**
- ❌ Delete 180 lines (duplicate modal)
- ✅ Reduce ~300 lines of duplicate code edit logic to ONE shared hook
- ✅ One place to fix bugs
- ✅ One place to add features
- ✅ Canvas works everywhere

---

## Implementation Steps

### Step 1: Extract Code Edit Logic
```bash
# Create the hook
touch features/code-editor/hooks/useCodeEditHandler.ts

# Move ~150 lines of shared logic here
```

### Step 2: Refactor Existing PromptCompactModal
```typescript
// Update features/prompts/components/results-display/PromptCompactModal.tsx
// Change internals to wrap PromptRunner
// Keep same props interface
```

### Step 3: Update Both Modals to Use Hook
```typescript
// Update ContextAwareCodeEditorModal.tsx
// Update ContextAwareCodeEditorCompact.tsx
// Both use useCodeEditHandler
```

### Step 4: Delete Duplicate
```bash
# Remove the -new version
rm features/prompts/components/results-display/PromptCompactModal-new.tsx

# Update exports
# Update imports in any files using the old -new version
```

### Step 5: Test Everything
```bash
# Test single-file editing (standard & compact)
# Test all existing PromptCompactModal usage
# Test code edit success states
# Test error handling
```

---

## Breaking Changes: NONE

### For PromptCompactModal Users
✅ Same props interface  
✅ Same behavior  
✅ Just better internally  
✅ **Bonus:** Canvas now works!

### For Code Editor Users
✅ Same API  
✅ Same behavior  
✅ Just cleaner code  
✅ **Bonus:** Bugs fixed in one place!

---

## Timeline

- **Day 1**: Create `useCodeEditHandler` hook
- **Day 2**: Refactor `PromptCompactModal`
- **Day 3**: Update both code editor modals to use hook
- **Day 4**: Delete duplicate, update exports
- **Day 5**: Test everything, fix any issues

**Total: 1 week** to eliminate duplication and improve maintainability.

---

## Summary

You were absolutely right to call this out! The duplication was a mistake. This refactor:

✅ Eliminates duplicate modal  
✅ Eliminates duplicate logic  
✅ Makes canvas work everywhere  
✅ Makes code more maintainable  
✅ No breaking changes  
✅ One place for bug fixes  

**This is the right way to build it!**

