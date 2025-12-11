# CompactPromptInput & CompactPromptModal

Space-efficient, modal-optimized versions of `SmartPromptInput` for inline AI triggers.

## Overview

**CompactPromptInput** and **CompactPromptModal** provide a condensed UI for prompt execution, ideal for context menus, toolbars, and inline AI integrations where space efficiency is critical.

### Key Differences from SmartPromptInput

| Feature | SmartPromptInput | CompactPromptInput |
|---------|------------------|-------------------|
| **Variables** | Collapsed rows with popovers | Directly visible, scrollable list |
| **Input** | Auto-expanding textarea | Single-line input |
| **Layout** | Standalone component | Modal-optimized |
| **Spacing** | Standard padding | Minimal padding |
| **Submit** | Inline button | Modal footer buttons |

### Shared Features

Both components share:
- ✅ Full Redux integration
- ✅ All variable types (textarea, toggle, radio, checkbox, select, number)
- ✅ Resource attachments (files, images, audio, notes, tasks, etc.)
- ✅ Voice transcription
- ✅ Clipboard paste for images
- ✅ Same execution flow

## Components

### CompactPromptInput

Core component that renders the input interface.

```tsx
import { CompactPromptInput } from '@/features/prompts/components/smart';

<CompactPromptInput
  runId={runId}
  placeholder="Additional instructions..."
  uploadBucket="userContent"
  uploadPath="prompt-attachments"
  enablePasteImages={true}
/>
```

#### Props

```typescript
interface CompactPromptInputProps {
  runId?: string;                  // Required for Redux state
  placeholder?: string;             // Input placeholder text
  uploadBucket?: string;            // Storage bucket for uploads
  uploadPath?: string;              // Path within bucket
  enablePasteImages?: boolean;      // Allow image paste
  onCancel?: () => void;           // Optional cancel callback
  onSubmit?: () => void;           // Optional submit callback
}
```

### CompactPromptModal

Modal wrapper with header, footer, and action buttons.

```tsx
import { CompactPromptModal } from '@/features/prompts/components/smart';

<CompactPromptModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  runId={runId}
  title="Fix Grammar"
  description="Adjust options and add context"
  submitLabel="Apply"
  onSubmit={() => {
    console.log('Prompt executed');
  }}
/>
```

#### Props

```typescript
interface CompactPromptModalProps {
  isOpen: boolean;                  // Control modal visibility
  onClose: () => void;              // Close handler
  runId?: string;                   // Required for Redux state
  
  // UI Customization
  title?: string;                   // Modal title
  description?: string;             // Optional description
  submitLabel?: string;             // Submit button text
  cancelLabel?: string;             // Cancel button text
  
  // Callbacks
  onSubmit?: () => void;           // Called after successful submission
  
  // CompactPromptInput props
  placeholder?: string;
  uploadBucket?: string;
  uploadPath?: string;
  enablePasteImages?: boolean;
}
```

## Usage Patterns

### Context Menu Integration

```tsx
function TextEditorContextMenu({ selectedText }) {
  const dispatch = useAppDispatch();
  const [showPrompt, setShowPrompt] = useState(false);
  const [runId, setRunId] = useState<string>();
  
  const handleAction = async (promptId: string) => {
    // Initialize prompt execution
    const { initializePromptRun } = await import(
      '@/lib/redux/prompt-execution/thunks/initializePromptRunThunk'
    );
    
    const result = await dispatch(initializePromptRun({ 
      promptId,
      promptData: {
        messages: [/* ... */],
        variableDefaults: [/* ... */],
        settings: { model_id: 'gpt-4o-mini' }
      },
      showVariables: true,
    })).unwrap();
    
    setRunId(result.runId);
    setShowPrompt(true);
  };
  
  return (
    <>
      <ContextMenuItem onClick={() => handleAction('grammar-fix')}>
        Fix Grammar
      </ContextMenuItem>
      
      <CompactPromptModal
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        runId={runId}
        title="Fix Grammar"
        submitLabel="Apply"
      />
    </>
  );
}
```

### Toolbar Action

```tsx
function CodeEditorToolbar() {
  const [activePrompt, setActivePrompt] = useState<{
    runId: string;
    title: string;
  } | null>(null);
  
  const handleQuickAction = async (action: string) => {
    // Get selected code
    const selectedCode = getSelectedCode();
    
    // Initialize prompt with context
    const result = await dispatch(initializePromptRun({
      promptId: `code-${action}`,
      initialContext: selectedCode,
      showVariables: true,
    })).unwrap();
    
    setActivePrompt({
      runId: result.runId,
      title: action === 'explain' ? 'Explain Code' : 'Refactor Code'
    });
  };
  
  return (
    <>
      <Toolbar>
        <ToolbarButton onClick={() => handleQuickAction('explain')}>
          Explain
        </ToolbarButton>
        <ToolbarButton onClick={() => handleQuickAction('refactor')}>
          Refactor
        </ToolbarButton>
      </Toolbar>
      
      {activePrompt && (
        <CompactPromptModal
          isOpen={!!activePrompt}
          onClose={() => setActivePrompt(null)}
          runId={activePrompt.runId}
          title={activePrompt.title}
        />
      )}
    </>
  );
}
```

