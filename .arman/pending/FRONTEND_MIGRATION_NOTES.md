# Frontend Migration Notes: Tool System V2

**Date:** February 15, 2026
**Scope:** All React/Next.js/TypeScript code consuming the `/api/agent/execute` streaming endpoint.

---

## What Changed

The Python backend has migrated from the legacy `mcp_server` tool system to **Tool System V2** (`ai/tool_system`). This affects:

1. **Streaming event format** for tool calls
2. **Database schema** for tool call history
3. **TypeScript types** (already updated in `agent.types.ts`)

**No API endpoint changes.** The `/api/agent/execute` and `/api/agent/warm` endpoints remain identical. Request format is unchanged.

---

## 1. Streaming Event Changes (Breaking)

### Old Format: `tool_update`

```json
{
  "event": "tool_update",
  "data": {
    "id": "call_abc123",
    "type": "user_visible_message",
    "tool_name": "web_search",
    "user_visible_message": "Searching the web..."
  }
}
```

### New Format: `tool_event`

```json
{
  "event": "tool_event",
  "data": {
    "event": "tool_progress",
    "call_id": "call_abc123",
    "tool_name": "web_search",
    "timestamp": 1739664000.123,
    "message": "Searching the web...",
    "show_spinner": true,
    "data": {}
  }
}
```

### Field Mapping

| Old (`tool_update`)           | New (`tool_event`)       | Notes                                    |
|-------------------------------|--------------------------|------------------------------------------|
| `data.id`                     | `data.call_id`           | Renamed for clarity                      |
| `data.type`                   | `data.event`             | Explicit lifecycle event name            |
| `data.user_visible_message`   | `data.message`           | Shorter name, same purpose               |
| _(not available)_             | `data.show_spinner`      | **New.** Boolean — show/hide spinner     |
| _(not available)_             | `data.timestamp`         | **New.** Unix float for ordering/timing  |
| `data.mcp_input`              | `data.data`              | Folded into generic `data` object        |
| `data.mcp_output`             | `data.data`              | Folded into generic `data` object        |
| `data.mcp_error`              | `data.data.error_type`   | Error details in `data` when event type is `tool_error` |
| `data.step_data`              | `data.data`              | Folded into generic `data` object        |

### Event Lifecycle

The `data.event` field follows a strict lifecycle:

```
tool_started → tool_progress* → tool_step* → tool_result_preview? → tool_completed
                                                                   → tool_error
```

- `tool_started` — Tool execution begins. Show spinner.
- `tool_progress` — Status update (e.g., "Fetching data..."). Keep spinner.
- `tool_step` — Named sub-step completed. `data.data.step` has the step name.
- `tool_result_preview` — Partial result available. `data.data.preview` has text.
- `tool_completed` — Tool finished successfully. `show_spinner=false`. Hide spinner.
- `tool_error` — Tool failed. `show_spinner=false`. Show error. `data.data.error_type` has the category.

### Migration Strategy

During the transition period, the backend MAY emit both `tool_update` and `tool_event` for some tools. Your handler should:

1. Add a handler for `tool_event` events using the new `AgentToolEvent` type.
2. Keep the existing `tool_update` handler as a fallback.
3. Once all tools are confirmed migrated, remove the `tool_update` handler.

```typescript
// Example handler
function handleStreamEvent(event: AgentStreamEvent) {
  switch (event.event) {
    case "tool_event":
      // New V2 tool events
      handleToolEvent(event.data);
      break;
    case "tool_update":
      // Legacy fallback (deprecated)
      handleLegacyToolUpdate(event.data);
      break;
    // ... other events
  }
}

function handleToolEvent(data: AgentToolEvent["data"]) {
  switch (data.event) {
    case "tool_started":
      showToolSpinner(data.call_id, data.tool_name, data.message);
      break;
    case "tool_progress":
    case "tool_step":
      updateToolStatus(data.call_id, data.message);
      break;
    case "tool_result_preview":
      showPreview(data.call_id, data.data?.preview);
      break;
    case "tool_completed":
      hideToolSpinner(data.call_id, data.message);
      break;
    case "tool_error":
      showToolError(data.call_id, data.message);
      break;
  }
}
```

---

## 2. Database Schema Changes

### How Messages and Tool Calls Relate

A single tool call cycle produces **three** cx_message rows plus **one** cx_tool_call row. Here is exactly how they connect:

