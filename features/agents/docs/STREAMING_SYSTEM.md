# STREAMING_SYSTEM.md

**Status:** `active` — canonical contract
**Tier:** 1 (cross-cutting; anchored here because the agents system owns the canonical implementation)
**Last updated:** `2026-04-22`

> This is the **single source of truth** for streaming across the app. Chat, conversation, artifacts, tool calls, and every long-running endpoint must conform. The detailed event-type and phase-value reference lives in [`STREAM_STATUS_LIFECYCLE.md`](./STREAM_STATUS_LIFECYCLE.md) — this doc is the higher-level contract and usage guide.

---

## Purpose

Every long-running operation in the app streams NDJSON. The stream carries the model output, tool lifecycle, phase transitions, record reservations, and errors. The client parses it into Redux (`activeRequests` slice) and every UI surface reads from there.

The contract is formalized because:
1. Agents, Chat, Runner, Shortcuts, Apps, and data-ingestion pipelines all use it.
2. Clients need timeout and heartbeat guarantees to handle network flake.
3. Observability, debugging, and replay all depend on a stable event shape.

---

## The wire format

- `Content-Type: application/x-ndjson`
- One JSON object per line, terminated by `\n`
- Every event has a `type` discriminator
- Ordering is load-bearing — events arrive in the order they happened

### Event types (summary — full detail in `STREAM_STATUS_LIFECYCLE.md`)

| Type | Purpose |
|---|---|
| `chunk` | Token-by-token LLM text |
| `reasoning_chunk` | Token-by-token thinking/reasoning |
| `phase` | State machine transition (`connected → processing → generating → using_tools → persisting → complete`) |
| `init` / `completion` | Identified operation bracket (user_request, llm_request, tool_execution, sub_agent, persistence) |
| `data` | Typed discriminated payload — switch on `data.type` |
| `warning` / `info` | Non-fatal notifications (warning has code + severity) |
| `tool_event` | Tool lifecycle update |
| `content_block` | Structured block streaming (artifacts, code, etc.) |
| `record_reserved` / `record_update` | DB row pre-announced then updated |
| `error` | Fatal — stream is about to end |
| `end` | Transport-level termination |
| `heartbeat` | Keep-alive |
| `broker` | Direct UI state update (frozen — no new usage) |

---

## Heartbeat + timeout contract

- Server emits `heartbeat` at regular intervals (typically every 10s) during any long-running phase.
- Client runs a timeout monitor (`lib/net/stream-monitor.ts`) that resets on every received event, including heartbeat.
- Missing heartbeats beyond the threshold triggers a client-side timeout error — the stream is considered dead.
- Reconnection is not automatic for in-flight streams. Conversation state is rehydrated via `resume-conversation.ts`.

---

## Phase machine

Phases are a closed enum representing what the server is doing right now. Clients use phases to drive status UIs.

Standard happy path:

```
connected → processing → generating → using_tools → generating → persisting → complete
```

Phases can loop (`using_tools ↔ generating` is the tool-call cycle). Clients should handle any phase in any order — do not encode sequence assumptions.

Full phase list: `STREAM_STATUS_LIFECYCLE.md`.

---

## Operation brackets (`init` / `completion`)

Every long operation is bracketed:

```
init: { operation: "llm_request", operation_id: "abc" }
...chunks, phases, tool events...
completion: { operation: "llm_request", operation_id: "abc", result_summary: {...} }
```

Five operations are tracked: `user_request`, `llm_request`, `tool_execution`, `sub_agent`, `persistence`.

The Redux slice stores these as a tree under `activeRequests[requestId].operations`. Clients read this to show "thinking ↔ using tools ↔ synthesizing" phases.

---

## Redux integration

State lives under `activeRequests` keyed by request ID. Each request's slice tracks:

- `accumulatedText` — concatenated chunks
- `reasoningText` — concatenated reasoning chunks
- `currentStatus` / `statusHistory` — phase and phase history
- `contentBlocks` / `contentBlockOrder` — streamed structured blocks keyed by blockId
- `toolLifecycle` — per-callId state machine for each tool call
- `pendingToolCalls` — durable + widget delegations awaiting client action
- `completion` — terminal result
- `errorMessage` / `errorIsFatal` — error state
- `dataPayloads` — catch-all for unstructured `data` events only (typed events go to their dedicated buckets)

