# Stream Logic Update — record_reserved + metadata propagation

Types were synced via `pnpm sync-types:local`. This doc covers the Redux/stream-processor changes needed.

---

## 1. Critical fix — `record_reserved` metadata is dropped from the timeline

### What happened
`appendTimeline` for `record_reserved` events was never passing `metadata`. The RTK type `TimelineRecordReserved` didn't have a `metadata` field either.  
For `cx_message` records this matters a lot: **the server sends `metadata.role` and `metadata.position` on every reservation** so the client knows which UUID is the user's message and which is the assistant's — without having to guess from arrival order.

### Required changes

**`features/agents/types/request.types.ts`** — add `metadata` to `TimelineRecordReserved`:
```ts
export interface TimelineRecordReserved extends TimelineBase {
  kind: "record_reserved";
  table: string;
  recordId: string;
  dbProject: string;
  parentRefs: Record<string, string>;
  metadata: Record<string, unknown>;   // ← ADD THIS
}
```

**`redux/execution-system/thunks/process-stream.ts`** — pass `metadata` in the timeline entry (~line 877):
```ts
dispatch(
  appendTimeline({
    requestId,
    entry: {
      kind: "record_reserved",
      seq: 0,
      timestamp: now,
      table: d.table,
      recordId: d.record_id,
      dbProject: d.db_project,
      parentRefs: d.parent_refs ?? {},
      metadata: d.metadata ?? {},   // ← ADD THIS
    },
  }),
);
```

---

## 2. Replace unsafe `as` casts with the new generated type guards

New type guards are now exported from `stream-events.ts`:
- `isCxMessageReservation(p)` → narrows to `CxMessageReservedPayload` with typed `metadata.role: CxMessageRole` and `metadata.position: number`
- `isCxRequestReservation(p)` → narrows to `CxRequestReservedPayload` with typed `metadata.iteration: number`
- `isCxToolCallReservation(p)` → narrows to `CxToolCallReservedPayload` with typed `metadata.tool_name`, `metadata.call_id`, `metadata.iteration`

**`process-stream.ts`** — in the `isRecordReservedEvent` branch, replace the three `d.table === "cx_*"` blocks:

```ts
// Import at top of file
import {
  // …existing imports…
  isCxMessageReservation,
  isCxRequestReservation,
  isCxToolCallReservation,
} from "@/types/python-generated/stream-events";

// In the isRecordReservedEvent branch:
if (isCxMessageReservation(d)) {
  // d.metadata.role and d.metadata.position are now typed — no `as` needed
  const { role, position } = d.metadata;
  const owningConversationId = d.parent_refs.conversation_id ?? conversationId;
  // … rest of logic unchanged …

} else if (isCxRequestReservation(d)) {
  const { iteration } = d.metadata;   // typed number
  // … rest of logic unchanged …

} else if (isCxToolCallReservation(d)) {
  const { tool_name, call_id, iteration } = d.metadata;   // all typed
  // … rest of logic unchanged …
}
```

---

## 3. Moderately important — `info` metadata is dropped from the timeline

`InfoPayload` has `metadata?: Record<string, unknown>`. The server uses it for `iteration_update` events (passes `{ Iteration, "Retry Attempt", "Finish Action", "will_continue" }`). This is useful for debugging agentic loops.

**`request.types.ts`** — add `metadata` to `TimelineInfo`:
```ts
export interface TimelineInfo extends TimelineBase {
  kind: "info";
  code: string;
  userMessage: string | null;
  systemMessage: string;
  metadata?: Record<string, unknown>;   // ← ADD
}
```

**`process-stream.ts`** — pass it in the timeline entry (~line 650):
```ts
entry: {
  kind: "info",
  seq: 0,
  timestamp: now,
  code: event.data.code,
  userMessage: event.data.user_message ?? null,
  systemMessage: event.data.system_message,
  metadata: event.data.metadata ?? {},   // ← ADD
},
```

---

## 4. Minor — `warning` and `record_update` also carry metadata that's currently dropped

Same pattern as above — both payloads have a `metadata` field that the timeline strips. Lower priority since it's mostly empty in practice, but worth making consistent.

**`TimelineWarning`** — add `metadata?: Record<string, unknown>`  
**`TimelineRecordUpdate`** — add `metadata?: Record<string, unknown>`  

And pass `metadata: event.data.metadata ?? {}` / `metadata: d.metadata ?? {}` in the respective `appendTimeline` calls.

---

## 5. Low priority — `error` event drops `code` and `details` from timeline

`ErrorPayload` has `code?: string | null` and `details?: Record<string, unknown> | null` that are not in `TimelineError`. The `code` is useful for programmatic error handling (e.g. routing to different UI states). `details` carries structured context for debugging.

**`request.types.ts`** — add to `TimelineError`:
```ts
export interface TimelineError extends TimelineBase {
  kind: "error";
  errorType: string;
  message: string;
  isFatal: boolean;
  code?: string | null;          // ← ADD
  details?: Record<string, unknown> | null;   // ← ADD
}
```

**`process-stream.ts`** — error `appendTimeline` call:
```ts
entry: {
  kind: "error",
  // …existing fields…
  code: event.data.code ?? null,
  details: event.data.details ?? null,
},
```

---

## 6. Low priority — `init` and `render_block` metadata

`InitPayload.metadata` and `RenderBlockPayload.metadata` are both stripped from the timeline. The full `RenderBlockPayload` IS stored in `renderBlocks` via `upsertRenderBlock`, so the data isn't lost — the timeline entry is just an index. `init` metadata is currently unused by the server. Safe to defer.

---

## Summary of all affected events

| Event | Severity | Missing from timeline |
|-------|----------|-----------------------|
| `record_reserved` | **Critical** | `metadata` (contains `role`+`position` for cx_message) |
| `info` | Moderate | `metadata` (contains iteration debug data) |
| `warning` | Low | `metadata` |
| `record_update` | Low | `metadata` |
| `error` | Low | `code`, `details` |
| `init` | Low | `metadata` (currently unused by server) |
| `render_block` | Negligible | `metadata` (full block in `renderBlocks`) |

## Files to touch

| File | Changes |
|------|---------|
| `features/agents/types/request.types.ts` | Add missing fields to `TimelineRecordReserved` (critical), `TimelineInfo`, `TimelineWarning`, `TimelineRecordUpdate`, `TimelineError` |
| `redux/execution-system/thunks/process-stream.ts` | Pass missing fields in 5+ `appendTimeline` calls; swap 3 unsafe `as` casts for typed guards |

No slice reducers need touching — `appendTimeline` accepts `TimelineEntry` and the union widens automatically when the interfaces are updated.
