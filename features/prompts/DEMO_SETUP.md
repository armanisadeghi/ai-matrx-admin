# Prompt Execution System Demo Setup

## Quick Access

Navigate to: **`/demo/prompt-execution`**

## Quick Import

🎉 **NEW!** You can now import these prompts instantly using JSON!

On the demo page, click **"Import Demo Prompts"** and paste the contents from `features/prompts/DEMO_PROMPTS.json`

Or manually create them below:

## Required Prompts

To use the demo page, create these prompts in your AI Prompts section:

### 1. Text Analyzer

- **Prompt ID**: `text-analyzer`
- **Name**: Text Analyzer
- **Description**: Analyzes text for sentiment, tone, and key themes
- **Variables**: `text`

**System Message**:
```
You are an expert text analyst. Analyze the provided text for sentiment, tone, key themes, and important insights. Be concise but thorough.
```

**User Message**:
```
Analyze this text:

{{ text }}
```

---

### 2. Demo Prompt (Multi-Variable)

- **Prompt ID**: `demo-prompt`
- **Name**: Demo Multi-Variable
- **Description**: Flexible demo prompt for testing variable detection
- **Variables**: `topic`, `style`, `detail_level`

**System Message**:
```
You are a helpful AI assistant. Generate content based on the user's specifications. Match the requested style and detail level.
```

**User Message**:
```
Create content about: {{ topic }}

Style: {{ style }}
Detail level: {{ detail_level }}
```

---

## Already Working

The **System Prompt Optimizer** feature is already functional and uses:
- **Prompt ID**: `6e4e6335-dc04-4946-9435-561352db5b26`
- **Location**: AI Prompts → Prompt Builder → System Message section

## Demo Features

### 1. Text Analyzer Demo
- Uses `usePromptExecution` hook
- Shows real-time streaming
- Single variable input
- Demonstrates basic programmatic execution

### 2. Modal Demo
- Uses `PromptExecutionModal` component
- Automatic variable detection
- Multiple examples with different configurations
- Shows default values feature

## Implementation Examples

All example components are in:
```
features/prompts/examples/
├── TextAnalyzerExample.tsx       ✅ Live demo
├── PromptModalExample.tsx        ✅ Live demo
├── ContentGeneratorExample.tsx   (needs prompts)
├── ContextMenuExample.tsx        (needs prompts)
└── ChainedPromptsExample.tsx     (needs prompts)
```

## Adding More Demos

To enable additional examples:
1. Create the required prompts in your database
2. Update the demo page to include the example component
3. Update this documentation with the new prompt specs