See [`AGENTS_OVERVIEW.MD`](./AGENTS_OVERVIEW.MD) §Layer 3 for the full slice inventory.

---

## Client side — where parsing happens

- `lib/api/stream-parser.ts` — NDJSON parser. Reads ReadableStream, splits on newlines, JSON-parses each line.
- `features/agents/redux/execution-system/process-stream.ts` — the dispatcher. Takes a parsed event, routes to the right action on `activeRequests`, `instanceConversationHistory`, or tool result handlers.
- `features/agents/redux/execution-system/thunks/execute-instance.thunk.ts` — the convergence point. Fires fetch, pipes to parser, pipes to process-stream.

---

## Record reservations

Before the DB row exists, the server announces it with its UUID:

```
record_reserved: { table: "cx_conversation", id: "abc...", ... }
```

The client stores the reservation immediately so optimistic UI can link to the conversation or reference its ID. Later `record_update` events fire as the row's status advances (`pending → persisted → error`).

This is how the client knows the conversation ID mid-stream, before persistence completes.

---

## Durable + widget tool integration

When the server emits `tool_delegated` (a specific flavor of `tool_event`):

- **Widget tools** (name matches `isWidgetActionName`): the stream **continues**. Client fires the widget action and batches results for one consolidated `POST /ai/conversations/{id}/tool_results`. See [`WIDGET_HANDLE_SYSTEM.md`](./WIDGET_HANDLE_SYSTEM.md).
- **Non-widget delegated tools**: the stream **pauses**. Client executes, POSTs result, server resumes. See [`DURABLE_TOOL_CALLS_CLIENT_INTEGRATION.md`](./DURABLE_TOOL_CALLS_CLIENT_INTEGRATION.md).

---

## Invariants & gotchas

- **NDJSON, not SSE.** Do not add `data: ` prefixes or `event: ` lines. One JSON per line.
- **Heartbeat is MANDATORY** for any stream expected to run longer than ~15s. Without heartbeat the client will time out.
- **`end` is the transport signal, `completion` is the semantic signal.** A well-formed stream emits both.
- **`error` events are fatal.** The stream ends right after. For recoverable issues, use `warning`.
- **Ordering matters.** A `phase: "complete"` before all `content_block` deltas is a bug.
- **`data` events are the fallback bucket** for unstructured payloads. If you find yourself adding a new typed stream concept, prefer a new event `type`, not overloading `data`.
- **Server is source of truth for conversationId.** Clients never mint one. Wait for `record_reserved` for `cx_conversation`.
- **The `broker` event type is frozen.** Do not introduce new usage; it's legacy direct UI state updates.
- **Do NOT add a new stream event type without updating this doc + `STREAM_STATUS_LIFECYCLE.md`.**

---

## Beyond agents — who else streams

The same contract applies to:

- Data ingestion pipelines (scraper, PDF extractor, research) — see `features/scraper/FEATURE.md`
- Any `app/api/*` route that runs >2s
- Agent apps public execution — see `features/agent-apps/FEATURE.md`
- Tool call visualization overlays — see `features/tool-call-visualization/FEATURE.md`

If you build a new long-running endpoint, conform to this contract. Do not invent a second streaming protocol.

---

## Related

- [`STREAM_STATUS_LIFECYCLE.md`](./STREAM_STATUS_LIFECYCLE.md) — detailed event + phase reference
- [`WIDGET_HANDLE_SYSTEM.md`](./WIDGET_HANDLE_SYSTEM.md) — widget tool stream integration
- [`DURABLE_TOOL_CALLS_CLIENT_INTEGRATION.md`](./DURABLE_TOOL_CALLS_CLIENT_INTEGRATION.md) — durable delegated tools
- [`AGENT_ORCHESTRATION.md`](./AGENT_ORCHESTRATION.md) — turn-level loop semantics

---

## Change log

- `2026-04-22` — claude: initial higher-level contract doc. Promotes the existing `STREAM_STATUS_LIFECYCLE.md` as the reference.

---

> **Keep-docs-live:** streaming is cross-cutting. Any change to event types, phase values, heartbeat timing, or NDJSON format must update this doc and `STREAM_STATUS_LIFECYCLE.md`. Every long-running endpoint depends on this contract being accurate.
