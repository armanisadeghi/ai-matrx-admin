# Tool Testing UI — Frontend Integration Guide

This document describes the Tool Testing API and how to build a frontend UI that lists all available tools, renders argument forms dynamically, executes tools with full streaming, and validates results against the registered output schema.

---

## API Endpoints

Base URL: `{PYTHON_API_BASE}` (your FastAPI server).

All endpoints require authentication — pass the Supabase JWT in the `Authorization: Bearer <token>` header, or the fingerprint cookie (same auth as all other API routes).

### 1. List All Tools

```
GET /tools/test/list?category=web
```

**Query params** (all optional):

| Param      | Type     | Description                                    |
|------------|----------|------------------------------------------------|
| `category` | `string` | Filter tools by category (e.g. `web`, `data`). |

**Response:**

```json
{
  "tools": [
    {
      "name": "web_search",
      "description": "Search the web using Brave Search API.",
      "parameters": {
        "query": {
          "type": "string",
          "description": "The search query to execute",
          "required": true
        },
        "count": {
          "type": "integer",
          "description": "Number of results to return",
          "default": 5
        }
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "results": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "title": { "type": "string" },
                "url": { "type": "string" },
                "description": { "type": "string" }
              }
            }
          }
        }
      },
      "annotations": [],
      "category": "web",
      "tags": ["search", "brave"],
      "icon": "search",
      "version": "1.0.0",
      "tool_type": "local",
      "timeout_seconds": 120.0
    }
  ],
  "count": 31
}
```

### 2. Get Single Tool Detail

```
GET /tools/test/{tool_name}
```

**Response:**

```json
{
  "tool": {
    "name": "web_search",
    "description": "...",
    "parameters": { ... },
    "output_schema": { ... },
    "annotations": [],
    "category": "web",
    "tags": ["search"],
    "icon": "search",
    "version": "1.0.0",
    "tool_type": "local",
    "timeout_seconds": 120.0
  }
}
```

### 3. Execute Tool (Streaming)

```
POST /tools/test/execute
Content-Type: application/json

{
  "tool_name": "web_search",
  "arguments": {
    "query": "best TypeScript frameworks 2026",
    "count": 5
  }
}
```

**Response:** `application/x-ndjson` (newline-delimited JSON). Each line is a complete JSON object.

---

## Streaming Protocol

The execute endpoint returns an NDJSON stream. Each line has this shape:

```typescript
interface StreamLine {
  event: string;
  data: Record<string, unknown>;
}
```

### Event Types

Events arrive in this order during a successful execution:

| Order | `event`         | Description                                | Emitted by     |
|-------|-----------------|--------------------------------------------|----------------|
| 1     | `status_update` | Stream connected, execution starting       | Router         |
| 2     | `tool_event`    | `tool_started` — includes full arguments   | Executor       |
| 3+    | `tool_event`    | `tool_progress` — intermediate updates     | Tool function  |
| 3+    | `tool_event`    | `tool_step` — named step completion        | Tool function  |
| 3+    | `tool_event`    | `tool_result_preview` — partial result     | Tool function  |
| N-1   | `tool_event`    | `tool_completed` — includes full result    | Executor       |
| N     | `data`          | Final payload with all results and costs   | Router         |
| N+1   | `end`           | Stream complete                            | Router         |

On error:

| `event`      | Description                                          |
|--------------|------------------------------------------------------|
| `tool_event` | `tool_error` — tool execution failed                 |
| `error`      | Fatal error (stream-level failure, not tool failure)  |
| `end`        | Stream complete (always sent, even after errors)     |

### Tool Event Shape (`tool_event`)

Every `tool_event` has this `data` shape:

```typescript
interface ToolStreamEvent {
  event:
    | "tool_started"
    | "tool_progress"
    | "tool_step"
    | "tool_result_preview"
    | "tool_completed"
    | "tool_error";
  call_id: string;
  tool_name: string;
  timestamp: number;       // Unix epoch seconds
  message: string | null;  // Human-readable status
  show_spinner: boolean;   // true = still running
  data: Record<string, unknown>;
}
```

