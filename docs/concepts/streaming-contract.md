# Streaming Contract (Client ↔ Python Backend)

Formal contract for every NDJSON stream the Matrx web client consumes. The web client enforces these timing guarantees via `lib/net/stream-monitor.ts`; servers that violate them will have their streams aborted client-side with a `HeartbeatTimeoutError`.

## Timing guarantees (what the server MUST do)

| Phase | Deadline | Notes |
|---|---|---|
| HTTP connect → response headers | ≤ **15 s** | First byte of the response. |
| First event emitted | ≤ **15 s** after headers | Must be `{kind:"phase", phase:"connected"}` (or any substantive event). |
| Max silence between events | ≤ **20 s** | If no payload event is ready, emit `{kind:"heartbeat"}`. Client deadline is 30 s, 10 s of headroom. |
| Absolute stream lifetime | ≤ **10 min** | Configurable per endpoint; hard ceiling. |
| Stream termination | Always | Emit `{kind:"end", reason:"complete"\|"error"\|"cancelled"}` as the final event. |

## Event shapes

All events are NDJSON (`\n`-delimited JSON), one object per line. Common fields:

```ts
type StreamEvent =
  | { kind: "phase"; phase: "connected" | "processing" | "finalizing"; seq: number }
  | { kind: "heartbeat"; seq: number; ts: number }
  | { kind: "delta"; seq: number; /* domain payload */ }
  | { kind: "tool"; seq: number; /* tool call info */ }
  | { kind: "error"; seq: number; code: string; message: string }
  | { kind: "end"; seq: number; reason: "complete" | "error" | "cancelled" };
```

- `seq` is monotonically increasing from 0. The client uses gaps in `seq` to detect dropped events.
- `heartbeat` events carry no semantic payload; they exist solely to reset the client's idle timer.

## Client behavior

- **Before first event**: 15 s timeout. On expiry → `ConnectTimeoutError`, request marked `phase: "timed-out"`.
- **Between events**: 30 s timeout. On expiry → `HeartbeatTimeoutError`, request marked `phase: "heartbeat-stalled"` then `timed-out`.
- **Absolute ceiling**: 10 min. On expiry → `TotalTimeoutError`.
- **On `{kind:"end"}`**: stream iteration completes normally; request marked `phase: "completed"`.
- **On abort**: client cancels via `AbortController`; server should stop work promptly.

## Non-streaming (request/response) endpoints

- Connect timeout: 15 s
- Total timeout: 30 s (configurable, e.g. 60 s for heavy CRUD)
- Initialization/bootstrap fetches: 15 s + up to 2 retry attempts with exponential backoff (`lib/net/retry.ts`)

## Migration checklist for Python endpoints

1. Every long-running streaming endpoint emits `{kind:"heartbeat"}` at ≤ 20 s intervals during any stall (waiting on model, tool, DB).
2. Every stream ends with `{kind:"end", reason}` — never a silent close.
3. Errors are emitted in-band as `{kind:"error", code, message}` followed by `{kind:"end", reason:"error"}` when possible, rather than HTTP 500.
4. Server respects `AbortController` cancellation from the client.
