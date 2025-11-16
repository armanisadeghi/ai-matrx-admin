# Unified Prompt Execution System

## Overview
Centralized Redux-based system for executing AI prompts with 7 different result display types. All prompt execution flows through a single entry point with global state management.

## Architecture

### Core Redux Flow
```
Component → usePromptRunner.openPrompt() → openPromptExecutionThunk → promptRunnerSlice → OverlayController → Display Component
```

### Key Files
- **`lib/redux/slices/promptRunnerSlice.ts`**: Central state for all displays
- **`lib/redux/thunks/openPromptExecutionThunk.ts`**: Routes execution to correct display type
- **`lib/redux/thunks/executePromptDirectThunk.ts`**: Handles non-UI executions
- **`features/prompts/hooks/usePromptRunner.ts`**: Primary hook for triggering prompts
- **`features/prompts/hooks/usePromptExecutionCore.ts`**: Stateful execution logic for UI components
- **`components/overlays/OverlayController.tsx`**: Renders all displays based on Redux state

## 7 Result Display Types

| Type | Use Case | UI Location |
|------|----------|-------------|
| `modal-full` | Complete conversation with all features | Full modal dialog |
| `modal-compact` | Quick AI response, minimal UI | Compact draggable modal |
| `inline` | Text replacement in editors | Overlay with replace/insert actions |
| `sidebar` | Full features in side panel | FloatingSheet (left/right) |
| `toast` | Quick notification | Bottom-right stack |
| `direct` | Programmatic access, no UI | Returns result via promise |
| `background` | Silent execution, auto-store | No UI, task tracking only |

## Usage Patterns

### Opening a Prompt
```typescript
import { usePromptRunner } from '@/features/prompts';

const { openPrompt } = usePromptRunner();

openPrompt({
  promptData: myPrompt,
  result_display: 'modal-compact',
  executionConfig: {
    auto_run: true,
    allow_chat: false,
    show_variables: false,
    apply_variables: true,
  },
  variables: { my_var: 'value' }
});
```

### taskId-Based Loading
All components support loading completed results via `taskId` from Redux Socket.IO state:
```typescript
// Toast → Compact Modal flow
taskId → selectPrimaryResponseTextByTaskId → Display result
```

### Execution Config
- `auto_run`: Execute immediately without user confirmation
- `allow_chat`: Enable follow-up conversation (ignored by toast/inline)
- `show_variables`: Show variable editing UI before execution
- `apply_variables`: Use variable values in messages

## Component Patterns

### Display Components Must:
1. Accept `taskId` prop for loading from Socket.IO state
2. Use `BasicMarkdownContent` or `EnhancedChatMarkdown` for rendering
3. Match compact modal visual style (dark theme, minimal padding)
4. Handle streaming via `selectPrimaryResponseTextByTaskId` selector
5. Ignore irrelevant execution config flags (e.g., toast ignores `allow_chat`)

### Streaming Flow
```typescript
taskId → createAndSubmitTask → Socket.IO → Redux → Selectors → Real-time UI update
```

## Testing
Use `PromptRunnerModalSidebarTester` to test all display types with mix-and-match configs.
Use `PromptExecutionTestModal` to test direct/inline/background modes in simulated contexts.

## Key Principles
1. **Single source of truth**: All prompt execution goes through Redux
2. **No prop drilling**: Components dispatch actions, OverlayController renders
3. **taskId as key**: Socket.IO taskId provides access to all execution data
4. **Graceful degradation**: Components ignore incompatible config options
5. **Performance**: Prompt data cached in Redux, fetched once per session