#### `tool_started`

```json
{
  "event": "tool_started",
  "call_id": "test_a1b2c3d4e5f6",
  "tool_name": "web_search",
  "timestamp": 1708100000.123,
  "message": "Searching Web for: best TypeScript frameworks 2026",
  "show_spinner": true,
  "data": {
    "arguments": {
      "query": "best TypeScript frameworks 2026",
      "count": 5
    }
  }
}
```

#### `tool_progress`

```json
{
  "event": "tool_progress",
  "call_id": "test_a1b2c3d4e5f6",
  "tool_name": "web_search",
  "timestamp": 1708100001.456,
  "message": "Found 5 results, processing...",
  "show_spinner": true,
  "data": {}
}
```

#### `tool_step`

```json
{
  "event": "tool_step",
  "call_id": "test_a1b2c3d4e5f6",
  "tool_name": "web_research",
  "timestamp": 1708100002.789,
  "message": "Scraped 3 of 5 URLs",
  "show_spinner": true,
  "data": {
    "step": "scraping",
    "urls_scraped": 3,
    "urls_total": 5
  }
}
```

#### `tool_result_preview`

```json
{
  "event": "tool_result_preview",
  "call_id": "test_a1b2c3d4e5f6",
  "tool_name": "web_research",
  "timestamp": 1708100003.012,
  "message": "Preview available",
  "show_spinner": true,
  "data": {
    "preview": "First 500 characters of the result..."
  }
}
```

#### `tool_completed`

```json
{
  "event": "tool_completed",
  "call_id": "test_a1b2c3d4e5f6",
  "tool_name": "web_search",
  "timestamp": 1708100004.345,
  "message": "Done",
  "show_spinner": false,
  "data": {
    "result": "... the tool's output ..."
  }
}
```

#### `tool_error`

```json
{
  "event": "tool_error",
  "call_id": "test_a1b2c3d4e5f6",
  "tool_name": "web_search",
  "timestamp": 1708100004.345,
  "message": "API key not configured",
  "show_spinner": false,
  "data": {
    "error_type": "configuration"
  }
}
```

### Final `data` Event

After all tool events, the router sends one `data` event with the complete results:

```typescript
interface FinalPayload {
  status: "complete";

  /** Exact dict the AI model would receive as the tool result */
  model_facing_result: {
    tool_use_id: string;
    call_id: string;
    name: string;
    content: string;   // The model-facing text output
    is_error: boolean;
  };

  /** Full result with metadata */
  full_result: {
    success: boolean;
    output: unknown;         // Raw output (may be string, object, etc.)
    error: {
      error_type: string;
      message: string;
      suggested_action: string | null;
      is_retryable: boolean;
    } | null;
    duration_ms: number;
    usage: Record<string, unknown> | null;
    child_usages: unknown[];
  };

  /** Estimated input token cost if this output were sent to the next model turn */
  cost_estimate: {
    char_count: number;
    estimated_tokens: number;
    chars_per_token: number;
    models: Array<{
      model: string;
      api: string;
      input_price_per_million: number | null;
      estimated_cost_usd: number | null;
    }>;
  } | null;

  /** The registered output schema for validation (from the tools DB table) */
  output_schema: Record<string, unknown> | null;
}
```

---

## TypeScript Client Implementation

### Streaming Client

