# Frontend Stream Event Migration Guide

This document describes every change to the NDJSON streaming protocol between the backend and frontend. Use it as a checklist when updating the frontend stream parser.

## Wire Format

No change. The backend still sends `application/x-ndjson` — one JSON object per line:

```
{"event": "<event_type>", "data": { ... }}\n
```

---

## Generated TypeScript Types

The backend now auto-generates TypeScript types from its Pydantic models. Import them directly:

```typescript
import type {
  StreamEvent,
  TypedStreamEvent,
  EventType,
  ChunkPayload,
  StatusUpdatePayload,
  CompletionPayload,
  ErrorPayload,
  ToolEventPayload,
  BrokerPayload,
  HeartbeatPayload,
  EndPayload,
} from "@/types/stream-events";

import {
  isChunkEvent,
  isErrorEvent,
  isToolEventEvent,
  isCompletionEvent,
  isHeartbeatEvent,
  isEndEvent,
} from "@/types/stream-events";
```

The file is located at `aidream/api/generated/stream-events.ts`. Copy it to your frontend project's types directory, or set up an automated sync.

Regenerate with: `python scripts/generate_stream_types.py`

---

## Event Type Changes

### Renamed Events

| Old Event Name | New Event Name | Notes |
|---|---|---|
| `tool_update` | `tool_event` | Complete payload restructure (see below) |

### Removed Events

| Event | Replacement |
|---|---|
| `info` | `status_update` — use the `status` field to differentiate |
| `tool_update` | `tool_event` — new flat structure |

### New Events

| Event | Purpose |
|---|---|
| `completion` | Final execution result (was previously sent as `data` with `status: "complete"`) |
| `heartbeat` | Connection keepalive — emitted every ~5 seconds during long operations |

### Unchanged Events

| Event | Notes |
|---|---|
| `chunk` | Streaming text tokens — payload changed from raw string to `{ text: string }` |
| `status_update` | Processing state — field name change (see below) |
| `data` | Generic structured data — still a catch-all for arbitrary payloads |
| `error` | Error events — field name change (see below) |
| `broker` | Shared state sync — now a Pydantic model with explicit fields |
| `end` | Stream termination — payload changed from `true` to `{ reason: string }` |

---

## Payload Shape Changes

### `chunk` event

**Before:**
```json
{"event": "chunk", "data": "token text here"}
```

**After:**
```json
{"event": "chunk", "data": {"text": "token text here"}}
```

The raw string is now wrapped in an object with a `text` field.

### `status_update` event

**Before:**
```json
{
  "event": "status_update",
  "data": {
    "status": "processing",
    "system_message": "...",
    "user_visible_message": "...",
    "metadata": {}
  }
}
```

**After:**
```json
{
  "event": "status_update",
  "data": {
    "status": "processing",
    "system_message": "...",
    "user_message": "...",
    "metadata": {}
  }
}
```

**Change:** `user_visible_message` is now `user_message` everywhere.

### `error` event

**Before:**
```json
{
  "event": "error",
  "data": {
    "error": "agent_error",
    "message": "...",
    "user_message": "...",
    "code": null,
    "details": null
  }
}
```

**After:**
```json
{
  "event": "error",
  "data": {
    "error_type": "agent_error",
    "message": "...",
    "user_message": "...",
    "code": null,
    "details": null
  }
}
```

**Change:** The `error` field is now `error_type` (avoids confusion with the event name).

### `tool_event` (replaces `tool_update`)

**Before (`tool_update`):**
```json
{
  "event": "tool_update",
  "data": {
    "id": "call_123",
    "type": "mcp_input",
    "tool_name": "web_search",
    "mcp_input": { ... },
    "mcp_output": null,
    "mcp_error": null,
    "step_data": null,
    "user_visible_message": "Searching..."
  }
}
```

**After (`tool_event`):**
```json
{
  "event": "tool_event",
  "data": {
    "event": "tool_started",
    "call_id": "call_123",
    "tool_name": "web_search",
    "timestamp": 1708123456.789,
    "message": "Searching...",
    "show_spinner": true,
    "data": {
      "arguments": { "query": "..." }
    }
  }
}
```

