# Result Display Implementation Status

## Quick Reference: What Works vs What's Needed

| Result Display | Status | Redux State | Component | OverlayController | Usage Hook |
|---------------|--------|-------------|-----------|-------------------|------------|
| **modal-full** | ✅ Complete | ✅ `promptRunnerSlice.activeModal` | ✅ `PromptRunnerModal` | ✅ Rendered | ✅ `usePromptRunner` |
| **modal-compact** | ❌ Missing | ❌ No state | ❌ No component | ❌ Not rendered | ❌ Not supported |
| **inline** | ⚠️ Partial | ❌ No UI state | ❌ No overlay component | ❌ Not rendered | ⚠️ Returns result only |
| **sidebar** | ⚠️ Partial | ❌ No state | ⚠️ `FloatingSheet` exists | ❌ Not rendered | ❌ Not supported |
| **toast** | ⚠️ Partial | ❌ No state | ❌ No component | ❌ Not rendered | ❌ Not supported |
| **direct** | ⚠️ Partial | N/A (no UI) | N/A | N/A | ⚠️ Returns result |
| **background** | ⚠️ Partial | N/A (no UI) | N/A | N/A | ⚠️ Returns result |

## Current Architecture Strengths

### ✅ What's Working Well

1. **Unified Type System** (`execution-modes.ts`)
   - `ResultDisplay` union type with 7 options
   - `PromptExecutionConfig` with boolean flags
   - Legacy mode conversion utilities
   - Clear documentation and use cases

2. **Modal-Full Implementation**
   - Fully Redux-managed via `promptRunnerSlice`
   - Rendered centrally in `OverlayController`
   - Accessed via `usePromptRunner` hook
   - Supports streaming, chat, variables

3. **Prompt Caching** (`promptCacheSlice`)
   - Prevents redundant database fetches
   - Session-based storage
   - Automatic cache management

4. **Execution Flow**
   - `UnifiedContextMenu` → `useShortcutExecution` → `usePromptRunner`
   - Scope mapping (selection → variables)
   - Socket.IO integration for streaming

5. **Code Organization**
   - Types centralized in `/types/modal.ts` and `/execution-modes.ts`
   - Hooks in `/hooks/`
   - Components in `/components/modal/`, `/components/inline/`, etc.
   - Redux slices in `/lib/redux/slices/`

### ❌ Critical Gaps

1. **Missing Result Display Components**
   ```
   ❌ PromptCompactModal - VS Code Copilot-style compact modal
   ❌ PromptInlineOverlay - Inline replace/insert/cancel UI
   ❌ PromptSidebarRunner - Sidebar version of prompt runner
   ❌ PromptToast - Toast notification for results
   ```

2. **Incomplete Redux State Management**
   - `promptRunnerSlice` only handles `modal-full`
   - No state for compact modal, inline overlay, sidebar, toast
   - No unified routing logic for different display types

3. **No Centralized Execution Router**
   - `useShortcutExecution` manually handles each type
   - Logic duplicated, not centralized
   - Difficult to add new display types

4. **OverlayController Incomplete**
   - Only renders `PromptRunnerModal` (modal-full)
   - Missing renders for other 6 display types

## Recommended Implementation Order

### Phase 1: Infrastructure (Do First) 🔥
**Goal**: Create the foundation that all display types will use

1. **Enhance `promptRunnerSlice.ts`**
   - Add state for: `compactModal`, `inlineOverlay`, `sidebarResult`, `toastResult`
   - Add actions: `openCompactModal`, `openInlineOverlay`, etc.
   - Add selectors for each type

2. **Create `openPromptExecution` thunk**
   - Single entry point that routes to correct display type
   - Handles prompt fetching/caching
   - Dispatches appropriate action based on `result_display`

3. **Update `usePromptRunner` hook**
   - Accept `result_display` parameter
   - Call `openPromptExecution` thunk
   - Maintain backward compatibility

**Impact**: Once done, adding new display types is just:
1. Create component
2. Add to OverlayController
3. Add case to thunk

### Phase 2: Modal-Compact (High Value) 🎯
**Goal**: Implement VS Code Copilot-style compact modal

**Why First?**
- Most similar to existing modal-full
- Sample UI already exists in experimental page
- Useful for quick, non-conversational prompts
- High user demand

**Tasks**:
1. Create `PromptCompactModal.tsx` component
2. Add render to `OverlayController`
3. Test from `UnifiedContextMenu`

