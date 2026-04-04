# Stream Status Lifecycle — Complete State Map

Every status flip, boolean change, and timing mark from submit to completion.

---

## Two Parallel Status Tracks

There are **two independent status fields** that change during execution:

| Track | Slice | Field | Type | Who sets it |
|-------|-------|-------|------|-------------|
| **Instance** | `executionInstances` | `instance.status` | `InstanceStatus` | `setInstanceStatus` |
| **Request** | `activeRequests` | `request.status` | `RequestStatus` | `setRequestStatus` |

These are NOT synchronized — they change at different moments. Understanding when each flips is critical.

---

## Timeline: Submit → Complete (Happy Path)

```
USER PRESSES SEND
│
├─ [1] addUserTurn                          (optimistic — user sees their message immediately)
│     history: new user turn appended
│
├─ [2] createRequest                        (new request entry in activeRequests)
│     request.status = "pending"
│     request.startedAt = now
│
├─ [3] setInstanceStatus("running")
│     instance.status: draft/ready/complete → "running"
│
├─ [4] setRequestStatus("connecting")
│     request.status: pending → "connecting"
│
│   ═══════ HTTP fetch fires ═══════
│   ═══════ Waiting for response... ═══════
│
├─ [5] Response headers arrive
│     ├─ X-Conversation-ID header read
│     │     setConversationId dispatched
│     │     request.conversationId set
│     │
│     ├─ submitAt = performance.now()     (t=0 for all timing)
│     │
│     ├─ setInstanceStatus("streaming")
│     │     instance.status: running → "streaming"
│     │
│     └─ setRequestStatus("streaming")
│           request.status: connecting → "streaming"
│
│   ═══════ NDJSON stream loop begins ═══════
│
├─ [6] Stream events arrive (processStream)
│     │
│     ├─ chunk event
│     │     appendChunk → textChunks.push(text)
│     │     request.firstChunkAt set on first chunk
│     │     clientFirstChunkAt recorded (for TTFT metric)
│     │
│     ├─ status_update event
│     │     setCurrentStatus → currentStatus overwritten, statusHistory.push
│     │     NO status change on instance or request
│     │
│     ├─ content_block event
│     │     upsertContentBlock → contentBlocks[blockId] upserted
│     │     NO status change
│     │
│     ├─ tool_event (lifecycle: started/progress/step/completed/error)
│     │     upsertToolLifecycle → toolLifecycle[callId] state machine
│     │     NO status change on instance or request
│     │
│     ├─ tool_event (delegated)
│     │     addPendingToolCall → request.status = "awaiting-tools"
│     │     upsertToolLifecycle → started + isDelegated=true
│     │     setInstanceStatus("paused")
│     │         instance.status: streaming → "paused"
│     │
│     ├─ data event (conversation_id)
│     │     setConversationId (if not already set from header)
│     │     NO status change
│     │
│     ├─ data event (other)
│     │     appendDataPayload → dataPayloads.push
│     │     NO status change
│     │
│     ├─ completion event
│     │     setCompletion → completion field set
│     │     tokenUsage, finishReason, completionStats extracted
│     │     NO status change (end event does that)
│     │
│     ├─ error event
│     │     setRequestStatus("error", errorMessage, isFatal=true)
│     │         request.status: streaming → "error"
│     │         request.completedAt set
│     │     setInstanceStatus("error")
│     │         instance.status: streaming → "error"
│     │
│     ├─ end event
│     │     setRequestStatus("complete")
│     │         request.status: streaming → "complete"
│     │         request.completedAt set
│     │     setInstanceStatus("complete")
│     │         instance.status: streaming → "complete"
│     │
│     ├─ broker event
│     │     appendDataPayload (wrapped)
│     │     NO status change
│     │
│     └─ heartbeat event
│           DROPPED — no storage, no status change
│
│   ═══════ Stream loop exits ═══════
│
├─ [7] Post-stream finalization (still in processStream)
│     ├─ finalizeAccumulatedText → textChunks joined → accumulatedText
│     ├─ commitAssistantTurn → history slice gets the completed turn
│     ├─ clearUserInput → text + contentBlocks cleared
│     ├─ clearAllResources → all resource entries removed
│     ├─ Client metrics computed (TTFT, stream duration, render delay, etc.)
│     ├─ finalizeClientMetrics → attached to request
│     └─ attachClientMetrics → attached to conversation turn
│
└─ [8] Thunk resolves → { requestId, conversationId }
```

