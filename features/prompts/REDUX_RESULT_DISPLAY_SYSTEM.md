# Redux Result Display System - Architecture & Implementation Plan

## Overview
This document outlines the comprehensive Redux-based system for managing AI prompt execution results across the entire application. The goal is to centralize result display logic, eliminate code duplication, and provide a unified interface for triggering AI prompts with different UI presentations.

## Current State Analysis

### What's Working ✅
1. **modal-full**: Fully implemented via `PromptRunnerModal` + Redux (`promptRunnerSlice`)
   - Renders in `OverlayController`
   - Opened via `usePromptRunner` hook
   - Supports full chat interface with history

2. **Prompt Caching**: Implemented via `promptCacheSlice`
   - Prevents redundant database fetches
   - Stores prompts for session duration

3. **Execution Configuration**: Unified types in `execution-modes.ts`
   - `PromptExecutionConfig` with separate flags (auto_run, allow_chat, show_variables, apply_variables)
   - `ResultDisplay` type with 7 display modes
   - Legacy mode conversion utilities

4. **Scope Mapping**: Working in `UnifiedContextMenu`
   - Maps application scopes (selection, content, context) to prompt variables
   - Integrated with `useShortcutExecution`

### What's Missing ❌

1. **modal-compact**: Type exists, but no implementation
   - Needs compact modal component (like VS Code Copilot overlay)
   - Should be registered in `overlaySlice` and rendered in `OverlayController`
   - Sample UI exists at `app/(authenticated)/ai/prompts/experimental/result-components/page.tsx`

2. **inline**: Partially implemented
   - `useShortcutExecution` handles inline execution
   - Returns result to caller for text replacement
   - **Missing**: Redux-managed inline result UI (VSCode-style overlay with replace/insert/cancel buttons)

3. **sidebar**: Not properly integrated
   - `FloatingSheet` component exists
   - Quick actions use it (via Redux), but not for prompt results
   - **Missing**: Sidebar-specific prompt result renderer

4. **toast**: Not implemented
   - `useShortcutExecution` executes prompt but doesn't show toast
   - **Missing**: Toast notification for prompt results
   - Sample exists at experimental page

5. **direct**: Partially implemented
   - Executes and returns result
   - **Missing**: Clear documentation on how to use returned result

6. **background**: Partially implemented
   - Executes silently
   - **Missing**: Pattern for handling side effects (save to DB, update state)

### Gaps in Current System

1. **OverlayController Gap**: Only renders `modal-full` (PromptRunnerModal)
   - Needs to handle all 7 result display types
   - Should dynamically render correct component based on `ResultDisplay` type

2. **Redux Slice Gap**: No unified slice for managing all result displays
   - `promptRunnerSlice` only handles modal-full
   - Need a more comprehensive slice or extend existing one

3. **Hook Gap**: `usePromptRunner` only opens modal-full
   - Need a more generic `usePromptExecution` that routes to correct display type

4. **Component Gap**: Missing components for modal-compact, inline overlay, sidebar runner, toast

---

## Proposed Architecture

### 1. Enhanced Redux Structure

#### Option A: Extend `promptRunnerSlice` (Recommended)
```typescript
// lib/redux/slices/promptRunnerSlice.ts (ENHANCED)

interface PromptRunnerState {
  // Current modal (modal-full)
  activeModal: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    taskId: string | null;
  };
  
  // NEW: Compact modal (modal-compact)
  compactModal: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    taskId: string | null;
  };
  
  // NEW: Inline result overlay
  inlineOverlay: {
    isOpen: boolean;
    result: string | null;
    taskId: string | null;
    originalText: string | null;
    promptName: string | null;
    // Callbacks for replace/insert actions
  };
  
  // NEW: Sidebar result
  sidebarResult: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    taskId: string | null;
    position: 'left' | 'right';
    size: 'sm' | 'md' | 'lg';
  };
  
  // NEW: Toast notification
  toastResult: {
    isVisible: boolean;
    result: string | null;
    promptName: string | null;
    duration: number;
  };
  
  // Background/Direct don't need UI state (return directly)
}
```

#### Option B: Use `overlaySlice` (Alternative)
Add prompt result overlays to existing `overlaySlice`:
```typescript
overlays: {
  // ... existing overlays ...
  promptModalFull: { isOpen: boolean; data: PromptRunnerModalConfig };
  promptModalCompact: { isOpen: boolean; data: PromptRunnerModalConfig };
  promptInlineOverlay: { isOpen: boolean; data: InlineResultData };
  promptSidebar: { isOpen: boolean; data: SidebarResultData };
  promptToast: { isOpen: boolean; data: ToastResultData };
}
```

**Decision**: Option A is cleaner as it keeps all prompt-related state together.

---

### 2. Unified Execution Entry Point

