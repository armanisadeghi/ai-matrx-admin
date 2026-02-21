# Frontend Breaking Changes — API Migration

> **STATUS: ✅ COMPLETE** — All changes applied 2026-02-20. Full codebase updated (warm endpoint, is_builtin removal, admin override audit).

**Date:** 2026-02-18  
**Affects:** All clients consuming the AI Dream Python API (web, mobile)  
**Severity:** Breaking — existing calls will 404 or behave incorrectly until updated

---

## Overview

Two categories of breaking changes:

1. **Endpoint URLs changed** — two routes moved, request bodies changed
2. **Every endpoint now streams** — there are no more single-response endpoints; all responses are NDJSON streams

Both must be addressed together. A client that hits the new URLs but still tries to read a single JSON response will break.

---

## 1. Endpoint URL Changes

### Agent Execution

| | Before | After |
|---|---|---|
| **New conversation** | `POST /api/ai/agent/execute` | `POST /api/ai/agents/execute` |
| **Existing conversation** | `POST /api/ai/agent/execute` | `POST /api/ai/agents/{conversation_id}/execute` |

**Request body — before:**
```json
{
  "prompt_id": "35461e07-bbd1-46cc-81a7-910850815703",
  "conversation_id": "abc-123",
  "is_new_conversation": false,
  "user_input": "Hello",
  "variables": {},
  "config_overrides": {},
  "is_builtin": false,
  "stream": true,
  "debug": false
}
```

**Request body — after (new conversation):**
```json
{
  "prompt_id": "35461e07-bbd1-46cc-81a7-910850815703",
  "user_input": "Hello",
  "variables": {},
  "config_overrides": {},
  "stream": true,
  "debug": false
}
```
The server generates and owns the `conversation_id`. You get it back from the stream (see Section 3 below).

**Request body — after (existing conversation):**
```json
{
  "prompt_id": "35461e07-bbd1-46cc-81a7-910850815703",
  "user_input": "Hello",
  "variables": {},
  "config_overrides": {},
  "stream": true,
  "debug": false
}
```
The `conversation_id` is now **in the URL path**, not the body. `is_new_conversation` is gone entirely.

**Fields removed from body:**
- `conversation_id` — moved to URL path for existing conversations
- `is_new_conversation` — no longer needed; inferred from which URL you call
- `is_builtin` — **removed entirely**; the server automatically determines whether the `prompt_id` is a prompt or builtin. Pass any valid ID and it just works.

---

### Unified Chat

| | Before | After |
|---|---|---|
| **New conversation** | `POST /api/ai/chat/unified` | `POST /api/ai/conversations/chat` |
| **Existing conversation** | `POST /api/ai/chat/unified` | `POST /api/ai/conversations/{conversation_id}/chat` |

**Request body — before:**
```json
{
  "ai_model_id": "gpt-4o",
  "messages": [...],
  "conversation_id": "abc-123",
  "is_new_conversation": false,
  "stream": true,
  "debug": false
}
```

**Request body — after (new conversation):**
```json
{
  "ai_model_id": "gpt-4o",
  "messages": [...],
  "stream": true,
  "debug": false
}
```

**Request body — after (existing conversation):**
```json
{
  "ai_model_id": "gpt-4o",
  "messages": [...],
  "stream": true,
  "debug": false
}
```
Again — `conversation_id` is in the URL path, `is_new_conversation` is gone.

**Fields removed from body:**
- `conversation_id` — moved to URL path
- `is_new_conversation` — no longer needed

**All other body fields are unchanged.** The full parameter list for unified chat (model config, tools, reasoning, image/audio/video params, etc.) is exactly the same.

---

### Agent Warm (Pre-loading / Cache)

A single unified warm endpoint. The server automatically determines whether the ID is a prompt or a builtin — you do not need to know or specify. No auth required. No request body.

| Endpoint |
|---|
| `POST /api/ai/agents/{agent_id}/warm` |

**Response (success):**
```json
{ "status": "cached", "agent_id": "<id>" }
```

**Response (error):**
```json
{ "status": "error", "agent_id": "<id>", "message": "..." }
```

> **Note:** The old `POST /api/ai/agent/warm` with `{ prompt_id, is_builtin }` body, and the old split routes (`/agents/prompt/{id}/warm`, `/agents/builtin/{id}/warm`) are all **removed**. Use the single unified URL above.

---

## 2. All Responses Are Now Streaming (NDJSON)

**This is the most significant change.**

Previously some endpoints returned a single JSON object. Now **every endpoint that calls AI returns a streaming NDJSON response**. This means:

- `Content-Type` is `application/x-ndjson`
- The response body is a stream of newline-delimited JSON objects, one per line
- The connection stays open until the server sends an `end` event
- You must read the stream line-by-line, not parse the entire body as one JSON blob

### How to read the stream

Each line you receive is a complete JSON object with this shape:

```json
{"event": "<event_type>", "data": { ... }}
```

You must handle each line as it arrives, in order.

