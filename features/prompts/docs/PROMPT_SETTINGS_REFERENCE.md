# Prompt Settings Reference

This document provides a comprehensive reference for all possible settings that can be configured in prompts.

## Quick Reference

### Maximum Configuration Object

```json
{
  "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
  "output_format": "text",
  "tool_choice": "auto",
  "tools": [],
  "temperature": 1,
  "max_tokens": 4096,
  "top_p": 1,
  "top_k": 50,
  "store": true,
  "stream": true,
  "parallel_tool_calls": false,
  "image_urls": false,
  "file_urls": false,
  "internal_web_search": false,
  "youtube_videos": false,
  "reasoning_effort": "medium",
  "verbosity": "medium",
  "reasoning_summary": "auto",
  "stop_sequences": []
}
```

## Settings Categories

### 1. Core Settings (Always Present)

#### model_id
- **Type**: `string` (UUID)
- **Required**: Yes
- **Description**: The AI model to use
- **Example**: `"548126f2-714a-4562-9001-0c31cbeea375"`

### 2. Output Formatting

#### output_format
- **Type**: `string` (enum)
- **Required**: No
- **Values**: `"text"` | `"json_object"` | `"json_schema"`
- **Default**: `"text"`
- **Description**: Controls response format

### 3. Tool Configuration

#### tool_choice
- **Type**: `string` (enum)
- **Required**: No
- **Values**: `"auto"` | `"required"` | `"none"`
- **Default**: `"auto"`
- **Description**: How the model uses tools

#### tools
- **Type**: `array<string>`
- **Required**: No
- **Default**: `[]`
- **Description**: List of tool names to enable
- **Example**: `["calculator", "web_search"]`

#### parallel_tool_calls
- **Type**: `boolean`
- **Required**: No
- **Default**: `false`
- **Description**: Allow parallel tool execution

### 4. Sampling Parameters

#### temperature
- **Type**: `number`
- **Range**: 0 - 2
- **Default**: 1
- **Description**: Controls response randomness

#### max_tokens
- **Type**: `number`
- **Range**: 1 - model-dependent (typically 4096-32000)
- **Default**: 4096
- **Description**: Maximum response length

#### top_p
- **Type**: `number`
- **Range**: 0 - 1
- **Default**: 1
- **Description**: Nucleus sampling parameter

#### top_k
- **Type**: `number`
- **Range**: 1 - 100
- **Default**: 50
- **Description**: Top-K sampling parameter

### 5. Feature Flags (Boolean Toggles)

#### store
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Save conversation to database

#### stream
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Stream response chunks

#### image_urls
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Process image URLs

#### file_urls
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Process file URLs

#### internal_web_search
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable web search

#### youtube_videos
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Process YouTube videos

### 6. Reasoning Model Parameters (o1-series)

#### reasoning_effort
- **Type**: `string` (enum)
- **Values**: `"none"` | `"low"` | `"medium"` | `"high"`
- **Default**: `"medium"`
- **Description**: Computational effort for reasoning

#### verbosity
- **Type**: `string` (enum)
- **Values**: `"low"` | `"medium"` | `"high"`
- **Default**: `"medium"`
- **Description**: Detail level of reasoning output

#### reasoning_summary
- **Type**: `string` (enum)
- **Values**: `"auto"` | `"enabled"` | `"disabled"`
- **Default**: `"auto"`
- **Description**: Whether to summarize reasoning steps

### 7. Advanced

#### stop_sequences
- **Type**: `array<string>`
- **Default**: `[]`
- **Description**: Sequences that stop generation

## Common Use Cases

### Basic Chat
```json
{
  "model_id": "...",
  "stream": true,
  "store": true,
  "temperature": 1,
  "max_tokens": 4096
}
```

### JSON Mode
```json
{
  "model_id": "...",
  "stream": true,
  "output_format": "json_object",
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### With Tools
```json
{
  "model_id": "...",
  "stream": true,
  "tools": ["calculator", "web_search"],
  "tool_choice": "auto",
  "parallel_tool_calls": true,
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### Multimodal
```json
{
  "model_id": "...",
  "stream": true,
  "image_urls": true,
  "file_urls": true,
  "youtube_videos": true,
  "internal_web_search": true,
  "temperature": 1,
  "max_tokens": 8192
}
```

### Reasoning Model
```json
{
  "model_id": "...",
  "stream": true,
  "reasoning_effort": "high",
  "verbosity": "medium",
  "reasoning_summary": "enabled"
}
```

## TypeScript Type

```typescript
type PromptSettings = {
  // Required
  model_id: string;
  
  // Optional string enums
  output_format?: "text" | "json_object" | "json_schema";
  tool_choice?: "auto" | "required" | "none";
  reasoning_effort?: "none" | "low" | "medium" | "high";
  verbosity?: "low" | "medium" | "high";
  reasoning_summary?: "auto" | "enabled" | "disabled";
  
  // Optional arrays
  tools?: string[];
  stop_sequences?: string[];
  
  // Optional numbers
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  
  // Optional booleans
  store?: boolean;
  stream?: boolean;
  parallel_tool_calls?: boolean;
  image_urls?: boolean;
  file_urls?: boolean;
  internal_web_search?: boolean;
  youtube_videos?: boolean;
}
```

## Implementation Notes for Python Backend

1. **Required Field**: Only `model_id` is required
2. **All Other Fields**: Optional, but should be handled gracefully
3. **Type Validation**: Validate enum values against allowed sets
4. **Array Handling**: Tools and stop_sequences are always arrays (never null)
5. **Boolean Defaults**: Use `true` for store and stream by default
6. **Number Ranges**: Validate temperature (0-2), max_tokens (1-32000), etc.
7. **Model-Specific Settings**: Some settings only apply to certain models

## Quick Import

For TypeScript/JavaScript projects, you can import:

```typescript
import {
  COMPREHENSIVE_PROMPT_SETTINGS,
  SETTINGS_SCHEMA,
  MINIMAL_PROMPT_SETTINGS,
  SETTINGS_PRESETS,
} from '@/features/prompts/constants/prompt-settings-schema';
```

