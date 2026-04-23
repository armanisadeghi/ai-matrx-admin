# Observational Memory — Frontend Integration Guide

**Status:** experimental, admin-gated. DB migration applied. Off for all conversations until an admin turns it on per-thread.

**TL;DR for the frontend team:**
1. Run `pnpm sync-types` — you'll automatically pick up the 5 new typed data events and three new request-body fields.
2. Add an admin-only toggle on `POST /conversations/{id}` / `POST /agents/{id}` / `POST /ai/chat` that sends `memory: true` once to enable; from that point on the flag **persists on the conversation** — you don't need to keep sending it.
3. In your SSE handler, switch on `TypedDataPayload.type` for the five `memory_*` events to show live Observer/Reflector activity.
4. Admin-only `GET /conversations/:id/memory_cost` returns the running cost rollup for this conversation's memory LLM calls.

---

## 1. Re-sync types

From your Next.js project:

```bash
pnpm sync-types
```

This hits `GET /schema/all` and regenerates:
- `api-types.ts` — now includes the three new request-body fields
- `stream-events.ts` — now includes five new memory event interfaces + updated `TypedDataPayload` union

No frontend code changes will break. All new fields are optional.

---

## 2. Request-body changes (backwards compatible)

Three new **optional** fields land on all three AI-executing endpoints:

| Endpoint | Where |
|----------|-------|
| `POST /ai/chat` | `ChatRequest` |
| `POST /agents/:id` | `AgentStartRequest` |
| `POST /conversations/:id` | `ConversationContinueRequest` |

### New fields

```ts
/** Observational memory flag — tri-state.
 *  null / omitted  → inherit this conversation's persisted state (normal case)
 *  true            → ADMIN-ONLY: enable memory on this conversation and persist
 *  false           → ADMIN-ONLY: disable memory on this conversation and persist
 *  Non-admins' true/false values are silently ignored.
 */
memory?: boolean | null;

/** Optional per-conversation model override for Observer/Reflector.
 *  Admin-only, persists with the enable.
 *  Example values: "google/gemini-2.5-flash", "claude-haiku-4-5", "openai/gpt-5-mini"
 *  Default (when null): `MATRX_OM_DEFAULT_MODEL` env var → "google/gemini-2.5-flash" */
memory_model?: string | null;

/** "thread" (default) — memory scoped to this conversation.
 *  "resource" — memory scoped to this user across all conversations (experimental). */
memory_scope?: "thread" | "resource";
```

### Usage patterns

**Enable memory on an existing thread (admin UI, one time):**
```ts
await fetch(`/api/conversations/${conversationId}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({
    user_input: "...",
    memory: true,                               // ← turn on
    memory_model: "google/gemini-2.5-flash",    // optional
  }),
});
```

**Subsequent turns (any user, including non-admins):**
```ts
// Just continue normally — the flag is persisted on cx_conversation.metadata
// and inherited automatically. No `memory` field needed.
await fetch(`/api/conversations/${conversationId}`, {
  method: "POST",
  body: JSON.stringify({ user_input: "..." }),
});
```

**Disable memory (admin):**
```ts
await fetch(`/api/conversations/${conversationId}`, {
  method: "POST",
  body: JSON.stringify({ user_input: "...", memory: false }),
});
```

**Non-admin tries to toggle:**
Their `memory: true`/`false` is silently dropped server-side. The effective flag is whatever was persisted by the last admin. No 403 — it's not an error, just a no-op.

### How persistence works

When an admin sets `memory: true`, the backend writes to `cx_conversation.metadata`:

```json
{
  "observational_memory": {
    "enabled": true,
    "enabled_at": "2026-04-22T12:00:00Z",
    "enabled_by": "<admin user_id>",
    "model": "google/gemini-2.5-flash",
    "scope": "thread",
    "disabled_at": null
  }
}
```

On every subsequent turn, the backend reads this block and auto-sets `memory_enabled=true` on the request context. The user doesn't need to know or re-send anything.

**Kill switch:** If the backend has `MATRX_OM_KILL_SWITCH=1` set in its environment, memory is off everywhere regardless of persisted state. The persisted flag isn't touched — flip the env off and memory resumes where it was.

---

## 3. Stream events (5 new typed data events)

All memory events ride on the existing `data` channel, typed as `DataPayload` subclasses in the generated `TypedDataPayload` discriminated union. No new event kind at the top level — just new `type` values inside `data` events.

### Event schema (from `aidream/api/generated/stream-events.ts`)

```ts
export interface MemoryContextInjectedData {
  type: "memory_context_injected";
  conversation_id: string;
  observation_chars?: number;   // length of the injected system-prompt block
}