---

## Status Values Reference

### InstanceStatus (executionInstances)

| Value | Meaning | Set by |
|-------|---------|--------|
| `"draft"` | Being configured (pre-autoRun) | `createInstance` |
| `"ready"` | Fully configured, awaiting execution | Manual transition |
| `"running"` | API call in flight, no chunks yet | `executeInstance` / `executeChatInstance` step [3] |
| `"streaming"` | First response received, chunks flowing | Step [5] |
| `"paused"` | Waiting for client tool results | `tool_delegated` event |
| `"complete"` | Stream ended successfully | `end` event |
| `"error"` | Stream ended with error | `error` event or catch block |

### RequestStatus (activeRequests)

| Value | Meaning | Set by |
|-------|---------|--------|
| `"pending"` | Request created, not yet sent | `createRequest` |
| `"connecting"` | HTTP request in flight, waiting for response | Step [4] |
| `"streaming"` | Response body being consumed | Step [5] |
| `"awaiting-tools"` | Paused — client must submit tool results | `addPendingToolCall` |
| `"complete"` | Stream finished normally | `end` event |
| `"error"` | Fatal error during stream | `error` event or catch |
| `"timeout"` | Request timed out | Not currently used |

---

## What Components Should Use

| UI Need | Selector | Returns |
|---------|----------|---------|
| "Is anything happening?" | `selectIsExecuting(instanceId)` | `true` when running OR streaming |
| "Show spinner before first text" | `selectIsWaitingForFirstToken(instanceId)` | `true` for running + connecting |
| "Is text actively streaming?" | `selectIsStreaming(instanceId)` | `true` only when streaming |
| "Show status message (thinking...)" | `selectLatestStatusMessage(instanceId)` | string from server status_update |
| "Is there an error?" | `selectLatestError(instanceId)` | error string or undefined |
| "Was the error fatal?" | `selectLatestErrorIsFatal(instanceId)` | boolean |
| "Get the streamed text" | `selectLatestAccumulatedText(instanceId)` | joined chunks |
| "Request-level status" | `selectLatestRequestStatus(instanceId)` | RequestStatus enum |
| "Content blocks" | `selectLatestContentBlocks(instanceId)` | ContentBlockPayload[] |
| "Active tools" | `selectLatestActiveTools(instanceId)` | ToolLifecycleEntry[] |
| "Completion data" | `selectLatestCompletion(instanceId)` | CompletionPayload or null |

---

## Event Timeline — First-Class Sequential Record

The `timeline` field on `ActiveRequest` is the authoritative ordered record of every event during the request. It is NOT a debug copy — it IS the source of truth for event ordering.

### Architecture

```
Server NDJSON stream → processStream()
  ├── Typed buckets (fast indexed access)
  │     textChunks[], toolLifecycle{}, contentBlocks{}, statusHistory[], etc.
  │
  └── Timeline (sequential ordering)
        TimelineEntry[] — monotonic seq, high-res timestamps
```

**Both** are first-class. The typed buckets serve component rendering (O(1) lookups). The timeline serves ordering reconstruction (what happened and in what sequence).

### Chunk Coalescing

During high-speed text streaming (thousands of chunks/sec), the timeline does NOT log each chunk individually. Instead:

1. When the first chunk of a text run arrives → `text_start` entry (marks `chunkStartIndex`)
2. Subsequent chunks → pushed into `textChunks[]` only (zero timeline writes)
3. When a non-chunk event arrives → `text_end` entry closes the run (marks `chunkEndIndex`, `chunkCount`)
4. The actual text for any run is reconstructed via: `textChunks.slice(chunkStartIndex, chunkEndIndex).join("")`

