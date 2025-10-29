## Universal Prompt Execution Modal - Usage Guide

The `PromptExecutionModal` is a powerful, reusable component that can execute any prompt from anywhere in your app. Just provide a prompt ID!

## Quick Start

### 1. Basic Usage

```tsx
import { PromptExecutionModal, usePromptModal } from '@/features/prompts';

export function MyComponent() {
  const modal = usePromptModal({
    promptId: 'your-prompt-id',
    onResult: (result) => console.log(result)
  });

  return (
    <>
      <Button onClick={modal.open}>Run AI</Button>
      <PromptExecutionModal {...modal.modalProps} />
    </>
  );
}
```

### 2. With Default Values

```tsx
const modal = usePromptModal({
  promptId: 'translate-text',
  defaultValues: {
    target_language: 'Spanish',
    text: selectedText
  },
  onResult: handleTranslation
});
```

### 3. Without User Input Field

```tsx
const modal = usePromptModal({
  promptId: 'analyze-data',
  hideUserInput: true,  // No additional input field
  onResult: handleAnalysis
});
```

## Features

### Automatic Variable Detection
The modal automatically:
- ✅ Fetches the prompt from database
- ✅ Extracts all variables from prompt messages
- ✅ Creates input fields for each variable
- ✅ Validates all variables are filled

### Dynamic Input Forms
Each variable gets:
- Text input (default)
- Table bookmark selector (for database references)
- File reference (coming soon)
- URL input (coming soon)

### Streaming Response
- Real-time text streaming
- Progress indicators
- Smooth UX during execution

### Result Handling
- View result in modal
- Copy to clipboard
- Pass to callback function
- Tab between input/result

## Table Bookmarks

The modal supports referencing data from user-generated tables:

### Full Table
```typescript
{
  type: 'full_table',
  table_id: 'uuid',
  table_name: 'Research Data'
}
```

### Table Row
```typescript
{
  type: 'table_row',
  table_id: 'uuid',
  row_id: 'uuid',
  table_name: 'Research Data'
}
```

### Table Column
```typescript
{
  type: 'table_column',
  table_id: 'uuid',
  column_name: 'summary',
  table_name: 'Research Data'
}
```

### Table Cell
```typescript
{
  type: 'table_cell',
  table_id: 'uuid',
  row_id: 'uuid',
  column_name: 'summary',
  table_name: 'Research Data'
}
```

## Advanced Usage

### In a Table Context

```tsx
function DataTable({ rows }) {
  const analyzeModal = usePromptModal({
    promptId: 'analyze-row',
    onResult: (analysis) => {
      // Handle analysis result
    }
  });

  const handleRowClick = (row) => {
    // Pass row data as default values
    analyzeModal.modalProps.defaultValues = {
      data: JSON.stringify(row)
    };
    analyzeModal.open();
  };

  return (
    <>
      {rows.map(row => (
        <tr key={row.id} onClick={() => handleRowClick(row)}>
          {/* row cells */}
        </tr>
      ))}
      <PromptExecutionModal {...analyzeModal.modalProps} />
    </>
  );
}
```

### With Context Menu

```tsx
function ContentEditor() {
  const [selected, setSelected] = useState('');
  
  const improveModal = usePromptModal({
    promptId: 'improve-writing',
    defaultValues: { text: selected },
    onResult: (improved) => {
      // Replace selected text with improved version
    }
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger onSelect={() => improveModal.open()}>
        Improve with AI
      </ContextMenuTrigger>
      <PromptExecutionModal {...improveModal.modalProps} />
    </ContextMenu>
  );
}
```

### Multiple Modals

```tsx
function MultiModalComponent() {
  const summarizeModal = usePromptModal({ promptId: 'summarize' });
  const translateModal = usePromptModal({ promptId: 'translate' });
  const analyzeModal = usePromptModal({ promptId: 'analyze' });

  return (
    <>
      <Button onClick={summarizeModal.open}>Summarize</Button>
      <Button onClick={translateModal.open}>Translate</Button>
      <Button onClick={analyzeModal.open}>Analyze</Button>

      <PromptExecutionModal {...summarizeModal.modalProps} />
      <PromptExecutionModal {...translateModal.modalProps} />
      <PromptExecutionModal {...analyzeModal.modalProps} />
    </>
  );
}
```