export interface MemoryObserverCompletedData {
  type: "memory_observer_completed";
  conversation_id: string;
  model?: string | null;        // e.g. "google/gemini-2.5-flash"
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;                // USD
  duration_ms?: number | null;
}

export interface MemoryReflectorCompletedData {
  type: "memory_reflector_completed";
  conversation_id: string;
  model?: string | null;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  duration_ms?: number | null;
}

export interface MemoryBufferSpawnedData {
  type: "memory_buffer_spawned";
  conversation_id: string;
  kind?: "observer" | "reflector";  // async buffering task kind
}

export interface MemoryErrorData {
  type: "memory_error";
  conversation_id: string;
  phase?: string;   // "pre_input" | "observer" | "reflector" | "post_output"
  error?: string;
  model?: string | null;
}
```

### Event lifecycle (per turn)

1. **`memory_context_injected`** (once, before the LLM call)
   Fires if the conversation has any prior observations to inject. UI can show a subtle "memory context applied" badge.

2. **`memory_observer_completed`** (zero or more per turn)
   Fires when the message-token threshold is crossed and the Observer LLM extracted new observations. Can fire multiple times in very long turns (rare).

3. **`memory_reflector_completed`** (zero or more per turn)
   Fires when the observation-token threshold is crossed and the Reflector compressed the observations.

4. **`memory_buffer_spawned`** (zero or more per turn)
   Async background task was started. UI can show "memory processing in background".

5. **`memory_error`** (zero or more per turn)
   A memory operation failed. **The main conversation turn is never affected** — memory errors are non-fatal by design. UI should at most show a subtle "memory degraded" indicator, never an error popup.

### Handler example

```ts
import type { TypedDataPayload } from "@/generated/stream-events";

