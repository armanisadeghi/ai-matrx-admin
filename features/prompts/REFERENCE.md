# Prompts System - Expert Reference

## Hooks (`features/prompts/hooks/`)

### `usePromptExecution()`
Core hook for programmatic prompt execution with real-time streaming via Socket.IO.

**Import:** `import { usePromptExecution } from '@/features/prompts/hooks'`

**Returns:**
```typescript
{
  execute: (config: PromptExecutionConfig) => Promise<ExecutionResult>
  isExecuting: boolean
  streamingText: string          // Live streaming text
  currentTaskId: string | null
  isResponseEnded: boolean
  error: string | null
  reset: () => void
}
```

**Config Options:**
```typescript
{
  promptId?: string                  // Fetch from DB
  promptData?: PromptsData | PromptExecutionData  // Skip fetch
  variables?: VariableSourceMap      // See variable types below
  userInput?: string | (() => string | Promise<string>)
  modelConfig?: {                    // Override model settings
    modelId?: string
    temperature?: number
    maxTokens?: number
    // ... any model setting
  }
  context?: any                      // For function variables
  onProgress?: (progress) => void
  onError?: (error) => void
}
```

**Variable Types:**
- `hardcoded`: Static values
- `runtime`: Lazy evaluation (computed at execution)
- `function`: Access context data
- `user-input`: Prompt user
- `context`: Extract from context path
- `previous-result`: Chain results
- `redux`: Redux selector
- `broker`: Broker value

**Helper Functions:**
```typescript
createSimpleVariables({ name: 'John', age: '25' })
createRuntimeVariable(() => new Date().toISOString())
createFunctionVariable((ctx) => ctx.user.name)
```

**Example:**
```typescript
const { execute, streamingText, isExecuting } = usePromptExecution();

await execute({
  promptId: 'my-prompt-id',
  variables: createSimpleVariables({ name: 'John' }),
  userInput: 'Be concise',
  modelConfig: { temperature: 0.7 }
});
```

---

### `usePromptRunnerModal()`
State management for PromptRunnerModal component.

**Import:** `import { usePromptRunnerModal } from '@/features/prompts/hooks'`

**Returns:**
```typescript
{
  isOpen: boolean
  open: (config: PromptRunnerModalConfig) => void
  close: () => void
  config: PromptRunnerModalConfig | null
}
```

**Example:**
```typescript
const modal = usePromptRunnerModal();

modal.open({
  promptId: 'text-analyzer',
  mode: 'auto-run',
  variables: { text: selectedText }
});

<PromptRunnerModal
  isOpen={modal.isOpen}
  onClose={modal.close}
  {...modal.config}
/>
```

---

### `usePromptsWithFetch()`
Entity system integration for prompts CRUD operations.

**Import:** `import { usePromptsWithFetch } from '@/features/prompts/hooks'`

**Returns:** Full entity system interface + `createPrompt()`, `updatePrompt()`, `promptsRecords`, etc.

---

### Other Hooks
- `useAvailableModels()`: Get available AI models
- `useModelControls()`: Model configuration controls
- `useResourceMessageFormatter()`: Format messages with resources

---

## Modal Components (`features/prompts/components/modal/`)

### `<PromptRunnerModal />`
Modal wrapper for prompt execution with conversation support.

**Import:** `import { PromptRunnerModal } from '@/features/prompts/components/modal'`

**Props:**
```typescript
{
  isOpen: boolean
  onClose: () => void
  promptId?: string              // Fetch from DB
  promptData?: PromptData        // Skip fetch
  mode?: PromptExecutionMode     // See modes below
  variables?: Record<string, string>
  initialMessage?: string
  onExecutionComplete?: (result) => void
  title?: string
  runId?: string                 // Resume conversation
}
```

**Execution Modes:**
- `manual` (default): Standard prompt runner
- `auto-run`: Auto-execute with variables, allow conversation
- `auto-run-one-shot`: Auto-execute, no follow-up
- `manual-with-hidden-variables`: User adds message, variables hidden
- `manual-with-visible-variables`: User can edit variables + message

**Example:**
```typescript
<PromptRunnerModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  promptId="text-analyzer"
  mode="auto-run"
  variables={{ text: selectedText }}
  initialMessage="Be detailed"
  onExecutionComplete={(result) => {
    console.log(result.response);
  }}
/>
```

---

### `<PromptRunner />`
Core prompt execution component (standalone, no modal wrapper).

**Import:** `import { PromptRunner } from '@/features/prompts/components/modal'`

**Props:** Same as `PromptRunnerModal` minus `isOpen`/`onClose`, plus:
```typescript
{
  className?: string
  isActive?: boolean  // Control init/reset
}
```

Use in Sheets, Pages, or custom containers.

---

## Context Menu Components (`features/prompts/components/`)

### `<PromptContextMenu />`
Right-click context menu for executing prompts on selected content.

