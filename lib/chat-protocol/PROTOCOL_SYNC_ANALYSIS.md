# Protocol Sync Analysis — matrx-ai ↔ matrx-admin

**Compared:**
- **Backend (source of truth):** `matrx-ai/matrx_ai/context/events.py` + `stream_emitter.py`
- **Frontend types (auto-generated):** `matrx-admin/types/python-generated/stream-events.ts` + `stream-events.schema.json`
- **Frontend consumer:** `matrx-admin/lib/chat-protocol/` (this directory)

---

## VERDICT: Structurally aligned, but with 6 specific issues

The event types, payload field names, and tool event types all match exactly. There are no missing events or renamed fields. The differences are type-accuracy issues and tooling gaps.

---

## Issues

### 1. CRITICAL — Type generation script is missing from `matrx-ai`

The auto-generated file `types/python-generated/stream-events.ts` contains this header:

```
// AUTO-GENERATED — do not edit manually.
// Source: aidream/api/events.py
// Run: .venv/bin/python scripts/generate_types.py stream
```

**Both references are wrong:**
- `aidream/api/events.py` — the old codebase (now renamed `matrx-ai`)
- `scripts/generate_types.py` — **this script does not exist** in `matrx-ai`

The `types/python-generated/stream-events.ts` and `stream-events.schema.json` were generated from the old `aidream` codebase. They currently happen to be correct because the event shapes were not changed during the migration, but any future change to `matrx_ai/context/events.py` will silently drift out of sync.

**Fix required:**
1. Port or recreate `scripts/generate_types.py` into `matrx-ai`
2. Update the header comment to: `// Source: matrx_ai/context/events.py`
3. Update the run command to point to the correct script path

---

### 2. `StreamEvent.data` type is too loose

**Python (`events.py`):**
```python
class StreamEvent(BaseModel):
    event: EventType
    data: dict[str, Any]   # ← always an object/dict
```

**Schema JSON:**
```json
"data": { "type": "object", "additionalProperties": true },
"required": ["event", "data"]
```

**TypeScript (`stream-events.ts`):**
```typescript
export interface StreamEvent {
  event: EventType;
  data: unknown;           // ← too loose; schema guarantees an object
}
```

`data` is both **required** and guaranteed to be a JSON object by the Python schema. The TypeScript should reflect this.

**Fix:**
```typescript
export interface StreamEvent {
  event: EventType;
  data: Record<string, unknown>;
}
```

---

### 3. `CompletionPayload.status` should not be optional

**Python (`events.py`):**
```python
class CompletionPayload(BaseModel):
    model_config = {"extra": "forbid"}
    status: Literal["complete", "failed", "max_iterations_exceeded"] = "complete"
```

Because Pydantic serializes all fields with defaults (not just `None` defaults), `status` is **always present** in the emitted JSON — it will never be absent from a real response.

**TypeScript (`stream-events.ts`):**
```typescript
export interface CompletionPayload {
  status?: "complete" | "failed" | "max_iterations_exceeded";  // ← ? is wrong
  ...
}
```

**Fix:**
```typescript
export interface CompletionPayload {
  status: "complete" | "failed" | "max_iterations_exceeded";   // required, always present
  ...
}
```

---

### 4. `ErrorPayload.user_message` should not be optional

**Python (`events.py`):**
```python
class ErrorPayload(BaseModel):
    model_config = {"extra": "forbid"}
    error_type: str
    message: str
    user_message: str = "Sorry. An error occurred."   # always serialized
```

**Schema JSON confirms:**
```json
"user_message": {
  "default": "Sorry. An error occurred.",
  "type": "string"
}
```
(Only `error_type` and `message` are in `required`, but `user_message` is a non-nullable `str` with a default — it will always be a string in the output.)

**TypeScript (`stream-events.ts`):**
```typescript
export interface ErrorPayload {
  error_type: string;
  message: string;
  user_message?: string;    // ← ? is wrong; Python always sends this as a string
  ...
}
```

**Fix:**
```typescript
export interface ErrorPayload {
  error_type: string;
  message: string;
  user_message: string;     // always present, default "Sorry. An error occurred."
  ...
}
```

---

### 5. `ToolEventPayload.show_spinner` should not be optional