Create a single `openPromptExecution` thunk that routes based on `result_display`:

```typescript
// lib/redux/thunks/openPromptExecutionThunk.ts (NEW)

import { ResultDisplay, PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';
import { openPromptModal, openCompactModal, openInlineOverlay, openSidebarResult, showToastResult } from '../slices/promptRunnerSlice';
import { executePromptDirect } from './executePromptThunk';

interface OpenPromptExecutionPayload {
  promptId?: string;
  promptData?: PromptData;
  config: PromptExecutionConfig; // Includes result_display
  variables?: Record<string, string>;
  initialMessage?: string;
  title?: string;
  
  // For inline: text replacement callbacks
  onTextReplace?: (text: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;
  originalText?: string;
  
  // For sidebar: position/size preferences
  sidebarPosition?: 'left' | 'right';
  sidebarSize?: 'sm' | 'md' | 'lg';
}

export const openPromptExecution = createAsyncThunk(
  'promptExecution/open',
  async (payload: OpenPromptExecutionPayload, { dispatch, getState }) => {
    const { config, promptId, promptData, ...rest } = payload;
    const { result_display, ...executionConfig } = config;
    
    // Fetch/cache prompt if needed
    let finalPromptData = promptData;
    if (promptId && !promptData) {
      finalPromptData = await fetchAndCachePrompt(promptId, dispatch, getState);
    }
    
    // Route based on result_display
    switch (result_display) {
      case 'modal-full':
        dispatch(openPromptModal({
          promptData: finalPromptData,
          executionConfig,
          ...rest
        }));
        break;
        
      case 'modal-compact':
        dispatch(openCompactModal({
          promptData: finalPromptData,
          executionConfig,
          ...rest
        }));
        break;
        
      case 'inline':
        // Execute first, then show inline overlay with result
        const inlineResult = await dispatch(executePromptDirect({
          promptData: finalPromptData,
          variables: rest.variables,
        })).unwrap();
        
        dispatch(openInlineOverlay({
          result: inlineResult,
          originalText: rest.originalText,
          promptName: finalPromptData?.name,
          callbacks: {
            onReplace: rest.onTextReplace,
            onInsertBefore: rest.onTextInsertBefore,
            onInsertAfter: rest.onTextInsertAfter,
          }
        }));
        break;
        
      case 'sidebar':
        dispatch(openSidebarResult({
          promptData: finalPromptData,
          executionConfig,
          position: rest.sidebarPosition || 'right',
          size: rest.sidebarSize || 'md',
          ...rest
        }));
        break;
        
      case 'toast':
        // Execute first, then show toast
        const toastResult = await dispatch(executePromptDirect({
          promptData: finalPromptData,
          variables: rest.variables,
        })).unwrap();
        
        dispatch(showToastResult({
          result: toastResult,
          promptName: finalPromptData?.name,
          duration: 5000,
        }));
        break;
        
      case 'direct':
        // Execute and return result directly (no UI)
        return await dispatch(executePromptDirect({
          promptData: finalPromptData,
          variables: rest.variables,
        })).unwrap();
        
      case 'background':
        // Execute silently, optionally trigger side effects
        const bgResult = await dispatch(executePromptDirect({
          promptData: finalPromptData,
          variables: rest.variables,
        })).unwrap();
        
        // TODO: Trigger side effects (save to DB, update state, etc.)
        // This could be handled via onExecutionComplete callback
        return bgResult;
        
      default:
        throw new Error(`Unknown result_display type: ${result_display}`);
    }
  }
);
```

---

### 3. Component Structure

#### New Components Needed

1. **`PromptCompactModal.tsx`** (modal-compact)
   ```typescript
   // features/prompts/components/modal/PromptCompactModal.tsx
   // Small, VS Code Copilot-style overlay
   // - Minimal header
   // - Streaming response area
   // - Action buttons: Copy, Insert, Retry, Cancel
   // - No full chat interface
   ```

2. **`PromptInlineOverlay.tsx`** (inline)
   ```typescript
   // features/prompts/components/inline/PromptInlineOverlay.tsx
   // VSCode-style inline action overlay
   // - Shows original text vs AI result
   // - Buttons: Replace, Insert Before, Insert After, Cancel
   // - Positioned near cursor/selection
   ```

3. **`PromptSidebarRunner.tsx`** (sidebar)
   ```typescript
   // features/prompts/components/sidebar/PromptSidebarRunner.tsx
   // Wraps PromptRunner in FloatingSheet
   // - Configurable position (left/right)
   // - Configurable size (sm/md/lg)
   // - Can stay open while user works
   ```

4. **`PromptToast.tsx`** (toast)
   ```typescript
   // features/prompts/components/toast/PromptToast.tsx
   // Simple toast notification with AI result
   // - Appears bottom-right
   // - Auto-dismisses after duration
   // - Click to copy
   ```