### Event types and their data shapes

#### `status_update`
Informational — the server telling you what it is doing. Show this to the user as a loading state.

```json
{
  "event": "status_update",
  "data": {
    "status": "connected",
    "system_message": "Stream established",
    "user_message": "Connecting to AI..."
  }
}
```

```json
{
  "event": "status_update",
  "data": {
    "status": "processing",
    "system_message": "Starting autonomous AI execution",
    "user_message": null
  }
}
```

Possible `status` values: `connected`, `processing`, `warning`, `executing`, `scraping`, `analyzing`, and others — treat any unrecognized status as a loading indicator.

---

#### `chunk`
A streaming text token. Append each chunk to your output buffer to build the full response incrementally.

```json
{
  "event": "chunk",
  "data": {
    "text": "Hello"
  }
}
```

When `stream: false` is set on the request, you still receive this event type — you just receive one single chunk with the complete response text instead of many small chunks.

---

#### `completion`
Sent once at the end of a successful AI execution. Contains usage/timing/cost data. The actual content was already delivered via `chunk` events.

```json
{
  "event": "completion",
  "data": {
    "status": "complete",
    "output": null,
    "iterations": 1,
    "total_usage": {
      "input_tokens": 1240,
      "output_tokens": 87,
      "total_tokens": 1327,
      "input_cost": 0.000124,
      "output_cost": 0.000174,
      "total_cost": 0.000298
    },
    "timing_stats": {
      "total_duration": 2.34,
      "api_duration": 2.11,
      "tool_duration": 0.0,
      "iterations": 1,
      "avg_iteration_duration": 2.34
    },
    "tool_call_stats": null,
    "finish_reason": "stop",
    "metadata": null
  }
}
```

For the **agent** endpoint specifically, `output` contains the full text output (because agents do not stream chunks — they return a complete result):

```json
{
  "event": "completion",
  "data": {
    "status": "complete",
    "output": "Here is the summary you requested...",
    "total_usage": { ... },
    "metadata": { ... }
  }
}
```

---

#### `tool_event`
Emitted when the AI is using a tool. Use these to show tool-use indicators in the UI.

```json
{
  "event": "tool_event",
  "data": {
    "event": "tool_started",
    "call_id": "call_abc123",
    "tool_name": "web_search",
    "timestamp": 1739900000.0,
    "message": "Searching the web...",
    "show_spinner": true,
    "data": {}
  }
}
```

Possible inner `event` values: `tool_started`, `tool_progress`, `tool_step`, `tool_result_preview`, `tool_completed`, `tool_error`.

---

#### `data`
Route-specific structured data. Shape varies by endpoint. Used by research, scraper, and other non-chat endpoints to return structured results.

```json
{
  "event": "data",
  "data": {
    "event": "search_complete",
    "total_sources": 14
  }
}
```

---

#### `error`
A recoverable or fatal error. The `user_message` is safe to show to the user. The `message` field is for logging.

```json
{
  "event": "error",
  "data": {
    "error_type": "conversation_not_found",
    "message": "Conversation abc-123 not found in database.",
    "user_message": "Conversation not found. It may have been deleted.",
    "code": null,
    "details": null
  }
}
```

After a fatal error, the server always sends an `end` event. You do not need to close the connection manually.

---

#### `heartbeat`
Keepalive ping. Sent every ~5 seconds if the connection is idle. Ignore this in your UI — it is only there to prevent the connection from timing out.

```json
{
  "event": "heartbeat",
  "data": {
    "timestamp": 1739900000.0
  }
}
```

---

#### `end`
Always the last event. Signals that the stream is complete and the connection will close.

```json
{
  "event": "end",
  "data": {
    "reason": "complete"
  }
}
```

Possible `reason` values: `complete`, `cancelled`.

---

## 3. How to Get the conversation_id for New Conversations

When you call the new-conversation endpoints, the server generates the `conversation_id` internally. You need it to continue the conversation on the next turn.

**Option A — from the `X-Request-ID` response header** (not conversation_id, skip this)

**Option B — embed it in a `status_update` event** (coming soon — not yet implemented)

**Option C — current approach: generate it client-side and pass it in the URL**

The cleanest current pattern is: **generate a UUID client-side before the first request** and call the existing-conversation endpoint immediately:

```
POST /api/ai/conversations/{your_generated_uuid}/chat   ← use this for ALL turns including first
POST /api/ai/agents/{your_generated_uuid}/execute       ← same for agents
```

This works because the server validates the conversation exists only when `is_new_conversation=false` (old API) — but now the existing-conversation endpoint just uses whatever ID you pass. You can pass a brand-new UUID on the first turn and it will be treated as a new conversation automatically.

> **Recommendation for the team:** Always generate the `conversation_id` client-side (a UUID v4) before the first request and use the `/{conversation_id}/` URL form for all turns. This gives you the ID immediately without waiting for a server response.

---

## 4. How to Implement the Stream Reader

### JavaScript / TypeScript (fetch + ReadableStream)