## Layout & Styling

### Space Efficiency

The components use minimal spacing:
- Modal padding: `p-3` (vs standard `p-6`)
- Section gaps: `gap-2` (vs standard `gap-4`)
- Input height: `h-9` (vs standard `h-10`)
- Variable spacing: `space-y-1.5` (vs standard `space-y-3`)

### Scrolling

- **Variables section**: `max-h-[300px]` with vertical scroll
- **Overall modal**: `max-h-[80dvh]` for mobile compatibility
- Uses `scrollbar-thin` utility for compact scrollbars

### Responsive Design

- Desktop-first with mobile-ready layout
- Modal max-width: `max-w-xl` (wider for complex variables)
- Variables always full width (no grid layout)
- Uses `dvh` units for proper mobile viewport handling

## Variable Types

All variable types from `VariableInputComponent` are supported:

### Textarea
```typescript
{
  name: "description",
  defaultValue: "",
  customComponent: { type: "textarea" }
}
```

### Toggle
```typescript
{
  name: "includeExamples",
  defaultValue: "Yes",
  customComponent: {
    type: "toggle",
    toggleValues: ["No", "Yes"]
  }
}
```

### Radio
```typescript
{
  name: "priority",
  defaultValue: "Medium",
  customComponent: {
    type: "radio",
    options: ["Low", "Medium", "High"],
    allowOther: true
  }
}
```

### Checkbox
```typescript
{
  name: "categories",
  defaultValue: "",
  customComponent: {
    type: "checkbox",
    options: ["Bug", "Feature", "Docs"],
    allowOther: true
  }
}
```

### Select
```typescript
{
  name: "status",
  defaultValue: "Draft",
  customComponent: {
    type: "select",
    options: ["Draft", "In Progress", "Complete"]
  }
}
```

### Number
```typescript
{
  name: "confidence",
  defaultValue: "50",
  customComponent: {
    type: "number",
    min: 0,
    max: 100,
    step: 5
  }
}
```

## Resources

Supports all resource types:
- **Files**: PDF, documents, spreadsheets
- **Images**: PNG, JPEG, GIF, WebP
- **Audio**: Voice recordings, audio files
- **Notes**: From notes app
- **Tasks**: From tasks app
- **Projects**: From projects app
- **Tables**: Database tables
- **Webpages**: Scraped content
- **YouTube**: Video transcripts

Resources are displayed using the `ResourceChips` component and can be previewed/removed.

## Voice Input

Single-line input uses voice transcription differently than textarea:
- **SmartPromptInput**: Appends transcribed text
- **CompactPromptInput**: Replaces input value (single-line behavior)

Click microphone icon to start recording, click again to stop and transcribe.

## Testing

Test page available at: `/tests/compact-prompt-test`

Tests include:
- All variable types
- Resource handling
- Scrolling with many variables
- Execution flow
- Voice input
- Image paste

## Architecture

### Redux Integration

Uses same Redux slice as `SmartPromptInput`:
- **Selectors**: From `@/lib/redux/prompt-execution/selectors`
- **Actions**: From `@/lib/redux/prompt-execution/slice`
- **Thunks**: `executeMessage`, `addValidatedResource`, etc.

### Component Hierarchy

```
CompactPromptModal
  └─ Dialog (ShadCN)
      ├─ DialogHeader
      │   └─ DialogTitle
      ├─ CompactPromptInput
      │   ├─ Variables (scrollable)
      │   │   └─ VariableInputComponent × N
      │   ├─ ResourceChips
      │   └─ Input (single-line)
      │       ├─ Voice button
      │       └─ Resource picker
      └─ DialogFooter
          ├─ Cancel button
          └─ Submit button
```

## Design Principles

1. **Minimal Waste**: Every pixel counts - tight spacing throughout
2. **Direct Display**: No hidden UI - everything visible upfront
3. **Professional Look**: Clean, modern, uncluttered despite density
4. **Consistent Theme**: Follow existing design tokens and patterns
5. **Accessible**: Proper labels, focus states, keyboard navigation

## Migration from SmartPromptInput

If you're using `SmartPromptInput` in a modal, consider switching to `CompactPromptModal`:

**Before:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogTitle>Configure</DialogTitle>
    <SmartPromptInput runId={runId} />
    <DialogFooter>
      <Button onClick={handleSubmit}>Submit</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**After:**
```tsx
<CompactPromptModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  runId={runId}
  title="Configure"
/>
```

Benefits:
- Less code
- Better space utilization
- Consistent modal patterns
- Optimized for inline triggers