**Files to Create/Modify**:
```
📄 features/prompts/components/modal/PromptCompactModal.tsx (NEW)
📝 components/overlays/OverlayController.tsx (UPDATE)
📝 features/prompts/components/modal/index.ts (UPDATE exports)
```

### Phase 3: Inline Overlay (High Value) 🎯
**Goal**: VSCode-style inline text manipulation UI

**Why Second?**
- Critical for text editing workflows
- Core use case for AI assistance
- Currently just returns text (no UI)

**Tasks**:
1. Create `PromptInlineOverlay.tsx`
   - Show original text vs AI result side-by-side
   - Buttons: Replace, Insert Before, Insert After, Cancel
   - Position near cursor/selection
2. Add render to `OverlayController`
3. Update `UnifiedContextMenu` to pass callbacks

**Files to Create/Modify**:
```
📁 features/prompts/components/inline/ (NEW FOLDER)
  📄 PromptInlineOverlay.tsx (NEW)
  📄 InlineResultComparison.tsx (NEW - shows diff)
  📄 index.ts (NEW)
📝 components/overlays/OverlayController.tsx (UPDATE)
```

### Phase 4: Toast Notifications (Medium Value) 💡
**Goal**: Simple, non-blocking notifications for quick answers

**Why Third?**
- Simplest to implement
- Sample already exists
- Useful for non-critical results

**Tasks**:
1. Create `PromptToast.tsx`
2. Add auto-dismiss logic
3. Support toast queue (multiple toasts)

**Files to Create/Modify**:
```
📁 features/prompts/components/toast/ (NEW FOLDER)
  📄 PromptToast.tsx (NEW)
  📄 index.ts (NEW)
📝 components/overlays/OverlayController.tsx (UPDATE)
```

### Phase 5: Sidebar Runner (Medium Value) 💡
**Goal**: Non-blocking sidebar for parallel workflows

**Why Fourth?**
- More complex (needs layout integration)
- FloatingSheet already exists (reuse)
- Useful for research/reference workflows

**Tasks**:
1. Create `PromptSidebarRunner.tsx` (wraps PromptRunner in FloatingSheet)
2. Add position/size configuration
3. Support "in-view" mode (non-blocking)

**Files to Create/Modify**:
```
📁 features/prompts/components/sidebar/ (NEW FOLDER)
  📄 PromptSidebarRunner.tsx (NEW)
  📄 index.ts (NEW)
📝 components/overlays/OverlayController.tsx (UPDATE)
```

### Phase 6: Direct & Background (Documentation) 📚
**Goal**: Document patterns, no UI needed

**Why Last?**
- Already partially working
- No UI components needed
- Just need clear documentation

**Tasks**:
1. Document how to use returned results
2. Document side effect patterns for background
3. Create examples

---

## Key Files to Understand

### Types & Configuration
```
📄 features/prompt-builtins/types/execution-modes.ts
   → ResultDisplay type, PromptExecutionConfig, legacy conversion

📄 features/prompts/types/modal.ts
   → PromptRunnerModalConfig, PromptData, ExecutionResult
```

### Redux State
```
📄 lib/redux/slices/promptRunnerSlice.ts
   → Current: Only activeModal state
   → Needs: States for all display types

📄 lib/redux/slices/promptCacheSlice.ts
   → Prompt caching (working well)

📄 lib/redux/slices/overlaySlice.ts
   → General overlays (used for quick actions)
```

### Execution Hooks
```
📄 features/prompts/hooks/usePromptRunner.ts
   → Main hook for opening prompts
   → Needs: Support for all display types

📄 features/prompt-builtins/hooks/useShortcutExecution.ts
   → Executes shortcuts from context menu
   → Needs: Better integration with unified system

📄 features/prompts/hooks/usePromptExecution.ts
   → Low-level prompt execution
   → Used by other hooks
```

### Components
```
📄 features/prompts/components/modal/PromptRunnerModal.tsx
   → Wrapper that displays PromptRunner in Dialog

📄 features/prompts/components/modal/PromptRunner.tsx
   → Core prompt runner logic (885 lines)
   → Handles execution, streaming, chat, variables

📄 components/overlays/OverlayController.tsx
   → Central render point for all overlays
   → Needs: Render all prompt result displays
```

### Context Menu
```
📄 components/unified/UnifiedContextMenu.tsx
   → App-wide context menu
   → Loads shortcuts from DB
   → Triggers prompt execution via useShortcutExecution
```

---

## Testing Strategy

### For Each Display Type

1. **Context Menu Test**
   - Add test shortcut with specific `result_display`
   - Right-click → Select shortcut
   - Verify correct UI appears

