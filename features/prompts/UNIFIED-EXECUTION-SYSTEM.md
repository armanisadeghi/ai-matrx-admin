# Unified Prompt Execution System - Implementation Status

**Date**: 2025-12-01  
**Status**: ✅ **COMPLETE** - Redux-first architecture, gold standard patterns established

---

## Architecture Overview

### Unified Redux-First Execution

**All display types use the same flow**:
```typescript
1. startPromptInstance({ promptId, executionConfig, variables, resources })
   → creates execution instance with runId
   
2. openPromptExecution({ ...config, result_display })
   → routes to appropriate UI based on result_display
   
3. executeMessage({ runId }) 
   → executes via Redux state
   
4. finalizeExecution({ runId, taskId })
   → saves streamed response to messages array
```

**Display components receive only**: `runId`, `isOpen`, `onClose`
- Everything else comes from Redux selectors
- No prop drilling
- Single source of truth

---

## ✅ Completed: Unified System

### Core Infrastructure

- **`lib/redux/prompt-execution/`** - Redux execution system
  - `slice.ts` - State management, basic selectors
  - `selectors.ts` - Memoized computed selectors
  - `thunks/startInstanceThunk.ts` - Creates instances (now accepts resources)
  - `thunks/executeMessageThunk.ts` - Executes messages
  - `thunks/finalizeExecutionThunk.ts` - Saves streamed messages
  - `thunks/setupProgrammaticExecutionThunk.ts` - Complete programmatic setup
  - `types.ts` - Type definitions (ExecutionConfig now fully required)

- **`features/prompt-builtins/types/execution-modes.ts`** ⭐ Single Source of Truth
  - `PromptExecutionConfig` - Complete config including result_display + track_in_runs
  - `RESULT_DISPLAY_META` - All display type metadata (icon, color, description, testMode)
  - Helper functions: `getAllDisplayTypes()`, `getDisplayMeta()`, `isTestMode()`

- **`lib/redux/thunks/openPromptExecutionThunk.ts`** - Unified entry point
  - ALL 8 display types create Redux instances
  - Routes to appropriate UI based on result_display
  - Accepts resources parameter

- **`lib/redux/slices/promptRunnerSlice.ts`** - Modal state management
  - All modal configs include runId
  - Selectors for runId tracking

### UI Components (Gold Standard Pattern)

- **`features/prompts/components/smart/`** ✅
  - `SmartPromptInput.tsx` - Redux-driven input (runId only)
  - `SmartMessageList.tsx` - Redux-driven display (runId only, compact mode support)
  - `SmartResourcePickerButton.tsx` - Redux-integrated resource picker

- **`features/prompts/components/results-display/`**
  - `PromptCompactModal.tsx` - ⭐ **GOLD STANDARD** 
    - Props: `runId`, `isOpen`, `onClose` only
    - Reads all state from Redux selectors
    - Respects ALL execution config settings
    - Includes streaming finalization logic
    - Self-contained, no prop drilling
  - `PromptRunner.tsx` - Main unified component (needs gold standard update)
  - `PromptRunnerModal.tsx` - Wraps PromptRunner (needs gold standard update)
  - `PromptSidebarRunner.tsx` - Wraps PromptRunner (needs gold standard update)
  - `PromptFlexiblePanel.tsx` - Wraps PromptRunner (needs gold standard update)
  - `PromptInlineOverlay.tsx` - Display-only (needs gold standard update)
  - `PromptToast.tsx` - Display-only (needs gold standard update)

### Pages Using Unified System
- **`features/prompts/components/PromptRunPage.tsx`** ✅
  - Uses `startPromptInstance` + `PromptRunner`
  - Full Redux integration

- **`components/overlays/OverlayController.tsx`** ✅
  - Passes runId to all modal components
  - Uses selectors for runId tracking

### Programmatic Execution Hook

- **`features/prompts/hooks/useProgrammaticPromptExecution.ts`** ✅ **NEW**
  - Clean API for programmatic execution using Redux system
  - Accepts complete `PromptExecutionConfig` (includes result_display)
  - Supports resources, variables, initial messages
  - Used by testing system to prove programmatic execution works

### Testing Components

- **`features/prompts/components/runner-tester/`** ✅
  - `PromptRunnerModalSidebarTester.tsx` - Only needs runId
    - Uses selectors to extract all current state
    - Tests ALL display types programmatically
    - Proves Redux architecture works correctly
  - `PromptExecutionTestModal.tsx` - Tests direct/inline/background modes

---

## 🔒 Exempt: Prompt Builder (Local State Only)

**Location**: `features/prompts/components/builder/`

**Design Decision**: Prompt Builder operates on UNSAVED prompts and should NOT use Redux execution system.