function handleDataEvent(payload: TypedDataPayload) {
  switch (payload.type) {
    case "memory_context_injected":
      setMemoryBadge({ active: true, chars: payload.observation_chars });
      break;

    case "memory_observer_completed":
    case "memory_reflector_completed":
      addMemoryCostTick({
        kind: payload.type === "memory_observer_completed" ? "observer" : "reflector",
        cost: payload.cost ?? 0,
        tokens: (payload.input_tokens ?? 0) + (payload.output_tokens ?? 0),
        duration_ms: payload.duration_ms ?? 0,
      });
      break;

    case "memory_buffer_spawned":
      showMemoryProcessingIndicator(payload.kind);
      break;

    case "memory_error":
      setMemoryDegraded(true);
      console.warn("[memory] degraded:", payload.phase, payload.error);
      break;

    // ...existing cases...
  }
}
```

### Timing caveat — events after the stream ends

`memory_observer_completed` / `memory_reflector_completed` can fire from background tasks that run **after** the `end` event on the SSE stream. If your SSE client has already closed the connection, those stream events are dropped silently.

The authoritative source for memory cost/history is the **DB** (see §4). For live UI, listen to the events while the stream is open; for post-hoc display (e.g. a history panel), fetch from the DB.

---

## 4. Memory cost endpoint (admin-only)

```
GET  /conversations/:conversation_id/memory_cost
GET  /conversation/:conversation_id/memory_cost
```

Returns the running rollup of all Observer/Reflector LLM calls for this conversation. Memory cost is **intentionally separate** from `CxUserRequest.total_cost` and `CxRequest.cost` — those remain user-attributed LLM spend; memory is infrastructure cost.

### Response shape

```ts
type MemoryCostSummary = {
  conversation_id: string;
  total_cost: number;            // USD, summed across all memory events
  total_input_tokens: number;
  total_output_tokens: number;
  event_count: number;
  by_event_type: {
    [eventType: string]: {       // "observer" | "reflector" | "error" | ...
      count: number;
      cost: number;
      input_tokens: number;
      output_tokens: number;
    };
  };
};
```

Non-admin callers receive **403 Forbidden** with:
```json
{"code": "admin_required", "message": "Memory cost is admin-only."}
```

### Example

```ts
const summary = await fetch(`/api/conversations/${conversationId}/memory_cost`, {
  headers: { Authorization: `Bearer ${adminToken}` },
}).then(r => r.json());
// summary.total_cost, summary.by_event_type.observer, etc.
```

---

## 5. Suggested admin UI surface

A minimum viable memory UI on the admin dashboard:

1. **Per-conversation toggle** — a switch in the conversation sidebar (admin-only visible). Calls the next user-turn with `memory: true` / `false`. Show the current persisted state by reading `cx_conversation.metadata.observational_memory.enabled` (already available via your existing conversation fetcher).

2. **Live activity panel** — while a memory-enabled conversation is streaming, show:
   - Green dot + "context applied" when `memory_context_injected` fires
   - Running counter of Observer / Reflector calls with token + cost deltas
   - Yellow warning if any `memory_error` fires

3. **Cost card** — simple widget that calls `GET /conversations/:id/memory_cost` on mount and on conversation close. Shows total cost USD + breakdown by event type.

4. **(Optional) Model selector** — dropdown that sets `memory_model` on the toggle-on request. Useful for side-by-side model comparisons during testing.

5. **(Optional) Cost explorer** — aggregate all memory costs across conversations for this user / this month. Query the dashboard directly against `cx_observational_memory_event` until we expose a broader aggregation endpoint.

---

## 6. Database tables (for the dashboard SQL layer)

New tables available in the `cx-explorer` / dashboard for direct inspection:

### `cx_observational_memory`
One row per `(user_id, conversation_id, scope)` that has memory enabled. Soft-deleted with `deleted_at`. Key columns:
- `active_observations` (text) — the current memory payload
- `observation_token_count` (int)
- `current_task`, `suggested_response` (text)
- `buffered_observations` (jsonb) — pending async observer chunks
- `buffered_reflection` (text) — pending async compression
- `generation_count` (int) — bumped on every observer/reflector update

### `cx_observational_memory_event`
Append-only. One row per Observer/Reflector LLM call plus non-LLM lifecycle events. Columns:
- `event_type` (text) — one of `observer`, `reflector`, `observer_buffer`, `reflector_buffer`, `context_injected`, `buffer_spawned`, `activated`, `error`
- `model`, `input_tokens`, `output_tokens`, `cost` (numeric), `duration_ms`
- `user_request_id` — links back to the user turn that triggered it
- `success`, `error`, `trigger_reason`

Handy queries:
```sql
-- Total memory cost per conversation, last 7 days
SELECT conversation_id, sum(cost) AS total_cost, count(*) AS events
FROM cx_observational_memory_event
WHERE created_at > now() - interval '7 days'
GROUP BY conversation_id
ORDER BY total_cost DESC;

-- Current memory state for a conversation
SELECT active_observations, observation_token_count, generation_count, updated_at
FROM cx_observational_memory
WHERE conversation_id = $1 AND deleted_at IS NULL;
```

---

## 7. Compatibility / risk

- **Zero-impact for non-memory conversations** — existing chats don't hit any memory code paths. All new fields are optional; absent/null = current behavior.
- **Fail-safe** — every memory operation is wrapped in try/except. If memory errors, the conversation continues normally; only a `memory_error` event is emitted.
- **Admin-gated toggle** — only admins can turn memory on. Non-admins sending `memory: true` is a silent no-op.
- **Cost is capped by threshold** — Observer runs only after ~30k token threshold; Reflector only after ~40k observation tokens. Cost does not scale linearly with turn count.
- **Bypass paths** — `MATRX_OM_KILL_SWITCH=1` (env) disables everywhere; `ctx.store = false` (ephemeral conversations) disables per-request.

---

## 8. Still to come (NOT shipped yet)

- Retrieval-mode memory tool (for agent-driven recall, not just passive observation)
- Cross-user aggregation endpoint (today it's per-user-per-conversation)
- UI for viewing the raw `active_observations` content — currently only queryable via SQL
- Model-swap controls at the org/project level (today it's per-conversation via `memory_model`)

---

## 9. Questions / contact

Backend owner: infrastructure team. File any integration issues against the `observational_memory` label.
