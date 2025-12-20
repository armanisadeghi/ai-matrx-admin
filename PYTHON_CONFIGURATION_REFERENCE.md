# AI Matrx - Configuration Settings Reference for Python Backend

**Last Updated:** December 19, 2025  
**Purpose:** Complete list of all possible configuration settings the frontend can send

---

## Configuration Object Structure

All configuration settings are optional except `model_id`. The frontend sends a `settings` object with any combination of these fields:

---

## Complete Settings List

### **REQUIRED**

| Key | Type | Description |
|-----|------|-------------|
| `model_id` | `string` (UUID) | The AI model identifier |

---

### OPTIONAL - Output & Format

| Key | Type | Options/Range | Description |
|-----|------|---------------|-------------|
| `output_format` | `string` | `"text"` \| `"json_object"` \| `"json_schema"` | Controls response format |

---

### OPTIONAL - Tool Configuration

| Key | Type | Options/Range | Description |
|-----|------|---------------|-------------|
| `tool_choice` | `string` | `"auto"` \| `"required"` \| `"none"` | How model uses tools |
| `tools` | `array<string>` | Array of tool names | List of enabled tools |
| `parallel_tool_calls` | `boolean` | `true` \| `false` | Allow simultaneous tool calls |

---

### OPTIONAL - Sampling Parameters

| Key | Type | Options/Range | Description |
|-----|------|---------------|-------------|
| `temperature` | `number` | `0` to `2` | Response randomness (lower = deterministic) |
| `max_tokens` | `number` | `1` to `32000` (model-dependent) | Maximum response length |
| `top_p` | `number` | `0` to `1` | Nucleus sampling parameter |
| `top_k` | `number` | `1` to `100` | Top-K sampling parameter |

---

### OPTIONAL - Storage & Streaming

| Key | Type | Options/Range | Description |
|-----|------|---------------|-------------|
| `store` | `boolean` | `true` \| `false` | Save conversation to database |
| `stream` | `boolean` | `true` \| `false` | Stream response in real-time |

---

### OPTIONAL - Multimodal & Features

| Key | Type | Options/Range | Description |
|-----|------|---------------|-------------|
| `image_urls` | `boolean` | `true` \| `false` | Enable image URL processing |
| `file_urls` | `boolean` | `true` \| `false` | Enable file URL processing |
| `internal_web_search` | `boolean` | `true` \| `false` | Enable web search capability |
| `internal_url_context` | `boolean` | `true` \| `false` | Enable URL context extraction |
| `youtube_videos` | `boolean` | `true` \| `false` | Enable YouTube video processing |

---

### OPTIONAL - Reasoning Models (o1-series)

| Key | Type | Options/Range | Description |
|-----|------|---------------|-------------|
| `reasoning_effort` | `string` | `"none"` \| `"low"` \| `"medium"` \| `"high"` | Computational reasoning effort |
| `verbosity` | `string` | `"low"` \| `"medium"` \| `"high"` | Reasoning output detail level |
| `reasoning_summary` | `string` | `"auto"` \| `"enabled"` \| `"disabled"` | Summarize reasoning steps |

---

### OPTIONAL - Advanced

| Key | Type | Options/Range | Description |
|-----|------|---------------|-------------|
| `stop_sequences` | `array<string>` | Array of strings | Sequences that stop generation |
| `thinking_budget` | `number` | Positive integer | Token budget for thinking/reasoning |
| `include_thoughts` | `boolean` | `true` \| `false` | Include thinking process in output |

---

## Example Configurations

### Minimal Configuration
```json
{
  "model_id": "548126f2-714a-4562-9001-0c31cbeea375"
}
```

### Standard Chat Configuration
```json
{
  "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
  "temperature": 1,
  "max_tokens": 4096,
  "stream": true,
  "store": true
}
```

### JSON Mode
```json
{
  "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
  "output_format": "json_object",
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": true
}
```

### With Tools
```json
{
  "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
  "tools": ["calculator", "web_search", "code_interpreter"],
  "tool_choice": "auto",
  "parallel_tool_calls": true,
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### Reasoning Model (o1-series)
```json
{
  "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
  "reasoning_effort": "high",
  "verbosity": "medium",
  "reasoning_summary": "enabled",
  "thinking_budget": 10000,
  "include_thoughts": true
}
```

### Multimodal Configuration
```json
{
  "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
  "image_urls": true,
  "file_urls": true,
  "youtube_videos": true,
  "internal_web_search": true,
  "internal_url_context": true,
  "temperature": 1,
  "max_tokens": 8192
}
```

### Maximum Configuration (All Options)
```json
{
  "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
  "output_format": "text",
  "tool_choice": "auto",
  "tools": ["tool1", "tool2"],
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
  "internal_url_context": false,
  "youtube_videos": false,
  "reasoning_effort": "medium",
  "verbosity": "medium",
  "reasoning_summary": "auto",
  "thinking_budget": 5000,
  "include_thoughts": false,
  "stop_sequences": []
}
```

---

## Important Notes for Python Backend

1. **Only `model_id` is required** - all other fields are optional
2. **Default booleans**: `store` and `stream` typically default to `true`
3. **Arrays**: `tools` and `stop_sequences` are always arrays (can be empty `[]`), never `null`
4. **Number validation**: Validate against specified ranges
5. **Enum validation**: Validate string enums against allowed values
6. **Model-specific settings**:
   - `reasoning_effort`, `verbosity`, `reasoning_summary` → o1-series models
   - `thinking_budget`, `include_thoughts` → Models with extended thinking
   - Attachment flags (`image_urls`, `file_urls`, etc.) may be model-specific
7. **Field naming**: All fields use `snake_case`

---

## Quick Reference: All Keys Alphabetically

```
file_urls
image_urls
include_thoughts
internal_url_context
internal_web_search
max_tokens
model_id (REQUIRED)
output_format
parallel_tool_calls
reasoning_effort
reasoning_summary
stop_sequences
store
stream
temperature
thinking_budget
tool_choice
tools
top_k
top_p
verbosity
youtube_videos
```

---

## TypeScript Type Definition

```typescript
interface PromptSettings {
  // Required
  model_id: string;
  
  // Optional strings (enums)
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
  thinking_budget?: number;
  
  // Optional booleans
  store?: boolean;
  stream?: boolean;
  parallel_tool_calls?: boolean;
  image_urls?: boolean;
  file_urls?: boolean;
  internal_web_search?: boolean;
  internal_url_context?: boolean;
  youtube_videos?: boolean;
  include_thoughts?: boolean;
}
```