**Components that should use LOCAL state**:
- `PromptBuilderRightPanel.tsx` - Builder preview/test panel
- Any builder-specific execution components
- Builder test functionality

**Reason**: Builder works with draft prompts that don't exist in the database yet. Redux execution system expects cached prompts with IDs.

---

## Pattern Reference

### Gold Standard Display Component Pattern

```typescript
// ✅ GOLD STANDARD: Minimal Props Interface
interface ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string;  // Everything else from Redux!
}

// ✅ Read ALL state from Redux
const instance = useAppSelector(state => selectInstance(state, runId));
const executionConfig = useAppSelector(state => selectExecutionConfig(state, runId));
const messages = useAppSelector(state => selectMessages(state, runId));
const prompt = useAppSelector(state => 
  instance ? selectCachedPrompt(state, instance.promptId) : null
);

// ✅ Streaming finalization logic (REQUIRED for components using SmartMessageList)
const currentTaskId = instance?.execution?.currentTaskId;
const isResponseEnded = useAppSelector(state =>
  currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
);

useEffect(() => {
  if (runId && currentTaskId && isResponseEnded) {
    dispatch(finalizeExecution({ runId, taskId: currentTaskId }));
  }
}, [runId, currentTaskId, isResponseEnded, dispatch]);

// ✅ Respect execution config settings
const allowChat = executionConfig?.allow_chat ?? true;
{allowChat && <ChatButton />}

// ✅ Use Smart components with runId
<SmartMessageList runId={runId} />
<SmartPromptInput runId={runId} />
```

### Programmatic Execution Pattern

```typescript
const { executePrompt } = useProgrammaticPromptExecution();

// Execute with complete config
await executePrompt({
  promptId: 'my-prompt',
  executionConfig: {
    result_display: 'modal-compact',
    auto_run: true,
    allow_chat: false,
    show_variables: false,
    apply_variables: true,
    track_in_runs: true,
  },
  variables: { text: selectedText },
  resources: [{ type: 'url', url: '...' }],
});
```

---

## Key Files Reference

### Core Redux System
```
lib/redux/prompt-execution/
├── slice.ts                    # State management
├── selectors.ts               # All selectors
├── types.ts                   # Type definitions
└── thunks/
    ├── startInstanceThunk.ts  # Creates instances
    ├── executeMessageThunk.ts # Executes messages
    └── loadRunThunk.ts        # Loads saved runs
```

### Display Components
```
features/prompts/components/
├── smart/
│   ├── SmartPromptInput.tsx         # ✅ Redux-driven (runId only)
│   └── SmartMessageList.tsx         # ✅ Redux-driven (runId only, compact mode)
├── results-display/
│   ├── PromptCompactModal.tsx       # ✅ ⭐ GOLD STANDARD (runId only)
│   ├── PromptRunner.tsx             # 🔄 Needs gold standard update
│   ├── PromptRunnerModal.tsx        # 🔄 Needs gold standard update
│   ├── PromptSidebarRunner.tsx      # 🔄 Needs gold standard update
│   └── PromptFlexiblePanel.tsx      # 🔄 Needs gold standard update
└── PromptRunPage.tsx                # ✅ Full page implementation
```

### Programmatic Hooks
```
features/prompts/hooks/
├── useProgrammaticPromptExecution.ts  # ✅ NEW - Redux-based programmatic
└── usePromptRunner.ts                 # ✅ Opens prompts with any display type
```

### Context Menu
```
components/unified/
└── UnifiedContextMenu.tsx       # ✅ Uses usePromptRunner → unified system
```

---

## Context Menu Integration ✅

**Location**: `components/unified/UnifiedContextMenu.tsx`

**Status**: ✅ **COMPLETE** - Now uses unified Redux system directly

**How It Works**:
- Uses `usePromptRunner()` hook to access unified system
- Maps application scopes (selection, content, context) to prompt variables via `mapScopeToVariables`
- Calls `openPrompt()` with shortcut configuration
- Unified system handles all display types and execution tracking

**Flow**:
1. User right-clicks → menu opens with shortcuts from database
2. User selects shortcut → `handleShortcutTrigger` called
3. Scope mapping: app scopes → prompt variables using `mapScopeToVariables` utility
4. Call `openPrompt()` with `result_display` and execution config
5. Redux creates instance via `startPromptInstance`
6. Routes to appropriate UI based on `result_display`
7. Auto-executes if `auto_run: true`

**Benefits**:
- All context menu executions properly tracked in Redux
- Run history now works correctly (was broken before)
- Consistent execution path with rest of system
- Easier debugging in Redux DevTools

---

## Key Improvements Implemented