```
cx_message (position 0, role="user")
  content: [{ type: "text", text: "Get me the news" }]

cx_message (position 1, role="assistant")            ← the model REQUESTING the tool
  content: [{ type: "tool_call", id: "gemini_123", name: "get_news_headlines", arguments: {...} }]
            ↑
            |  content[].id === cx_tool_call.call_id   (this is the join key)
            ↓
cx_tool_call (call_id: "gemini_123")                 ← the EXECUTION record
  message_id → points to the tool-role message below
  output: "{full JSON result...}"
  execution_events: [{event: "tool_started", ...}, {event: "tool_completed", ...}]
            ↑
            |  cx_tool_call.message_id === cx_message.id
            ↓
cx_message (position 2, role="tool")                 ← the RESULT placeholder
  content: []   (empty — the actual data lives in cx_tool_call.output)

cx_message (position 3, role="assistant")            ← the model's FINAL response
  content: [{ type: "text", text: "Here are today's headlines..." }]
```

**Three linkage paths (use whichever fits your query):**

| From → To | Join Key | When to Use |
|-----------|----------|-------------|
| Assistant tool_call message → cx_tool_call | `content[].id` = `cx_tool_call.call_id` | You have the assistant message and need the execution details |
| cx_tool_call → Tool result message | `cx_tool_call.message_id` = `cx_message.id` | You have the tool call and need its position in the conversation |
| Tool result message → cx_tool_call | `cx_message.id` = `cx_tool_call.message_id` | You have the tool-role message and need its output |

**For parallel tool calls:** The assistant message at position 1 may contain multiple `tool_call` content items. Each one has its own `cx_tool_call` row (matched by `call_id`). There will be one `role="tool"` message per tool call, each linked via `message_id`.

### New Table: `cx_tool_call`

This is the single source of truth for every tool call. Key columns:

| Column             | Type          | Description                                      |
|--------------------|---------------|--------------------------------------------------|
| `id`               | `uuid`        | Primary key                                      |
| `conversation_id`  | `uuid`        | FK to `cx_conversation`                          |
| `message_id`       | `uuid (null)` | FK to `cx_message` (backfilled after persistence)|
| `user_id`          | `uuid`        | FK to `auth.users`                               |
| `request_id`       | `uuid (null)` | FK to `cx_user_request` (backfilled after persistence) |
| `tool_name`        | `text`        | Tool name (e.g. `get_news_headlines`)            |
| `tool_type`        | `text`        | `local`, `external_mcp`, or `agent`              |
| `call_id`          | `text`        | Provider-assigned call ID (e.g. `gemini_123`, `call_abc`) — **this is the primary join key to assistant message content** |
| `status`           | `text`        | `running`, `completed`, `error`                  |
| `arguments`        | `jsonb`       | Input arguments as JSON                          |
| `success`          | `boolean`     | Whether the tool succeeded                       |
| `output`           | `text`        | Full tool output (the result content)            |
| `output_type`      | `text`        | `text` or `json`                                 |
| `is_error`         | `boolean`     | Whether output is an error message               |
| `error_type`       | `text`        | Error category (if failed)                       |
| `error_message`    | `text`        | Error description (if failed)                    |
| `duration_ms`      | `integer`     | Execution time in milliseconds                   |
| `started_at`       | `timestamptz` | When execution began                             |
| `completed_at`     | `timestamptz` | When execution finished                          |
| `input_tokens`     | `integer`     | Tokens consumed (for agent-as-tool calls)        |
| `output_tokens`    | `integer`     | Tokens produced                                  |
| `total_tokens`     | `integer`     | Total tokens                                     |
| `cost_usd`         | `numeric`     | Cost in USD                                      |
| `iteration`        | `integer`     | Which iteration of the request loop              |
| `retry_count`      | `integer`     | Number of retries                                |
| `execution_events` | `jsonb`       | Array of streaming events (for UI replay)        |
| `parent_call_id`   | `uuid (null)` | FK to self — for agent-as-tool nesting           |
| `persist_key`      | `text (null)` | Key for persisted output data                    |
| `file_path`        | `text (null)` | Path to any generated file                       |
| `metadata`         | `jsonb`       | Additional metadata                              |
| `created_at`       | `timestamptz` | Row creation time                                |
| `deleted_at`       | `timestamptz` | Soft delete                                      |

### Impact on `cx_message`

For messages with `role = 'tool'`:
- **Old behavior:** `cx_message.content` contained the full tool result as JSON.
- **New behavior:** `cx_message.content` is `[]` (empty array). The actual tool result lives in `cx_tool_call.output`, linked via `cx_tool_call.message_id`.

### How to Query Tool Results

**Option A: Load full conversation with tool data in one query**