```typescript
type StreamEventHandler = {
  onStatusUpdate?: (data: Record<string, unknown>) => void;
  onToolEvent?: (event: ToolStreamEvent) => void;
  onFinalResult?: (payload: FinalPayload) => void;
  onError?: (error: Record<string, unknown>) => void;
  onEnd?: () => void;
};

async function executeToolTest(
  toolName: string,
  args: Record<string, unknown>,
  handlers: StreamEventHandler,
  abortSignal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/tools/test/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ tool_name: toolName, arguments: args }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line) as { event: string; data: unknown };

        switch (parsed.event) {
          case "status_update":
            handlers.onStatusUpdate?.(parsed.data as Record<string, unknown>);
            break;

          case "tool_event":
            handlers.onToolEvent?.(parsed.data as ToolStreamEvent);
            break;

          case "data":
            handlers.onFinalResult?.(parsed.data as FinalPayload);
            break;

          case "error":
            handlers.onError?.(parsed.data as Record<string, unknown>);
            break;

          case "end":
            handlers.onEnd?.();
            break;
        }
      } catch {
        console.warn("[ToolTest] Failed to parse NDJSON line:", line);
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer);
      if (parsed.event === "end") handlers.onEnd?.();
    } catch {
      // Ignore incomplete trailing data
    }
  }
}
```

### Usage Example

```typescript
const controller = new AbortController();

await executeToolTest(
  "web_search",
  { query: "best React frameworks 2026", count: 5 },
  {
    onStatusUpdate: (data) => {
      setConnectionStatus(data.status as string);
    },
    onToolEvent: (event) => {
      switch (event.event) {
        case "tool_started":
          setIsRunning(true);
          setArgsSent(event.data.arguments);
          setStatusMessage(event.message ?? "Starting...");
          break;

        case "tool_progress":
        case "tool_step":
          setStatusMessage(event.message ?? "Processing...");
          break;

        case "tool_result_preview":
          setPreview(event.data.preview as string);
          break;

        case "tool_completed":
          setStatusMessage("Complete");
          setIsRunning(false);
          break;

        case "tool_error":
          setError(event.message);
          setIsRunning(false);
          break;
      }
    },
    onFinalResult: (payload) => {
      setModelFacingResult(payload.model_facing_result);
      setFullResult(payload.full_result);
      setCostEstimate(payload.cost_estimate);
      setOutputSchema(payload.output_schema);

      // Validate result against schema
      if (payload.output_schema && payload.full_result.success) {
        const validation = validateAgainstSchema(
          payload.full_result.output,
          payload.output_schema,
        );
        setSchemaValidation(validation);
      }
    },
    onEnd: () => {
      setStreamComplete(true);
    },
  },
  controller.signal,
);
```

---

## Auto-Generating Argument Forms

The `parameters` field from the tool definition contains everything needed to render a form dynamically.

### Parameter Shape

Each key in `parameters` maps to a field definition:

```typescript
interface ParameterDefinition {
  type: "string" | "integer" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];             // Render as <select>
  items?: ParameterDefinition; // For arrays
  properties?: Record<string, ParameterDefinition>; // For objects
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}
```

### Mapping Parameters to Form Controls

| `type`    | `enum` present | Render as                                                              |
|-----------|----------------|------------------------------------------------------------------------|
| `string`  | no             | `<input type="text">`                                                  |
| `string`  | yes            | `<select>` with options from `enum`                                    |
| `integer` | no             | `<input type="number" step="1">`                                       |
| `number`  | no             | `<input type="number" step="any">`                                     |
| `boolean` | no             | `<input type="checkbox">` or toggle switch                             |
| `array`   | no             | Dynamic list — add/remove items, each item rendered per `items` schema |
| `object`  | no             | Nested fieldset with fields for each key in `properties`               |

### Form Generator Pseudocode