```typescript
async function streamRequest(url: string, body: object, onEvent: (event: StreamEvent) => void) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed) as StreamEvent;
        onEvent(event);
      } catch {
        console.warn('Failed to parse stream line:', trimmed);
      }
    }
  }
}
```

### Usage example

```typescript
import { v4 as uuidv4 } from 'uuid';

const conversationId = uuidv4(); // generate once, reuse for all turns

await streamRequest(
  `https://api.aidream.com/api/ai/conversations/${conversationId}/chat`,
  {
    ai_model_id: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
    stream: true,
  },
  (event) => {
    switch (event.event) {
      case 'status_update':
        setLoadingMessage(event.data.user_message);
        break;
      case 'chunk':
        appendToOutput(event.data.text);
        break;
      case 'completion':
        setUsageStats(event.data.total_usage);
        break;
      case 'error':
        showError(event.data.user_message);
        break;
      case 'end':
        setLoading(false);
        break;
      case 'heartbeat':
        break; // ignore
    }
  }
);
```

---

## 5. TypeScript Types

```typescript
type EventType =
  | 'chunk'
  | 'status_update'
  | 'data'
  | 'completion'
  | 'error'
  | 'tool_event'
  | 'broker'
  | 'heartbeat'
  | 'end';

interface StreamEvent {
  event: EventType;
  data: Record<string, unknown>;
}

interface ChunkData {
  text: string;
}

interface StatusUpdateData {
  status: string;
  system_message: string | null;
  user_message: string | null;
  metadata: Record<string, unknown> | null;
}

interface CompletionData {
  status: 'complete' | 'failed' | 'max_iterations_exceeded';
  output: string | null;
  iterations: number | null;
  total_usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    input_cost: number;
    output_cost: number;
    total_cost: number;
  } | null;
  timing_stats: {
    total_duration: number;
    api_duration: number;
    tool_duration: number;
    iterations: number;
    avg_iteration_duration: number;
  } | null;
  tool_call_stats: Record<string, unknown> | null;
  finish_reason: string | null;
  metadata: Record<string, unknown> | null;
}

interface ErrorData {
  error_type: string;
  message: string;
  user_message: string;
  code: string | null;
  details: Record<string, unknown> | null;
}

type ToolEventType =
  | 'tool_started'
  | 'tool_progress'
  | 'tool_step'
  | 'tool_result_preview'
  | 'tool_completed'
  | 'tool_error';

interface ToolEventData {
  event: ToolEventType;
  call_id: string;
  tool_name: string;
  timestamp: number;
  message: string | null;
  show_spinner: boolean;
  data: Record<string, unknown>;
}

interface EndData {
  reason: 'complete' | 'cancelled';
}

interface HeartbeatData {
  timestamp: number;
}
```

---

## 6. Complete List of What Changed vs. What Did NOT Change

### Changed — action required

| What | Before | After |
|---|---|---|
| Agent endpoint URL | `POST /api/ai/agent/execute` | `POST /api/ai/agents/execute` (new) or `POST /api/ai/agents/{conversation_id}/execute` (existing) |
| Chat endpoint URL | `POST /api/ai/chat/unified` | `POST /api/ai/conversations/chat` (new) or `POST /api/ai/conversations/{conversation_id}/chat` (existing) |
| Agent warm endpoint | `POST /api/ai/agent/warm` with `{ prompt_id, is_builtin }` body | `POST /api/ai/agents/{agent_id}/warm` — no body, single unified route |
| `conversation_id` in body | Sent in body | Moved to URL path; remove from body |
| `is_new_conversation` in body | Sent in body | Removed; determined by which URL you call |
| `is_builtin` in agent execute body | Sent in body (`true`/`false`) | **Removed entirely** — server auto-detects prompt vs. builtin from the ID |
| Response format for all AI endpoints | Single JSON object (some) or stream (some) | Always NDJSON stream — no exceptions |

### Did NOT change

| What | Status |
|---|---|
| All research endpoints (`/api/research/...`) | Unchanged — URLs, request bodies, and response shapes are the same |
| All scraper endpoints (`/api/scraper/...`) | Unchanged |
| Auth header format (`Authorization: Bearer <token>`) | Unchanged |
| Supabase JWT tokens | Unchanged |
| All model config fields in unified chat body | Unchanged |
| Tool list, tool names | Unchanged |
| Health check (`GET /api/health`) | Unchanged |
| PDF processing (`POST /api/utilities/...`) | Unchanged |
| Cancel endpoint (`POST /api/ai/cancel`) | Unchanged |

---

## 7. Auth Requirements

Every endpoint except `/api/health` requires authentication. Pass the Supabase JWT:

```
Authorization: Bearer <supabase_jwt_token>
```

Guest access (fingerprint-based, no JWT) is still supported for agent and chat endpoints by passing:

```
X-Fingerprint-ID: <device_fingerprint_string>
```

Research, scraper, and tool endpoints require a full JWT — no guest access.
