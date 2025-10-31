# PromptRunnerModal - Quick Start Guide

## 🚀 Get Started in 30 Seconds

### 1. Import What You Need
```typescript
import { 
  usePromptRunnerModal, 
  PromptRunnerModal 
} from '@/features/prompts';
```

### 2. Use the Hook
```typescript
const promptModal = usePromptRunnerModal();
```

### 3. Open the Modal
```typescript
promptModal.open({
  promptId: 'your-prompt-id',
  mode: 'auto-run',
  variables: { text: 'Hello!' }
});
```

### 4. Render the Component
```typescript
<PromptRunnerModal
  isOpen={promptModal.isOpen}
  onClose={promptModal.close}
  {...promptModal.config}
/>
```

## 🎯 Common Patterns

### Auto-Execute with Selected Text
```typescript
const handleAnalyze = () => {
  promptModal.open({
    promptId: 'text-analyzer',
    mode: 'auto-run',
    variables: { text: selectedText }
  });
};
```

### Let User Add Instructions
```typescript
const handleOptimize = () => {
  promptModal.open({
    promptId: 'optimizer',
    mode: 'manual-with-hidden-variables',
    variables: { content: currentContent }
  });
};
```

### Give Full Control
```typescript
const handleAdvanced = () => {
  promptModal.open({
    promptData: myPrompt,
    mode: 'manual-with-visible-variables'
  });
};
```

### Handle Completion
```typescript
promptModal.open({
  promptId: 'generator',
  mode: 'auto-run',
  variables: { topic: 'AI' },
  onExecutionComplete: (result) => {
    console.log(result.response);
    // Do something with the result
  }
});
```

## 🧪 Test It Now!

1. Go to `/ai/prompts/run/[any-prompt-id]`
2. Look at the bottom of the left sidebar
3. Click **"Test Modal"**
4. Click any mode button
5. Watch it work! ✨

## 📖 Need More?

- **Full Guide**: `PROMPT_RUNNER_MODAL_GUIDE.md`
- **Implementation Details**: `MODAL_IMPLEMENTATION_SUMMARY.md`
- **Types**: `features/prompts/types/modal.ts`

## 🎨 Execution Modes

| Mode | Variables | User Input | Use Case |
|------|-----------|------------|----------|
| `auto-run` | Hidden + Auto | No | Context menus, programmatic |
| `manual-with-hidden-variables` | Hidden | Yes | Simplified UX |
| `manual-with-visible-variables` | Visible | Yes | Power users |
| `manual` | Visible | Yes | Admin/testing |

## ✅ You're Ready!

That's it! You now know everything you need to use the PromptRunnerModal in your application.

**Happy Prompting! 🎉**