## API Reference

### usePromptModal Options

```typescript
interface UsePromptModalOptions {
  // Required: ID of the prompt to execute
  promptId: string;
  
  // Optional: Display name (overrides prompt name from DB)
  promptName?: string;
  
  // Optional: Pre-fill variable values
  defaultValues?: Record<string, string>;
  
  // Optional: Hide the additional input field
  hideUserInput?: boolean;
  
  // Optional: Callback when execution completes
  onResult?: (result: string) => void;
}
```

### usePromptModal Return

```typescript
{
  isOpen: boolean;        // Modal state
  open: () => void;       // Open the modal
  close: () => void;      // Close the modal
  toggle: () => void;     // Toggle modal state
  modalProps: {           // Props to spread on PromptExecutionModal
    ...options,
    isOpen,
    onClose
  }
}
```

## Common Patterns

### 1. Quick Action Button

```tsx
const modal = usePromptModal({
  promptId: 'quick-analysis',
  onResult: handleResult
});

<Button onClick={modal.open}>Quick Analysis</Button>
<PromptExecutionModal {...modal.modalProps} />
```

### 2. Form Submission

```tsx
const modal = usePromptModal({
  promptId: 'process-form',
  hideUserInput: true
});

const handleSubmit = (formData) => {
  modal.modalProps.defaultValues = formData;
  modal.open();
};
```

### 3. Toolbar Action

```tsx
const modal = usePromptModal({
  promptId: 'enhance-content',
  defaultValues: { content: editorContent },
  onResult: (enhanced) => {
    setEditorContent(enhanced);
  }
});

<Toolbar>
  <Button onClick={modal.open}>Enhance</Button>
</Toolbar>
```

### 4. Batch Processing

```tsx
const modal = usePromptModal({
  promptId: 'process-item',
  onResult: (result) => {
    results.push(result);
    if (hasMore) {
      processNext();
    }
  }
});

const processBatch = () => {
  items.forEach(item => {
    modal.modalProps.defaultValues = { item };
    modal.open();
  });
};
```

## Styling

The modal uses Tailwind CSS and Shadcn UI components. It's fully themed and responsive.

### Customization

Currently, styling is handled internally. For custom styling, you can:

1. Modify the component directly
2. Use CSS classes to override
3. Create a wrapper component

## Performance

- ✅ Lazy loads prompt data (only when opened)
- ✅ Efficient streaming updates
- ✅ Proper cleanup on unmount
- ✅ Optimized re-renders

## Limitations

Current version doesn't support:
- Multiple prompt execution in single modal
- Prompt chaining/workflows
- File upload for variables
- Custom variable input components

These features are planned for future releases.

## Troubleshooting

### Modal doesn't open
- Check promptId is valid
- Verify prompt exists in database
- Check console for errors

### Variables not showing
- Ensure prompt uses `{{variable}}` syntax
- Check prompt messages are properly formatted
- Verify variable extraction is working

### Streaming not working
- Check network tab for API errors
- Verify `/api/prompts/execute` route exists
- Check browser console for errors

### Result not appearing
- Verify onResult callback is defined
- Check result tab in modal
- Look for execution errors

## Examples

See `features/prompts/examples/PromptModalExample.tsx` for complete examples.

## Best Practices

1. **Reuse Modals**: Create one modal instance and reuse it
2. **Default Values**: Pre-fill when possible for better UX
3. **Result Handling**: Always provide onResult callback
4. **Error Handling**: The modal handles errors, but log them too
5. **User Feedback**: Use toast notifications for completion

## Future Enhancements

Planned features:
- [ ] Table bookmark selector UI
- [ ] File upload support
- [ ] URL content fetching
- [ ] Custom input components
- [ ] Prompt templates
- [ ] Result history
- [ ] Export results
- [ ] Batch processing UI

---

**Built with:**
- React 19 + Next.js 15
- TypeScript
- Tailwind CSS
- Shadcn UI
- Programmatic Prompt Execution System