**Key changes:**
- Explicit `event` sub-type field: `tool_started`, `tool_progress`, `tool_step`, `tool_result_preview`, `tool_completed`, `tool_error`
- No more nullable bag-of-fields (`mcp_input`, `mcp_output`, `mcp_error`, `step_data`)
- `id` renamed to `call_id`
- `user_visible_message` renamed to `message`
- Includes `timestamp` and `show_spinner`
- Tool arguments and results are in the `data` sub-object

### `completion` event (NEW)

Previously, completion data was sent as a `data` event with `status: "complete"`. Now it has its own event type:

```json
{
  "event": "completion",
  "data": {
    "status": "complete",
    "output": "...",
    "iterations": 3,
    "total_usage": { ... },
    "timing_stats": { ... },
    "tool_call_stats": { ... },
    "finish_reason": "stop",
    "metadata": {}
  }
}
```

All fields are optional except `status` (one of: `"complete"`, `"failed"`, `"max_iterations_exceeded"`).

### `heartbeat` event (NEW)

Emitted every ~5 seconds during long-running operations:

```json
{"event": "heartbeat", "data": {"timestamp": 1708123456.789}}
```

**Frontend recommendation:** If no heartbeat is received for 15+ seconds, show a "connection may be stale" indicator. The heartbeat does NOT indicate progress — it only confirms the connection is alive.

### `end` event

**Before:**
```json
{"event": "end", "data": true}
```

**After:**
```json
{"event": "end", "data": {"reason": "complete"}}
```

Possible `reason` values: `"complete"`, `"client_disconnected"`, `"cancelled"`.

### `broker` event

**Before:** A raw dict from Python's `dataclasses.asdict()`.

**After:** Typed with explicit fields:
```json
{
  "event": "broker",
  "data": {
    "broker_id": "sidebar_count",
    "value": 42,
    "source": "agent",
    "source_id": "agent_123"
  }
}
```

---

## New Cancellation Endpoint

### `POST /ai/cancel/{request_id}`

Cancels a running request by its `request_id`.

**Request:** No body required. `request_id` is in the URL path.

**Response:**
```json
{
  "status": "cancelled",
  "request_id": "abc-123-def"
}
```

**Behavior:**
1. Frontend sends `POST /ai/cancel/{request_id}`
2. Backend sets a cancellation flag
3. At the next iteration boundary, the backend stops execution
4. Backend emits an `error` event with `error_type: "task_cancelled"`, then an `end` event
5. Frontend receives clean termination

**Note:** Cancellation is best-effort. If the backend is in the middle of an API call to an AI provider, it will finish that call before checking the cancellation flag. The flag is checked between iterations and before each tool call.

---

## Complete Event Reference

| Event | When Emitted | Payload Type |
|---|---|---|
| `chunk` | Each streaming text token from AI providers | `ChunkPayload` |
| `status_update` | Processing state changes, retries, warnings | `StatusUpdatePayload` |
| `data` | Generic structured data (arbitrary shapes) | `DataPayload` |
| `completion` | Final result of agent/chat/tool execution | `CompletionPayload` |
| `error` | Non-fatal errors (fatal errors are followed by `end`) | `ErrorPayload` |
| `tool_event` | Tool lifecycle: started, progress, step, completed, error | `ToolEventPayload` |
| `broker` | Shared state sync updates | `BrokerPayload` |
| `heartbeat` | Connection keepalive during long operations | `HeartbeatPayload` |
| `end` | Stream termination (always the last event) | `EndPayload` |

---

## Recommended Frontend Parser Pattern

```typescript
function handleStreamEvent(event: StreamEvent) {
  if (isChunkEvent(event)) {
    appendToMessage(event.data.text);
  } else if (isStatusUpdateEvent(event)) {
    updateStatusIndicator(event.data);
  } else if (isCompletionEvent(event)) {
    handleCompletion(event.data);
  } else if (isErrorEvent(event)) {
    handleError(event.data);
  } else if (isToolEventEvent(event)) {
    handleToolEvent(event.data);
  } else if (isBrokerEvent(event)) {
    updateSharedState(event.data);
  } else if (isHeartbeatEvent(event)) {
    resetConnectionTimeout();
  } else if (isEndEvent(event)) {
    closeStream(event.data.reason);
  }
}
```