**Import:** `import { PromptContextMenu } from '@/features/prompts/components'`

**Props:**
```typescript
{
  options: ContextMenuPromptOption[]
  context: any                    // Passed to prompt execution
  children: React.ReactNode       // Content to wrap
  className?: string
}
```

**Option Config:**
```typescript
{
  label: string
  icon?: LucideIcon
  group?: string                  // Group related options
  visible?: boolean | ((context) => boolean)  // Dynamic visibility
  config: PromptExecutionConfig   // Execution config (minus context)
}
```

**Example:**
```typescript
<PromptContextMenu
  options={[
    {
      label: 'Summarize',
      icon: FileText,
      group: 'content',
      config: {
        promptId: 'summarize-text',
        variables: {
          text: { type: 'context', path: 'selectedText' }
        }
      }
    },
    {
      label: 'Translate to Spanish',
      icon: Languages,
      group: 'translation',
      visible: (ctx) => ctx.selectedText.length > 0,
      config: {
        promptId: 'translate-text',
        variables: {
          text: { type: 'context', path: 'selectedText' },
          lang: { type: 'hardcoded', value: 'Spanish' }
        }
      }
    }
  ]}
  context={{ selectedText, metadata }}
>
  <div>Right-click me!</div>
</PromptContextMenu>
```

---

### `<TextSelectionPromptMenu />`
Specialized wrapper for text selection (auto-captures selected text).

**Import:** `import { TextSelectionPromptMenu } from '@/features/prompts/components'`

**Props:** Same as `PromptContextMenu` minus `context` (auto-provided)

**Example:**
```typescript
<TextSelectionPromptMenu
  options={[
    {
      label: 'Summarize Selection',
      config: {
        promptId: 'summarize-text',
        variables: {
          text: { type: 'context', path: 'selectedText' }
        }
      }
    }
  ]}
>
  <div>Select text and right-click!</div>
</TextSelectionPromptMenu>
```

**Context provided:** `{ selectedText: string, selection: string }`

---

## Type Definitions

**Location:** `features/prompts/types/`

- `execution.ts`: Hook types, configs, variable sources
- `modal.ts`: Modal props, modes, execution results
- `core.ts`: Prompt data, messages, variables, settings

---

## Key Patterns

### 1. Headless Execution (No UI)
```typescript
const { execute } = usePromptExecution();
await execute({ promptId: 'my-prompt', variables: {...} });
```

### 2. Modal-Based Execution
```typescript
const modal = usePromptRunnerModal();
modal.open({ promptId: 'my-prompt', mode: 'auto-run' });
```

### 3. With Existing Prompt Object
```typescript
const { promptsRecords } = usePromptsWithFetch();
const prompt = promptsRecords[`id:${promptId}`];

await execute({ promptData: prompt, variables: {...} });
```

### 4. Real-time Streaming
```typescript
const { streamingText, isExecuting, isResponseEnded } = usePromptExecution();
// Watch streamingText for live updates
```

### 5. Chained Prompts
```typescript
const result1 = await execute({ promptId: 'step-1' });
const result2 = await execute({ 
  promptId: 'step-2',
  variables: createSimpleVariables({ input: result1.text })
});
```

### 6. Context Menu for Text Selection
```typescript
<TextSelectionPromptMenu
  options={[
    {
      label: 'Summarize',
      config: {
        promptId: 'summarize',
        variables: { text: { type: 'context', path: 'selectedText' } }
      }
    }
  ]}
>
  <div>Select text and right-click</div>
</TextSelectionPromptMenu>
```

---

## Architecture

**Execution Flow:**
1. Get prompt (fetch or use provided)
2. Resolve variables (all types, async support)
3. Build messages (replace variables)
4. Add user input (optional)
5. Apply model config overrides
6. Execute via Socket.IO
7. Stream results via Redux selectors

**Modal Flow:**
- `PromptRunnerModal` → wraps `PromptRunner` in Dialog
- `PromptRunner` → core execution + conversation
- Uses Socket.IO for streaming
- Integrates with AI Runs for history
- Supports Canvas for markdown content

---

## File Locations

**Hooks:** `features/prompts/hooks/`
- `usePromptExecution.ts`
- `usePromptRunnerModal.ts`
- `usePrompts.ts`

**Components:**
- `features/prompts/components/modal/`
  - `PromptRunnerModal.tsx`
  - `PromptRunner.tsx`
- `features/prompts/components/`
  - `PromptContextMenu.tsx`

**Types:** `features/prompts/types/`
- `execution.ts`
- `modal.ts`
- `core.ts`

**Utils:** `features/prompts/utils/`
- `variable-resolver.ts`

---

## Notes

- Both `promptId` and `promptData` work (fetch vs skip fetch)
- All variable sources support async
- Model config supports both camelCase and snake_case
- Streaming happens via Redux selectors (real-time)
- Modal modes control auto-execution and variable visibility
- 100% backward compatible with existing code

