# Matrx Actions - Setup Guide

## Connecting Actions to Real Prompts

This guide shows you how to update the hardcoded system actions with your actual prompt IDs.

## 📝 Example: Persian Translation (DONE ✓)

```typescript
{
  id: 'translate-persian',
  name: 'Translate to Persian',
  description: 'Translate text to Persian',
  icon: 'Languages',
  actionType: 'prompt',
  promptId: '3446e556-b6c5-4322-960a-e36fe0eff17c', // ✓ Real prompt ID
  variableContextMap: {
    text_to_translate: { // ✓ Matches your prompt's variable name
      source: 'selection',
      fallback: 'editor_content',
      required: true,
      label: 'Text to translate'
    }
  },
  scope: 'system',
  isSystem: true
}
```

## 🔧 How to Update Actions

### Step 1: Identify Your Prompt

Find the prompt in your database or prompt builder:
- Note the **Prompt ID** (UUID)
- Note the **Variable Names** used in the prompt
- Note any **Additional Variables** (for guidance, style, etc.)

### Step 2: Update the Action Definition

Open `features/matrx-actions/constants/system-actions.ts` and update the action:

```typescript
{
  id: 'your-action-id',
  name: 'Action Name',
  // ...
  promptId: 'YOUR-ACTUAL-PROMPT-UUID-HERE', // ← Replace this
  variableContextMap: {
    your_actual_variable_name: { // ← Match your prompt's variable name
      source: 'selection', // Where to get the value
      fallback: 'editor_content', // Fallback if source unavailable
      required: true, // Is this variable required?
      label: 'User-friendly label'
    },
    // Add more variables if your prompt needs them
    additional_guidance: {
      source: 'manual_input', // User will be prompted
      prompt: 'Any additional guidance?',
      default: '',
      required: false
    }
  }
}
```

### Step 3: Match Variable Names EXACTLY

The variable names in `variableContextMap` **must match** the variable names in your prompt:

**Your Prompt:**
```
Translate the following text to Persian:

{{ text_to_translate }}

Additional guidance: {{ guidance }}
```

**Your Action Config:**
```typescript
variableContextMap: {
  text_to_translate: { ... }, // ✓ Matches {{ text_to_translate }}
  guidance: { ... }            // ✓ Matches {{ guidance }}
}
```

## 📋 Actions That Need Prompt IDs

Here's a checklist of all actions that need real prompt IDs configured:

### Standalone Actions
- [ ] `explain` - Prompt ID: `_____________`
- [ ] `summarize` - Prompt ID: `_____________`
- [ ] `extract-key-points` - Prompt ID: `_____________`
- [ ] `improve` - Prompt ID: `_____________`
- [ ] `get-ideas` - Prompt ID: `_____________`

### Matrx Create
- [ ] `create-flashcards` - Prompt ID: `_____________`
- [ ] `create-presentation` - Prompt ID: `_____________`
- [ ] `create-quiz` - Prompt ID: `_____________`
- [ ] `create-flowchart` - Prompt ID: `_____________`
- [ ] `create-other` - Prompt ID: `_____________`

### Translation
- [ ] `translate-english` - Prompt ID: `_____________`
- [ ] `translate-spanish` - Prompt ID: `_____________`
- [ ] `translate-french` - Prompt ID: `_____________`
- [ ] `translate-italian` - Prompt ID: `_____________`
- [x] `translate-persian` - Prompt ID: `3446e556-b6c5-4322-960a-e36fe0eff17c` ✓
- [ ] `translate-other` - Prompt ID: `_____________`

## 🎯 Context Sources Explained

When mapping variables to context, you can use these sources:

| Source | Description | Example Use Case |
|--------|-------------|------------------|
| `selection` | User-highlighted text | Text to translate, analyze, improve |
| `editor_content` | Full content of current editor | When no text selected |
| `manual_input` | Prompt user for input | Language choice, style preference |
| `screenshot` | Visual capture (future) | Image analysis |
| `page_html` | DOM structure (future) | Web page analysis |
| `clipboard` | System clipboard (future) | Quick paste actions |

## 💡 Advanced: Multiple Variables

If your prompt has multiple variables:

```typescript
{
  id: 'advanced-action',
  promptId: 'your-prompt-id',
  variableContextMap: {
    // Primary content from selection
    content: {
      source: 'selection',
      fallback: 'editor_content',
      required: true,
      label: 'Content to process'
    },
    
    // Style from user input
    style: {
      source: 'manual_input',
      prompt: 'Choose a style',
      default: 'professional',
      required: false,
      label: 'Writing style'
    },
    
    // Hardcoded value
    output_format: {
      source: 'manual_input',
      default: 'markdown',
      required: true,
      label: 'Output format'
    }
  }
}
```

## 🔄 Testing After Updates

After updating prompt IDs:

1. **Save the file** - Hot reload should update immediately
2. **Go to demo page** - `/demo/prompt-execution` → "Matrx Actions" tab
3. **Right-click** on the content
4. **Click an action** - Should now show the real prompt ID in the toast/console
5. **Check console** for the context being passed

## 🎨 Variable Source Strategy

Choose the right source based on your use case:

### Selection with Fallback (Most Common)
```typescript
{
  source: 'selection',
  fallback: 'editor_content',
  required: true
}
```
**Use for:** Text processing actions (translate, summarize, improve)

### Manual Input Only
```typescript
{
  source: 'manual_input',
  prompt: 'What would you like to create?',
  required: true
}
```
**Use for:** When user needs to specify something (topic, language, etc.)

### Manual Input with Default
```typescript
{
  source: 'manual_input',
  default: 'concise',
  prompt: 'Choose a style (concise, detailed, etc.)',
  required: false
}
```
**Use for:** Optional parameters with sensible defaults

## 🚀 Next: Connecting to Execution System

Once all prompt IDs are configured, we'll connect these actions to the actual prompt execution system:

1. The `onActionTrigger` callback will receive the action ID and context
2. We'll look up the action's prompt ID
3. Resolve all variables from the context
4. Execute the prompt using `usePromptExecution` hook
5. Display results in canvas/toast/modal

For now, clicking actions shows toasts - this proves the structure works before we add execution logic.

## ❓ Questions?

- **Q: What if my prompt doesn't exist yet?**
  - A: Leave the placeholder ID, create the prompt later, then update the action

- **Q: Can one action use multiple prompts?**
  - A: Use `actionType: 'hybrid'` for complex workflows (future feature)

- **Q: What if variable names don't match?**
  - A: The system won't work properly - variable names must match exactly

- **Q: Can I add custom variables?**
  - A: Yes! Add any variables your prompt needs to the `variableContextMap`