#### Enhanced `OverlayController.tsx`

```typescript
// components/overlays/OverlayController.tsx (ENHANCED)

// Add dynamic imports
const PromptRunnerModal = dynamic(() => import('@/features/prompts/components/modal/PromptRunnerModal').then(m => ({ default: m.PromptRunnerModal })));
const PromptCompactModal = dynamic(() => import('@/features/prompts/components/modal/PromptCompactModal'));
const PromptInlineOverlay = dynamic(() => import('@/features/prompts/components/inline/PromptInlineOverlay'));
const PromptSidebarRunner = dynamic(() => import('@/features/prompts/components/sidebar/PromptSidebarRunner'));
const PromptToast = dynamic(() => import('@/features/prompts/components/toast/PromptToast'));

// Add selectors
const {
  activeModal,
  compactModal,
  inlineOverlay,
  sidebarResult,
  toastResult
} = useAppSelector((state) => state.promptRunner);

// Render all prompt result UIs
return (
  <>
    {/* ... existing overlays ... */}
    
    {/* Prompt Result UIs */}
    {activeModal.isOpen && (
      <PromptRunnerModal
        isOpen={true}
        onClose={() => dispatch(closePromptModal())}
        {...activeModal.config}
      />
    )}
    
    {compactModal.isOpen && (
      <PromptCompactModal
        isOpen={true}
        onClose={() => dispatch(closeCompactModal())}
        {...compactModal.config}
      />
    )}
    
    {inlineOverlay.isOpen && (
      <PromptInlineOverlay
        isOpen={true}
        onClose={() => dispatch(closeInlineOverlay())}
        result={inlineOverlay.result}
        originalText={inlineOverlay.originalText}
        promptName={inlineOverlay.promptName}
        taskId={inlineOverlay.taskId}
        {...inlineOverlay.callbacks}
      />
    )}
    
    {sidebarResult.isOpen && (
      <PromptSidebarRunner
        isOpen={true}
        onClose={() => dispatch(closeSidebarResult())}
        position={sidebarResult.position}
        size={sidebarResult.size}
        {...sidebarResult.config}
      />
    )}
    
    {toastResult.isVisible && (
      <PromptToast
        result={toastResult.result}
        promptName={toastResult.promptName}
        duration={toastResult.duration}
        onDismiss={() => dispatch(dismissToast())}
      />
    )}
  </>
);
```

---

### 4. Hook Updates

#### Enhanced `usePromptRunner.ts`

```typescript
// features/prompts/hooks/usePromptRunner.ts (ENHANCED)

export function usePromptRunner() {
  const dispatch = useAppDispatch();
  
  // Open any result display type
  const openPrompt = useCallback(async (config: {
    promptId?: string;
    promptData?: PromptData;
    executionConfig?: Omit<PromptExecutionConfig, 'result_display'>;
    result_display?: ResultDisplay; // NEW: Specify display type
    variables?: Record<string, string>;
    initialMessage?: string;
    title?: string;
    // ... other options ...
  }) => {
    const fullConfig: PromptExecutionConfig = {
      ...config.executionConfig,
      result_display: config.result_display || 'modal-full', // Default to modal-full
    };
    
    await dispatch(openPromptExecution({
      ...config,
      config: fullConfig,
    })).unwrap();
  }, [dispatch]);
  
  return { openPrompt };
}
```

#### Update `useShortcutExecution.ts`

```typescript
// features/prompt-builtins/hooks/useShortcutExecution.ts (ENHANCED)

export function useShortcutExecution() {
  const { openPrompt } = usePromptRunner();
  
  const executeShortcut = useCallback(async (
    shortcut: PromptShortcut & { prompt_builtin: PromptBuiltin | null },
    context: ShortcutExecutionContext
  ) => {
    // ... scope mapping logic ...
    
    const resultDisplay = shortcut.result_display || 'modal-full';
    
    // Build execution config
    const fullConfig: PromptExecutionConfig = {
      result_display: resultDisplay,
      auto_run: shortcut.auto_run,
      allow_chat: shortcut.allow_chat,
      show_variables: shortcut.show_variables,
      apply_variables: shortcut.apply_variables,
    };
    
    // Let the unified system handle routing
    return await openPrompt({
      promptData,
      variables: finalVariables,
      executionConfig: fullConfig,
      title: shortcut.label,
      // For inline: pass callbacks
      ...(resultDisplay === 'inline' && {
        onTextReplace: context.onTextReplace,
        onTextInsertBefore: context.onTextInsertBefore,
        onTextInsertAfter: context.onTextInsertAfter,
        originalText: context.scopes.selection,
      }),
    });
  }, [openPrompt]);
  
  return { executeShortcut };
}
```

---