```typescript
function renderParameterField(
  name: string,
  param: ParameterDefinition,
  value: unknown,
  onChange: (name: string, value: unknown) => void,
): React.ReactNode {
  if (param.enum) {
    return (
      <select
        value={value as string}
        onChange={(e) => onChange(name, e.target.value)}
      >
        <option value="">Select...</option>
        {param.enum.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  switch (param.type) {
    case "string":
      return (
        <input
          type="text"
          value={(value as string) ?? param.default ?? ""}
          placeholder={param.description}
          onChange={(e) => onChange(name, e.target.value)}
        />
      );

    case "integer":
    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? param.default ?? ""}
          min={param.minimum}
          max={param.maximum}
          step={param.type === "integer" ? 1 : "any"}
          onChange={(e) => onChange(name, Number(e.target.value))}
        />
      );

    case "boolean":
      return (
        <input
          type="checkbox"
          checked={(value as boolean) ?? param.default ?? false}
          onChange={(e) => onChange(name, e.target.checked)}
        />
      );

    case "array":
      return <ArrayFieldEditor param={param} value={value} onChange={onChange} />;

    case "object":
      return <ObjectFieldEditor param={param} value={value} onChange={onChange} />;
  }
}

function buildArgumentForm(
  parameters: Record<string, ParameterDefinition>,
): React.ReactNode {
  return Object.entries(parameters).map(([name, param]) => (
    <div key={name} className="field-group">
      <label>
        {name}
        {param.required && <span className="required">*</span>}
      </label>
      <p className="description">{param.description}</p>
      {renderParameterField(name, param, formValues[name], handleChange)}
      {param.default !== undefined && (
        <p className="default">Default: {JSON.stringify(param.default)}</p>
      )}
    </div>
  ));
}
```

---

## Output Schema Validation

After a tool returns its result, validate the `full_result.output` against the tool's `output_schema`. The schema follows JSON Schema conventions.

### Recommended Approach