### 1. Execution Config Standardization ✅
- **Removed `Partial<ExecutionConfig>`** - All properties now required
- **Added `track_in_runs`** to all configs
- **Removed `displayVariant`** - Each display type is distinct
- **Complete config**: `{ result_display, auto_run, allow_chat, show_variables, apply_variables, track_in_runs }`

### 2. Single Source of Truth ✅
- **`RESULT_DISPLAY_META`** contains ALL metadata
  - `icon`: Lucide icon name
  - `color`: Tailwind color classes
  - `description`: Human-readable description
  - `testMode`: Whether it requires test modal
- **Helper functions** prevent duplication:
  - `getAllDisplayTypes()`: Get all display types
  - `getDisplayMeta(display)`: Get metadata for specific type
  - `isTestMode(display)`: Check if test mode

### 3. Gold Standard Component Pattern ✅
- **Props**: Only `runId`, `isOpen`, `onClose`
- **State**: Everything from Redux selectors
- **Config Respect**: Honors ALL execution config settings
- **Finalization**: Includes streaming finalization logic
- **Example**: `PromptCompactModal` - 87% reduction in props

### 4. Resources Support ✅
- **`startPromptInstance`** now accepts `resources` parameter
- **Programmatic execution** supports resources
- **Testing system** can test with resources

---

## Template Message Metadata System ✅

**Date**: 2025-12-01

### Overview
Added `metadata.fromTemplate` marker to identify messages originating from prompt/builtin templates, enabling clean filtering and two distinct use cases:

### Use Cases

1. **Admin/Creator Debug** (`showTemplateMessages` toggle)
   - Shows raw template messages BEFORE first execution
   - For debugging and testing by prompt creators
   - Controlled via CreatorOptionsModal

2. **Application-Level Hiding** (`show_variables` config)
   - Hides template messages AFTER execution when `show_variables: false`
   - Prevents users from seeing variable placeholders and "how it works"
   - Automatic based on execution config

### Implementation

**Type Definition** (`lib/redux/prompt-execution/types.ts`):
```typescript
metadata?: {
  fromTemplate?: boolean;  // Marks messages from templates
  // ... other metadata
}
```

**Marking at Creation** (`thunks/startInstanceThunk.ts`):
- Template messages marked when instances created
- Preserved through variable replacement and processing
- Not added to user-created or assistant messages

**UI Filtering** (`components/smart/SmartMessageList.tsx`):
```typescript
// Before execution: respect debug toggle
const shouldShowMessagesBeforeExecution = !requiresVariableReplacement || showTemplateMessages;

// After execution: filter based on show_variables config
const visibleMessages = messages.filter(msg => {
  if (msg.role === 'system' && !showSystemMessage) return false;
  if (!requiresVariableReplacement && msg.metadata?.fromTemplate && executionConfig?.show_variables === false) {
    return false;
  }
  return true;
});
```

**Helper Selectors** (`selectors.ts`):
- `selectMessagesFromTemplate()` - Get only template messages
- `selectUserCreatedMessages()` - Get only user-created messages

### Benefits
- Clean per-message identification (no heuristics)
- Persistent across DB operations
- Supports both debug and production use cases
- Easy to extend with additional metadata

### Component Coverage ✅

All display components that show message history automatically support template filtering via `SmartMessageList`:

| Component | Uses SmartMessageList | Template Filtering |
|-----------|---------------------|-------------------|
| **PromptCompactModal** | ✅ Direct | ✅ Auto |
| **PromptRunnerModal** | ✅ via PromptRunner | ✅ Auto |
| **PromptSidebarRunner** | ✅ via PromptRunner | ✅ Auto |
| **PromptFlexiblePanel** | ✅ via PromptRunner | ✅ Auto |
| **PromptInlineOverlay** | N/A (result-only) | N/A |
| **PromptToast** | N/A (result-only) | N/A |

**Note**: PromptInlineOverlay and PromptToast only display final results, not conversation history, so template filtering is not applicable.

---

## Next Steps

### Apply Gold Standard to Remaining Components

**To Update** (follow PromptCompactModal pattern):
1. `PromptRunnerModal.tsx` - Remove extra props, use selectors
2. `PromptSidebarRunner.tsx` - Remove extra props, use selectors
3. `PromptFlexiblePanel.tsx` - Remove extra props, use selectors
4. `PromptInlineOverlay.tsx` - Remove extra props, use selectors
5. `PromptToast.tsx` - Remove extra props, use selectors

**Pattern to Apply**:
- Props: `runId`, `isOpen`, `onClose` only
- Read everything from Redux selectors
- Include streaming finalization if using SmartMessageList
- Respect execution config settings

