# Prompt Import System Guide

## Overview

The Prompt Import System allows you to create prompts programmatically using JSON format. This is particularly useful for:
- AI assistants to generate prompts
- Sharing prompts between systems
- Batch importing prompts
- Version control for prompts
- Template distribution

## Quick Start

### 1. Using the UI

Navigate to `/demo/prompt-execution` and click **"Import Demo Prompts"**

### 2. JSON Format

```json
{
  "id": "my-prompt-id",
  "name": "My Prompt",
  "description": "What this prompt does",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Please help with {{ task }}."
    }
  ],
  "variables": [
    {
      "name": "task",
      "defaultValue": "writing code"
    }
  ],
  "settings": {
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```

### 3. Batch Import

```json
{
  "prompts": [
    { /* prompt 1 */ },
    { /* prompt 2 */ }
  ]
}
```

## Programmatic Usage

### For AI Assistants

```typescript
import { 
  quickPrompt, 
  formatPromptJSON 
} from '@/features/prompts';

// Generate prompt JSON
const promptJSON = quickPrompt(
  "Code Reviewer",
  "You are an expert code reviewer.",
  "Review this code:\n\n{{ code }}",
  {
    description: "Reviews code for issues",
    settings: {
      temperature: 0.3,
      max_tokens: 2000
    }
  }
);

// Format for user
console.log(formatPromptJSON(promptJSON));
```

### Using Utility Functions

```typescript
import { 
  createPromptJSON,
  systemMessage,
  userMessage,
  variable,
  defaultSettings
} from '@/features/prompts';

const prompt = createPromptJSON(
  "Translator",
  [
    systemMessage("You are a professional translator."),
    userMessage("Translate to {{ language }}:\n\n{{ text }}")
  ],
  {
    variables: [
      variable("language", "Spanish"),
      variable("text")
    ],
    settings: defaultSettings({ temperature: 0.5 })
  }
);
```

### Importing Programmatically

```typescript
import { importPrompt, importPromptBatch } from '@/features/prompts';

// Single prompt
const result = await importPrompt(promptJSON);
if (result.success) {
  console.log('Created:', result.promptId);
}

// Batch
const batchResult = await importPromptBatch(batchJSON);
console.log(`Imported ${batchResult.totalImported} prompts`);
```

## JSON Schema Reference

### PromptJSON

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | No | Unique identifier (auto-generated if not provided) |
| `name` | string | Yes | Display name |
| `description` | string | No | What the prompt does |
| `messages` | array | Yes | System, user, assistant messages |
| `variables` | array | No | Variable definitions with defaults |
| `settings` | object | No | Model configuration |

### Message

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | `system`, `user`, or `assistant` |
| `content` | string | Yes | Message content with variables |

### Variable

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Variable name (used as `{{ name }}`) |
| `defaultValue` | string | No | Default value for testing |

### Settings

Common settings:

| Field | Type | Description |
|-------|------|-------------|
| `model_id` | string | Model to use (optional, uses default if not set) |
| `temperature` | number | 0-2, controls randomness |
| `max_tokens` | number | Maximum response length |
| `top_p` | number | Nucleus sampling |
| `output_format` | string | `text`, `json`, etc. |

## Best Practices

### 1. Always Provide Clear Names and Descriptions

```json
{
  "name": "Email Draft Generator",
  "description": "Creates professional email drafts based on context and tone"
}
```

### 2. Use Descriptive Variable Names

```json
{
  "variables": [
    { "name": "recipient_name", "defaultValue": "John" },
    { "name": "email_purpose", "defaultValue": "follow-up" }
  ]
}
```

### 3. Set Appropriate Temperatures

- **Creative tasks** (0.7-1.0): Writing, brainstorming
- **Balanced** (0.5-0.7): General assistance
- **Precise tasks** (0.1-0.3): Code review, analysis

### 4. Include System Messages

Always start with a clear system message:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an expert Python developer with 10+ years of experience. Provide clear, well-documented code examples."
    }
  ]
}
```

### 5. Test Your Variables

Use realistic default values for testing:

```json
{
  "variables": [
    {
      "name": "code",
      "defaultValue": "def hello():\\n    print('Hello, World!')"
    }
  ]
}
```

## Examples

See `features/prompts/DEMO_PROMPTS.json` for working examples.

## Troubleshooting

### "Prompt name is required"
Ensure the `name` field is provided and not empty.

### "Invalid message role"
Role must be exactly `system`, `user`, or `assistant`.

### "User not authenticated"
You must be logged in to import prompts.

### Variables not detected
Make sure variables use the exact format: `{{ variable_name }}`

## Future Enhancements

- [ ] Automated import from URLs
- [ ] Template marketplace
- [ ] Version history for prompts
- [ ] Export existing prompts as JSON
- [ ] Bulk update via JSON

## API Reference

Full API documentation: `features/prompts/types/prompt-json.ts`