```sql
SELECT
  m.*,
  tc.call_id,
  tc.tool_name,
  tc.tool_type,
  tc.status      AS tool_status,
  tc.arguments   AS tool_arguments,
  tc.output      AS tool_output,
  tc.output_type AS tool_output_type,
  tc.is_error    AS tool_is_error,
  tc.error_message AS tool_error_message,
  tc.duration_ms AS tool_duration_ms,
  tc.execution_events AS tool_events
FROM cx_message m
LEFT JOIN cx_tool_call tc ON tc.message_id = m.id
WHERE m.conversation_id = :conversation_id
ORDER BY m.position;
```

For non-tool messages, all `tc.*` columns will be NULL. For tool messages, they contain the full execution record.

**Option B: Supabase client query (from Next.js or React)**

```typescript
// Load messages
const { data: messages } = await supabase
  .from("cx_message")
  .select("*")
  .eq("conversation_id", conversationId)
  .order("position");

// Load tool calls separately
const { data: toolCalls } = await supabase
  .from("cx_tool_call")
  .select("*")
  .eq("conversation_id", conversationId)
  .is("deleted_at", null)
  .order("created_at");

// Index by call_id for fast lookup
const toolCallMap = new Map(toolCalls?.map(tc => [tc.call_id, tc]) ?? []);
```

Then when rendering:
- For `role="assistant"` messages, check if `content[]` has items with `type: "tool_call"`. If so, look up `toolCallMap.get(item.id)` to get execution status, duration, etc.
- For `role="tool"` messages, the `content` is `[]`. The tool output is already available in the `toolCallMap` entry linked by `call_id` (from the preceding assistant message).

**Option C: Query tool calls independently**

```sql
SELECT * FROM cx_tool_call
WHERE conversation_id = :conversation_id AND deleted_at IS NULL
ORDER BY created_at;
```

### RLS

`cx_tool_call` has RLS enabled. SELECT allows:
- `user_id = auth.uid()` (owner)
- `has_permission('cx_conversation', conversation_id, 'viewer')` (shared conversations)

This matches the existing `cx_user_request` pattern.

### New Table: `cx_agent_memory`

Used for agent short/medium/long-term memory. No frontend changes needed unless building a memory management UI.

---

## 3. Updated TypeScript Types

The `AgentToolEvent` interface has been added to `aidream/api/routers/ts_types/agent.types.ts`.

Import it alongside the existing types:

```typescript
import type {
  AgentStreamEvent,
  AgentToolEvent,        // New
  AgentToolUpdateEvent,  // Deprecated
  // ... other types
} from "@/types/agent.types";
```

The `AgentStreamEvent` union now includes both `AgentToolUpdateEvent` (deprecated) and `AgentToolEvent` (new).

---

## 4. Tool Names Are Changing

Old tools are being migrated one at a time with improved names. Examples:

| Old Name                     | New Name                |
|------------------------------|-------------------------|
| `api_news_fetch_headlines`   | `get_news_headlines`    |
| `core_web_search`            | `web_search`            |
| `core_web_read_web_pages`    | `web_read`              |
| `data_user_lists_create`     | `create_user_list`      |
| `seo_check_meta_titles`      | `check_meta_titles`     |

Since the UI gets tools from the database, there is nothing to do for these to work properly.

---

## 5. What You Need to Do

### Required

1. **Handle `role="tool"` messages with empty content.** When rendering a conversation from the database, `cx_message` rows with `role="tool"` now have `content: []`. You must either:
   - Query `cx_tool_call` alongside messages and join on `call_id` (see Option B above), or
   - Simply skip rendering tool-role messages in the UI (the tool output is typically not shown to the user — the assistant's final response summarizes it).
2. **Add a `tool_event` handler** to your streaming event parser (see example above).
3. **Match tool calls to their execution data** using `call_id`. When an assistant message contains `{ type: "tool_call", id: "gemini_123", ... }`, that `id` value matches `cx_tool_call.call_id`.

### Recommended

4. Use `show_spinner` from `tool_event` to control loading indicators instead of inferring state.
5. Use `execution_events` from `cx_tool_call` if you need to replay or display a timeline of what happened during a tool call.
6. Show `tool_name` in the UI using the new cleaner names (e.g., "Get News Headlines" instead of "API News Fetch Headlines").

### Can Be Deferred

7. Remove the `tool_update` handler once all tools are confirmed migrated.
8. Build UI for `cx_tool_call` metadata (execution time, cost, token usage, events replay).

---

## 6. No Changes Required For

- Authentication (headers, tokens, fingerprints)
- Request body format (`AgentExecuteRequest`)
- Warm-up endpoint (`/api/agent/warm`)
- `chunk`, `status_update`, `data`, `error`, `end` streaming events
- Any non-tool-related functionality
