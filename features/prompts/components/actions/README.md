# Prompt Actions

Reusable action components for prompts.

## PromptActionsMenu

Dropdown menu providing 6 key actions for prompts.

### Actions

| Action | Description | Access |
|--------|-------------|--------|
| Open Run Modal | Opens prompt runner modal (quick test) | All users |
| Go To Run Page | Full-page runner at `/ai/prompts/run/{id}` | All users |
| Duplicate | Create copy with loading modal & options | All users |
| Create App | Turn prompt into shareable web app | All users |
| Convert to Template | Create template with success modal | Admin only |
| Convert to Builtin | Opens ConvertToBuiltinModal (3-step wizard) | Admin only |

### Usage

```tsx
import { PromptActionsMenu } from "@/features/prompts/components/actions/PromptActionsMenu";

// Basic
<PromptActionsMenu
  promptId={prompt.id}
  promptData={prompt}
/>

// Custom trigger
<PromptActionsMenu
  promptId={prompt.id}
  promptData={prompt}
  trigger={<Button>Actions</Button>}
  align="start"
/>

// With callbacks
<PromptActionsMenu
  promptId={prompt.id}
  promptData={prompt}
  onDuplicateSuccess={(newId) => console.log(newId)}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `promptId` | string | Yes | Prompt ID |
| `promptData` | object | No | For duplicate/create app |
| `trigger` | ReactNode | No | Custom trigger (default: ⋮ button) |
| `triggerClassName` | string | No | CSS classes |
| `align` | string | No | "start" \| "center" \| "end" |
| `side` | string | No | "top" \| "right" \| "bottom" \| "left" |
| `onDuplicateSuccess` | function | No | Callback with new ID |
| `onConvertToTemplateSuccess` | function | No | Callback after conversion |
| `onConvertToBuiltinSuccess` | function | No | Callback after conversion |

### Where It's Used

- Prompt Builder header (desktop & mobile)
- Can be added to prompt cards, lists, etc.

### API Endpoints

- `POST /api/prompts/[id]/convert-to-template`
- `POST /api/prompts/[id]/convert-to-system-prompt`