Use [ajv](https://ajv.js.org/) for runtime JSON Schema validation:

```bash
pnpm add ajv
```

```typescript
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

function validateAgainstSchema(
  output: unknown,
  schema: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  // The output from tools is often a string — parse it if it looks like JSON
  let parsed = output;
  if (typeof output === "string") {
    try {
      parsed = JSON.parse(output);
    } catch {
      // Not JSON — validate as-is (schema may accept strings)
    }
  }

  const validate = ajv.compile(schema);
  const valid = validate(parsed);

  return {
    valid: !!valid,
    errors: valid
      ? []
      : (validate.errors ?? []).map(
          (e) => `${e.instancePath || "/"}: ${e.message}`,
        ),
  };
}
```

### Displaying Validation Results

Show a pass/fail indicator alongside the result:

- **Pass**: Green checkmark with "Output matches registered schema"
- **Fail**: Red X with a list of validation errors from ajv
- **No schema**: Gray info badge with "No output_schema registered for this tool"

---

## Suggested UI Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Tool Testing Dashboard                                         │
├─────────────────┬───────────────────────────────────────────────┤
│                 │                                               │
│  Tool List      │  Tool Detail / Test Panel                     │
│  ────────────── │  ────────────────────────────────────────     │
│                 │                                               │
│  [Filter: ___]  │  Tool Name: web_search                       │
│                 │  Category: web  |  Version: 1.0.0             │
│  > web_search   │  Description: Search the web using...         │
│    web_read     │                                               │
│    web_research │  ┌─ Arguments ──────────────────────────┐     │
│    ...          │  │  query: [________________]  *         │     │
│                 │  │  count: [5_]                          │     │
│  Categories:    │  │  freshness: [▼ Select...]            │     │
│  ☑ web          │  │                                      │     │
│  ☑ data         │  │  [▶ Execute]   [Reset to Defaults]  │     │
│  ☑ text         │  └──────────────────────────────────────┘     │
│  ☑ code         │                                               │
│                 │  ┌─ Stream Events ──────────────────────┐     │
│                 │  │  ● tool_started   "Searching Web..." │     │
│                 │  │  ● tool_progress  "Found 5 results"  │     │
│                 │  │  ✓ tool_completed "Done"              │     │
│                 │  └──────────────────────────────────────┘     │
│                 │                                               │
│                 │  ┌─ Model-Facing Result ────────────────┐     │
│                 │  │  (Exact string the AI model receives) │     │
│                 │  │  ┌────────────────────────────────┐  │     │
│                 │  │  │ <pre>                          │  │     │
│                 │  │  │   ... content string ...       │  │     │
│                 │  │  │ </pre>                         │  │     │
│                 │  │  └────────────────────────────────┘  │     │
│                 │  └──────────────────────────────────────┘     │
│                 │                                               │
│                 │  ┌─ Schema Validation ──────────────────┐     │
│                 │  │  ✓ Output matches registered schema  │     │
│                 │  └──────────────────────────────────────┘     │
│                 │                                               │
│                 │  ┌─ Cost Estimate ──────────────────────┐     │
│                 │  │  Chars: 12,450 | Tokens: ~3,112      │     │
│                 │  │                                      │     │
│                 │  │  Model          $/M Input  Est. Cost │     │
│                 │  │  ─────────────  ─────────  ───────── │     │
│                 │  │  Gemini Flash     $0.10    $0.000311 │     │
│                 │  │  GPT-5.2          $2.50    $0.007780 │     │
│                 │  │  Claude Opus     $15.00    $0.046680 │     │
│                 │  └──────────────────────────────────────┘     │
│                 │                                               │
│                 │  ┌─ Full Result (Debug) ────────────────┐     │
│                 │  │  { success, output, duration_ms, ... }│    │
│                 │  └──────────────────────────────────────┘     │
└─────────────────┴───────────────────────────────────────────────┘
```

### Component Breakdown

| Component             | Purpose                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| `ToolListSidebar`     | Fetches `GET /tools/test/list`, renders filterable/searchable list      |
| `ToolTestPanel`       | Main panel — shows detail, form, and results for selected tool         |
| `ArgumentForm`        | Auto-generated from `parameters` using the mapping table above         |
| `StreamEventLog`      | Real-time log of `tool_event` items with icons for each event type     |
| `ModelFacingResult`   | Displays `model_facing_result.content` in a `<pre>` block             |
| `SchemaValidator`     | Runs ajv validation, shows pass/fail badge                             |
| `CostEstimateTable`   | Renders cost comparison table from `cost_estimate`                     |
| `FullResultDebug`     | Collapsible JSON viewer for the complete `full_result` object          |

---

## Error Handling

### HTTP Errors (non-streaming)

- `401 Unauthorized` — Missing or invalid auth token
- `404 Not Found` — Tool name doesn't exist (on detail or execute)
- `503 Service Unavailable` — Tool registry not loaded yet (server starting up)

### Stream Errors

The `error` event in the stream indicates a fatal failure:

```json
{
  "event": "error",
  "data": {
    "message": "Tool test execution failed.",
    "type": "tool_test_error",
    "user_visible_message": "Tool test execution failed.",
    "details": { "traceback": "..." }
  }
}
```

### Tool-Level Errors

If the tool itself fails but the stream is healthy, you'll see a `tool_error` event followed by the final `data` event where `full_result.success` is `false` and `full_result.error` contains details.

---

## Cancellation

Pass an `AbortController` signal to `fetch`. When aborted:

1. The browser tears down the connection
2. The server detects the disconnect via `GeneratorExit`
3. The background execution task is cancelled
4. No `end` event is sent (the stream is already closed)

```typescript
const controller = new AbortController();

// Start execution
executeToolTest("web_research", args, handlers, controller.signal);

// Cancel button handler
const handleCancel = () => controller.abort();
```

---

## Quick Start Checklist

1. **Fetch tool list** — `GET /tools/test/list` on page load. Cache locally.
2. **Render tool selector** — sidebar or dropdown with search/filter.
3. **Generate argument form** — iterate `tool.parameters`, map to form controls.
4. **Pre-fill defaults** — use `param.default` values.
5. **Execute on submit** — `POST /tools/test/execute` with streaming.
6. **Display events in real-time** — `tool_started` → spinner, `tool_progress` → status line, `tool_completed` → stop spinner.
7. **Show model-facing result** — the `content` string from `model_facing_result`.
8. **Validate output** — compare `full_result.output` against `output_schema` using ajv.
9. **Display cost estimate** — render the three-model comparison table.
10. **Support cancellation** — wire up `AbortController` to a cancel button.