2. **Direct API Test**
   - Call `openPrompt()` with display type
   - Verify correct component renders
   - Verify execution completes

3. **Edge Cases**
   - Multiple simultaneous results (should queue or replace)
   - Network errors during execution
   - User cancels mid-execution
   - Invalid prompt ID

### Sample Test Code

```typescript
// Test modal-compact
const { openPrompt } = usePromptRunner();
await openPrompt({
  promptId: 'test-prompt',
  executionConfig: { auto_run: true, allow_chat: false },
  result_display: 'modal-compact',
});
// Expected: Compact modal appears, auto-executes, shows result

// Test inline
await openPrompt({
  promptId: 'fix-grammar',
  executionConfig: { auto_run: true },
  result_display: 'inline',
  variables: { text: 'test text with erors' },
  originalText: 'test text with erors',
  onTextReplace: (newText) => console.log('Replace:', newText),
});
// Expected: Inline overlay appears with corrected text, replace button works
```

---

## Migration Checklist

### Before Starting
- [ ] Read `REDUX_RESULT_DISPLAY_SYSTEM.md` (full architecture)
- [ ] Read `EXECUTION_FLOW_DIAGRAM.md` (if exists)
- [ ] Understand current `PromptRunnerModal` implementation
- [ ] Review experimental result components page

### Phase 1 (Infrastructure)
- [ ] Enhance `promptRunnerSlice` with all display states
- [ ] Create `openPromptExecution` thunk
- [ ] Update `usePromptRunner` to use new thunk
- [ ] Test modal-full still works

### Phase 2 (Modal-Compact)
- [ ] Create `PromptCompactModal` component
- [ ] Add to `OverlayController`
- [ ] Test from context menu
- [ ] Test from direct hook call

### Phase 3 (Inline Overlay)
- [ ] Create `PromptInlineOverlay` component
- [ ] Add to `OverlayController`
- [ ] Test text replacement flow
- [ ] Test with UnifiedContextMenu

### Phase 4 (Toast)
- [ ] Create `PromptToast` component
- [ ] Implement auto-dismiss
- [ ] Test multiple toasts

### Phase 5 (Sidebar)
- [ ] Create `PromptSidebarRunner`
- [ ] Test position/size options
- [ ] Test "in-view" mode

### Phase 6 (Documentation)
- [ ] Document all display types with examples
- [ ] Update `usePromptRunner` docs
- [ ] Create migration guide for existing code
- [ ] Add TypeScript examples

---

## Common Pitfalls to Avoid

### 1. Don't Create Local Modal State
❌ **Bad**:
```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
return <PromptRunnerModal isOpen={isModalOpen} ... />;
```

✅ **Good**:
```typescript
const { openPrompt } = usePromptRunner();
openPrompt({ promptId: '...', result_display: 'modal-full' });
```

### 2. Don't Duplicate Execution Logic
❌ **Bad**: Calling `usePromptExecution` directly for each display type

✅ **Good**: Use `openPromptExecution` thunk that routes correctly

### 3. Don't Forget Socket.IO Integration
- All interactive displays need `taskId` for streaming
- Use `selectPrimaryResponseTextByTaskId` selector
- Use `selectPrimaryResponseEndedByTaskId` for completion

### 4. Don't Hardcode Display Types
❌ **Bad**: `if (type === 'modal') { ... } else if ...`

✅ **Good**: Use `result_display` from config, let thunk route

---

## Success Criteria

### When Complete, You Should Have:

1. ✅ Single `openPrompt()` API for all display types
2. ✅ Zero local modal state in consuming components
3. ✅ All 7 display types working via Redux
4. ✅ Components rendered centrally in `OverlayController`
5. ✅ Full TypeScript support with `ResultDisplay` type
6. ✅ Streaming support for interactive displays
7. ✅ Documentation with examples for each type
8. ✅ Migration complete for all existing usages
9. ✅ Context menu working with all display types
10. ✅ Test coverage for each display type

---

## Questions to Answer During Implementation

1. **Multiple Simultaneous Results**
   - Should we queue or replace?
   - Per-type limits (e.g., 1 modal, 3 toasts)?

2. **Sidebar "In View" Mode**
   - How to calculate non-overlapping position?
   - Should it auto-hide on certain actions?

3. **Background Execution Side Effects**
   - Standard patterns for save-to-DB?
   - Error handling strategy?

4. **Inline Overlay Positioning**
   - Near cursor or centered?
   - Mobile behavior?

5. **Toast Queue Management**
   - FIFO or priority-based?
   - Max visible at once?