**Python (`events.py`):**
```python
class ToolEventPayload(BaseModel):
    ...
    show_spinner: bool = True      # default True, always serialized as bool
    data: dict[str, Any] = Field(default_factory=dict)   # always serialized as {}
```

**TypeScript (`stream-events.ts`):**
```typescript
export interface ToolEventPayload {
  ...
  show_spinner?: boolean;                  // ← ? is wrong
  data?: Record<string, unknown>;          // ← ? is wrong
}
```

Python always emits both fields. `show_spinner` will always be a boolean; `data` will always be at minimum `{}`.

**Fix:**
```typescript
export interface ToolEventPayload {
  event: ToolEventType;
  call_id: string;
  tool_name: string;
  timestamp?: number;                      // default_factory → legitimately optional in schema
  message?: string | null;
  show_spinner: boolean;                   // default true, always present
  data: Record<string, unknown>;           // default {}, always present
}
```

---

### 6. `DataPayload` does not document its freeform nature

**Python (`events.py`):**
```python
class DataPayload(BaseModel):
    model_config = {"extra": "allow"}   # ← accepts any additional fields
```

This means `data` events carry an arbitrary dict of key-value pairs — there's no fixed schema.

**TypeScript (`stream-events.ts`):**
```typescript
export interface DataPayload {}   // empty; doesn't communicate the freeform contract
```

**Fix:**
```typescript
/** Freeform data payload — any additional fields are allowed (Python extra: allow). */
export interface DataPayload {
  [key: string]: unknown;
}
```

---

## Summary Table

| # | File | Field | Python actual | TypeScript current | Fix |
|---|------|-------|--------------|-------------------|-----|
| 1 | `stream-events.ts` | header | `matrx_ai/context/events.py` | `aidream/api/events.py` | Update source path + create gen script |
| 2 | `stream-events.ts` | `StreamEvent.data` | `dict[str, Any]` (always object) | `unknown` | `Record<string, unknown>` |
| 3 | `stream-events.ts` | `CompletionPayload.status` | always present | `status?:` | Remove `?` |
| 4 | `stream-events.ts` | `ErrorPayload.user_message` | always present string | `user_message?:` | Remove `?` |
| 5 | `stream-events.ts` | `ToolEventPayload.show_spinner` | always present bool | `show_spinner?:` | Remove `?` |
| 5 | `stream-events.ts` | `ToolEventPayload.data` | always present `{}` | `data?:` | Remove `?` |
| 6 | `stream-events.ts` | `DataPayload` | freeform extra:allow | `{}` | Add index signature |

---

## What IS aligned correctly

Everything else matches:

- All 9 `EventType` values: `chunk`, `status_update`, `data`, `completion`, `error`, `tool_event`, `broker`, `heartbeat`, `end`
- All 6 `ToolEventType` values: `tool_started`, `tool_progress`, `tool_step`, `tool_result_preview`, `tool_completed`, `tool_error`
- All field names use snake_case matching Python exactly
- `ChunkPayload.text: string` ✅
- `StatusUpdatePayload` all 4 fields ✅
- `BrokerPayload` all 4 fields ✅
- `HeartbeatPayload.timestamp?: number` ✅ (legitimately optional — `default_factory` means not in schema required)
- `EndPayload.reason?: string` ✅
- `ToolEventPayload.timestamp?: number` ✅ (legitimately optional)
- NDJSON envelope format `{ "event": "...", "data": {...} }\n` ✅
- `from-stream.ts` handles all `tool_event` subtypes correctly ✅
- `from-stream.ts` correctly ignores `status_update`, `broker`, `heartbeat`, `end`, `completion` ✅

---

## Known gap (not a bug — intentional future work)

**`ThinkingBlock` from stream:** The canonical types include `ThinkingBlock` and `from-db.ts` correctly
reconstructs it from `CxThinkingContent`. However, there is no `thinking` event type on the Python
emitter side. The `from-stream.ts` file documents this as `// thinking (future)`. When Python adds
streaming thinking support (e.g., for Claude extended thinking), a new `EventType.THINKING = "thinking"`
and a `ThinkingPayload` will need to be added to both `events.py` and `stream-events.ts`, and the
`from-stream.ts` handler will need to be uncommented.