This means during the hottest code path, the timeline sees zero writes. For a typical response:

```
text_start          → "text streaming started"
text_end            → "427 chunks"
status_update       → "processing tools..."
tool_event          → "tool_started — web_search"
tool_event          → "tool_completed — web_search"
text_start          → "text streaming resumed"
text_end            → "812 chunks"
completion          → "stream completed"
end                 → "stream ended"
```

### Timeline Entry Types

| Kind | Data | When |
|------|------|------|
| `text_start` | `chunkStartIndex` | First chunk of a new text run |
| `text_end` | `chunkStartIndex`, `chunkEndIndex`, `chunkCount` | Non-chunk event interrupts text |
| `status_update` | Full `StatusUpdatePayload` | Server status_update event |
| `tool_event` | `subEvent`, `callId`, `toolName`, `data` | Any tool lifecycle event |
| `content_block` | `blockId`, `blockType`, `blockStatus` | Content block upsert |
| `data` | Full data payload | Unstructured data event |
| `completion` | (none — full data in `request.completion`) | Completion event |
| `error` | `errorType`, `message`, `isFatal` | Error event |
| `end` | `reason?` | Stream end |
| `broker` | `brokerId` | Broker fan-out |
| `heartbeat` | (none) | Keep-alive |

### Key Selectors

| Need | Selector | Level |
|------|----------|-------|
| Full timeline for a request | `selectTimeline(requestId)` | Request |
| Timeline entry count | `selectTimelineLength(requestId)` | Request |
| Is text currently flowing? | `selectIsInTextRun(requestId)` | Request |
| Filter by kind | `selectTimelineByKind(requestId, kind)` | Request |
| Kind counts | `selectTimelineKindCounts(requestId)` | Request |
| Latest timeline (via instanceId) | `selectLatestTimeline(instanceId)` | Instance bridge |
| Is latest request in text run? | `selectIsInTextRun(instanceId)` | Instance bridge |

---

## Known Gaps / Potential Issues

1. **No "first chunk received" boolean** — `selectIsStreaming` is true from HTTP response (step [5]), not from first chunk. Use `selectIsInTextRun` for "is text actually flowing right now". Components should check both for the most accurate rendering state.

2. **Instance status vs Request status desync** — The instance goes to "streaming" at step [5] (HTTP response), but `request.firstChunkAt` is only set when the actual first chunk arrives. The timeline's `text_start` entry precisely marks this boundary.

3. **Error events always set `isFatal = true`** — The processStream code hardcodes `const isFatal = true`. There's no distinction between fatal and non-fatal errors yet. If the server sends a recoverable error mid-stream, it will still kill the UI state.

4. **End event required for "complete"** — If the stream closes without an explicit `end` event (e.g., network drop), neither instance nor request status transitions to "complete". They stay "streaming" forever. There's no timeout or stream-close detection.

5. **`completion` event arrives BEFORE `end`** — The completion event sets data (stats, usage) but does NOT change status. The `end` event (which follows) is what flips to "complete". If `end` never arrives, completion data exists but status stays "streaming".

6. **Post-stream operations are synchronous** — `finalizeAccumulatedText`, `commitAssistantTurn`, `clearUserInput`, and `clearAllResources` all dispatch inside the same async function after the stream loop. They execute in Redux order but there's no guarantee React has rendered between them. The "render delay" metric measures this gap.

---

## Timing Marks (ClientMetrics)

| Mark | When | Metric |
|------|------|--------|
| `submitAt` | `performance.now()` right before `fetch()` | t=0 |
| `conversationIdAt` | When X-Conversation-ID header is read | `internalLatencyMs = conversationIdAt - submitAt` |
| `firstChunkAt` | When first `chunk` event is processed | `ttftMs = firstChunkAt - submitAt` |
| `streamEndAt` | When the `for await` loop exits | `streamDurationMs = streamEndAt - firstChunkAt` |
| `renderCompleteAt` | After all post-stream dispatches | `renderDelayMs = renderCompleteAt - streamEndAt` |
