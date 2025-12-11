# Pre-Execution Input Modal

A compact modal system that intercepts prompt execution to collect variables and input before showing the final result display.

## Overview

The Pre-Execution Input Modal acts as an intermediary step in the prompt execution flow:

1. User triggers a prompt (e.g., from context menu)
2. **Pre-execution modal appears** (NEW) - collects variables and input
3. User submits (or auto-runs after countdown)
4. Original result display shows (modal-full, sidebar, etc.)

## Features

- **Compact Variable Inputs**: Uses `VariableInputComponent` with `compact=true` for minimal space
- **Auto-Run Countdown**: 3-second countdown timer that auto-submits
  - Stops on ANY user interaction (typing, clicking, hovering)
  - Becomes manual if stopped
- **Resource Attachments**: Full support for file/image uploads
- **Config Respect**: Honors all execution config settings
  - `show_variables: false` - hides variables section
  - `apply_variables: false` - doesn't set variables
  - `auto_run: true` - shows countdown and auto-executes

## Usage

### Enable in Execution Config

Add `use_pre_execution_input: true` to any prompt execution:

```typescript
import { usePromptRunner } from '@/features/prompts/hooks/usePromptRunner';

const { openPrompt } = usePromptRunner();

await openPrompt({
  promptId: 'my-prompt-id',
  promptSource: 'prompt_builtins',
  variables: { text: selectedText },
  executionConfig: {
    auto_run: true,
    allow_chat: true,
    show_variables: true,
    apply_variables: true,
    track_in_runs: true,
    use_pre_execution_input: true, // ⭐ Enable pre-execution modal
  },
  result_display: 'modal-full', // After submission, shows full modal
});
```

### Example: Context Menu Integration

In `features/context-menu/UnifiedContextMenu.tsx`:

```typescript
const executionConfig = {
  auto_run: shortcut.auto_run ?? true,
  allow_chat: shortcut.allow_chat ?? true,
  show_variables: shortcut.show_variables ?? false,
  apply_variables: shortcut.apply_variables ?? true,
  track_in_runs: true,
  use_pre_execution_input: true, // ⭐ Add this line
};
```

## How It Works

### Execution Flow

```
openPrompt()
  ↓
startPromptInstance() → creates runId
  ↓
use_pre_execution_input === true?
  ↓ YES                           ↓ NO
openPreExecutionModal()     openPromptModal()
  ↓                               ↓
[User fills variables]      [Auto-execute]
  ↓                               ↓
submitPreExecution()         [Show results]
  ↓
executeMessage()
  ↓
openPromptModal/Sidebar/etc.
  ↓
[Show results]
```

### Redux State Structure

```typescript
preExecutionModal: {
  isOpen: boolean;
  config: PromptRunnerModalConfig | null; // Contains runId
  targetResultDisplay: string | null; // 'modal-full', 'sidebar', etc.
}
```

## Configuration Options

### Execution Config

```typescript
interface ExecutionConfig {
  auto_run: boolean;           // Show countdown timer and auto-execute
  allow_chat: boolean;         // Not used in pre-execution (affects result display)
  show_variables: boolean;     // Show/hide variables section
  apply_variables: boolean;    // Apply variables to prompt or not
  track_in_runs: boolean;      // Track execution in run history
  use_pre_execution_input?: boolean; // NEW: Show pre-execution modal
}
```

### Result Display Types

Works with all display types except `direct` and `background`:
- ✅ `modal-full` - Opens full modal after submission
- ✅ `modal-compact` - Opens compact modal after submission
- ✅ `sidebar` - Opens sidebar after submission
- ✅ `flexible-panel` - Opens flexible panel after submission
- ✅ `inline` - Executes and shows inline overlay
- ✅ `toast` - Executes and shows toast notification
- ❌ `direct` - Bypassed (no UI)
- ❌ `background` - Bypassed (silent execution)

## Components

### PreExecutionInputModalContainer.tsx
Redux connector that:
- Wraps the existing `CompactPromptModal` (reuses beautifully styled component)
- Reads modal state from Redux
- Handles submission via `submitPreExecutionThunk`
- Implements auto-run countdown overlay
- Routes to target display type after execution

### CompactPromptModal.tsx (Reused)
The existing beautifully-styled modal with:
- `CompactPromptInput` component (all existing styling preserved)
- Compact variable inputs with help text
- Single-line message input with voice support
- Resource picker and chips
- Inline execute button
- **Modes**:
  - `execute` (default): Executes prompt directly when submitted
  - `input-only`: Only collects input, lets parent handle execution (used in pre-execution flow)

### submitPreExecutionThunk.ts
Thunk that:
- Closes pre-execution modal
- Executes the prompt via `executeMessage`
- Routes to target result display (modal-full, sidebar, etc.)

## Auto-Run Behavior

When `auto_run: true`:
1. Modal opens with your existing `CompactPromptModal` styling
2. Countdown overlay appears as a floating badge with progress bar
3. Badge shows "Auto-running in Xs"
4. ANY interaction stops countdown:
   - Typing in input
   - Changing variable values
   - Clicking anywhere
   - Hovering over the modal
5. If countdown reaches 0, auto-submits

When `auto_run: false`:
- No countdown shown
- User must click the inline "Execute" button (styled send icon)

## Testing

### Quick Test

1. Open any page with context menu (e.g., notes, tasks)
2. Select some text
3. Right-click → AI Actions → [any prompt]
4. Should see pre-execution modal (if enabled)
5. Fill variables or wait for auto-run
6. Should proceed to normal result display

### Enable for All Context Menu Prompts

In `features/context-menu/UnifiedContextMenu.tsx`, line 546-552:

```typescript
const executionConfig = {
  auto_run: shortcut.auto_run ?? true,
  allow_chat: shortcut.allow_chat ?? true,
  show_variables: shortcut.show_variables ?? false,
  apply_variables: shortcut.apply_variables ?? true,
  track_in_runs: true,
  use_pre_execution_input: true, // Add this for testing
};
```

## Troubleshooting

### Pre-Execution Modal Not Showing

If the pre-execution modal isn't appearing when expected:

1. **Check the execution config**: Ensure `use_pre_execution_input: true` is set
2. **Check the result_display type**: Pre-execution is bypassed for `direct` and `background` modes
3. **Check for hardcoded flows**: Some test components may have legacy hardcoded logic that bypasses the core system

### Tester Component

The `PromptRunnerModalSidebarTester` component has two toggles:

- **Use Pre-Execution Input**: Uses the core system with `use_pre_execution_input: true` ✅ Recommended
- **Use Compact Input (Legacy)**: Uses local state to directly open CompactPromptModal ⚠️ Deprecated

Always use "Use Pre-Execution Input" for testing as it properly integrates with the core execution system.

## Implementation Details

### Fixed Issues

**Problem**: The sidebar tester was hardcoding logic to directly open `CompactPromptModal` instead of using the core execution system.

**Solution**: 
1. Added `usePreExecutionInput` state toggle
2. Removed hardcoded logic that bypassed the execution flow
3. Set `use_pre_execution_input` in executionConfig based on toggle
4. Kept legacy flow for backward compatibility but marked as deprecated

**Files Modified**:
- `features/prompts/components/runner-tester/PromptRunnerModalSidebarTester.tsx`
- `features/prompts/components/modals/PreExecutionInputModalContainer.tsx` (uses existing CompactPromptModal)

## Notes

- Modal is dynamically imported to reduce bundle size
- Fully integrated with existing Redux execution system
- No changes needed to existing result display components
- Backward compatible - defaults to false
- Properly respects execution config settings (show_variables, apply_variables, auto_run, etc.)