## Implementation Plan

### Phase 1: Foundation (High Priority)
1. ✅ Review and understand current system
2. [ ] Enhance `promptRunnerSlice` with all result display states
3. [ ] Create `openPromptExecution` thunk
4. [ ] Update `usePromptRunner` hook to use new thunk

### Phase 2: Modal-Compact (High Priority)
1. [ ] Create `PromptCompactModal` component (based on experimental page sample)
2. [ ] Add to `OverlayController`
3. [ ] Test from `UnifiedContextMenu`

### Phase 3: Inline Overlay (High Priority)
1. [ ] Create `PromptInlineOverlay` component
2. [ ] Integrate with Redux state
3. [ ] Add to `OverlayController`
4. [ ] Test inline text replacement flow

### Phase 4: Sidebar (Medium Priority)
1. [ ] Create `PromptSidebarRunner` component (wraps PromptRunner in FloatingSheet)
2. [ ] Add position/size configuration
3. [ ] Test with "sidebar in view" concept (non-blocking)

### Phase 5: Toast & Background (Medium Priority)
1. [ ] Create `PromptToast` component
2. [ ] Implement auto-dismiss logic
3. [ ] Document background execution patterns

### Phase 6: Testing & Documentation (High Priority)
1. [ ] Test all 7 result display types from `UnifiedContextMenu`
2. [ ] Update all existing usages to use new system
3. [ ] Write comprehensive documentation
4. [ ] Create examples for each display type

---

## Key Design Decisions

### 1. Single vs Multiple Active Results
**Decision**: Support single active result per type initially
- One modal-full at a time
- One modal-compact at a time
- Multiple inline overlays could make sense (future enhancement)
- Multiple toast notifications (queue them)

### 2. Result Streaming
**Decision**: All interactive displays (modals, sidebar) support streaming via Socket.IO
- Use `selectPrimaryResponseTextByTaskId` selector
- Non-interactive displays (toast, inline) execute first, then show result

### 3. Sidebar "In View" Mode
**Decision**: Use FloatingSheet with `persistent` prop or similar
- Sidebar doesn't block main content
- User can interact with page while sidebar is open
- Position calculated to not overlap content

### 4. Background Execution Side Effects
**Pattern**: Use `onExecutionComplete` callback for side effects
```typescript
openPrompt({
  config: { result_display: 'background', ... },
  onExecutionComplete: (result) => {
    // Save to DB
    // Update Redux state
    // Trigger other actions
  }
});
```

---

## Benefits of This Architecture

1. **Zero Code Duplication**: All prompt execution logic centralized in Redux
2. **Consistent API**: Single `openPrompt()` interface for all use cases
3. **Easy to Extend**: Add new result display types by:
   - Adding state to slice
   - Creating component
   - Adding case to `openPromptExecution` thunk
   - Rendering in `OverlayController`
4. **Type Safety**: Full TypeScript support with `ResultDisplay` union type
5. **Performance**: Dynamic imports keep bundle size small
6. **Testability**: All logic in Redux makes testing straightforward
7. **Future-Proof**: Architecture supports multiple simultaneous results

---

## Migration Strategy

### For Existing Code
1. Find all direct `PromptRunnerModal` renders
2. Replace with `usePromptRunner` hook calls
3. Specify `result_display` if different from 'modal-full'

### For New Features
1. Import `usePromptRunner` hook
2. Call `openPrompt()` with desired `result_display`
3. Let Redux handle everything else

---

## Example Usage

### From Context Menu (Inline)
```typescript
const { openPrompt } = usePromptRunner();

openPrompt({
  promptId: 'fix-grammar',
  executionConfig: { auto_run: true, allow_chat: false },
  result_display: 'inline',
  variables: { text: selectedText },
  onTextReplace: (newText) => updateTextarea(newText),
  originalText: selectedText,
});
```

### From Button (Modal Compact)
```typescript
openPrompt({
  promptId: 'summarize',
  executionConfig: { auto_run: true, allow_chat: false },
  result_display: 'modal-compact',
  variables: { content: documentText },
});
```

### From Quick Action (Sidebar)
```typescript
openPrompt({
  promptId: 'research-assistant',
  executionConfig: { auto_run: false, allow_chat: true },
  result_display: 'sidebar',
  sidebarPosition: 'right',
  sidebarSize: 'md',
});
```

### Background Processing
```typescript
openPrompt({
  promptId: 'auto-tag-notes',
  executionConfig: { auto_run: true },
  result_display: 'background',
  variables: { noteContent },
  onExecutionComplete: (result) => {
    // Save tags to database
    saveTags(result.response);
  },
});
```

---

## Next Steps
1. Review this architecture with team
2. Get approval on design decisions
3. Begin Phase 1 implementation
4. Iteratively build and test each phase

